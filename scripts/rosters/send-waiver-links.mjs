// ---------------------------------------------------------------------------
// For each recent Ecwid order, emails the parent:
//   1. A prefilled link to the student-info Jotform (per-order).
//   2. For each of the 3 sign documents (waiver / media / COPPA) EITHER a
//      "already signed <date>" note if they signed within the current school
//      year, OR a link to sign it.
//
// A signature counts as current if it was submitted within the past 365 days
// (rolling window ending today).
// Match key for prior signatures is parentEmail (the sign forms must have a
// field with unique-name `parentEmail`; if the field isn't there yet the
// script safely falls back to "please sign").
//
// SAFETY: defaults to a dry run. Prints the emails that would be sent.
// Run for real with:  DRY_RUN=false node scripts/rosters/send-waiver-links.mjs
//
// PERSISTENCE: on real send this writes last-waiver-email.txt so the next
// run only picks up newer orders. In GitHub Actions the runner is ephemeral,
// so that file is lost between runs — readLastProcessed() then falls back
// to "last 24h", which is fine for a daily cron. If the cron ever misses a
// day, back-fill manually with --since <date>.
//
// Other flags:
//   --since 2026-09-01           # override the last-processed timestamp
//   --limit 5                    # cap number of orders processed (safety)
//   --order 123456               # only process one specific order id or
//                                # vendor code (e.g. G2APQ)
// ---------------------------------------------------------------------------

import dotenv from 'dotenv';
import path   from 'path';
import fs     from 'fs/promises';
import mailchimp from '@mailchimp/mailchimp_transactional';
import { getOrders, getOrderById, getAllProducts, getCategories } from '../ecwid.js';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

// ── Config ─────────────────────────────────────────────────────────────────
const {
	JOTFORM_API_KEY,
	JOTFORM_STUDENT_FORM_ID,
	JOTFORM_WAIVER_FORM_ID,
	JOTFORM_Media_FORM_ID,
	JOTFORM_COPPA_FORM_ID,
	MAILCHIMP_KEY,
} = process.env;

const missing = [];
for (const [k, v] of Object.entries({
	JOTFORM_API_KEY,
	JOTFORM_STUDENT_FORM_ID,
	JOTFORM_WAIVER_FORM_ID,
	JOTFORM_Media_FORM_ID,
	JOTFORM_COPPA_FORM_ID,
	MAILCHIMP_KEY,
})) if (!v) missing.push(k);
if (missing.length) {
	console.error('Missing in .env: ' + missing.join(', '));
	process.exit(1);
}

const SIGN_DOCS = [
	{ key: 'waiver', label: 'Liability Waiver', id: JOTFORM_WAIVER_FORM_ID },
	{ key: 'media',  label: 'Media Release',    id: JOTFORM_Media_FORM_ID  },
	{ key: 'coppa',  label: 'COPPA Consent',    id: JOTFORM_COPPA_FORM_ID  },
];

const DRY_RUN     = process.env.DRY_RUN !== 'false';
const DATE_FILE   = 'scripts/rosters/last-waiver-email.txt';
const FROM_EMAIL  = 'office@blueridgeboost.com';
const FROM_NAME   = 'Blue Ridge Boost';
const mail = new mailchimp(MAILCHIMP_KEY);

