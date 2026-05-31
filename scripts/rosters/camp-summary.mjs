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

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

// hard-coded weeks
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

const SESSION_TIME = 'Session Time';
const FULL_DAY = 'Full-Day';
const AM_SESSION = 'AM';
const PM_SESSION = 'PM';
const BOOTCAMP_OPTION = 'Session';

// columns for summary report
const HEADER = [
    'Camp Name', 'Type', 'Ages',
    'AM Seats', 'PM Seats', 'Full-Day Seats',
    'AM available', 'PM available', 'Required staff',
];

// bootcamps have max
function getMax(camp) {
    const v = getAttributeValue(camp, 'Max');
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
}

function getAges(camp) {
    const subtitle = getAttributeValue(camp, 'Subtitle') || camp.subtitle || '';
    const tokens = subtitle.split('|');
    if (tokens.length >= 2) return tokens[1].trim();
    return subtitle;
}

// 1 staff per 10 campers 
function staff(am, pm, full) {
    return Math.ceil((Math.max(am, pm) + full) / 10);
}

function findWeekIndex(startDate) {
    return SUMMER_WEEKS.findIndex(w => w.startDate === startDate);
}

// returns { am, pm, full } counts for a camp
async function countSessions(camp) {
    const orders = await getOrdersByProductId(camp.id);
    let am = 0, pm = 0, full = 0;

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;

            const selected = item.selectedOptions?.find(o => o?.name === SESSION_TIME)?.value;
            const quant = item.quantity || 1;
            if (selected === FULL_DAY) full += quant;
            else if (selected === AM_SESSION) am += quant;
            else if (selected === PM_SESSION) pm += quant;
        }
    }
    return { am, pm, full };
}

// Bootcamps have either 2 weeks of half days or one week of fulldays 
async function countBootcampSessions(camp) {
    const orders = await getOrdersByProductId(camp.id);
    let amHalf = 0, pmHalf = 0, fullW1 = 0, fullW2 = 0;

    for (const order of orders) {
        for (const item of order.items || []) {
            if (item.productId !== camp.id) continue;
            const selected = item.selectedOptions?.find(o => o?.name === BOOTCAMP_OPTION)?.value || '';
            const quant = item.quantity || 1;
            if (selected.startsWith('Full-Day Week1')) fullW1 += quant;
            else if (selected.startsWith('Full-Day Week2')) fullW2 += quant;
            else if (selected.startsWith('AM ')) amHalf += quant;
            else if (selected.startsWith('PM ')) pmHalf += quant;
        }
    }
    return { amHalf, pmHalf, fullW1, fullW2 };
}

async function sessionRow(camp, type) {
    const max = getMax(camp);
    const { am, pm, full } = await countSessions(camp);
    return [
        camp.name, type, getAges(camp),
        am, pm, full,
        max - (full + am), max - (full + pm),
        staff(am, pm, full),
    ];
}

function styleWeekHeader(sheet, row, weekColor) {
    sheet.mergeCells(row.number, 1, row.number, 9);
    const cell = row.getCell(1);
    let fillColor = weekColor === 'green' ? 'FF81C784' : 'FF64B5F6'; // LightGreen or LightBlue
    cell.font = { bold: true, size: 14 };
    cell.fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor }, 
    };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
}

