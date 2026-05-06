
import {
  getSummerCamps,
  getOrdersByProductId,
  getAdvancedStemCamps,
  getBootcamps,
} from '../ecwid.js';
import path from 'path';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
console.log(envPath)
console.log(`Loading environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SESSION_TIME = 'Session Time';
const FULL_DAY = 'Full-Day';
const AM_SESSION = 'AM';
const PM_SESSION = 'PM';

const TAB1 = 'Ages 6-12';
const TAB2 = 'Advanced';
const TAB3 = 'Bootcamps';

const CAMP_COLS = [
  'Counter',
  'Name',
  'Grade',
  'Type',
  'Parent',
  'Email',
  'Phone',
  'Notes',
];

//Excel sheet setup
function createSheet(workbook, name) {
  const sheet = workbook.addWorksheet(name);

  sheet.columns = [
    { header: 'Counter', key: 'counter', width: 10 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Grade', key: 'grade', width: 12 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Parent', key: 'parent', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return sheet;
}

function getOrCreateCampSection(sheet, campName) {
  const lastRow = sheet.lastRow ? sheet.lastRow.number : 0;
  const startRow = lastRow + 2;

  sheet.getCell(`A${startRow}`).value = campName;
  sheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

  const headerRow = startRow + 1;
  sheet.getRow(headerRow).values = CAMP_COLS;
  sheet.getRow(headerRow).font = { bold: true };

  return headerRow + 1;
}

function getOptionValue(item, optionName) {
  return item?.selectedOptions?.find(opt => opt?.name === optionName)?.value ?? '';
}

async function processCamps(sheet, camps) {
  for (const camp of camps) {
    if (!camp.enabled) continue;

    console.log(`Processing camp: ${camp.name}`);
    const orders = await getOrdersByProductId(camp.id);

    const startRow = getOrCreateCampSection(sheet, camp.name);
    let currentRow = startRow;
    let counter = 1;
    let AMCounter = 0;
    let PMCounter = 0;
    let FullCounter = 0;

    for (const order of orders) {
      for (const item of order.items || []) {
        if (item.productId !== camp.id) continue;

        const selectedSession = getOptionValue(item, SESSION_TIME);

        const row = [
          counter,
          '',
          '',
          selectedSession || '',
          order?.billingPerson?.name ||
            order?.shippingPerson?.name ||
            '',
          order?.email || '',
          order?.billingPerson?.phone ||
            order?.shippingPerson?.phone ||
            '',
          '',
        ];

        if (
          selectedSession === FULL_DAY ||
          selectedSession === AM_SESSION ||
          selectedSession === PM_SESSION
        ) {
          sheet.getRow(currentRow).values = row;
          currentRow += 1;
          counter += 1;
        }
        //not the most elegant way to do this, but this section counts how many students are
        //enrolled for each type of camp, then adds rows for Full-Day, AM, and PM counts to show quick totals
        //This works for all 3 types of camps, and simply tacks 3 additional rows under the existing counting system
        if (selectedSession === FULL_DAY) {
          FullCounter += 1;
        }
        if (selectedSession === AM_SESSION) {
          AMCounter += 1;
        }
        if (selectedSession === PM_SESSION) {
          PMCounter += 1;
        }
      }
    }
    //this is where the counters get put into their own rows. -Lain Bowman
    sheet.getRow(currentRow).values = ['Total AM Students', AMCounter];
          currentRow += 1;
    sheet.getRow(currentRow).values = ['Total PM Students', PMCounter];
          currentRow += 1;
    sheet.getRow(currentRow).values = ['Total Full-Day Students', FullCounter];
          currentRow += 1;
  }
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  
  const sheet1 = createSheet(workbook, TAB1);
  const sheet2 = createSheet(workbook, TAB2);
  const sheet3 = createSheet(workbook, TAB3);

  const summerCamps = await getSummerCamps();
  await processCamps(sheet1, summerCamps);

  const stemCamps = await getAdvancedStemCamps();
  await processCamps(sheet2, stemCamps);

  const bootCamps = await getBootcamps();
  await processCamps(sheet3, stemCamps);


  const outputPath = path.join(process.cwd(), 'Summer-Camp-Summary.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('Created Excel file:', outputPath);
}

main().catch(console.error);