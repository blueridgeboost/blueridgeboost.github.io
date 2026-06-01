import path from 'path';
import dotenv from 'dotenv';
import mailchimp from '@mailchimp/mailchimp_transactional';
import {
    getSummerCamps,
    getAdvancedStemCamps,
    getBootcamps,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const client = new mailchimp(process.env.MAILCHIMP_KEY);

// ---------------------------------------------------------------------------
// SAFETY: defaults to a dry run so you can verify recipients before sending.
// Run for real with:  DRY_RUN=false node send-next-week-confirmations.js
// ---------------------------------------------------------------------------
const DRY_RUN = process.env.DRY_RUN !== 'false';
const SEND_DELAY_MS = 0; // editable for API rate limits

const SUMMER_WEEKS = [
    { startDate: '2026-06-01', label: 'Week June 1-5' },
    { startDate: '2026-06-08', label: 'Week June 8-12' },
    { startDate: '2026-06-15', label: 'Week June 15-19' },
    { startDate: '2026-06-22', label: 'Week June 22-26' },
    { startDate: '2026-06-29', label: 'Week June 29 - July 3' },
    { startDate: '2026-07-06', label: 'Week July 6-10' },
    { startDate: '2026-07-13', label: 'Week July 13-17' },
    { startDate: '2026-07-20', label: 'Week July 20-24' },
    { startDate: '2026-07-27', label: 'Week July 27-31' },
    { startDate: '2026-08-03', label: 'Week August 3-7' },
];

const SESSION_TIME = 'Session Time';   // option name for summer / STEM camps
const BOOTCAMP_OPTION = 'Session';     // option name for bootcamps

// Session option -> time range, shown in the Registration Details table.
const SESSION_TIMES = {
    'Full-Day': '8:30 AM – 5:00 PM',
    'AM':       '8:30 AM – 1:00 PM',
    'PM':       '12:30 PM – 5:00 PM',
};

// YYYY-MM-DD
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextWeek(referenceDate = todayISO()) {
    return SUMMER_WEEKS.find(w => w.startDate > referenceDate) || null;
}

// "June 1, 2026" — formatting only
function formatDate(isoDate) {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

// takes an item and returns the camper's name
function getChildName(item) {
    return item.selectedOptions?.find(o => o?.name === "Camper's Name")?.value || null;
}

// Regular weekly camps (summer + advanced STEM)
async function collectRegistrations(camp, week) {
    const orders = await getOrdersByProductId(camp.id);
    const regs = [];

    for (const order of orders) {
        const parentEmail = order.email;
        if (!parentEmail) continue;

        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;

            regs.push({
                parentEmail,
                childName: getChildName(item) || 'your child',
                campName: camp.name,
                campDescription: camp.description || '',
                sessionLabel: item.selectedOptions?.find(o => o?.name === SESSION_TIME)?.value || '',
                startDate: week.startDate,
                weekLabel: week.label,
            });
        }
    }
    return regs;
}

// Bootcamps: full-day is one week (week 1 or week 2); AM/PM half-day spans both weeks.
async function collectBootcampRegistrations(camp, week, nextWeek) {
    const orders = await getOrdersByProductId(camp.id);
    const regs = [];

    for (const order of orders) {
        const parentEmail = order.email;
        if (!parentEmail) continue;

        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;

            const selected = item.selectedOptions?.find(o => o?.name === BOOTCAMP_OPTION)?.value || '';

            // default: week 1
            let startDate = week.startDate;
            let weekLabel = week.label;

            if (selected.startsWith('Full-Day Week2') && nextWeek) {
                startDate = nextWeek.startDate;
                weekLabel = nextWeek.label;
            } else if ((selected.startsWith('AM ') || selected.startsWith('PM ')) && nextWeek) {
                // half-day sessions run across both weeks
                weekLabel = `${week.label} and ${nextWeek.label}`;
            }

            regs.push({
                parentEmail,
                childName: getChildName(item) || 'your child',
                campName: camp.name,
                campDescription: camp.description || '',
                sessionLabel: selected,
                startDate,
                weekLabel,
            });
        }
    }
    return regs;
}

