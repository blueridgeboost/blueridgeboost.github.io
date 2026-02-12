import dotenv from 'dotenv';
import {getOrdersByProductId, getCatalog} from '../ecwid.js';
import Papa from 'papaparse';
import path from 'path';
import { getSummerCamps, getOrdersByProductId, updateEcwidProduct } from '../ecwid.js';

//This file is a chimera of "all-classes.mjs" (within rosters) and "update-availability.mjs" (within summer camps)
//refer to these files for information on set up

import fs from 'fs';
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

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

//writing camp summary to csv file
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
const camps = await getSummerCamps(); //pulling summer camps
    for (const camp of camps) {
        if (camp.enabled) {
            const maxAttribute = camp?.attributes?.find(attribute => attribute?.name === "Max");
            const maxSeats = parseInt(maxAttribute.value, 10);
            if (!maxAttribute || !maxAttribute.value?.trim()) {
                console.error(`No start_date attribute for product ${camp.id}`);
            } else {
                const orders = await getOrdersByProductId(camp.id);
                var full_enrollment =0;
                var am_enrollment = 0;
                var pm_enrollment = 0;
                for (let order of orders) {
                    for (let item of order.items) {
                        if (item.productId === camp.id) { 
                            const selectedSession = item?.selectedOptions?.find(
                                opt => opt?.name === SESSION_TIME).value;
                            // console.log(`Order ${order.id} - Selected Session: ${selectedSession}`);
                            if (selectedSession === FULL_DAY) {
                                full_enrollment += 1;
                            } else if (selectedSession === AM_SESSION) {
                                am_enrollment += 1;
                            } else if (selectedSession === PM_SESSION) {
                                pm_enrollment += 1;
                            }
                        }
                    }
                }
            }
        }
        
            await writeDataToCsv(class_data, brbId);
        
    }
    

    await writeDataToCsv(data, 'summary-classes');
}



main();