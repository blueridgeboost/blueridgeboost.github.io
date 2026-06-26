// Makes a single roster workbook for the entire summer,
// with one sheet per week and all bootcamp sessions included.

import {
    getCatalog,
    SUMMER_CAMPS_CATEGORY_ID,
    ADVANCED_STEM_CAMPS_CATEGORY_ID,
    BOOTCAMPS_CATEGORY_ID,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';
import { SUMMER_WEEKS } from './roster-helpers.mjs'
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SESSION_TIME   = 'Session Time';
const BOOTCAMP_OPTION = 'Session';

const CAMP_SEPARATOR_ROWS = 3;

// Alternating camp colors — even index = green, odd index = blue
const CAMP_COLORS = [
    { row: 'FFE8F5E9', sectionHeader: 'FFC8E6C9' }, // green-50 / green-100
    { row: 'FFE3F2FD', sectionHeader: 'FFBBDEFB' }, // blue-50 / blue-100
];

const MIN_ROW_HEIGHT = 25;
const LINE_HEIGHT    = 12; // points added per extra wrapped line (Arial 10)

const COLUMNS = [
    { header: 'Parent Name',  key: 'parentName',  width: 22 },
    { header: 'Parent Email', key: 'parentEmail', width: 30 },
    { header: 'Parent Phone', key: 'parentPhone', width: 16 },
    { header: 'Student Name', key: 'student',     width: 18 },
    { header: 'Session',      key: 'session',     width: 22 },
];

const THIN        = { style: 'thin', color: { argb: 'FFBDBDBD' } };
const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// ── data helpers ──────────────────────────────────────────────────────────────

function getOptionValue(item, optionName) {
    return item.selectedOptions?.find(o => o?.name === optionName)?.value || '';
}

function estimateLines(text, colWidth) {
    const str = String(text ?? '');
    if (!str) return 1;
    const charsPerLine = Math.max(1, Math.floor(colWidth - 1));
    let lines = 0;
    for (const segment of str.split('\n')) {
        lines += Math.max(1, Math.ceil(segment.length / charsPerLine));
    }
    return lines;
}

async function collectRows(camp) {
    const SESSION_ORDER = { AM: 0, PM: 1, 'Full-Day': 2 };
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            rows.push([
                order.billingPerson?.name || '',
                order.email || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name"),
                getOptionValue(item, SESSION_TIME),
            ]);
        }
    }

    rows.sort((a, b) => (SESSION_ORDER[a[4]] ?? 99) - (SESSION_ORDER[b[4]] ?? 99));
    return rows;
}

// weekNumber: 1 or 2 — controls which Full-Day sessions are included.
// Half-day sessions run both weeks and are always included.
async function collectBootcampRows(camp, weekNumber) {
    const SESSION_ORDER = { 'Half-Day AM': 0, 'Half-Day PM': 1, 'Full-Day': 2 };
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            const selected =
                getOptionValue(item, BOOTCAMP_OPTION) ||
                getOptionValue(item, 'Type') ||
                getOptionValue(item, 'Time') ||
                '';

            const isWeek1FullDay = selected.startsWith('Full-Day Week1');
            const isWeek2FullDay = selected.startsWith('Full-Day Week2');
            const isHalfDay = selected.includes('AM') || selected.includes('PM')
                || selected.toLowerCase().includes('half-day');

            // Skip full-day entries that belong to the other week
            if (weekNumber === 1 && isWeek2FullDay) continue;
            if (weekNumber === 2 && isWeek1FullDay) continue;
            // Skip anything that isn't a recognised session type
            if (!isWeek1FullDay && !isWeek2FullDay && !isHalfDay) continue;

            rows.push([
                order.billingPerson?.name || '',
                order.email || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name"),
                selected,
            ]);
        }
    }

    rows.sort((a, b) => (SESSION_ORDER[a[4]] ?? 99) - (SESSION_ORDER[b[4]] ?? 99));
    return rows;
}

