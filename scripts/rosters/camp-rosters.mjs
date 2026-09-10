// ---------------------------------------------------------------------------
// One-day camp rosters (npm run one-day-camp-rosters).
//
// For every enabled one-day camp starting within the next month:
//   1. Pull orders from Ecwid.
//   2. Match each seat to the student's name from the student-info Jotform
//      (JOTFORM_STUDENT_FORM_ID), keyed by orderId. Honors the
//      "sameStudentForAll" checkbox.
//   3. Write a per-camp CSV to OneDrive. Rows without a matching submission
//      get "PENDING" in the Student Name column so the seat still shows up.
//   4. After all camps are processed, email each parent whose form is still
//      missing (one email per parent, listing all their pending orders), and
//      send a summary to office@blueridgeboost.com.
//
// SAFETY: emails are gated by DRY_RUN. Defaults to a dry run.
//   Run for real:  DRY_RUN=false node scripts/rosters/camp-rosters.mjs
// ---------------------------------------------------------------------------

import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';
import Papa from 'papaparse';
import mailchimp from '@mailchimp/mailchimp_transactional';
import {
    getOrdersByProductId,
    getCatalog,
    getAllProducts,
    getCategories,
} from '../ecwid.js';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

// ── Config ─────────────────────────────────────────────────────────────────
const {
    JOTFORM_API_KEY,
    JOTFORM_STUDENT_FORM_ID,
    MAILCHIMP_KEY,
} = process.env;

const DRY_RUN     = process.env.DRY_RUN !== 'false';
const FROM_EMAIL  = 'office@blueridgeboost.com';
const FROM_NAME   = 'Blue Ridge Boost';
const OFFICE_TO   = 'office@blueridgeboost.com';
const ONE_DAY_CAMPS_CATEGORY_ID = 175336115;
const ROSTER_DIR  = path.join(os.homedir(), 'OneDrive - Blue Ridge Boost', 'Rosters - Documents');
const STUDENT_LOOKBACK_DAYS = 365;

if (!JOTFORM_API_KEY || !JOTFORM_STUDENT_FORM_ID) {
    console.error('Missing JOTFORM_API_KEY or JOTFORM_STUDENT_FORM_ID in .env.');
    process.exit(1);
}
if (!DRY_RUN && !MAILCHIMP_KEY) {
    console.error('DRY_RUN=false requires MAILCHIMP_KEY in .env.');
    process.exit(1);
}

const mail = MAILCHIMP_KEY ? new mailchimp(MAILCHIMP_KEY) : null;

// ── Small helpers ──────────────────────────────────────────────────────────
function getAttributeValue(product, attributeName) {
    const attr = (product.attributes || []).find((a) => a.name === attributeName);
    return attr ? attr.value : '';
}

