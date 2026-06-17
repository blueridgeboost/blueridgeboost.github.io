// creates a csv of Parent Name | Parent Discount 
// parents are all people who ordered summer camps 
import {
    SUMMER_CAMPS_CATEGORY_ID,
    ADVANCED_STEM_CAMPS_CATEGORY_ID,
    BOOTCAMPS_CATEGORY_ID,
    getOrdersByProductId,
    getAttributeValue,
    getCatalog,
    listDiscountIds,
    createDiscount,
} from '../../ecwid.js';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { createWriteStream } from 'fs';
import { randomBytes } from 'crypto';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath })

// hard-coded weeks, in this script serves as a double check 
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

const VALID_START_DATES = new Set(SUMMER_WEEKS.map(w => w.startDate));

// first, last, discount code, street, city, state, zip 
const COLUMNS = [
    'First Name',
    'Last Name',
    'Discount Code',
    'Street',
    'City',
    'State',
    'ZIP code'
];

// for handling names and splitting into first | last 
function parseName(fullName = '') {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

// wrap in quotes if has newline, comma, or quote
function csvField(value) {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
         return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function csvRow(fields) {
    return fields.map(csvField).join(',');
}

// Generates a random uppercase alphanumeric code.
function generateRandomCode(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

async function collectUniqueCustomers(camps, dedupeMap) {
    for (const camp of camps) {
        const startDate = getAttributeValue(camp, 'Start Date');
        if (!VALID_START_DATES.has(startDate)) continue;

        const orders = await getOrdersByProductId(camp.id);
        for (const order of orders) {
            const billing = order.billingPerson ?? null;
            const name = billing.name ?? '';
            const { first, last } = parseName(billing.name);
            
            if (dedupeMap.has(name)) continue;
            // collect data, discount is null for now
            dedupeMap.set(name, {
                firstName:      first, 
                lastName:       last, 
                discountCode:   null,
                street:         billing.street ?? '',
                city:           billing.city ?? '',
                state:          billing.stateOrProvinceCode ?? '',
                zipCode:        billing.postalCode ?? "",
            });
        }
    }
}

async function main() {
    const dedupeMap = new Map();

    console.log('Fetching summer camps…');
    const summer = await getCatalog([SUMMER_CAMPS_CATEGORY_ID], false);
    await collectUniqueCustomers(summer, dedupeMap);

    console.log('Fetching advanced STEM camps…');
    const stem = await getCatalog([ADVANCED_STEM_CAMPS_CATEGORY_ID], false);
    await collectUniqueCustomers(stem, dedupeMap);

    console.log('Fetching bootcamps…');
    const bootcamps = await getCatalog([BOOTCAMPS_CATEGORY_ID], false);
    await collectUniqueCustomers(bootcamps, dedupeMap);

    console.log('Fetching Discounts')
    let discounts = await listDiscountIds();

    for (const discount of discounts.items) {
        // Full Name-Referral-Discount
        const parts = discount.name.split('-');
        parts.pop(); // remove -Discount
        const referral = parts.pop(); // remove -Referral 
        const name = parts.join('-'); // get the name in case of dash within name 

        // map name to code if this is an active referral discount 
        if (referral === 'Referral' && discount.status === 'ACTIVE') {
            const customer = dedupeMap.get(name);
            if (customer) { customer.discountCode = discount.code; }
        }
    }
   
    // ── Create new discount codes ──────────────────────────────────────────────
    let countOfNew = 0;
    for (const name of dedupeMap.keys()) {
        const customer = dedupeMap.get(name);

        if (!customer.discountCode) {
            let newDiscount = generateRandomCode(10);
            await createDiscount(`${name}-Referral-Discount`, newDiscount, 10);
            countOfNew ++;
            customer.discountCode = newDiscount;
        }
    }

    // ── Write CSV ──────────────────────────────────────────────────────────────
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Discount-Codes-${new Date().toISOString().slice(0, 10)}.csv`
    );

    const stream = createWriteStream(outputPath, { encoding: 'utf-8'});

    // Header
    stream.write(csvRow(COLUMNS) + '\n');
    // rows of the csv
    for (const [, customer] of dedupeMap) {
        const row = [
            customer.firstName,
            customer.lastName,
            customer.discountCode,
            customer.street,
            customer.city,
            customer.state,
            customer.zipCode,
        ];
        stream.write(csvRow(row) + '\n');
    }

    await new Promise((resolve, reject) => {
        stream.end(err => (err ? reject(err) : resolve()));
    });

    console.log(`CSV written to: ${outputPath}`);
    console.log(`New discounts created: ${countOfNew}`);
    console.log(`Total recipients: ${dedupeMap.size}`);
}

main().catch(console.error);