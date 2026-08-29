import dotenv from 'dotenv';
import {getOrdersByProductId, getCatalog, getOrders, updateOrderStatus, getOrderById} from '../ecwid.js';
import path from 'path';
import fs from "fs/promises";

const DATE_FILE = "scripts/rosters/last-processed-order-date.txt";


// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });


function getAttributeValue(product, attributeName) {
    const attribute = product.attributes.find(attribute => attribute.name === attributeName);
    if (attribute === undefined) {
        return '';
    } else {
        return attribute.value;
    }
}

async function saveCurrentDateTime() {
  await fs.writeFile(
  DATE_FILE,
  new Date().toISOString().slice(0, 19).replace("T", " "),
  "utf8"
);
}

export async function changeOrderStatus() {
    const COMPLETED = "CUSTOM_FULFILLMENT_STATUS_2";
    const orders = await getOrders();

    console.log(`Orders found: ${orders.length}`);
    console.log(`Order found: ${JSON.stringify(orders[0])}`);

    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const orderDate = new Date(order.createDate.replace(" ", "T").replace(" +0000", "Z"));
        const otherDate = new Date("2025-06-30T19:27:50Z");
        if (orderDate < otherDate ) {
            console.log(order.id);
            await updateOrderStatus( order.id, COMPLETED );
        }
    }

    // const classes = await getCatalog([175340602]);
    // const COMPLETED = "CUSTOM_FULFILLMENT_STATUS_2";
    // const startDate = await fs.readFile(DATE_FILE, "utf8").catch(err => { console.error(err); return "2025-05-15 19:27:50"; });

    // console.log(`Searching for orders later than ${startDate}`);
    
    // for (const c of classes) {
    //     if (!c.enabled) continue;
    //     const orders = await getOrdersByProductId(c.id);
    //     for (const order of orders) {
    //         if ( order.fulfillmentStatus !== COMPLETED) {
    //             let completed = true;
    //             for (const item of order.items) {
    //                 console.log(` ${item.name} ${JSON.stringify(item.selectedOptions)}\n\n`);
                    
    //             }
         
    //         }
    //     }
    // }
    //saveCurrentDateTime();
}