// html email content
// html email content
function sendEmail({ parentEmail, childName, campName, sessionLabel, startDate, weekLabel }) {
    const sessionTime = SESSION_TIMES[sessionLabel] || null;

    const html = `
    <p>Hello,</p>
    <p><strong>${childName}</strong> is registered for <strong>${campName}</strong>. We look forward to having them join us.</p>

    <h3 style="margin-bottom:4px; font-weight:600;">Registration Details</h3>
    <table style="border-collapse:collapse; font-size:15px;">
      <tr><td style="padding:4px 12px 4px 0;"><strong>Camp</strong></td><td>${campName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;"><strong>Week</strong></td><td>${weekLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;"><strong>Starts</strong></td><td>${formatDate(startDate)}</td></tr>
      ${sessionLabel ? `<tr><td style="padding:4px 12px 4px 0;"><strong>Session</strong></td><td>${sessionLabel}${sessionTime ? ` &nbsp;(${sessionTime})` : ''}</td></tr>` : ''}
    </table>

    <hr style="margin:20px 0;"/>

    <h3 style="margin-bottom:4px; font-weight:600;">What to Bring</h3>
    <ul style="margin:0; padding-left:20px;">
      <li>Water bottle</li>
      <li>Lunch</li>
      <li>1–2 light snacks</li>
      <li>Any necessary medications (please share allergy or medical details with staff on arrival)</li>
    </ul>

    <h3 style="margin-top:20px; margin-bottom:4px; font-weight:600;">Location</h3>
    <p style="margin:0;">2171 Ivy Rd, Charlottesville, VA 22903</p>

    <h3 style="margin-top:20px; margin-bottom:4px; font-weight:600;">Dress Code</h3>
    <p style="margin:0;">Comfortable clothes and indoor-friendly shoes.</p>

    <h3 style="margin-top:20px; margin-bottom:4px; font-weight:600;">Questions?</h3>
    <p style="margin:0;">
      <a href="mailto:camps@blueridgeboost.com">camps@blueridgeboost.com</a>
      &nbsp;•&nbsp;
      <a href="tel:+14342600636">(434) 260-0636</a>
    </p>

    <hr style="margin:20px 0;"/>
    <p>We look forward to a great week with ${childName}.</p>
    <p>Thank you,<br/>Blue Ridge Boost</p>
  `;

    if (DRY_RUN) {
        console.log(`[DRY RUN] -> ${parentEmail} | ${childName} | ${campName}${sessionLabel ? ` (${sessionLabel})` : ''} | ${weekLabel} (starts ${formatDate(startDate)})`);
        return Promise.resolve({ dryRun: true });
    }

    return client.messages.send({
        message: {
            from_email: 'office@blueridgeboost.com',
            from_name: 'Blue Ridge Boost',
            to: [{ email: parentEmail, type: 'to' }],
            subject: `${campName} — Registration confirmed for ${childName}`,
            html,
        },
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    const week = getNextWeek();
    if (!week) {
        console.log('No upcoming camp week found. Nothing to send.');
        return;
    }

    console.log(`Processing next week: ${week.label} (starts ${week.startDate})`);
    if (DRY_RUN) console.log('DRY RUN — no emails will be sent. Set DRY_RUN=false to send.\n');

    // Week after the one we're processing — used for bootcamp week 2 / half-day spans.
    const nextWeek = SUMMER_WEEKS[SUMMER_WEEKS.indexOf(week) + 1] || null;

    const registrations = [];

    const summer = await getSummerCamps();
    for (const c of summer) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        registrations.push(...await collectRegistrations(c, week));
    }

    const stem = await getAdvancedStemCamps();
    for (const c of stem) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        registrations.push(...await collectRegistrations(c, week));
    }

    // Bootcamps are sent when the bootcamp's Start Date falls in this week.
    const bootcamps = await getBootcamps();
    for (const c of bootcamps) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        registrations.push(...await collectBootcampRegistrations(c, week, nextWeek));
    }

    console.log(`Found ${registrations.length} registration(s) to confirm.\n`);

    let sent = 0, failed = 0;
    for (const reg of registrations) {
        try {
            await sendEmail(reg);
            sent++;
            if (SEND_DELAY_MS) await sleep(SEND_DELAY_MS);
        } catch (err) {
            failed++;
            console.error(`Failed: ${reg.parentEmail} (${reg.childName} / ${reg.campName}):`, err?.message || err);
        }
    }

    console.log(`\nDone. ${DRY_RUN ? 'Would send' : 'Sent'}: ${sent}, Failed: ${failed}`);
}

main().catch(console.error);