// ── CLI args ───────────────────────────────────────────────────────────────
function argValue(flag) {
	const i = process.argv.indexOf(flag);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const SINCE_ARG    = argValue('--since');
const LIMIT_ARG    = argValue('--limit');
const ORDER_ARG    = argValue('--order');
const LIMIT        = LIMIT_ARG ? parseInt(LIMIT_ARG, 10) : Infinity;

// ── Signature validity window (rolling past year) ──────────────────────────
function pastYearWindow(today = new Date()) {
	const end = new Date(Date.UTC(
		today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
	));
	const start = new Date(end);
	start.setUTCFullYear(start.getUTCFullYear() - 1);
	return { start, end };
}

// ── Jotform helpers ────────────────────────────────────────────────────────
async function jf(pathname) {
	const res = await fetch(`https://api.jotform.com${pathname}`, {
		headers: { APIKEY: JOTFORM_API_KEY },
	});
	const body = await res.json();
	if (!res.ok || body.responseCode !== 200) {
		throw new Error(`Jotform ${pathname} failed (HTTP ${res.status}): ${JSON.stringify(body).slice(0, 400)}`);
	}
	return body.content;
}

// Fetch all submissions for a form created after `sinceIso`.
async function fetchSubmissionsSince(formId, sinceIso) {
	const submissions = [];
	let offset = 0;
	const limit = 1000;
	while (true) {
		const filter = encodeURIComponent(JSON.stringify({ 'created_at:gt': sinceIso }));
		const page = await jf(`/form/${formId}/submissions?limit=${limit}&offset=${offset}&filter=${filter}`);
		if (!Array.isArray(page) || page.length === 0) break;
		submissions.push(...page);
		if (page.length < limit) break;
		offset += limit;
	}
	return submissions;
}

// Look through a submission's answers for one matching `predicate(answer)`,
// return its .answer value (string), or undefined.
function findAnswer(submission, predicate) {
	const answers = submission.answers || {};
	for (const q of Object.values(answers)) {
		if (predicate(q)) return typeof q.answer === 'string' ? q.answer : undefined;
	}
	return undefined;
}

// Predicates for the sign-form fields we care about.
// - parentEmail: unique-name "parentEmail" (the field the user will add).
// - parentName: unique-name "parentName", OR any control_textbox whose label
//   matches /legal guardian|guardian|parent/i (covers the existing
//   "Legal Guardians Name" field with unique-name shortText3).
const isEmailField = (q) => q?.name === 'parentEmail';
const isNameField  = (q) => q?.name === 'parentName' || (
	q?.type === 'control_textbox' &&
	typeof q.text === 'string' &&
	/legal\s*guardian|guardian|parent/i.test(q.text)
);

function normalizeName(s) {
	return (s || '')
		.toString()
		.toLowerCase()
		.replace(/[.,'"`]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

// Build two maps for a form:
//   byEmail: lowercased-email  → most-recent submission Date
//   byName:  normalized-name   → most-recent submission Date
// Email match is preferred at lookup time; name match is a fallback for
// submissions from before the email field was added.
async function buildSignedIndex(formId, windowStart) {
	const sinceIso = windowStart.toISOString().slice(0, 19).replace('T', ' ');
	const subs = await fetchSubmissionsSince(formId, sinceIso);
	const byEmail = new Map();
	const byName  = new Map();
	for (const s of subs) {
		const when = new Date(s.created_at.replace(' ', 'T') + 'Z');

		const email = findAnswer(s, isEmailField);
		if (email) {
			const key = email.trim().toLowerCase();
			const prev = byEmail.get(key);
			if (!prev || when > prev) byEmail.set(key, when);
		}

		const name = findAnswer(s, isNameField);
		if (name) {
			const key = normalizeName(name);
			if (key) {
				const prev = byName.get(key);
				if (!prev || when > prev) byName.set(key, when);
			}
		}
	}
	return { byEmail, byName };
}

// ── URL prefill helpers ────────────────────────────────────────────────────
function prefillUrl(formId, params) {
	const usp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v == null || v === '') continue;
		usp.append(k, String(v));
	}
	const qs = usp.toString();
	return `https://form.jotform.com/${formId}${qs ? '?' + qs : ''}`;
}

// ── Order helpers ──────────────────────────────────────────────────────────
function parseOrderDate(order) {
	// Ecwid returns "YYYY-MM-DD HH:mm:ss +0000"
	return new Date(order.createDate.replace(' ', 'T').replace(' +0000', 'Z'));
}

// Accept either a numeric internal order id or a vendor order number (short
// alphanumeric code like "G2APQ" shown in admin URLs).
async function resolveOrder(idOrVendorNumber) {
	if (/^\d+$/.test(idOrVendorNumber)) {
		return await getOrderById(idOrVendorNumber);
	}
	const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/orders?keywords=${encodeURIComponent(idOrVendorNumber)}&limit=5`;
	const res = await fetch(url, {
		headers: {
			accept: 'application/json',
			Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`,
		},
	});
	if (!res.ok) throw new Error(`Order search failed: ${res.statusText}`);
	const body = await res.json();
	const target = idOrVendorNumber.toUpperCase();
	const match = (body.items || []).find(
		(o) => (o.vendorOrderNumber || '').toUpperCase() === target,
	);
	if (!match) {
		console.warn(`No order matched vendor number ${idOrVendorNumber}. Search returned ${body.items?.length || 0} result(s).`);
		return null;
	}
	return match;
}

// Enrollment = every enabled Ecwid product EXCEPT gift cards and products in
// any category whose name matches /wro/i (World Robot Olympiad).
async function getEnrollmentProductIds() {
	const [products, categories] = await Promise.all([
		getAllProducts(true),
		getCategories(),
	]);

	const wroCategoryIds = new Set(
		(categories || [])
			.filter((c) => /wro/i.test(c.name || ''))
			.map((c) => c.id),
	);
	console.log(`WRO categories excluded: ${[...wroCategoryIds].join(', ') || '(none found)'}`);

	const isGiftCard = (p) => /gift\s*card/i.test(p.name || '') || /gift\s*card/i.test(p.sku || '');
	const isWro = (p) => (p.categoryIds || []).some((id) => wroCategoryIds.has(id));

	const enrollmentProducts = products.filter((p) => !isGiftCard(p) && !isWro(p));
	const droppedGift = products.filter(isGiftCard).length;
	const droppedWro  = products.filter((p) => !isGiftCard(p) && isWro(p)).length;
	console.log(`Enabled products: ${products.length}, enrollment: ${enrollmentProducts.length} (excluded ${droppedGift} gift-card, ${droppedWro} WRO)`);
	return new Set(enrollmentProducts.map((p) => p.id));
}

