import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import {getOrdersByProductId, getCatalog} from '../../../../brb-utils/src/ecwid-commons.js';
import Papa from 'papaparse';
import fs from 'fs';

const emailsOnly=false;

function getAttributeValue(product, attributeName) {
    const attribute = product.attributes.find(attribute => attribute.name === attributeName);
    if (attribute === undefined) {
        return '';
    } else {
        return attribute.value;
    }
}

async function writeDataToCsv(data, fileName) {
    // Convert data to CSV format using PapaParse
    const csv = Papa.unparse(data, {
        header: true, // Include headers in the CSV
        quotes: true, // Quote all fields for safety
    });

    // File path to save the CSV
    const filePath = `G:\\Shared drives\\BRB\\25-26 Camps\\${fileName}.csv`;

    // Write the CSV content to a file
    fs.writeFileSync(filePath, csv, 'utf8', (err) => {
        if (err) {
            console.error('Error writing CSV file:', err);
        } else {
            console.log(`CSV file created at ${filePath}`);
        }
    });
}

function isWithinNextMonth(dateStr) {
    // Validate format YYYY-MM-DD (basic check)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    // Parse as local date at midnight
    const [y, m, d] = dateStr.split('-').map(Number);
    const inputDate = new Date(y, m - 1, d);

    // Reject invalid dates (e.g., 2025-02-30)
    if (Number.isNaN(inputDate.getTime()) || 
        inputDate.getFullYear() !== y || 
        inputDate.getMonth() !== m - 1 || 
        inputDate.getDate() !== d) {
        return false;
    }

    // Get today's date at local midnight
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // One month from today at local midnight
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    // Must be strictly after today and no later than one month later
    return inputDate >= today && inputDate <= oneMonthLater;
}

async function main() {
    const camps = await getCatalog([175336115]);
    const data = [];
    for (const c of camps) {
        if (!c.enabled) continue;
        if (!isWithinNextMonth(getAttributeValue(c, "start_date"))) continue;
        const orders = await getOrdersByProductId(c.id);
        let count = 0;
        const order_data = []
        for (let order of orders) {
            for (let item of order.items) {
                // const name1 = order.orderExtraFields.find(field => field.title == "First Student's Name");
                // const grade1 = order.orderExtraFields.find(field => field.title == "First Student's Grade");
                // const name2 = order.orderExtraFields.find(field => field.title == "[Optional] Second Student's Name");
                // const grade2 = order.orderExtraFields.find(field => field.title == "[Optional] Second Student's Grade");
                // const notes = order.orderExtraFields.find(field => field.title == "[Optional] Please let us know of anything you think we should be aware of to best teach your student.");
                // console.log(JSON.stringify(order));
                
                if (item.productId === c.id) {
                    count += item.quantity;
                    const line = {
                        Name: order.billingPerson.name,
                        Email: order.email,
                        "Phone Number": order.billingPerson.phone,
                        // "Camper's Name": (name1) ? name1.value : "",
                        // "Camper's Grade": (grade1) ? grade1.value : "",
                        // notes: (notes) ? notes.value : "",
                    };
                    for (let opt of item.selectedOptions) {
                        line[opt.name] = (opt.value) ? JSON.stringify(opt.value) : "";
                    }
                    order_data.push(line);
                    if (item.quantity > 1) {
                        order_data.push(line);
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
            await writeDataToCsv(order_data, brbId);
        }
        
    }
    await writeDataToCsv(data, 'summary-camps');
}


main();