import { createRequire } from 'module';
import { writeDataToCsv } from './fs-helpers.js';
// import { parse } from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:\\Users\\nora_blueridgeboost\\Code\\cheddar up income.xlsx');
const outputFilePath = 'C:\\Users\\nora_blueridgeboost\\Code\\cheddar_up_income.csv';
const outputCsvData = [];

import { parse, format } from 'date-fns';

function formatToMMDDYYYY(dateStr) {
  if (!dateStr) return '';

  const cleaned = String(dateStr).replace(/\s[A-Z]{3,4}$/, '');
  const parsedDate = parse(cleaned, 'MMM d, yyyy hh:mm a', new Date());

  if (isNaN(parsedDate)) return '';

  return format(parsedDate, 'MM/dd/yyyy');
}


function cleanPrice(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  return String(value).replace(/\$/g, '').replace(/,/g, '').trim();
}

function toNumber(value) {
  const cleaned = cleanPrice(value);
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function cleanLineItem(value) {
  if (!value) return '';

  return String(value)
    .replace(/^\d+-/, '')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];

  const raw_rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false
  });

  const rows = raw_rows.filter((row) =>
    row["First Name"] ||
    row["Last Name"] ||
    row["Date"] ||
    row["Discounts"] ||
    row["Subtotal"]
  );

  for (const row of raw_rows) {
    if (!(row["First Name"] ||
        row["Last Name"] ||
        row["Date"] ||
        row["Discounts"] ||
        row["Subtotal"])) {
            console.log(sheetName, row["First Name"], row["Last Name"], row["Date"], row["Discounts"], row["Subtotal"]);
            console.log('---');
            console.log(row);
            console.log('---');
        }
}

  const min = 1;
  const max = 9999999999;

  outputCsvData.push(
    ...rows.map((row) => {
      const subtotal = toNumber(row["Subtotal"]);
      const discount = toNumber(row["Discounts"]);

      return {
        RefNumber: Math.floor(Math.random() * (max - min + 1)) + min,
        Customer: `${row["First Name"] || ''} ${row["Last Name"] || ''}`.trim(),
        TxnDate: formatToMMDDYYYY(row["Date"]),
        DiscountAmt: discount.toFixed(2),
        LineItem: cleanLineItem(sheetName),
        LineAmount: (subtotal + discount).toFixed(2),
        BankAccount: 'Business Checking',
      };
    })
  );
}

// console.log(JSON.stringify(outputCsvData, null, 2));
writeDataToCsv(outputCsvData, outputFilePath);

