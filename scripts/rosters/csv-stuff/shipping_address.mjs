// dump-customer-shipping.js
// Fetches all customers directly from the Ecwid customers API and dumps to JSON.
// For debugging/inspection only — checks shipping addresses.

import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

const { ECWID_STORE_ID, ECWID_REST_SECRET } = process.env;
if (!ECWID_STORE_ID || !ECWID_REST_SECRET) {
    throw new Error('Missing ECWID_STORE_ID or ECWID_TOKEN in environment.');
}

const BASE_URL = `https://app.ecwid.com/api/v3/${ECWID_STORE_ID}`;

/**
 * Fetch one page of customers from the Ecwid API.
 * @param {number} offset
 * @param {number} limit
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function fetchCustomerPage(offset = 0, limit = 100) {
    const params = new URLSearchParams({ offset, limit, sortBy: 'REGISTERED_DATE_DESC' });
    const res = await fetch(`${BASE_URL}/customers?${params}`, {
        headers: { Authorization: `Bearer ${ECWID_REST_SECRET}` },
    });

    if (!res.ok) {
        throw new Error(`Ecwid API error ${res.status}: ${await res.text()}`);
    }

    return res.json();
}

/**
 * Fetch ALL customers, paginating automatically.
 * @returns {Promise<object[]>}
 */
async function getAllCustomers() {
    const limit = 20;
    let offset  = 0;
    let total   = null;
    const all   = [];

    do {
        const page = await fetchCustomerPage(offset, limit);
        total ??= page.total;
        all.push(...page.items);
        offset += page.count;
        console.log(`  Fetched ${all.length} / ${total} customers…`);
    } while (all.length < total);

    return all;
}

/**
 * Pull the first phone number from the contacts array.
 */
function getPhone(contacts = []) {
    return contacts.find(c => c.type === 'PHONE')?.contact ?? null;
}

/**
 * Flatten a customer record to the fields we care about.
 */
function summarise(customer) {
    const billing   = customer.billingPerson ?? {};
    const addresses = customer.shippingAddresses ?? [];

    return {
        id:              customer.id,
        name:            customer.name ?? null,
        email:           customer.email ?? null,
        phone:           billing.phone ?? getPhone(customer.contacts) ?? null,
        registered:      customer.registered ?? null,
        totalOrderCount: customer.totalOrderCount ?? 0,
        stats:           customer.stats ?? {},

        billingAddress: {
            street:      billing.street ?? null,
            city:        billing.city ?? null,
            state:       billing.stateOrProvinceName ?? billing.stateOrProvinceCode ?? null,
            postalCode:  billing.postalCode ?? null,
            country:     billing.countryName ?? billing.countryCode ?? null,
        },

        // All saved shipping addresses (there can be more than one)
        shippingAddresses: addresses.map(a => ({
            id:          a.id,
            name:        a.name ?? null,
            street:      a.street ?? null,
            city:        a.city ?? null,
            state:       a.stateOrProvinceName ?? a.stateOrProvinceCode ?? null,
            postalCode:  a.postalCode ?? null,
            country:     a.countryName ?? a.countryCode ?? null,
            formatted:   a.addressFormatted ?? null,
        })),

        hasShippingAddress: addresses.length > 0,
    };
}

async function main() {
    console.log('Fetching all customers from Ecwid…');
    const raw       = await getAllCustomers();
    const customers = raw.map(summarise);

    const withAddr    = customers.filter(c => c.hasShippingAddress);
    const withoutAddr = customers.filter(c => !c.hasShippingAddress);

    console.log(`\nTotal customers:          ${customers.length}`);
    console.log(`With shipping address:     ${withAddr.length}`);
    console.log(`Without shipping address:  ${withoutAddr.length}`);

    const dateStr    = new Date().toISOString().slice(0, 10);
    const rosterDir  = path.join(process.cwd(), 'scripts', 'rosters');
    const outputPath = path.join(rosterDir, `customer-shipping-${dateStr}.json`);

    await mkdir(rosterDir, { recursive: true });
    await writeFile(outputPath, JSON.stringify({ customers, withoutAddr }, null, 2), 'utf8');
    console.log('Wrote:', outputPath);
}

main().catch(console.error);