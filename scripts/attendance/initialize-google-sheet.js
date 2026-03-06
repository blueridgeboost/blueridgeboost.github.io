import 'dotenv/config';
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';

// thhe .env must contain a path to a Google service account json keyfile with access to the target spreadsheet.
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });


// for now will assume the sheet is already created and shared with google service account.
// In the future, we could add logic to create the sheet, periodically making new ones if need be.

const TAB_HEADERS = {
    Classes: ['brb_id','ecwid_product_id','class_name','teacher_emails','day_of_week','start_date','end_date','class_status','form_id','form_edit_url','form_response_url','last_roster_sync_at'],
    Enrollments: ['brb_id','student_key','student_name','parent_name','parent_email','parent_phone','order_id','order_item_id','purchase_date','active','notes','last_sync_at'],
    AttendanceLedger: ['brb_id','class_date','student_key','present','source_timestamp','source_form_id','source_submission_row'],
};


// Convert column count -> A1 column letter (1->A, 26->Z, 27->AA)
function colToA1(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}


async function main() {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('Missing ATTENDANCE_SHEET_ID in .env');
    if (!process.env.GOOGLE_KEYFILE) throw new Error('Missing GOOGLE_KEYFILE in .env');

    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_KEYFILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1) Read existing sheet tabs
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = new Set((meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean));

    // 2) Create missing tabs only
    const addSheetRequests = Object.keys(TAB_HEADERS)
    .filter((title) => !existingTitles.has(title))
    .map((title) => ({addSheet: { properties: { title } },}));

    if (addSheetRequests.length) {
        await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody: { requests: addSheetRequests },});
        console.log(`Created tabs: ${addSheetRequests.map(r => r.addSheet.properties.title).join(', ')}`);
    }
    else {console.log('All tabs already exist');}

    // 3) Write headers to row 1, will overwrite row 1. 
    for (const [tabName, headers] of Object.entries(TAB_HEADERS)) {
        const lastColLetter = colToA1(headers.length);
        const range = `${tabName}!A1:${lastColLetter}1`;

        await sheets.spreadsheets.values.update({spreadsheetId,range,valueInputOption: 'RAW',requestBody: {values: [headers],},});
  }

    console.log('Sheet Initialized.');
}

main().catch((e) => {
    console.error('Error:', e?.message || e);
    process.exit(1);
});