// ── sheet builders ────────────────────────────────────────────────────────────
function createWeekSheet(workbook, week) {
    const sheet = workbook.addWorksheet(week.label, {
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            horizontalCentered: true,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        },
    });

    sheet.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }));
    const lastCol = COLUMNS.length;

    // Title row
    const titleRow = sheet.addRow([`Admin Roster \u2014 ${week.label}`]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
    titleRow.getCell(1).font = { bold: true, size: 15, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    titleRow.height = 24;

    // Column header row
    const headerRow = sheet.addRow(COLUMNS.map(c => c.header));
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = CELL_BORDER;
    });

    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
    sheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to:   { row: headerRow.number, column: lastCol },
    };
    sheet.pageSetup.printTitlesRow = `1:${headerRow.number}`;

    return sheet;
}

function appendCampSection(sheet, campName, rows, campIndex, isFirst) {
    const lastCol = COLUMNS.length;
    const color   = CAMP_COLORS[campIndex % 2];
    const emptyRow = new Array(lastCol).fill('');

    if (!isFirst) {
        for (let i = 0; i < CAMP_SEPARATOR_ROWS; i++) {
            sheet.addRow([...emptyRow]).height = MIN_ROW_HEIGHT;
        }
    }

    // Section header
    const camperLabel = `${rows.length} camper${rows.length === 1 ? '' : 's'}`;
    const sectionRow  = sheet.addRow([`${campName}  \u2022  ${camperLabel}`]);
    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, lastCol);
    sectionRow.height = 26;
    const sectionCell = sectionRow.getCell(1);
    sectionCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.sectionHeader } };
    sectionCell.font      = { bold: true, size: 14, name: 'Arial' };
    sectionCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sectionCell.border    = CELL_BORDER;

    for (const row of rows) {
        const r = sheet.addRow(row);

        let maxLines = 1;
        row.forEach((value, colIdx) => {
            maxLines = Math.max(maxLines, estimateLines(value, COLUMNS[colIdx]?.width || 10));
        });
        r.height = MIN_ROW_HEIGHT + (maxLines - 1) * LINE_HEIGHT;

        r.eachCell({ includeEmpty: true }, cell => {
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.row } };
            cell.font      = { name: 'Arial', size: 10 };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border    = CELL_BORDER;
        });
    }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
    const workbook     = new ExcelJS.Workbook();
    workbook.creator   = 'Blue Ridge Boost';
    workbook.created   = new Date();

    const campGroups = [
        { fetch: () => getCatalog([SUMMER_CAMPS_CATEGORY_ID], false), type: 'regular'  },
        { fetch: () => getCatalog([ADVANCED_STEM_CAMPS_CATEGORY_ID], false), type: 'regular'  },
        { fetch: () => getCatalog([BOOTCAMPS_CATEGORY_ID], false), type: 'bootcamp' },
    ];

    let grandTotalCampers = 0;

    // Tracks how many weekly sheets each bootcamp product has appeared on.
    // First appearance = week 1 (show Full-Day Week1 + half-days),
    // second appearance = week 2 (show Full-Day Week2 + half-days), and so on.
    const bootcampSeenCount = new Map();

    for (const week of SUMMER_WEEKS) {
        const sheet = createWeekSheet(workbook, week);
        let campIndex   = 0;
        let weekCampers = 0;

        for (const { fetch, type } of campGroups) {
            const camps = await fetch();
            for (const camp of camps) {
                if (getAttributeValue(camp, 'Start Date') !== week.startDate) continue;

                let rows;
                if (type === 'bootcamp') {
                    const seenCount = (bootcampSeenCount.get(camp.id) ?? 0) + 1;
                    bootcampSeenCount.set(camp.id, seenCount);
                    rows = await collectBootcampRows(camp, seenCount);
                } else {
                    rows = await collectRows(camp);
                }

                appendCampSection(sheet, camp.name, rows, campIndex, campIndex === 0);
                weekCampers += rows.length;
                campIndex++;
            }
        }

        if (campIndex === 0) {
            sheet.addRow([`No camps scheduled for ${week.label}`]);
            console.log(`  ${week.label}: no camps found`);
        } else {
            console.log(`  ${week.label}: ${campIndex} camp(s), ${weekCampers} camper(s)`);
        }

        grandTotalCampers += weekCampers;
    }

    console.log(`\nTotal across all weeks: ${grandTotalCampers} camper(s)`);

    const dateStr    = new Date().toISOString().slice(0, 10);
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Admin-Roster-Summer-2026-${dateStr}.xlsx`,
    );

    await workbook.xlsx.writeFile(outputPath);
    console.log('Created Excel file:', outputPath);
}

main().catch(console.error);