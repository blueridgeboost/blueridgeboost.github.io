// ---------------------------------------------------------------------------
// Builds next weeks roster summary and emails it to RECIPIENTS 
//
// SAFETY: defaults to a dry run — the file is generated but no email is sent.
// Run for real with:  DRY_RUN=false node send-next-week-summary.js
// ---------------------------------------------------------------------------

import {
    getSummerCamps,
    getAdvancedStemCamps,
    getBootcamps,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import fs from 'fs';
import mailchimp from '@mailchimp/mailchimp_transactional';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

// ── Recipients ───────────────────────────────────────────────────────────────
const RECIPIENTS = [
    'nathaneal@blueridgeboost.com',
    'nora@blueridgeboost.com',
    'seth@blueridgeboost.com',
];

// ── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN !== 'false';
const client = new mailchimp(process.env.MAILCHIMP_KEY);

// ── Constants ────────────────────────────────────────────────────────────────
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
const SESSION_TIME    = 'Session Time';
const FULL_DAY        = 'Full-Day';
const AM_SESSION      = 'AM';
const PM_SESSION      = 'PM';
const BOOTCAMP_OPTION = 'Session';
const HEADER = [
    'Camp Name', 'Type', 'Ages',
    'AM Seats', 'PM Seats', 'Full-Day Seats',
    'AM available', 'PM available', 'Full-Day available',
    'Required staff',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextWeek(referenceDate = todayISO()) {
    return SUMMER_WEEKS.find(w => w.startDate > referenceDate) || null;
}

function getNextWeekIndex(week) {
    return SUMMER_WEEKS.indexOf(week);
}

function formatDate(isoDate) {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function getMax(camp) {
    const v = getAttributeValue(camp, 'Max');
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
}

function getAges(camp) {
    const subtitle = getAttributeValue(camp, 'Subtitle') || camp.subtitle || '';
    const tokens = subtitle.split('|');
    return tokens.length >= 2 ? tokens[1].trim() : subtitle;
}

function staff(am, pm, full) {
    return Math.ceil((Math.max(am, pm) + full) / 10);
}

function getOptionValue(item, optionName) {
    return item.selectedOptions?.find(o => o?.name === optionName)?.value || '';
}

// ── Session counting ─────────────────────────────────────────────────────────
async function countSessions(camp) {
    const orders = await getOrdersByProductId(camp.id);
    let am = 0, pm = 0, full = 0;

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            const selected = item.selectedOptions?.find(o => o?.name === SESSION_TIME)?.value;
            const quant = item.quantity || 1;
            if (selected === FULL_DAY)        full += quant;
            else if (selected === AM_SESSION) am   += quant;
            else if (selected === PM_SESSION) pm   += quant;
        }
    }
    return { am, pm, full };
}

async function countBootcampSessions(camp) {
    const orders = await getOrdersByProductId(camp.id);
    let amHalf = 0, pmHalf = 0, fullW1 = 0, fullW2 = 0;

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            const selected =
                getOptionValue(item, BOOTCAMP_OPTION) ||
                getOptionValue(item, 'Type') ||
                getOptionValue(item, 'Time') || '';
            const quant = item.quantity || 1;
            if      (selected.startsWith('Full-Day Week1'))       fullW1 += quant;
            else if (selected.startsWith('Full-Day Week2'))       fullW2 += quant;
            else if (selected.includes('AM'))                     amHalf += quant;
            else if (selected.includes('PM'))                     pmHalf += quant;
            else if (selected.toLowerCase().includes('half-day')) amHalf += quant; // auto-assign to AM
        }
    }
    return { amHalf, pmHalf, fullW1, fullW2 };
}

// ── Row builders ─────────────────────────────────────────────────────────────
async function sessionRow(camp, type) {
    const max = getMax(camp);
    const { am, pm, full } = await countSessions(camp);
    return [
        camp.name, type, getAges(camp),
        am, pm, full,
        max - (full + am), max - (full + pm), max - full - Math.max(am, pm),
        staff(am, pm, full),
    ];
}

// ── Excel styling ─────────────────────────────────────────────────────────────
const COLORS = {
    green: { header: 'FF81C784', col: 'FF81C784', row: 'FFC8E6C9' },
    blue:  { header: 'FF64B5F6', col: 'FF64B5F6', row: 'FFBBDEFB' },
};

function styleWeekHeader(sheet, row, color) {
    sheet.mergeCells(row.number, 1, row.number, 10);
    const cell = row.getCell(1);
    cell.font = { bold: true, size: 14 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[color].header } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
}

function styleColumnHeader(row, color) {
    row.font = { bold: true };
    row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[color].col } };
        cell.border = { bottom: { style: 'thick', color: { argb: 'FF000000' } } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
}

function styleRow(row, color) {
    const am   = row.getCell(4).value || 0;
    const pm   = row.getCell(5).value || 0;
    const full = row.getCell(6).value || 0;
    const num_students = full + Math.max(am, pm);

    let fillColor = COLORS[color].row;
    if (num_students <= 1) fillColor = 'FFE57373';       // Coral Red
    else if (num_students <= 5) fillColor = 'FFFFB74D';  // Amber Orange

    row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    });
}

// ── Excel builder ─────────────────────────────────────────────────────────────
async function buildWorkbook(week, rows, color) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
        { width: 32 }, { width: 14 }, { width: 16 },
        { width: 10 }, { width: 10 }, { width: 14 },
        { width: 14 }, { width: 14 }, { width: 14 },
        { width: 14 },
    ];

    // Title
    const titleRow = sheet.addRow([`Camp Summary — ${week.label}`]);
    titleRow.font = { bold: true, size: 22 };
    sheet.mergeCells(titleRow.number, 1, titleRow.number, 10);
    sheet.addRow([]);

    // Week block
    const headerRow = sheet.addRow([week.label]);
    styleWeekHeader(sheet, headerRow, color);

    const columnHeaderRow = sheet.addRow(HEADER);
    styleColumnHeader(columnHeaderRow, color);

    for (const row of rows) {
        styleRow(sheet.addRow(row), color);
    }

    return workbook;
}

