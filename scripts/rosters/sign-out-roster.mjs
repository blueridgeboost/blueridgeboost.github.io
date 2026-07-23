// Summer Attendance Sheet 
//    Makes an excel roster for the current week of campers. 
import {
    getSummerCamps,
    getAdvancedStemCamps,
    getBootcamps,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';
import { SUMMER_WEEKS, todayISO, getCurrentWeek, getNextWeek} from './roster-helpers.mjs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SESSION_TIME = 'Session Time';
const BOOTCAMP_OPTION = 'Session';
const EXPLORATION_TIME_OPTION = 'Gaming Option (Exploration Time)';

// Number of empty rows left at the bottom of every sheet.
const TRAILING_BLANK_ROWS = 3;

const COLUMNS = [
    { header: 'Parent Name',                        key: 'parentName',  width: 18 },
    { header: 'Parent Phone',                       key: 'parentPhone', width: 16 },
    { header: 'Student Name',                       key: 'student',     width: 18 },
    { header: 'Session',                            key: 'session',     width: 10 },
    { header: 'Exploration Time (Gaming Option)',   key: 'exploration', width: 18 },
    { header: 'Sign In',                            key: 'signIn',      width: 18 },
    { header: 'Sign Out',                           key: 'signOut',     width: 18 },
];

function getOptionValue(item, optionName) {
    return item.selectedOptions?.find(o => o?.name === optionName)?.value || '';
}

// Some camps carry a camp-level "Gaming" attribute, but the per-registration
// text field (the selected exploration option) should win over
function getExplorationValue(camp, item) {
    const textField = getOptionValue(item, EXPLORATION_TIME_OPTION);
    if (textField) return textField;                 // text field takes precedence
    return getAttributeValue(camp, 'Gaming') || '';  // fall back to the camp attribute
}


// Collect roster rows for a regular camp (summer / advanced STEM).
async function collectRows(camp) {
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;

            rows.push([
                order.billingPerson?.name || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name") || '',
                getOptionValue(item, SESSION_TIME),
                getExplorationValue(camp, item),
                '', // Sign In  — left blank 
                '', // Sign Out — left blank 
            ]);
        }
    }

    // sort by session time 
    const SESSION_ORDER = { 'AM': 0, 'PM': 1, 'Full-Day': 2 };
    rows.sort((a, b) => {
        const timeA = a[3] ?? 100;
        const timeB = b[3] ?? 100;
        return SESSION_ORDER[timeA] - SESSION_ORDER[timeB];
    });
    
    return rows;
}

// Collect roster rows for a bootcamp (week 1 / half-day entries for this week).
async function collectBootcampRows(camp) {
    const orders = await getOrdersByProductId(camp.id);
    const rows = [];

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;

            const selected = getOptionValue(item, BOOTCAMP_OPTION)
                || getOptionValue(item, 'Type')
                || getOptionValue(item, 'Time')
                || "";

            const isWeek1FullDay = selected.startsWith('Full-Day Week1');
            const isWeek2FullDay = selected.startsWith('Full-Day Week2');
            const isHalfDay = selected.includes('AM') || selected.includes('PM')
                || selected.toLowerCase().includes('half-day');

            if (isWeek2FullDay) continue;              // shown in the next week's sheet
            if (!isWeek1FullDay && !isHalfDay) continue; // unrecognised option — skip

            rows.push([
                order.billingPerson?.name || '',
                order.billingPerson?.phone || '',
                getOptionValue(item, "Camper's Name") || '',
                selected,
                getExplorationValue(camp, item),
                '', // Sign In
                '', // Sign Out
            ]);
        }
    }

     // sort by session time 
    const SESSION_ORDER = { 'Half-Day AM': 0, 'Half-Day PM': 1, 'Full-Day': 2 };
    rows.sort((a, b) => {
        const timeA = a[3] ?? 100;
        const timeB = b[3] ?? 100;
        return SESSION_ORDER[timeA] - SESSION_ORDER[timeB];
    });

    return rows;
}

