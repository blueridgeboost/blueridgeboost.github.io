import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import {getOrdersByProductId, getCatalog} from '../../../../brb-utils/src/ecwid-commons.js';
import Papa from 'papaparse';
import fs from 'fs';

const emailsOnly=false;
const ROSTERS_DIR = "G:\\Shared drives\\BRB\\25-26 Classes\\rosters\\"

function getAttributeValue(product, attributeName) {
    const attribute = product.attributes.find(attribute => attribute.name === attributeName);
    if (attribute === undefined) {
        return '';
    } else {
        return attribute.value;
    }
}

async function deleteCsvs(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async e => {
    if (e.isFile() && e.name.toLowerCase().endsWith('.csv')) {
        await fs.promises.unlink(`${dir}${e.name}`);
        console.log(`Deleted ${dir}${e.name}`);
    }
  }));
}

async function writeDataToCsv(data, fileName) {
    // Convert data to CSV format using PapaParse 
    const csv = Papa.unparse(data, {
        header: true, // Include headers in the CSV
        quotes: true, // Quote all fields for safety
    });

    // File path to save the CSV
    const filePath = `${ROSTERS_DIR}${fileName}.csv`;

    // Write the CSV content to a file
    fs.writeFileSync(filePath, csv, 'utf8', (err) => {
        if (err) {
            console.error('Error writing CSV file:', err);
        } else {
            console.log(`CSV file created at ${filePath}`);
        }
    });
    console.log(`Wrote ${data.length} records to ${filePath}`);
}

async function main() {
    const classes = await getCatalog([175340602]);
    const IN_PROGRESS = "CUSTOM_FULFILLMENT_STATUS_1";
    const NEW_ORDER = "AWAITING_PROCESSING";
    const COMPLETED = "CUSTOM_FULFILLMENT_STATUS_2";
    const data = [];
    await deleteCsvs(ROSTERS_DIR);
    for (const c of classes) {
        if (!c.enabled) continue;
        const orders = await getOrdersByProductId(c.id);
        let count = 0;
        const class_data = []
        for (let order of orders) {
            if (order.fulfillmentStatus === IN_PROGRESS || order.fulfillmentStatus === NEW_ORDER) {
                for (let item of order.items) {
                    const name1 = order.orderExtraFields.find(field => field.title == "First Student's Name");
                    const grade1 = order.orderExtraFields.find(field => field.title == "First Student's Grade");
                    const name2 = order.orderExtraFields.find(field => field.title == "[Optional] Second Student's Name");
                    const grade2 = order.orderExtraFields.find(field => field.title == "[Optional] Second Student's Grade");
                    const notes = order.orderExtraFields.find(field => field.title == "[Optional] Please let us know of anything you think we should be aware of to best teach your student.");
                    if (item.productId === c.id) {
                        count += item.quantity;
                        class_data.push({
                            parentName: order.billingPerson.name,
                            parentEmail: order.email,
                            parentPhone: order.billingPerson.phone,
                            childName: (name1) ? name1.value : "",
                            childGrade: (grade1) ? grade1.value : "",
                            selectedOptions: ( item.selectedOptions &&
                                item.selectedOptions.length > 0) ? 
                                    JSON.stringify(item.selectedOptions[0].value) : "",
                            notes: (notes) ? notes.value : "",
                        });
                        if (item.quantity > 1) {
                            class_data.push({
                                parentName: order.billingPerson.name,
                                parentEmail: order.email,
                                parentPhone: order.billingPerson.phone,
                                childName: (name2) ? name2.value : "",
                                childGrade: (grade2) ? grade2.value : "",
                                selectedOptions: (item.selectedOptions &&item.selectedOptions.length > 0) ? 
                                    JSON.stringify(item.selectedOptions[0].value) : "",
                                notes: (notes) ? notes.value : "",
                            });
                        }
                    }
                }
            }
        }
        if (count > 0) {
            const brbId = getAttributeValue(c, "brb_id");
            data.push({
                brbId: brbId,
                className: c.productName,
                count: count,
                daysOfWeek: getAttributeValue(c, "days_of_week"),
                startDate: getAttributeValue(c, "start_date"),
                endDate: getAttributeValue(c, "end_date"),
                startTime: getAttributeValue(c, "start_time"),
                endTime: getAttributeValue(c, "end_time"),
            });
            await writeDataToCsv(class_data, brbId);
        }
        
    }
    await writeDataToCsv(data, 'summary-classes');
}


main();