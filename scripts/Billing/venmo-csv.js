// Script for converting Venmo monthly statement CSV exports into two CSV files
// importable by rightworks TransactionPro
//
// - transfers.csv      <- Venmo "Standard Transfer" rows  
// - sales-receipts.csv <- Venmo "Payment" rows to Ana Evans
//
// Venmo statement layout: rows 1-2 are titles
//   A1: Account Statement -(@blueridgeboost)
//   A2: Account Activity
//   Row 3:(ID, Datetime, Type, Status, Note, From, To,
//         Amount (total), ... Destination, ...) 
//
// Use wit: node ./scripts/Billing/venmo-csv.js [inputDir] [outputDir]

import { createRequire } from 'module';
import { readFile, readdir, mkdir } from 'fs/promises';
import path from 'path';
import { parseISO, isValid, format } from 'date-fns';
import { writeDataToCsv } from '../fs-helpers.js';

const require = createRequire(import.meta.url);
const papaparse = require('papaparse');

// Config -- overidable with cli args
const INPUT_DIR = process.argv[2] || './scripts/Billing/venmo-statements/';
const OUTPUT_DIR = process.argv[3] || './scripts/Billing/output/';
const SR_ITEM = 'Tutoring'; // generic QuickBooks line item for every receipt
const SR_PAYEE = 'Ana Evans'; // venomo "to" value to flag a sale 

// Read one Venmo statement file. Returns { accountName, rows } where rows are
// the transaction rows keyed by the row-3 headers.
async function parseVenmoFile(filePath) {
  const text = await readFile(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  // locate header row 
  const headerIdx = lines.findIndex(
    (line) => line.includes('Datetime') && line.includes('Type')
  );
  if (headerIdx === -1) {
    console.warn(`No header row found in ${filePath}; skipping.`);
    return { accountName: '', rows: [] };
  }
  // acoutn name from title 
  const handleMatch = titleText.match(/\(@?([^)]+)\)/);
  const accountName = handleMatch ? `@${handleMatch[1].replace(/^@/, '')}` : '';

  const body = lines.slice(headerIdx).join('\n');
  const { data, errors } = papaparse.parse(body, {
    header: true,
    skipEmptyLines: true,
  });
  if (errors?.length) {
    console.error(`Papa errors in ${path.basename(filePath)}:`, errors);
  }
  return { accountName, rows: data };
}

function cleanAmount(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = Number(String(value).replace(/[$,+\s]/g, ''));
  return Number.isNaN(num) ? '0.00' : Math.abs(num).toFixed(2);
}

// Venmo date: yyyy-mm-ddTxx:xx:xx
function formatDate(dt) {
  if (!dt) return '';
  let parsed = parseISO(String(dt).trim());
  if (!isValid(parsed)) parsed = new Date(dt);
  return isValid(parsed) ? format(parsed, 'MM/dd/yyyy') : '';
}

async function main() {
  // gather all csv files 
  const entries = await readdir(INPUT_DIR); 
  const csvFiles = entries.filter((f) => f.toLowerCase().endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.warn(`No .csv files found in ${INPUT_DIR}`);
    return;
  }

  const transfers = [];
  const salesReceipts = [];

  // gather all csvs, for each csv parse, for each parsed row puch the proper mappings
  for (const file of csvFiles) {
    const { accountName, rows } = await parseVenmoFile(path.join(INPUT_DIR, file));
    for (const row of rows) {
      const type = (row['Type'] || '').trim();
      if (!row['ID'] || !type) continue; // skip summary / empty rows
      
      // handle bank transfers 
      if (type === 'Standard Transfer') {
        transfers.push({
          RefNumber: row['ID'], // RefNumber is the unique transaction Id
          'Transaction Date': formatDate(row['Datetime']),
          'Transfer from Acct': accountName, 
          'Transfer to Acct': row['Destination'] || '', // mapping only valid for 
          Amount: cleanAmount(row['Amount (total)']),
          Class: '',
          Memo: row['Note'] || '',
        });
      } 
      // handle Payements To Us (Ana Evans)
      else if (type === 'Payment' && (row['To'] || '').includes(SR_PAYEE)) {
        salesReceipts.push({
          Customer: row['From'] || '',
          'Transaction Date': formatDate(row['Datetime']),
          RefNumber: row['ID'],
          'Payment Method': 'Venmo',
          Item: SR_ITEM,
          Quantity: 1,
          Description: row['Note'] || SR_ITEM,
          Price: cleanAmount(row['Amount (total)']),
          'Deposit To': accountName,
          'Cust. Tax Code': 'Non',
          'Sales Tax Code': 'Non',
        });
      }
    }
  }
  // sort by date just in case 
  const byDate = (a, b) => new Date(a['Transaction Date']) - new Date(b['Transaction Date']);
  transfers.sort(byDate);
  salesReceipts.sort(byDate);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeDataToCsv(transfers, path.join(OUTPUT_DIR, 'transfers.csv'));
  await writeDataToCsv(salesReceipts, path.join(OUTPUT_DIR, 'sales-receipts.csv'));

  console.log(
    `Done: ${transfers.length} transfer(s), ${salesReceipts.length} sales receipt(s) from ${csvFiles.length} file(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});