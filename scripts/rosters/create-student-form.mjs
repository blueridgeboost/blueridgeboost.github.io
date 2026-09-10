// Builds a Jotform for collecting student information tied to an Ecwid order.
//
// The waiver / media release / COPPA are separate Jotform Sign documents and
// are NOT included here — send-waiver-links.mjs (todo) links to those with a
// "already signed" status note per school year.
//
// Usage (from the repo root, so ../.env resolves to Code/.env):
//   node scripts/rosters/create-student-form.mjs             # dry-run
//   node scripts/rosters/create-student-form.mjs --create    # actually create
//
// Requires JOTFORM_API_KEY in .env. After --create succeeds, add the returned
// form id to .env as JOTFORM_STUDENT_FORM_ID.

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const API_KEY = process.env.JOTFORM_API_KEY;
const CREATE  = process.argv.includes('--create');

if (!API_KEY) {
	console.error('Missing JOTFORM_API_KEY in .env.');
	process.exit(1);
}

// One seat = one line item × its quantity. STUDENT_SLOTS caps how many can
// fit on a single form; the send-waiver-links script prefills `productN` with
// the class/camp name for each seat, and `studentNameN` collects the name.
const STUDENT_SLOTS = 8;

let qid = 1;
const questions = {};
const add = (props) => {
	questions[qid] = { ...props, order: String(qid) };
	qid++;
};

// --- Header + prefill fields ------------------------------------------------
add({
	type: 'control_head',
	text: 'Student Information',
	subHeader: 'Please tell us the name of the student for each class or camp on your order. Waiver, media release, and COPPA consent are separate documents linked in your confirmation email.',
});
add({ type: 'control_textbox', name: 'orderId', text: 'Ecwid order ID', readonly: 'Yes', required: 'No' });

// --- Parent -----------------------------------------------------------------
add({ type: 'control_head',    text: 'Parent / Guardian' });
add({ type: 'control_textbox', name: 'parentName',  text: 'Parent name',  required: 'Yes' });
add({ type: 'control_email',   name: 'parentEmail', text: 'Parent email', required: 'Yes' });
add({ type: 'control_phone',   name: 'parentPhone', text: 'Parent phone', required: 'Yes' });

// --- Backup contact ---------------------------------------------------------
add({
	type: 'control_head',
	text: 'Backup contact',
	subHeader: 'Someone we can call if we can\'t reach the parent above.',
});
add({ type: 'control_textbox', name: 'backupContactName',  text: 'Backup contact name',  required: 'Yes' });
add({ type: 'control_phone',   name: 'backupContactPhone', text: 'Backup contact phone', required: 'Yes' });

// --- Students (one per seat) ------------------------------------------------
add({ type: 'control_head', text: 'Students' });
add({
	type: 'control_checkbox',
	name:  'sameStudentForAll',
	text:  'Same student for every seat on this order',
	subHeader: 'Check this if one student is attending everything on this order — you can leave the other name fields blank; we\'ll use Student 1\'s name for all seats.',
	options: 'Yes',
	required: 'No',
});

for (let i = 1; i <= STUDENT_SLOTS; i++) {
	// `product` is prefilled from the email URL (?product1=..&product2=..).
	// Empty slots stay blank and the parent can ignore them.
	add({
		type: 'control_textbox',
		name: `product${i}`,
		text: `Class or camp (seat ${i})`,
		readonly: 'Yes',
		required: 'No',
	});
	add({
		type: 'control_textbox',
		name: `studentName${i}`,
		text: `Student name for seat ${i}`,
		required: i === 1 ? 'Yes' : 'No',
	});
	add({
		type: 'control_textarea',
		name: `allergies${i}`,
		text: `Allergies for seat ${i}`,
		subHeader: i === 1
			? 'List any food, medication, or environmental allergies for this student, or leave blank if none.'
			: undefined,
		required: 'No',
	});
}

const properties = {
	title: 'Blue Ridge Boost — Student Information',
	activeRedirect: 'thankyou',
};

const payload = { questions, properties };

if (!CREATE) {
	console.log(`--- DRY RUN (${Object.keys(questions).length} questions) ---`);
	console.log(JSON.stringify(payload, null, 2));
	console.log('\nRe-run with --create to actually build the form in Jotform.');
	process.exit(0);
}

const params = new URLSearchParams();
for (const [id, q] of Object.entries(payload.questions)) {
	for (const [k, v] of Object.entries(q)) {
		if (v == null) continue;
		params.append(`questions[${id}][${k}]`, String(v));
	}
}
for (const [k, v] of Object.entries(payload.properties)) {
	if (v == null) continue;
	params.append(`properties[${k}]`, String(v));
}

const res = await fetch('https://api.jotform.com/user/forms', {
	method: 'POST',
	headers: {
		APIKEY: API_KEY,
		'Content-Type': 'application/x-www-form-urlencoded',
	},
	body: params,
});
const body = await res.json();
if (!res.ok || body.responseCode !== 200) {
	console.error(`Create failed (HTTP ${res.status}):`);
	console.error(JSON.stringify(body, null, 2));
	process.exit(1);
}

const form = body.content;
console.log(`\nCreated form ${form.id}: ${form.title}`);
console.log(`  Edit: https://www.jotform.com/build/${form.id}`);
console.log(`  View: https://form.jotform.com/${form.id}`);
console.log('\nAdd to your .env:');
console.log(`JOTFORM_STUDENT_FORM_ID=${form.id}`);
console.log('\nManual setup — in the Jotform builder → Settings → Conditions:');
console.log('');
console.log('  Rule 1 — hide empty seats. For each N in 2..8, add a "Show/Hide Field" rule:');
console.log('    IF   productN  is empty');
console.log('    HIDE productN, studentNameN, allergiesN');
console.log('  (seven rules; takes ~3 minutes)');
console.log('');
console.log('  Rule 2 — one student for the whole order. Add ONE more rule:');
console.log('    IF   sameStudentForAll  is filled');
console.log('    HIDE product2..8, studentName2..8, allergies2..8');
console.log('');
console.log('After both are in place: single-seat orders show only seat 1, multi-seat');
console.log('orders show the exact number of seats, and checking "same student" collapses');
console.log('everything back to seat 1.');
