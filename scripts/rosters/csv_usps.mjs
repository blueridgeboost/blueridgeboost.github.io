import {
    SUMMER_CAMPS_CATEGORY_ID,
    ADVANCED_STEM_CAMPS_CATEGORY_ID,
    BOOTCAMPS_CATEGORY_ID,
    getOrdersByProductId,
    getAttributeValue,
    getCatalog,
} from '../ecwid.js';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { createWriteStream } from 'fs';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

// ─── SENDER CONSTANTS ────────────────────────────────────────────────────────
const SHIPPING_DATE        = '5/30/26';          // MM-DD-YY up 7 (unclear restraint)
const SENDER_COMPANY       = 'Blue Ridge Boost';
const SENDER_ADDRESS_LINE1 = '2171 Ivy Rd';
const SENDER_CITY          = 'Charlottesville';
const SENDER_STATE         = 'VA';
const SENDER_COUNTRY       = 'US';
const SENDER_ZIP           = '22903';
const SENDER_EMAIL         = 'office@blueridgeboost.com';
const SENDER_PHONE         = '4342600636'; // this means +1 434-260-0636

// ─── PACKAGE CONSTANTS ───────────────────────────────────────────────────────
const SERVICE_TYPE         = 'USPS Flat Rate';
const PACKAGE_TYPE         = 'Package';
const PACKAGE_WEIGHT_LB    = 0;
const PACKAGE_WEIGHT_OZ    = 6;

// ─── WEEKS TO INCLUDE ────────────────────────────────────────────────────────
// Only orders whose camp start date matches one of these will be included.
const SUMMER_WEEKS = [
    { startDate: '2026-06-01', label: 'Week June 1-5' },
    { startDate: '2026-06-08', label: 'Week June 8-12' },
];

const VALID_START_DATES = new Set(SUMMER_WEEKS.map(w => w.startDate));

const BOOTCAMP_OPTION = 'Session';

// ─── CSV COLUMNS ─────────────────────────────────────────────────────────────
const COLUMNS = [
    // sender ─── 
    'Shipping Date',
    'Sender Company/Org Name',
    'Sender Address Line 1',
    'Sender Address Town/City',
    'Sender State',
    'Sender Country',
    'Sender Zip Code',
    'Sender Email',
    'Sender Phone Number',
    // recipient ─── 
    'Recipient Country',
    'Recipient First Name',
    'Recipient Last Name',
    'Recipient Address Line 1',
    'Recipient Address Town/City',
    'Recipient State',
    'Recipient Zip Code',
    // package ─── 
    'Service Type',
    'Package Type',
    'Package Weight (lb.)',
    'Package Weight (oz)',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Split a full name into first / last. Everything after the first token is "last". */
function parseName(fullName = '') {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** Escape a CSV field: wrap in quotes if it contains a comma, quote, or newline. */
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

/** Build the fixed sender + package portion of a row (returns an array). */
function senderFields() {
    return [
        SHIPPING_DATE,
        SENDER_COMPANY,
        SENDER_ADDRESS_LINE1,
        SENDER_CITY,
        SENDER_STATE,
        SENDER_COUNTRY,
        SENDER_ZIP,
        SENDER_EMAIL,
        SENDER_PHONE,
    ];
}

/**
 * Collect all orders for a list of camp products, filtering to camps whose
 * Start Date is in VALID_START_DATES.
 * Deduplicates by email. Each item's quantity is accumulated into totalQuantity,
 * which is later used to scale the package weight.
 */
async function collectRecipients(camps, dedupeMap) {
    for (const camp of camps) {
        // if camp has valid start date 
        const startDate = getAttributeValue(camp, 'Start Date');
        if (!VALID_START_DATES.has(startDate)) continue;

        const orders = await getOrdersByProductId(camp.id);
        // for each order build the customer info 
        for (const order of orders) {
            const billing = order.billingPerson ?? {};
            const email = (order.email ?? '').toLowerCase().trim();
            // make sure to only collect items of the correct camp 
            const qualifyingQty = (order.items ?? [])
                .filter(item => item.productId === camp.id)
                .reduce((sum, item) => sum + (item.quantity ?? 1), 0);
            if (qualifyingQty === 0) continue;

            if (dedupeMap.has(email)) {
                dedupeMap.get(email).totalQuantity += qualifyingQty;
                continue; 
            }

            const { first, last } = parseName(billing.name);

            dedupeMap.set(email, {
                firstName:    first,
                lastName:     last,
                addressLine1: billing.street ?? '',
                city:         billing.city ?? '',
                state:        billing.stateOrProvinceCode ?? '',
                zip:          billing.postalCode ?? '',
                country:      billing.countryCode ?? 'US',
                email:        order.email ?? '',
                phone:        billing.phone ?? '',
                totalQuantity: qualifyingQty,
            });
        }
    }
}



// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    const dedupeMap = new Map(); // dedupeKey → recipient

    console.log('Fetching summer camps…');
    const summer = await getCatalog([SUMMER_CAMPS_CATEGORY_ID], false);
    await collectRecipients(summer, dedupeMap);

    console.log('Fetching advanced STEM camps…');
    const stem = await getCatalog([ADVANCED_STEM_CAMPS_CATEGORY_ID], false);
    await collectRecipients(stem, dedupeMap);

    console.log('Fetching bootcamps…');
    const bootcamps = await getCatalog([BOOTCAMPS_CATEGORY_ID], false);
    await collectRecipients(bootcamps, dedupeMap);

    console.log(`Collected ${dedupeMap.size} unique recipients.`);

    // ── Write CSV ──────────────────────────────────────────────────────────────
    const outputPath = path.join(
        os.homedir(),
        'OneDrive - Blue Ridge Boost',
        'Rosters - Documents',
        `Shipping-Labels-${new Date().toISOString().slice(0, 10)}.csv`
    );

    const stream = createWriteStream(outputPath, { encoding: 'utf8' });

    // Header row
    stream.write(csvRow(COLUMNS) + '\n');

    for (const recipient of dedupeMap.values()) {
        // Scale weight by total quantity purchased across all qualifying camps.
        const totalOzRaw = (PACKAGE_WEIGHT_OZ + PACKAGE_WEIGHT_LB * 16) * recipient.totalQuantity;
        const weightLb   = Math.floor(totalOzRaw / 16);
        const weightOz   = totalOzRaw % 16;

        const row = [
            ...senderFields(),
            recipient.country,
            recipient.firstName,
            recipient.lastName,
            recipient.addressLine1,
            recipient.city,
            recipient.state,
            recipient.zip,
            SERVICE_TYPE,
            PACKAGE_TYPE,
            weightLb,
            weightOz,
        ];
        stream.write(csvRow(row) + '\n');
    }

    await new Promise((resolve, reject) => {
        stream.end(err => (err ? reject(err) : resolve()));
    });

    console.log(`CSV written to: ${outputPath}`);
}

main().catch(console.error);