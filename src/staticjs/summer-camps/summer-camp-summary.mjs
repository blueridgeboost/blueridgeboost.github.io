import dotenv from 'dotenv';
import {getOrdersByProductId, getCatalog} from '../ecwid.js';
import Papa from 'papaparse';
import path from 'path';
import { getSummerCamps, getOrdersByProductId, updateEcwidProduct } from '../ecwid.js';

//This file is a chimera of "all-classes.mjs" (within rosters) and "update-availability.mjs" (within summer camps)
//refer to these files for information on set up
//this file is untested as of Lain committing on 2/12/2026

import fs from 'fs';
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

const ROSTERS_DIR = "G:\\Shared drives\\BRB\\Summer 2026" //changed correctly


function getAttributeValue(product, attributeName) {
    const attribute = product.attributes.find(attribute => attribute.name === attributeName);
    if (attribute === undefined) {
        return '';
    } else {
        return attribute.value;
    }
    }

// Commented to avoid deletions during debugging
// async function deleteCsvs(dir) {
//   const entries = await fs.promises.readdir(dir, { withFileTypes: true });
//   await Promise.all(entries.map(async e => {
//     if (e.isFile() && e.name.toLowerCase().endsWith('.csv')) {
//         await fs.promises.unlink(`${dir}${e.name}`);
//         console.log(`Deleted ${dir}${e.name}`);
//     }
//   }));
// }


//writing camp summary to csv file (taken from all-classes)
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

//Camp Summary Generation

async function main() {
const camps = await getSummerCamps(); //pulling summer camps
    for (const camp of camps) {     //look through one camp at a time
        if (camp.enabled) {
            //check how many seats are available
            const maxAttribute = camp?.attributes?.find(attribute => attribute?.name === "Max");
            //pull brb id
            const brbId = getAttributeValue(camp, "brb_id");
            const maxSeats = parseInt(maxAttribute.value, 10);
            const orders = await getOrdersByProductId(camp.id);
            //set up variables for AM PM & Full
            var full_enrollment = 0;
            var am_enrollment = 0;
            var pm_enrollment = 0;
            //set up seats 
            var seats_taken = 0;
            var seats_left = 0;
            //what will be written to csv
            const camp_data = []
            
            for (let order of orders) { //Check orders for specific camp id and count
                for (let item of order.items) {
                    if (item.productId === camp.id) { //found camp id in order
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
                    } //end of "for let item of order items"
                } //end of "for let order of orders"

                        //calculate FULL DAY seats remaining 
                        // I wasn't quite sure which way to calculate this, but I think we want to not include any
                        // half day seats in the available seat total (ex, if there are 10 full, 3 am, and 5 pm, there are 15 seats taken)
                        if (am_enrollment > pm_enrollment) {
                            seats_taken = am_enrollment + full_enrollment;
                            seats_left = maxAttribute - seats_taken;
                        } else {
                            seats_taken = pm_enrollment + full_enrollment;
                            seats_left = maxAttribute - seats_taken;
                        }
                    //push data to the structure to write to file
                    camp_data.push({
                        brb_id: brbId,
                        campName: c.name,
                        full_day_count: full_enrollment,
                        am_count: am_enrollment,
                        pm_count: pm_enrollment,
                        full_seats_remaining: seats_left,
                        });

                    //after data has been pushed, write to csv. 
                    await writeDataToCsv(camp_data, "summer-camp-counts"); //did not get to test how the data structure cooperates here, modelled based on "all-classes" -Lain
        } //end of "if camp enabled"
    } //ends of "camp of camps"
    
}



main();