// ── Email sender ──────────────────────────────────────────────────────────────
async function sendSummaryEmail(week, filePath) {
    const attachment = fs.readFileSync(filePath);
    const base64Data = attachment.toString('base64');
    const filename   = path.basename(filePath);

    const html = `
      <p>Hello,</p>
      <p>Attached is a summary of the current state of camp enrollment for <strong>${week.label}</strong> (starts ${formatDate(week.startDate)}).</p>
      <p>Color key:</p>
      <ul>
        <li>🟢 / 🔵 Default — camp is running normally</li>
        <li>🟠 Orange — 2–5 students enrolled</li>
        <li>🔴 Red — 0–1 students enrolled</li>
      </ul>
      <p>Thank you,<br/>Blue Ridge Boost Automated Reports</p>
    `;

    if (DRY_RUN) {
        console.log(`\n[DRY RUN] Would send email for ${week.label} to:`);
        RECIPIENTS.forEach(r => console.log(`  -> ${r}`));
        console.log(`  Attachment: ${filename}`);
        return;
    }

    await client.messages.send({
        message: {
            from_email: 'nathaneal@blueridgeboost.com',
            from_name:  'Blue Ridge Boost',
            to: RECIPIENTS.map(email => ({ email, type: 'to' })),
            subject: `Camp Summary — ${week.label}`,
            html,
            attachments: [
                {
                    type:    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    name:    filename,
                    content: base64Data,
                },
            ],
        },
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const week = getNextWeek();
    if (!week) {
        console.log('No upcoming camp week found. Nothing to send.');
        return;
    }

    const weekIndex  = getNextWeekIndex(week);
    const nextWeek   = SUMMER_WEEKS[weekIndex + 1] || null; // needed for bootcamp week 2 rows
    const prevWeek   = SUMMER_WEEKS[weekIndex - 1] || null; // needed for bootcamp week 2 lookback
    const color      = weekIndex % 2 === 0 ? 'green' : 'blue';

    console.log(`Building summary for: ${week.label} (starts ${week.startDate})`);
    if (DRY_RUN) console.log('DRY RUN — no email will be sent. Set DRY_RUN=false to send.\n');

    const rows = [];

    // Summer camps
    const summer = await getSummerCamps();
    for (const c of summer) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        rows.push(await sessionRow(c, 'Summer Camp'));
    }

    // Advanced STEM camps
    const stem = await getAdvancedStemCamps();
    for (const c of stem) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        rows.push(await sessionRow(c, 'Advanced STEM'));
    }

    // Bootcamps span two consecutive weeks:
    //   - Half-day (AM/PM) enrollees attend both weeks 
    //   - Full-day enrollees attend one week only (Week1 or Week2 are separate SKUs).
    const bootcamps = await getBootcamps();
    for (const c of bootcamps) {
        if (!c.enabled) continue;

        const campStart = getAttributeValue(c, 'Start Date');
        const isWeek1 = campStart === week.startDate;
        const isWeek2 = prevWeek && campStart === prevWeek.startDate;
        if (!isWeek1 && !isWeek2) continue;

        const max = getMax(c);
        const { amHalf, pmHalf, fullW1, fullW2 } = await countBootcampSessions(c);
        const ages = getAges(c);
        const w1 = isWeek1 ? week : prevWeek;
        const w2 = isWeek1 ? nextWeek : week;

        if (isWeek1) {
            // Next week is week 1 — show both rows.
            rows.push([
                `${c.name} (Week 1 — ${w1.label})`, 'Bootcamp', ages,
                amHalf, pmHalf, fullW1,
                max - (fullW1 + amHalf), max - (fullW1 + pmHalf), max - fullW1 - Math.max(amHalf, pmHalf),
                staff(amHalf, pmHalf, fullW1),
            ]);
            if (w2) {
                rows.push([
                    `${c.name} (Week 2 — ${w2.label})`, 'Bootcamp', ages,
                    amHalf, pmHalf, fullW2,
                    max - (fullW2 + amHalf), max - (fullW2 + pmHalf), max - fullW2 - Math.max(amHalf, pmHalf),
                    staff(amHalf, pmHalf, fullW2),
                ]);
            }
        } else {
            // Next week is week 2 
            // Half-day students enrolled in week 1 are still present this week.
            rows.push([
                `${c.name} (Week 2 — ${w2.label})`, 'Bootcamp', ages,
                amHalf, pmHalf, fullW2,
                max - (fullW2 + amHalf), max - (fullW2 + pmHalf), max - fullW2 - Math.max(amHalf, pmHalf),
                staff(amHalf, pmHalf, fullW2),
            ]);
        }
    }

    if (rows.length === 0) {
        console.log('No camps found for this week. Nothing to send.');
        return;
    }

    console.log(`Found ${rows.length} camp row(s).\n`);

    // Build Excel file
    const workbook   = await buildWorkbook(week, rows, color);
    const dateStr    = new Date().toISOString().slice(0, 10);
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Next-Week-Summary-${week.startDate}-generated-${dateStr}.xlsx`,
    );
    await workbook.xlsx.writeFile(outputPath);
    console.log('Created Excel file:', outputPath);

    // Send email
    await sendSummaryEmail(week, outputPath);

    if (!DRY_RUN) {
        console.log(`\nSent summary to ${RECIPIENTS.length} recipient(s).`);
    }
}

main().catch(console.error);