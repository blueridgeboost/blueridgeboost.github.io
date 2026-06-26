// Admin student summary rosters 
// Makes a roster for administrative use only, contains private info.

import {
    getSummerCamps,
    getAdvancedStemCamps,
    getBootcamps,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';
import { SUMMER_WEEKS, todayISO, getCurrentWeek } from './roster-helpers.mjs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SESSION_TIME = 'Session Time';
const BOOTCAMP_OPTION = 'Session';

const TRAILING_BLANK_ROWS = 3;  // blank rows appended after each camp's data
const CAMP_SEPARATOR_ROWS = 3;  // blank rows between camp sections

// Alternating camp colors — even index = green, odd index = blue
const CAMP_COLORS = [
    { row: 'FFE8F5E9', sectionHeader: 'FFC8E6C9' }, // green-50 / green-100
    { row: 'FFE3F2FD', sectionHeader: 'FFBBDEFB' }, // blue-50 / blue-100
];

const MIN_ROW_HEIGHT = 25;
const LINE_HEIGHT = 12; // points added per extra wrapped line (Arial 10)

// change widths here to edit ratio of cells
const COLUMNS = [
    { header: 'Parent Name',      key: 'parentName',  width: 22 },
    { header: 'Parent Email',     key: 'parentEmail', width: 30 },
    { header: 'Parent Phone',     key: 'parentPhone', width: 16 },
    { header: 'Student Name',     key: 'student',     width: 18 },
    { header: 'Session',          key: 'session',     width: 22 },
    { header: 'Additional Notes', key: 'notes',       width: 30 },
];

function getOptionValue(item, optionName) {
    return item.selectedOptions?.find(o => o?.name === optionName)?.value || '';
}

function getOrderExtraFieldValue(order, fieldTitle) {
    return order.orderExtraFields?.find(f => f?.title === fieldTitle)?.value || '';
}

const ADDITIONAL_NOTES_TITLE =
    '[Optional] Please let us know of anything you think we should be aware of to best teach your student.';

function getAdditionalNotes(order, item) {
    const notes = getOrderExtraFieldValue(order, ADDITIONAL_NOTES_TITLE);
    if (notes) return notes;
    return getOptionValue(item, ADDITIONAL_NOTES_TITLE) || '';
}

// Estimate how many wrapped lines a string needs in a column of the given width.
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
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];
    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            rows.push([
                order.billingPerson?.name || '',
                order.email || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name") || '',
                getOptionValue(item, SESSION_TIME),
                getAdditionalNotes(order, item),
            ]);
        }
    }

    // sort by session time 
    const SESSION_ORDER = { 'AM': 0, 'PM': 1, 'Full-Day': 2 };
    rows.sort((a, b) => {
        const timeA = a[4] ?? 100;
        const timeB = b[4] ?? 100;
        return SESSION_ORDER[timeA] - SESSION_ORDER[timeB];
    });
    
    return rows;
}

async function collectBootcampRows(camp) {
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];
    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            // After
            const selected = getOptionValue(item, BOOTCAMP_OPTION)
                || getOptionValue(item, 'Type')
                || getOptionValue(item, 'Time')
                || "";
            const isWeek1FullDay = selected.startsWith('Full-Day Week1');
            const isWeek2FullDay = selected.startsWith('Full-Day Week2');
            const isHalfDay = selected.includes('AM') || selected.includes('PM')
                || selected.toLowerCase().includes('half-day');
            if (isWeek2FullDay) continue;
            if (!isWeek1FullDay && !isHalfDay) continue;
            rows.push([
                order.billingPerson?.name || '',
                order.email || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name") || '',
                selected,
                getAdditionalNotes(order, item),
            ]);
        }
    }

    // sort by session time 
    const SESSION_ORDER = { 'Half-Day AM': 0, 'Half-Day PM': 1, 'Full-Day': 2 };
    rows.sort((a, b) => {
        const timeA = a[4] ?? 100;
        const timeB = b[4] ?? 100;
        return SESSION_ORDER[timeA] - SESSION_ORDER[timeB];
    });

    return rows;
}

