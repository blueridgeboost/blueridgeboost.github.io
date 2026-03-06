import 'dotenv/config';
import { google } from 'googleapis';
import { getCatalog, getOrdersByProductId } from '../ecwid.js';
import path from 'path';
import dotenv from 'dotenv';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

// ---------- helpers ----------
function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

function getAttributeValue(product, attributeName) {
  const attribute = product?.attributes?.find(a => a?.name === attributeName);
  return attribute?.value ?? '';
}

function normalizeKey(s) {
  return (s || '').trim().toLowerCase();
}

function studentKey(parentEmail, studentName) {
  return `${normalizeKey(parentEmail)}|${normalizeKey(studentName)}`;
}

function csvEmails(v) {
  return (v || '').split(',').map(s => s.trim()).filter(Boolean).join(',');
}

async function getClients() {
  const auth = new google.auth.GoogleAuth({
    keyFile: mustEnv('GOOGLE_KEYFILE'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { sheets: google.sheets({ version: 'v4', auth }) };
}

async function readHeaders(sheets, spreadsheetId, tabName) {
  const res = await sheets.spreadsheets.values.get({spreadsheetId,range: `${tabName}!1:1`,});
  const headers = (res.data.values?.[0] || []).map(h => (h || '').trim());
  const idx = (name) => headers.indexOf(name);
  return { headers, idx };
}

async function overwriteTab(sheets, spreadsheetId, tabName, headers, rows) {
  // Clear everything below the header row, then write new data starting A2.
  await sheets.spreadsheets.values.clear({spreadsheetId,range: `${tabName}!A2:ZZ`,});
  
  if (!rows.length) return;

  await sheets.spreadsheets.values.update({spreadsheetId,
    range: `${tabName}!A2`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

// ---------- main logic ----------
async function main() {};