// test-order-status.js
// Diagnostic: for every enabled summer camp, print each order with its payment
// status (regardless of status) so you can spot cancelled/refunded orders that
// are being returned and counted toward attendance.
//
// Usage:  node test-order-status.js
//
// NOTE: adjust the import path below to match where this file lives relative to ecwid.js.

import { getOrdersByProductId, getSummerCamps, getAdvancedStemCamps } from '../ecwid.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '..', '.env');
await dotenv.config({ path: envPath });

const SESSION_TIME = "Session Time";
const OUT_PATH = path.join(process.cwd(), 'scripts', 'summer-camps', 'order-test.txt');

const lines = [];
function log(line = '') {
    console.log(line);
    lines.push(line);
}

async function run() {
    const summerCamps = await getSummerCamps();
    // Include advanced STEM camps too (same grouping your seat script uses).
    // Remove getAdvancedStemCamps below if you only want the plain summer camps.
    const stemCamps = await getAdvancedStemCamps();
    const camps = [...summerCamps, ...stemCamps].filter(c => c.enabled);

    for (const camp of camps) {
        const orders = await getOrdersByProductId(camp.id);
        log(`\n=== ${camp.name} (${camp.id}) — ${orders.length} order(s) ===`);

        if (orders.length === 0) {
            log('  (no orders)');
            continue;
        }

        for (const order of orders) {
            const items = (order.items || [])
                .filter(i => i.productId === camp.id)
                .map(i => {
                    const session = i?.selectedOptions?.find(o => o?.name === SESSION_TIME)?.value || '(no session)';
                    return `${session} x${i.quantity}`;
                })
                .join(', ');

            log(`  Order ${order.id} | payment: ${order.paymentStatus || 'UNKNOWN'} | fulfillment: ${order.fulfillmentStatus || 'UNKNOWN'} | ${items}`);
        }
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, lines.join('\n'));
    console.log(`\nOutput written to ${OUT_PATH}`);
}

run();