// Excel tab names: max 31 chars, no \ / ? * [ ] : , and must be unique.
function safeSheetName(name, used) {
    const base = (String(name || 'Camp')
        .replace(/[\\/?*[\]:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 31)) || 'Camp';

    let candidate = base;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
        const suffix = ` (${n})`;
        candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        n++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
}

const THIN = { style: 'thin', color: { argb: 'FFBDBDBD' } };
const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// Build one worksheet for a single camp.
function addCampSheet(workbook, campName, rows, week, usedNames) {
    const sheet = workbook.addWorksheet(safeSheetName(campName, usedNames), {
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,   // squeeze all columns onto one page wide
            fitToHeight: 0,  // allow as many pages tall as the roster needs
            horizontalCentered: true,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        },
    });

    sheet.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }));
    const lastCol = COLUMNS.length;

    // Title (camp name)
    const titleRow = sheet.addRow([campName]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
    titleRow.getCell(1).font = { bold: true, size: 15, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    titleRow.height = 24;

    // Subtitle (week + camper count)
    const camperLabel = `${rows.length} camper${rows.length === 1 ? '' : 's'}`;
    const subtitleRow = sheet.addRow([`${week.label}  \u2022  ${camperLabel}`]);
    sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, lastCol);
    subtitleRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF757575' }, name: 'Arial' };
    subtitleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    subtitleRow.height = 16;

    // Column headers
    const headerRow = sheet.addRow(COLUMNS.map(c => c.header));
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = CELL_BORDER;
    });

    for (let i = 0; i < 3; i++) {
        rows.push(['', '', '', '', '', '', '']); // add blank rows at the end
    }

    const MIN_ROW_HEIGHT = 30;
    // const LINE_HEIGHT = 12; 
    // uncomment the above and calculation below to allow variable row height sizing

    rows.forEach((row, i) => {
        const r = sheet.addRow(row);

        // Size the row to its tallest wrapping cell.
        let maxLines = 1;
        row.forEach((value, colIdx) => {
            const colWidth = COLUMNS[colIdx]?.width || 10;
            maxLines = Math.max(maxLines, estimateLines(value, colWidth));
        });
        // r.height = MIN_ROW_HEIGHT + (maxLines - 1) * LINE_HEIGHT; // add variable height for wrapped lines 
        
        r.height = MIN_ROW_HEIGHT; // fixed row height
        const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF5F8FC';
        r.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.font = { name: 'Arial', size: 10 };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = CELL_BORDER;
        });
    });


    // Freeze the title + header, repeat them on every printed page, add filter
    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
    sheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to:   { row: headerRow.number, column: lastCol },
    };
    sheet.pageSetup.printTitlesRow = `1:${headerRow.number}`;

    return sheet;
}

// Estimate how many wrapped lines a string needs in a column of the given width.
function estimateLines(text, colWidth) {
    const str = String(text ?? '');
    if (!str) return 1;
    const charsPerLine = Math.max(1, Math.floor(colWidth - 1)); // a little slack
    let lines = 0;
    for (const segment of str.split('\n')) {        // respect explicit newlines
        lines += Math.max(1, Math.ceil(segment.length / charsPerLine));
    }
    return lines;
}

async function main() {
    // switch between this and next week 
    const week = getNextWeek();
    // const week = getCurrentWeek();
    if (!week) {
        console.log('No upcoming camp week found. Nothing to generate.');
        return;
    }

    console.log(`Generating roster for: ${week.label} (starts ${week.startDate})`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Blue Ridge Boost';
    workbook.created = new Date();

    const usedNames = new Set();
    let sheetCount = 0;
    let totalCampers = 0;

    const summer = await getSummerCamps();
    for (const c of summer) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        const rows = await collectRows(c);
        addCampSheet(workbook, c.name, rows, week, usedNames);
        sheetCount++;
        totalCampers += rows.length;
    }

    const stem = await getAdvancedStemCamps();
    for (const c of stem) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        const rows = await collectRows(c);
        addCampSheet(workbook, c.name, rows, week, usedNames);
        sheetCount++;
        totalCampers += rows.length;
    }

    const bootcamps = await getBootcamps();
    for (const c of bootcamps) {
        if (!c.enabled) continue;
        if (getAttributeValue(c, 'Start Date') !== week.startDate) continue;
        const rows = await collectBootcampRows(c);
        addCampSheet(workbook, c.name, rows, week, usedNames);
        sheetCount++;
        totalCampers += rows.length;
    }

    if (sheetCount === 0) {
        console.log('No enabled camps start this week. Nothing to generate.');
        return;
    }

    console.log(`Created ${sheetCount} camp sheet(s).`);

    const dateStr = new Date().toISOString().slice(0, 10);
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Weekly-Roster-${week.startDate}-${dateStr}.xlsx`,
    );

    await workbook.xlsx.writeFile(outputPath);
    console.log('Created Excel file:', outputPath);
}

main().catch(console.error);