function orderHasEnrollment(order, enrollmentIds) {
	return (order.items || []).some((i) => enrollmentIds.has(i.productId));
}

// Expand line items × quantity into one name per seat.
// Example: [{name:"Robotics", qty:2}, {name:"Math", qty:1}]  →
//          ["Robotics", "Robotics", "Math"]
function seatsFromOrder(order, enrollmentIds) {
	const seats = [];
	for (const item of order.items || []) {
		if (!enrollmentIds.has(item.productId)) continue;
		const qty = Math.max(1, Number(item.quantity) || 1);
		for (let i = 0; i < qty; i++) seats.push(item.name || '');
	}
	return seats;
}

// ── State ──────────────────────────────────────────────────────────────────
async function readLastProcessed() {
	if (SINCE_ARG) return new Date(SINCE_ARG.replace(' ', 'T') + (SINCE_ARG.includes('T') ? 'Z' : 'T00:00:00Z'));
	try {
		const raw = (await fs.readFile(DATE_FILE, 'utf8')).trim();
		return new Date(raw.replace(' ', 'T') + 'Z');
	} catch {
		return new Date(Date.now() - 24 * 60 * 60 * 1000); // default: last 24h
	}
}

async function writeLastProcessed(dt) {
	await fs.writeFile(
		DATE_FILE,
		dt.toISOString().slice(0, 19).replace('T', ' '),
		'utf8',
	);
}

