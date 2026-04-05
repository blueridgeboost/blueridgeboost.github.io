import path from 'path';
import dotenv from 'dotenv';
import { mustEnv, getClients, readSheetTable, colToA1 } from './google-utils.js';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/forms.body.readonly',
];

// ---------- helpers ----------
function parseStudentKey(optionValue) {
  const match = (optionValue || '').match(/\[([^\]]+)\]\s*$/);// captures the part inside the last pair of brackets
  return match ? match[1].trim() : null;
}

// Build a map of questionId -> isoDate from the google form
function buildQuestionDateMap(formItems) {
  const map = new Map();

  for (const item of formItems || []) {
    const questionId = item?.questionItem?.question?.questionId;
    const description = (item?.description || '').trim();

    if (questionId && /^\d{4}-\d{2}-\d{2}$/.test(description)) { // checks for validity of ISO date
                                                                 // ie. xxxx-xx-xx where x is a digit
      map.set(questionId, description);
    }
  }

  return map;
}

// builds a string to check for duplicate items later
function ledgerKey(brbId, classDate, studentKey) {
  return `${brbId}||${classDate}||${studentKey}`;
}

// ---------- main ----------

async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');
  const { sheets, forms } = await getClients(SCOPES);

  // 1. Read Classes table to get form_id per class 
  const { rows: classRows, idx: classIdx } = await readSheetTable( sheets, spreadsheetId, 'Classes!A1:Z' );

  const iBrb = classIdx('brb_id');
  const iFormId = classIdx('form_id');
  const iName = classIdx('class_name');

  if (iBrb === -1 || iFormId === -1) {
    throw new Error('Classes sheet missing required columns: brb_id, form_id');
  }

  // 2. Read existing AttendanceLedger, mark what's already there
  const { headers: ledgerHeaders, rows: ledgerRows, idx: ledgerIdx } =
    await readSheetTable(sheets, spreadsheetId, 'AttendanceLedger!A1:Z');

  const lBrb = ledgerIdx('brb_id');
  const lDate = ledgerIdx('class_date');
  const lStudentKey = ledgerIdx('student_key');
  const lPresent = ledgerIdx('present');
  const lTimestamp = ledgerIdx('source_timestamp');
  const lFormId = ledgerIdx('source_form_id');
  const lSubRow = ledgerIdx('source_submission_row');

  const requiredLedgerCols = ['brb_id', 'class_date', 'student_key', 'present'];
  for (const col of requiredLedgerCols) {
    if (ledgerIdx(col) === -1) {
      throw new Error(`AttendanceLedger sheet missing required column: ${col}`);
    }
  }

  // Build a set of existing ledger keys so we can skip duplicates
  const existingKeys = new Set();
  for (const row of ledgerRows) {
    const key = ledgerKey(
      (row[lBrb] || '').trim(),
      (row[lDate] || '').trim(),
      (row[lStudentKey] || '').trim()
    );
    existingKeys.add(key);
  }

  // 3. For each class with form_id, pull responses 
  const newRows = [];
  let totalResponsesProcessed = 0;

  for (const classRow of classRows) {
    const brbId = (classRow[iBrb] || '').trim();
    const formId = (classRow[iFormId] || '').trim();
    const className = (classRow[iName] || '').trim();

    if (!brbId || !formId) continue;

    console.log(`Processing responses for ${brbId} - ${className} (form=${formId})...`);

    // 3 Get the form definition to map questionId -> date
    let formDef;
    try {
      const formRes = await forms.forms.get({ formId });
      formDef = formRes.data;
    } catch (e) {
      console.warn(
        `  Could not read form ${formId}: ${e?.message || e}. Skipping.`
      );
      continue;
    }

    const questionDateMap = buildQuestionDateMap(formDef.items);

    if (questionDateMap.size === 0) {
      console.log(`  No date-mapped questions found in form. Skipping.`);
      continue;
    }

    // 3 continued: Fetch all responses
    let responses = [];
    let nextPageToken;

    do {
      try {
        const params = { formId };
        if (nextPageToken) params.pageToken = nextPageToken;

        const respRes = await forms.forms.responses.list(params);
        const page = respRes.data.responses || [];
        responses = responses.concat(page);
        nextPageToken = respRes.data.nextPageToken;
      } catch (e) {
        console.warn(`  Could not fetch responses for form ${formId}: ${e?.message || e}. Skipping.`);
        responses = [];
        nextPageToken = undefined;
        break;
      }
    } while (nextPageToken);

    if (!responses.length) {
      console.log(`  No responses found.`);
      continue;
    }

    console.log(`  Found ${responses.length} response(s).`);

    // 3 continued: Parse each response
    for (let rIdx = 0; rIdx < responses.length; rIdx++) {
      const response = responses[rIdx];
      const submissionTimestamp = response.lastSubmittedTime || response.createTime || '';
      const answers = response.answers || {};

      for (const [questionId, answer] of Object.entries(answers)) {
        const classDate = questionDateMap.get(questionId);
        if (!classDate) continue; // question not mapped to a date

        // Each answer has textAnswers.answers[] with checkbox selections
        const textAnswers = answer?.textAnswers?.answers || [];

        for (const ta of textAnswers) {
          const studentKey = parseStudentKey(ta.value);
          if (!studentKey) continue;

          const key = ledgerKey(brbId, classDate, studentKey);

          if (existingKeys.has(key)) continue; // already recorded

          // Build the new row
          const newRow = new Array(ledgerHeaders.length).fill('');

          newRow[lBrb] = brbId;
          newRow[lDate] = classDate;
          newRow[lStudentKey] = studentKey;
          newRow[lPresent] = 'true';

          if (lTimestamp !== -1) newRow[lTimestamp] = submissionTimestamp;
          if (lFormId !== -1) newRow[lFormId] = formId;
          if (lSubRow !== -1) newRow[lSubRow] = String(rIdx + 1);

          newRows.push(newRow);
          existingKeys.add(key); // prevent duplicates within this run
        }
      }

      totalResponsesProcessed++;
    }
  }

  // 4. Append new rows to AttendanceLedger 
  if (newRows.length === 0) {
    console.log(`\nNo new attendance records to write.`);
  } else {
    // Append starting after the last existing row
    const startRow = ledgerRows.length + 2; // +1 for header, +1 for 1-indexed

    // Batch the writes in chunks to stay within API limits
    const CHUNK_SIZE = 500;

    for (let i = 0; i < newRows.length; i += CHUNK_SIZE) {
      const chunk = newRows.slice(i, i + CHUNK_SIZE);
      const rangeStart = startRow + i;
      const lastCol = colToA1(ledgerHeaders.length);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `AttendanceLedger!A${rangeStart}:${lastCol}${rangeStart + chunk.length - 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: chunk },
      });
    }

    console.log(`\nWrote ${newRows.length} new attendance record(s) to AttendanceLedger.`);
  }

  console.log(`Processed ${totalResponsesProcessed} total form response(s).`);
  console.log('Done.');
}

main().catch((e) => {
  console.error('Error message:', e?.message || e);
  console.error('Error code:', e?.code);
  console.error('Error status:', e?.response?.status);
  console.error('Error data:', JSON.stringify(e?.response?.data, null, 2));
  process.exit(1);
});