// Extract a Date from a one-day-camp product. Sources, in priority order:
//   1. Ecwid attribute "Date"  → "M/D/YYYY" or "MM/DD/YYYY"
//   2. SKU pattern             → "ODC-YYYY-MM-DD..."
//   3. Product name            → "... - Month D, YYYY"
// Returns a Date at local midnight, or null if none parse.
function getCampDate(product) {
    const attr = getAttributeValue(product, 'Date');
    if (attr) {
        const m = attr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (m) {
            const [, mo, d, y] = m.map(Number);
            const dt = new Date(y, mo - 1, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
        }
    }
    const skuMatch = (product.sku || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (skuMatch) {
        const [, y, mo, d] = skuMatch.map(Number);
        const dt = new Date(y, mo - 1, d);
        if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
    }
    const nameMatch = (product.name || '').match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i,
    );
    if (nameMatch) {
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const mo = months.indexOf(nameMatch[1].toLowerCase());
        const d  = Number(nameMatch[2]);
        const y  = Number(nameMatch[3]);
        if (mo >= 0) {
            const dt = new Date(y, mo, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
        }
    }
    return null;
}

function toIsoDate(dt) {
    if (!dt) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isWithinNextMonth(dt) {
    if (!dt) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return dt >= today && dt <= oneMonthLater;
}

async function writeDataToCsv(data, fileName) {
    const csv = Papa.unparse(data, { header: true, quotes: true });
    const filePath = path.join(ROSTER_DIR, `${fileName}.csv`);
    try {
        fs.writeFileSync(filePath, csv, 'utf8');
        console.log(`Wrote ${filePath}`);
    } catch (err) {
        console.error('Error writing CSV file:', err);
    }
}

// ── Enrollment set (excludes gift cards and WRO) ───────────────────────────
async function getEnrollmentProductIds() {
    const [products, categories] = await Promise.all([
        getAllProducts(true),
        getCategories(),
    ]);
    const wroCategoryIds = new Set(
        (categories || []).filter((c) => /wro/i.test(c.name || '')).map((c) => c.id),
    );
    const isGiftCard = (p) => /gift\s*card/i.test(p.name || '') || /gift\s*card/i.test(p.sku || '');
    const isWro = (p) => (p.categoryIds || []).some((id) => wroCategoryIds.has(id));
    const enrollment = products.filter((p) => !isGiftCard(p) && !isWro(p));
    return new Set(enrollment.map((p) => p.id));
}

// ── Jotform: build an index of student-info submissions keyed by orderId ───
async function fetchStudentIndex() {
    const since = new Date();
    since.setDate(since.getDate() - STUDENT_LOOKBACK_DAYS);
    const sinceIso = since.toISOString().slice(0, 19).replace('T', ' ');

    const submissions = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const filter = encodeURIComponent(JSON.stringify({ 'created_at:gt': sinceIso }));
        const url = `https://api.jotform.com/form/${JOTFORM_STUDENT_FORM_ID}/submissions?limit=${limit}&offset=${offset}&filter=${filter}`;
        const res = await fetch(url, { headers: { APIKEY: JOTFORM_API_KEY } });
        const body = await res.json();
        if (!res.ok || body.responseCode !== 200) {
            throw new Error(`Jotform submissions fetch failed (HTTP ${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
        }
        const page = Array.isArray(body.content) ? body.content : [];
        submissions.push(...page);
        if (page.length < limit) break;
        offset += limit;
    }

    const answerByName = (submission, name) => {
        for (const q of Object.values(submission.answers || {})) {
            if (q?.name === name) return q.answer;
        }
        return undefined;
    };

    const truthyCheckbox = (v) => {
        if (!v) return false;
        if (Array.isArray(v)) return v.some((x) => x && String(x).toLowerCase() !== 'no');
        return String(v).trim() !== '' && String(v).toLowerCase() !== 'no';
    };

    const byOrderId = new Map();
    for (const s of submissions) {
        const orderId = answerByName(s, 'orderId');
        if (!orderId) continue;
        const key = String(orderId).trim();
        // If the same order has multiple submissions, keep the newest.
        const when = new Date((s.created_at || '').replace(' ', 'T') + 'Z');
        const prev = byOrderId.get(key);
        if (prev && new Date((prev._raw.created_at || '').replace(' ', 'T') + 'Z') >= when) continue;

        const sameForAll = truthyCheckbox(answerByName(s, 'sameStudentForAll'));
        const backupName  = (answerByName(s, 'backupContactName')  || '').toString().trim();
        const backupPhone = (answerByName(s, 'backupContactPhone') || '').toString().trim();
        const students = [];
        for (let i = 1; i <= 8; i++) {
            students.push({
                product:   (answerByName(s, `product${i}`)     || '').toString().trim(),
                name:      (answerByName(s, `studentName${i}`) || '').toString().trim(),
                allergies: (answerByName(s, `allergies${i}`)   || '').toString().trim(),
            });
        }
        byOrderId.set(key, { sameForAll, backupName, backupPhone, students, _raw: s });
    }
    return byOrderId;
}

// ── Seat helpers ───────────────────────────────────────────────────────────
// Given an order and a target productId, return the 1-indexed seat numbers
// (in enrollment-only, order-wide seating) that correspond to this product.
function seatIndicesForProduct(order, targetProductId, enrollmentIds) {
    const seats = [];
    let seatIdx = 0;
    for (const item of order.items || []) {
        if (!enrollmentIds.has(item.productId)) continue;
        const qty = Math.max(1, Number(item.quantity) || 1);
        if (item.productId === targetProductId) {
            for (let i = 0; i < qty; i++) seats.push(seatIdx + i + 1);
        }
        seatIdx += qty;
    }
    return seats;
}

function studentForSeat(submission, seatIdx) {
    if (!submission) return null;
    if (submission.sameForAll) return submission.students[0] || null;
    return submission.students[seatIdx - 1] || null;
}

// ── URL prefill for reminder emails ────────────────────────────────────────
function prefillUrl(formId, params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') continue;
        usp.append(k, String(v));
    }
    const qs = usp.toString();
    return `https://form.jotform.com/${formId}${qs ? '?' + qs : ''}`;
}

function buildStudentUrlForOrder(order, enrollmentIds) {
    const prefill = {
        orderId: order.id,
        parentName:  order.billingPerson?.name  || '',
        parentEmail: order.email                || '',
        parentPhone: order.billingPerson?.phone || '',
    };
    let seatIdx = 0;
    for (const item of order.items || []) {
        if (!enrollmentIds.has(item.productId)) continue;
        const qty = Math.max(1, Number(item.quantity) || 1);
        for (let i = 0; i < qty; i++) {
            seatIdx += 1;
            prefill[`product${seatIdx}`] = item.name || '';
        }
    }
    return prefillUrl(JOTFORM_STUDENT_FORM_ID, prefill);
}

// ── Email composition ──────────────────────────────────────────────────────
function fmtDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function composeParentReminder(parentName, orderEntries) {
    const items = orderEntries.map((e) => `
      <li>
        <strong>${e.campName}</strong> — starts ${fmtDate(e.startDate)}
        (order #${e.order.id})<br/>
        <a href="${e.url}">Fill out student information for this order</a>
      </li>
    `).join('\n');
    const html = `
      <p>Hi ${parentName || 'there'},</p>
      <p>We're finalizing rosters for the camps you registered for and don't
      yet have student names for the seats below. Please take a minute to
      complete the student-information form for each order — each link is
      already prefilled with your order details, so you'll just need to type
      names.</p>
      <ul>${items}</ul>
      <p>If one student is attending all of these, just check the
      "Same student for every seat" box on each form and enter their name once.</p>
      <p>Thanks,<br/>Blue Ridge Boost</p>
    `;
    return {
        subject: 'Please send us your student names for upcoming camp(s)',
        html,
    };
}

function composeOfficeSummary(pendingByEmail) {
    const totalOrders = [...pendingByEmail.values()]
        .reduce((n, p) => n + p.orders.length, 0);
    const rows = [];
    for (const [email, p] of pendingByEmail) {
        for (const e of p.orders) {
            rows.push(`
              <tr>
                <td>${e.order.id}</td>
                <td>${p.parentName || ''}</td>
                <td>${email}</td>
                <td>${e.campName}</td>
                <td>${fmtDate(e.startDate)}</td>
              </tr>
            `);
        }
    }
    const html = `
      <p>${totalOrders} order(s) across ${pendingByEmail.size} parent(s) are
      still missing student-information submissions for upcoming one-day
      camps.</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <thead>
          <tr>
            <th>Order</th><th>Parent</th><th>Email</th>
            <th>Camp</th><th>Start</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      <p>Parents were emailed a reminder in this same run.</p>
    `;
    return {
        subject: `[Rosters] ${totalOrders} order(s) missing student names`,
        html,
    };
}

async function sendEmail({ to, subject, html }) {
    if (DRY_RUN) {
        console.log(`[DRY RUN] would send to ${to}: ${subject}`);
        return;
    }
    await mail.messages.send({
        message: {
            from_email: FROM_EMAIL,
            from_name:  FROM_NAME,
            to:         [{ email: to, type: 'to' }],
            subject,
            html,
        },
    });
    console.log(`Sent to ${to}: ${subject}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log(DRY_RUN ? 'DRY RUN — no email will be sent. Set DRY_RUN=false to send.\n' : '');

    console.log('Fetching enrollment product ids...');
    const enrollmentIds = await getEnrollmentProductIds();

    console.log('Fetching student-info submissions...');
    const studentIndex = await fetchStudentIndex();
    console.log(`Indexed ${studentIndex.size} submission(s) by orderId.`);

    console.log('Fetching one-day-camp catalog...');
    const camps = await getCatalog([ONE_DAY_CAMPS_CATEGORY_ID]);

    const summary = [];
    // parentEmail → { parentName, orders: [{order, campName, startDate, url}] }
    const pendingByEmail = new Map();

    for (const c of camps) {
        if (!c.enabled) continue;
        const campDate = getCampDate(c);
        if (!isWithinNextMonth(campDate)) continue;
        const startDate = toIsoDate(campDate);

        // One-day camps don't have brb_id, so use SKU (or slugified name).
        const fileKey = (c.sku && c.sku.trim())
            || (c.name || 'camp').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60);
        const campName = c.name;
        const orders = await getOrdersByProductId(c.id);

        let count = 0;
        const rows = [];

        for (const order of orders) {
            const submission = studentIndex.get(String(order.id));
            const seats = seatIndicesForProduct(order, c.id, enrollmentIds);

            for (const seatIdx of seats) {
                count += 1;
                const student = studentForSeat(submission, seatIdx);
                const row = {
                    'Parent Name': order.billingPerson?.name || '',
                    Email: order.email || '',
                    'Phone Number': order.billingPerson?.phone || '',
                    'Student Name': student?.name || 'PENDING',
                    Allergies: submission ? (student?.allergies || '') : 'PENDING',
                    'Backup Contact': submission?.backupName || '',
                    'Backup Phone':   submission?.backupPhone || '',
                };
                // Copy selectedOptions from the matching line item.
                const item = (order.items || []).find((i) => i.productId === c.id);
                for (const opt of (item?.selectedOptions || [])) {
                    row[opt.name] = opt.value ? String(opt.value) : '';
                }
                rows.push(row);
            }

            if (!submission && seats.length > 0) {
                const key = (order.email || '').trim().toLowerCase();
                if (!key) continue;
                if (!pendingByEmail.has(key)) {
                    pendingByEmail.set(key, {
                        parentName: order.billingPerson?.name || '',
                        orders: [],
                    });
                }
                const entry = pendingByEmail.get(key);
                // Avoid listing the same order twice if it covers multiple camps.
                if (!entry.orders.some((e) => e.order.id === order.id && e.campName === campName)) {
                    entry.orders.push({
                        order,
                        campName,
                        startDate,
                        url: buildStudentUrlForOrder(order, enrollmentIds),
                    });
                }
            }
        }

        if (count > 0) {
            summary.push({
                sku: c.sku || '',
                campName,
                topic: getAttributeValue(c, 'Camp Topic'),
                count,
                date: startDate,
            });
            await writeDataToCsv(rows, fileKey);
        }
    }

    await writeDataToCsv(summary, 'summary-camps');

    // Reminders
    if (pendingByEmail.size === 0) {
        console.log('\nNo pending student-info forms — no reminders to send.');
        return;
    }

    console.log(`\n${pendingByEmail.size} parent(s) with pending forms; ${[...pendingByEmail.values()].reduce((n, p) => n + p.orders.length, 0)} order(s) pending.`);

    for (const [email, p] of pendingByEmail) {
        const msg = composeParentReminder(p.parentName, p.orders);
        await sendEmail({ to: email, subject: msg.subject, html: msg.html });
    }

    const summaryMsg = composeOfficeSummary(pendingByEmail);
    await sendEmail({ to: OFFICE_TO, subject: summaryMsg.subject, html: summaryMsg.html });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
