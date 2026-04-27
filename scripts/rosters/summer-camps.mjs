import { getSummerCamps, getOrdersByProductId, updateEcwidProduct, getAttributeValue, getAdvancedStemCamps } from '../ecwid.js';
import path from 'path';
import { createSpreadsheet, getClients, writeCellsBatch } from '../google-utils.js'
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loading environment variables from: ${envPath}`);
// Load the .env file
await dotenv.config({ path: envPath });

const SESSION_TIME = "Session Time";
const FULL_DAY = "Full-Day";
const AM_SESSION = "AM";
const PM_SESSION = "PM"; 

const TAB1="Ages 6-12";
const TAB2="Advanced";
const TAB3="Bootcamps";

const CAMP_COLS = [
    "Name",
    "Grade",
    "Type",
    "Parent",
    "Email",
    "Phone",
    "Notes"
];

async function processCamps( sheets, summary, camps ) {
    for (const camp of camps) {
        if (!camp.enabled) continue;
        const orders = await getOrdersByProductId(camp.id);
        const full_enrollment = [];
        const am_enrollment = [];
        const pm_enrollment = [];
                    
        for (let order of orders) {
            console.log(order);
            let i = 1;
            for (let item of order.items) {
                if (item.productId === camp.id) { 
                    const selectedSession = item?.selectedOptions?.find(
                        opt => opt?.name === SESSION_TIME).value;
                    // console.log(`Order ${order.id} - Selected Session: ${selectedSession}`);
                    if (selectedSession === FULL_DAY) {
                        full_enrollment.push([
                            i,
                            "", //Name
                            "", //Grade 
                            FULL_DAY,
                            order.
                        ])
                    } else if (selectedSession === AM_SESSION) {
                        //am_enrollment += 1;
                    } else if (selectedSession === PM_SESSION) {
                        //pm_enrollment += 1;
                    }
                }
                break;
            }
            break;
        }
    } 
    
}

async function main() {
    const { sheets } = await getClients([
        'https://www.googleapis.com/auth/spreadsheets',
    ]);
    
    const summary = await createSpreadsheet(
        sheets,
        'Summer-Camp-Summary',
        [TAB1, TAB2, TAB3]
    );
    
    await writeCellsBatch(sheets, summary, await writeCellsBatch(sheets, spreadsheetId, [
        {
            range: 'Classes!A1:H1',
            values: [[COL0_COUNTER, COL1_NAME, COL2_GRADE, COL3_TYPE, COL]],
        },
        {
            range: 'Students!A1:C1',
            values: [['student_id', 'first_name', 'last_name']],
        },
        {
            range: 'Attendance!A1:D1',
            values: [['class_id', 'student_id', 'date', 'status']],
        },
        ]);)

    console.log('Created spreadsheet:', summary.spreadsheetId);
    console.log('URL:', summary.spreadsheetUrl);
    
    const summerCamps = await getSummerCamps();
    processCamps(sheets, summary, summerCamps);
    
    // const stemCamps = await getAdvancedStemCamps();
    // processCamps(sheets, summary, stemCamps);
    
    // todo bootcamps
    
}

main().catch(console.error);