// ── Email composition ──────────────────────────────────────────────────────
function fmt(dt) {
	return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function composeEmail(order, statusByDoc, enrollmentIds) {
	const parentName  = order.billingPerson?.name  || '';
	const parentEmail = order.email                || '';
	const parentPhone = order.billingPerson?.phone || '';
	const seats       = seatsFromOrder(order, enrollmentIds);

	const studentPrefill = {
		orderId: order.id,
		parentName,
		parentEmail,
		parentPhone,
	};
	seats.forEach((productName, idx) => {
		studentPrefill[`product${idx + 1}`] = productName;
	});
	if (seats.length > 8) {
		console.warn(`Order #${order.id} has ${seats.length} seats but the form only has 8 slots — extras won't prefill.`);
	}
	const studentUrl = prefillUrl(JOTFORM_STUDENT_FORM_ID, studentPrefill);

	const docLines = SIGN_DOCS.map((doc) => {
		const s = statusByDoc[doc.key];
		if (s.signed) {
			return `<li><strong>${doc.label}:</strong> ✅ Signed on ${fmt(s.signedAt)}.</li>`;
		}
		const url = prefillUrl(doc.id, { parentEmail, parentName });
		return `<li><strong>${doc.label}:</strong> <a href="${url}">Please sign</a>.</li>`;
	}).join('\n');

	const seatsList = seats.map((n) => `<li>${n}</li>`).join('');

	const html = `
	  <p>Hi ${parentName || 'there'},</p>
	  <p>Thanks for your order (#${order.id}). To finish enrollment, please:</p>
	  <ol>
	    <li><a href="${studentUrl}"><strong>Enter the student name for each seat</strong></a>. The class/camp for each seat is prefilled — you'll just type a name beside each. If one student is attending everything, check the "Same student for every seat" box and enter their name once.</li>
	    <li>Complete the documents below:</li>
	  </ol>
	  <ul>
	    ${docLines}
	  </ul>
	  ${seatsList ? `<p><strong>On this order (${seats.length} seat${seats.length === 1 ? '' : 's'}):</strong></p><ul>${seatsList}</ul>` : ''}
	  <p>Thanks,<br/>Blue Ridge Boost</p>
	`;

	return {
		subject: `Please complete enrollment for order #${order.id}`,
		html,
		to: parentEmail,
	};
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
	const window = pastYearWindow();
	console.log(`Signature-validity window (past year): ${window.start.toISOString().slice(0, 10)} → ${window.end.toISOString().slice(0, 10)}`);

	const enrollmentIds = await getEnrollmentProductIds();

	console.log('Building signed-index for each sign document...');
	const signedMaps = {};
	for (const doc of SIGN_DOCS) {
		signedMaps[doc.key] = await buildSignedIndex(doc.id, window.start);
		const { byEmail, byName } = signedMaps[doc.key];
		console.log(`  ${doc.label}: ${byEmail.size} by email, ${byName.size} by name (past year)`);
	}

	let orders;
	if (ORDER_ARG) {
		const one = await resolveOrder(ORDER_ARG);
		console.log(`Fetched --order ${ORDER_ARG}:`, JSON.stringify({
			id: one?.id,
			vendorOrderNumber: one?.vendorOrderNumber,
			email: one?.email,
			itemCount: (one?.items || []).length,
			itemNames: (one?.items || []).map((i) => i.name),
		}, null, 2));
		orders = one && one.id ? [one] : [];
	} else {
		const lastProcessed = await readLastProcessed();
		console.log(`Fetching orders newer than ${lastProcessed.toISOString()}`);
		const all = await getOrders();
		orders = all
			.filter((o) => parseOrderDate(o) > lastProcessed)
			.sort((a, b) => parseOrderDate(a) - parseOrderDate(b));
	}

	const beforeEnrollment = orders.length;
	orders = orders.filter((o) => orderHasEnrollment(o, enrollmentIds));
	const droppedNoEnrollment = beforeEnrollment - orders.length;

	// "Completed" per the existing scripts (all-classes.mjs, update-orders.mjs):
	// custom fulfillment status 2. Also skip the standard DELIVERED status.
	const COMPLETED_STATUSES = new Set(['CUSTOM_FULFILLMENT_STATUS_2', 'DELIVERED']);
	const beforeStatus = orders.length;
	orders = orders.filter((o) => !COMPLETED_STATUSES.has(o.fulfillmentStatus));
	const droppedCompleted = beforeStatus - orders.length;

	// Skip fully-refunded orders (payment reversed) and cancelled orders.
	const REFUNDED_STATUSES = new Set(['REFUNDED', 'CANCELLED']);
	const beforeRefunded = orders.length;
	orders = orders.filter((o) => !REFUNDED_STATUSES.has(o.paymentStatus));
	const droppedRefunded = beforeRefunded - orders.length;

	const notes = [];
	if (droppedNoEnrollment) notes.push(`${droppedNoEnrollment} gift-card/WRO-only`);
	if (droppedCompleted)    notes.push(`${droppedCompleted} already completed`);
	if (droppedRefunded)     notes.push(`${droppedRefunded} refunded/cancelled`);
	console.log(`Orders to process: ${orders.length}${notes.length ? ` (dropped ${notes.join(', ')})` : ''}`);
	if (orders.length > LIMIT) {
		console.log(`Capping to first ${LIMIT} (--limit).`);
		orders = orders.slice(0, LIMIT);
	}

	if (DRY_RUN) console.log('\nDRY RUN — no email will be sent. Set DRY_RUN=false to send.\n');

	let sent = 0;
	let latest = null;
	for (const order of orders) {
		const email    = (order.email || '').trim().toLowerCase();
		const nameKey  = normalizeName(order.billingPerson?.name);
		const statusByDoc = {};
		for (const doc of SIGN_DOCS) {
			const { byEmail, byName } = signedMaps[doc.key];
			const emailHit = email   ? byEmail.get(email) : undefined;
			const nameHit  = nameKey ? byName.get(nameKey) : undefined;
			const signedAt = emailHit || nameHit;
			const matchedBy = emailHit ? 'email' : (nameHit ? 'name' : null);
			statusByDoc[doc.key] = signedAt
				? { signed: true, signedAt, matchedBy }
				: { signed: false };
		}

		const msg = composeEmail(order, statusByDoc, enrollmentIds);
		if (!msg.to) {
			console.log(`Order #${order.id}: no parent email; skipping.`);
			continue;
		}

		console.log(`--- Order #${order.id} → ${msg.to} ---`);
		for (const doc of SIGN_DOCS) {
			const s = statusByDoc[doc.key];
			console.log(`  ${doc.label}: ${s.signed ? `SIGNED ${fmt(s.signedAt)} (matched by ${s.matchedBy})` : 'needs signature'}`);
		}

		if (DRY_RUN) {
			console.log(`Subject: ${msg.subject}`);
		} else {
			await mail.messages.send({
				message: {
					from_email: FROM_EMAIL,
					from_name:  FROM_NAME,
					to:         [{ email: msg.to, type: 'to' }],
					subject:    msg.subject,
					html:       msg.html,
				},
			});
			console.log(`Sent to ${msg.to} for order #${order.id}.`);
		}

		sent++;
		const orderDt = parseOrderDate(order);
		if (!latest || orderDt > latest) latest = orderDt;
	}

	if (!DRY_RUN && !ORDER_ARG && latest) {
		await writeLastProcessed(latest);
		console.log(`Updated ${DATE_FILE} → ${latest.toISOString()}`);
	}

	console.log(`\n${DRY_RUN ? 'Would have sent' : 'Sent'} ${sent} email(s).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
