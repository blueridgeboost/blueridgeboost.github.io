import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { mustEnv, getClients, writeCell, readClassesTable, createAttendanceForm } from './google-utils.js';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
];

// ---------- main ----------
async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');
  const { sheets, forms } = await getClients(SCOPES);

  const { rows, idx } = await readClassesTable(sheets, spreadsheetId);

  const iBrb = idx('brb_id');
  const iName = idx('class_name');
  const iFormId = idx('form_id');
  const iEditUrl = idx('form_edit_url');
  const iRespUrl = idx('form_response_url');

  let createdCount = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const brbId = (row[iBrb] || '').trim();
    const className = (row[iName] || '').trim();
    const formIdExisting = (row[iFormId] || '').trim();

    if (!brbId || !className) continue;
    if (formIdExisting) continue;

    console.log(`Creating form for ${brbId} - ${className}...`);

    const { formId, editUrl, viewUrl } = await createAttendanceForm(forms, className, brbId);
    const sheetRow = r + 2;

    await writeCell(sheets, spreadsheetId, 'Classes', iFormId, sheetRow, formId);

    if (iEditUrl !== -1) {
      await writeCell(sheets, spreadsheetId, 'Classes', iEditUrl, sheetRow, editUrl);
    }

    if (iRespUrl !== -1) {
      await writeCell(sheets, spreadsheetId, 'Classes', iRespUrl, sheetRow, viewUrl);
    }

    createdCount++;
    console.log(`Created formId=${formId}`);
  }

  console.log(`Done. Created ${createdCount} forms.`);
}

main().catch((e) => {
  console.error('Error message:', e?.message || e);
  console.error('Error code:', e?.code);
  console.error('Error status:', e?.response?.status);
  console.error('Error data:', JSON.stringify(e?.response?.data, null, 2));
  process.exit(1);
});


