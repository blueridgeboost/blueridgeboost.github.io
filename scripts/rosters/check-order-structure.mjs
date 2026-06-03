import {
    getSummerCamps,
    getOrdersByProductId,
    getAttributeValue,
} from '../ecwid.js';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

// How many camps to inspect, and how many orders per camp.
// Keep these small so the output is readable.
const MAX_CAMPS = 3;
const MAX_ORDERS_PER_CAMP = 3;

// Recursively find any keys whose name looks student/grade/notes-related,
// so we don't miss things tucked into nested structures.
const NAME_PATTERNS = [
    /student/i, /camper/i, /child/i,
    /grade/i, /age/i,
    /note/i, /aware/i, /allerg/i,
];

function findInterestingPaths(obj, basePath = '', hits = []) {
    if (obj === null || obj === undefined) return hits;
    if (typeof obj !== 'object') return hits;

    if (Array.isArray(obj)) {
        obj.forEach((v, i) => findInterestingPaths(v, `${basePath}[${i}]`, hits));
        return hits;
    }

    for (const [k, v] of Object.entries(obj)) {
        const p = basePath ? `${basePath}.${k}` : k;
        const matched = NAME_PATTERNS.some(re => re.test(k))
            || (typeof v === 'string' && NAME_PATTERNS.some(re => re.test(v)));
        if (matched) {
            const preview = typeof v === 'object' ? `<${Array.isArray(v) ? 'array' : 'object'}>` : String(v).slice(0, 100);
            hits.push(`${p} = ${preview}`);
        }
        findInterestingPaths(v, p, hits);
    }
    return hits;
}

// Compact summary of an order's most relevant slots, plus a deep-grep for matches.
function summarizeOrder(order) {
    const lines = [];
    lines.push(`  Order id: ${order.id}  email: ${order.email}`);
    lines.push(`  billingPerson.name: ${order.billingPerson?.name}`);

    lines.push(`  orderExtraFields (${order.orderExtraFields?.length ?? 0}):`);
    for (const f of order.orderExtraFields || []) {
        lines.push(`    - title: ${JSON.stringify(f.title)}`);
        lines.push(`      value: ${JSON.stringify(f.value)}`);
    }

    lines.push(`  items (${order.items?.length ?? 0}):`);
    for (const item of order.items || []) {
        lines.push(`    * productId: ${item.productId}  name: ${item.name}  qty: ${item.quantity}`);
        lines.push(`      selectedOptions (${item.selectedOptions?.length ?? 0}):`);
        for (const opt of item.selectedOptions || []) {
            lines.push(`        - name:  ${JSON.stringify(opt.name)}`);
            lines.push(`          value: ${JSON.stringify(opt.value)}`);
            // surface other keys on the option in case they hide the data
            const otherKeys = Object.keys(opt).filter(k => k !== 'name' && k !== 'value');
            if (otherKeys.length) {
                lines.push(`          otherKeys: ${otherKeys.join(', ')}`);
            }
        }
    }

    const hits = findInterestingPaths(order);
    if (hits.length) {
        lines.push(`  Deep grep (keys/values matching student|camper|grade|notes|...):`);
        for (const h of hits) lines.push(`    > ${h}`);
    } else {
        lines.push(`  Deep grep: no matches`);
    }

    return lines.join('\n');
}

function summarizeProduct(camp) {
    const lines = [];
    lines.push(`Camp: ${camp.name}  id: ${camp.id}  enabled: ${camp.enabled}`);
    lines.push(`  Top-level keys: ${Object.keys(camp).join(', ')}`);
    lines.push(`  attributes (${camp.attributes?.length ?? 0}):`);
    for (const a of camp.attributes || []) {
        lines.push(`    - ${JSON.stringify(a.name)} = ${JSON.stringify(a.value)}`);
    }

    // product-level option definitions (these define what selectedOptions on items look like)
    if (camp.options?.length) {
        lines.push(`  options (${camp.options.length}):`);
        for (const o of camp.options) {
            const choices = (o.choices || []).map(c => c.text ?? c.value ?? '?').join(' | ');
            lines.push(`    - name: ${JSON.stringify(o.name)}  type: ${o.type}  required: ${o.required}`);
            if (choices) lines.push(`      choices: ${choices}`);
        }
    } else {
        lines.push(`  options: none`);
    }

    return lines.join('\n');
}

async function main() {
    const camps = await getSummerCamps();
    const enabled = camps.filter(c => c.enabled);
    console.log(`Total camps: ${camps.length}  enabled: ${enabled.length}`);

    // pick a few enabled camps that have orders
    const sample = enabled.slice(0, MAX_CAMPS);

    const out = [];
    out.push(`# Ecwid structure inspection`);
    out.push(`# Generated: ${new Date().toISOString()}`);
    out.push(`# Inspecting up to ${MAX_CAMPS} camps and ${MAX_ORDERS_PER_CAMP} orders each\n`);

    for (const camp of sample) {
        out.push('='.repeat(80));
        out.push(summarizeProduct(camp));

        const orders = await getOrdersByProductId(camp.id);
        out.push(`\n  Total orders for this camp: ${orders.length}`);

        const orderSample = orders.slice(0, MAX_ORDERS_PER_CAMP);
        for (const order of orderSample) {
            out.push('-'.repeat(80));
            out.push(summarizeOrder(order));
        }
        out.push('');
    }

    // also dump one full raw order + one full raw product as JSON for ground truth
    if (sample.length > 0) {
        out.push('='.repeat(80));
        out.push('# RAW: full first product object');
        out.push(JSON.stringify(sample[0], null, 2));

        const firstOrders = await getOrdersByProductId(sample[0].id);
        if (firstOrders.length > 0) {
            out.push('='.repeat(80));
            out.push('# RAW: full first order object');
            out.push(JSON.stringify(firstOrders[0], null, 2));
        }
    }

    const text = out.join('\n');
    console.log(text);

    const outFile = path.join(process.cwd(), '/scripts', 'rosters', 'ecwid-structure-dump.txt');
    fs.writeFileSync(outFile, text, 'utf8');
    console.log(`\nWrote full dump to: ${outFile}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});