const THIN = { style: 'thin', color: { argb: 'FFBDBDBD' } };
const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// Create the single roster sheet with a title and frozen column headers.
function createRosterSheet(workbook, week) {
    const sheet = workbook.addWorksheet('Admin Roster', {
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

    // Title
    const titleRow = sheet.addRow([`Admin Roster \u2014 ${week.label}`]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
    titleRow.getCell(1).font = { bold: true, size: 15, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    titleRow.height = 24;

    // Column headers
    const headerRow = sheet.addRow(COLUMNS.map(c => c.header));
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = CELL_BORDER;
    });

    // Freeze title + header, repeat on every printed page, add filter
    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
    sheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to:   { row: headerRow.number, column: lastCol },
    };
    sheet.pageSetup.printTitlesRow = `1:${headerRow.number}`;

    return sheet;
}

// Append one camp's section to the single sheet.
// campIndex drives the alternating color; isFirst suppresses the leading separator.
function appendCampSection(sheet, campName, rows, campIndex, isFirst) {
    const lastCol = COLUMNS.length;
    const color = CAMP_COLORS[campIndex % 2];
    const emptyRow = new Array(lastCol).fill('');

    // Blank separator rows between camps
    if (!isFirst) {
        for (let i = 0; i < CAMP_SEPARATOR_ROWS; i++) {
            sheet.addRow([...emptyRow]).height = MIN_ROW_HEIGHT;
        }
    }

    // Camp section header (name + camper count)
    const camperLabel = `${rows.length} camper${rows.length === 1 ? '' : 's'}`;
    const sectionRow = sheet.addRow([`${campName}  \u2022  ${camperLabel}`]);
    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, lastCol);
    sectionRow.height = 26;
    const sectionCell = sectionRow.getCell(1);
    sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.sectionHeader } };
    sectionCell.font = { bold: true, size: 14, name: 'Arial' };
    sectionCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sectionCell.border = CELL_BORDER;
    

    rows.forEach(row => {
        const r = sheet.addRow(row);

        let maxLines = 1;
        row.forEach((value, colIdx) => {
            const colWidth = COLUMNS[colIdx]?.width || 10;
            maxLines = Math.max(maxLines, estimateLines(value, colWidth));
        });
        r.height = MIN_ROW_HEIGHT + (maxLines - 1) * LINE_HEIGHT;

        r.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.row } };
            cell.font = { name: 'Arial', size: 10 };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = CELL_BORDER;
        });
    });
}

async function main() {
    const week = getCurrentWeek();
    if (!week) {
        console.log('No upcoming camp week found. Nothing to generate.');
        return;
    }

    console.log(`Generating admin roster for: ${week.label} (starts ${week.startDate})`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Blue Ridge Boost';
    workbook.created = new Date();

    const sheet = createRosterSheet(workbook, week);

    let campIndex = 0;
    let totalCampers = 0;

    const campGroups = [
        { fetch: getSummerCamps,      type: 'regular'   },
        { fetch: getAdvancedStemCamps, type: 'regular'  },
        { fetch: getBootcamps,        type: 'bootcamp'  },
    ];

    for (const { fetch, type } of campGroups) {
        const camps = await fetch();
        for (const c of camps) {
            if (!c.enabled) continue;
            if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;

            const rows = type === 'bootcamp'
                ? await collectBootcampRows(c)
                : await collectRows(c);
            


            appendCampSection(sheet, c.name, rows, campIndex, campIndex === 0);
            totalCampers += rows.length;
            campIndex++;
        }
    }

    if (campIndex === 0) {
        console.log('No enabled camps start this week. Nothing to generate.');
        return;
    }

    console.log(`Added ${campIndex} camp section(s), ${totalCampers} total campers.`);

    const dateStr = new Date().toISOString().slice(0, 10);
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Admin-Roster-${week.startDate}-${dateStr}.xlsx`,
    );

    await workbook.xlsx.writeFile(outputPath);
    console.log('Created Excel file:', outputPath);
}

main().catch(console.error);