function styleColumnHeader(row, weekColor) {
    row.font = { bold: true };
    let fillColor = weekColor === 'green' ? 'FF81C784' : 'FF64B5F6'; // LightGreen or LightBlue
    row.eachCell(cell => {
        cell.fill = {
            type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor },
        };
        cell.border = { bottom: { style: 'thick', color: { argb: 'FF000000' } } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
}

function styleRow(row, weekColor) {
    // if between 2-5 students enrolled, color the row orange
    // if less 0 or 1, color red
    const am = row.getCell(4).value || 0;
    const pm = row.getCell(5).value || 0;
    const full = row.getCell(6).value || 0;

    // most amount of students at any time
    const num_students = full + Math.max(am, pm);

    let color = weekColor === 'green' ? 'FFC8E6C9' : 'FFBBDEFB'; // LightGreen or LightBlue

    if (num_students <= 1) color = 'FFE57373'; // Coral Red
    else if (num_students <= 5) color = 'FFFFB74D'; // Amber Orange

    if (color) { 
        row.eachCell( { includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                 fgColor: { argb: color },
            }
        })
    }
}

async function main() {
    const buckets = SUMMER_WEEKS.map(() => []);

    // === loop through camps by type, sorting into weekly buckets based on start date ===
    
    const summer = await getSummerCamps();
    for (const c of summer) {
        if (!c.enabled) continue;

        const idx = findWeekIndex(getAttributeValue(c, 'Start Date'));
        if (idx < 0) {
            console.warn(`Skipping summer camp ${c.name} (Start Date=${getAttributeValue(c, 'Start Date')})`);
            continue;
        }

        buckets[idx].push(await sessionRow(c, 'Summer Camp'));
    }

    const stem = await getAdvancedStemCamps();
    for (const c of stem) {
        if (!c.enabled) continue;

        const idx = findWeekIndex(getAttributeValue(c, 'Start Date'));
        if (idx < 0) {
            console.warn(`Skipping advanced stem camp ${c.name} (Start Date=${getAttributeValue(c, 'Start Date')})`);
            continue;
        }

        buckets[idx].push(await sessionRow(c, 'Advanced STEM'));
    }

    // bootcamp two-row split (week 1 + week 2)
    const bootcamps = await getBootcamps();
    for (const c of bootcamps) {
        if (!c.enabled) continue;

        const startDate = getAttributeValue(c, 'Start Date');
        const idx = findWeekIndex(startDate);
        if (idx < 0 || idx + 1 >= SUMMER_WEEKS.length) {
            console.warn(`Skipping bootcamp ${c.name} (Start Date=${startDate})`);
            continue;
        }

        const max = getMax(c);
        const { amHalf, pmHalf, fullW1, fullW2 } = await countBootcampSessions(c);
        const ages = getAges(c);

        // week 1
        buckets[idx].push([
            c.name, 'Bootcamp', ages,
            amHalf, pmHalf, fullW1,
            max - (fullW1 + amHalf), max - (fullW1 + pmHalf),
            staff(amHalf, pmHalf, fullW1),
        ]);

        // week 2 
        buckets[idx + 1].push([
            c.name, 'Bootcamp', ages,
            amHalf, pmHalf, fullW2,
            max - (fullW2 + amHalf), max - (fullW2 + pmHalf),
            staff(amHalf, pmHalf, fullW2),
        ]);
    }

    // write workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
        { width: 32 }, { width: 14 }, { width: 16 },
        { width: 10 }, { width: 10 }, { width: 14 },
        { width: 14 }, { width: 14 }, { width: 14 },
    ];

    const titleRow = sheet.addRow(['Camp Summary']);
    titleRow.font = { bold: true, size: 22 };
    sheet.mergeCells(titleRow.number, 1, titleRow.number, 9);
    sheet.addRow([]);

    // add each row from buckets 
    for (let i = 0; i < SUMMER_WEEKS.length; i++) {
        if (buckets[i].length === 0) continue;

        // colors alternate green and blue for each week
        const headerRow = sheet.addRow([SUMMER_WEEKS[i].label]);
        styleWeekHeader(sheet, headerRow, i % 2 === 0 ? 'green' : 'blue');

        const columnHeaderRow = sheet.addRow(HEADER);
        styleColumnHeader(columnHeaderRow, i % 2 === 0 ? 'green' : 'blue');

        for (const row of buckets[i]) {
            styleRow(sheet.addRow(row), i % 2 === 0 ? 'green' : 'blue'); // styleRow handles orange/red color logic based on enrollment
        }
        sheet.addRow([]);
        sheet.addRow([]);
    }
    const outputPath = path.join(os.homedir(), 'OneDrive - Blue Ridge Boost', 'Rosters - Documents', 'Summer-Camp-Quick-Summary_test.xlsx');
    await workbook.xlsx.writeFile(outputPath);

    console.log('Created Excel file:', outputPath);
}

main().catch(console.error);
