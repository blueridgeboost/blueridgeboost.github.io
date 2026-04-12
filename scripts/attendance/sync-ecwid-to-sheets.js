import { getCatalog, getOrdersByProductId } from '../ecwid.js';
import { mustEnv, getClients, overwriteTab, readHeaders, readSheetTable } from './google-utils.js';
import path from 'path';
import dotenv from 'dotenv';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

// note: could add ecwid product items: teacherEmails and/or sessionlength

// ---------- helpers ----------

function getAttributeValue(product, attributeName) {
  const attribute = product?.attributes?.find((a) => a?.name === attributeName);
  return attribute?.value ?? '';
}

function normalizeKey(s) {
  return (s || '').trim().toLowerCase();
}

function studentKey(parentEmail, studentName) {
  return `${normalizeKey(parentEmail)}|${normalizeKey(studentName)}`;
}

// Builds a row for the Enrollments sheet based on the provided enrollment data
function buildEnrollmentRow(enrollIdx, enrollmentHeaders, { brbId, studentName, parentEmail, parentName, parentPhone, orderId, purchaseDate }) {
  const sk = studentKey(parentEmail, studentName);
  const row = new Array(enrollmentHeaders.length).fill('');

  row[enrollIdx('brb_id')] = brbId;
  row[enrollIdx('student_key')] = sk;
  row[enrollIdx('student_name')] = studentName;

  if (enrollIdx('parent_name') !== -1) row[enrollIdx('parent_name')] = parentName;
  if (enrollIdx('parent_email') !== -1) row[enrollIdx('parent_email')] = parentEmail;
  if (enrollIdx('parent_phone') !== -1) row[enrollIdx('parent_phone')] = parentPhone;
  if (enrollIdx('order_id') !== -1) row[enrollIdx('order_id')] = orderId;
  if (enrollIdx('purchase_date') !== -1) row[enrollIdx('purchase_date')] = purchaseDate;
  if (enrollIdx('active') !== -1) row[enrollIdx('active')] = 'true';
  if (enrollIdx('last_sync_at') !== -1) row[enrollIdx('last_sync_at')] = new Date().toISOString();

  return row;
}

// utility function to process items concurrently with max limit. 
async function mapWithConcurrency(items, fn, concurrency = 3) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

// ---------- main logic ----------

async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');

  const { sheets } = await getClients(['https://www.googleapis.com/auth/spreadsheets',]);

  // Pull class products from Ecwid, id taken from all-classes in roster
  const CATEGORY_IDS = [175340602];
  const classes = await getCatalog(CATEGORY_IDS);

  // Build rows in Classes based on headers and rows
  const { headers: classHeaders, rows: existingClassRows, idx: classIdx } = await readSheetTable(sheets,spreadsheetId,'Classes!A1:Z');

  const requiredClassCols = ['brb_id','ecwid_product_id','class_name','teacher_emails','day_of_week',
    'start_date','end_date','class_status'];

  for (const col of requiredClassCols) {
    if (classIdx(col) === -1) {throw new Error(`Missing required column ${col} in Classes tab`);}
  }

  const existingBRBIds = new Map();
  for (const row of existingClassRows) {
    const existingBRBId = String(row[classIdx('brb_id')] || '').trim();
    if (!existingBRBId) continue;
    existingBRBIds.set(existingBRBId, row);
  }

  const { headers: enrollmentHeaders, idx: enrollIdx } = await readHeaders(sheets,spreadsheetId,'Enrollments');

  const requiredEnrollCols = ['brb_id','student_key','student_name','parent_email',];

  for (const col of requiredEnrollCols) {
    if (enrollIdx(col) === -1) {throw new Error(`Missing required column ${col} in Enrollments tab`);}
  }

  const classRows = [];
  const enrollmentRows = [];

  const IN_PROGRESS = 'CUSTOM_FULFILLMENT_STATUS_1';
  const NEW_ORDER = 'AWAITING_PROCESSING';

  const enabledClasses = classes.filter((c) => {
    if (!c?.enabled) return false;
    const brbId = getAttributeValue(c, 'brb_id');
    if (!brbId) {
      console.warn(`Class ${c?.name || '(unnamed)'} is missing brb_id, skipping`);
      return false;
    }
    return true;
  });

  // Fetch orders for all classes concurrently (max 3 at a time to avoid rate limits)
  const ordersPerClass = await mapWithConcurrency(
    enabledClasses,
    (c) => getOrdersByProductId(c.id),
    3
  );

  for (let ci = 0; ci < enabledClasses.length; ci++) {
    const c = enabledClasses[ci];
    const brbId = getAttributeValue(c, 'brb_id');

    const classType = getAttributeValue(c, 'class_type');
    const teacherEmails = getAttributeValue(c, 'teacher_emails');
    const dayOfWeek = getAttributeValue(c, 'day_of_week');
    const startDate = getAttributeValue(c, 'start_date');
    const endDate = getAttributeValue(c, 'end_date');
    const classStatus = getAttributeValue(c, 'class_status') || 'planned';

    // --- Classes row ---
    // if we have existing row for this BRB ID, copy it and overwrite with new values, otherwise create new row
    const classRow = existingBRBIds.has(brbId)
     ? [...existingBRBIds.get(brbId)] : new Array(classHeaders.length).fill('');

    classRow[classIdx('brb_id')] = brbId;
    classRow[classIdx('ecwid_product_id')] = String(c.id ?? '');
    classRow[classIdx('class_name')] = c.name || '';

    if (classIdx('class_type') !== -1) {classRow[classIdx('class_type')] = classType;}
    if (classIdx('teacher_emails') !== -1) {classRow[classIdx('teacher_emails')] = teacherEmails;}
    if (classIdx('day_of_week') !== -1) {classRow[classIdx('day_of_week')] = dayOfWeek;}
    if (classIdx('start_date') !== -1) {classRow[classIdx('start_date')] = startDate;}
    if (classIdx('end_date') !== -1) {classRow[classIdx('end_date')] = endDate;}
    if (classIdx('class_status') !== -1) {classRow[classIdx('class_status')] = classStatus;}
    if (classIdx('last_roster_sync_at') !== -1) {classRow[classIdx('last_roster_sync_at')] = new Date().toISOString();}

    classRows.push(classRow);

    // --- Pull orders for this class → build enrollment rows ---
    const orders = ordersPerClass[ci];

    for (const order of orders || []) {
      if (![IN_PROGRESS, NEW_ORDER].includes(order?.fulfillmentStatus)) continue;

      for (const item of order?.items || []) {
        if (item?.productId !== c.id) continue;

        // prefer extra fields, fallback to selectedOptions
        const getExtra = (title) =>
          order?.orderExtraFields?.find((f) => f?.title === title)?.value;

        let name1 = getExtra("First Student's Name");
        let name2 = getExtra("[Optional] Second Student's Name");

        const options = item?.selectedOptions || [];
        const getOpt = (name) => options.find((opt) => opt?.name === name)?.value;

        if (!name1) name1 = getOpt("Student's Name");
        if (!name2) name2 = getOpt("Additional Name (if signing up more than one)");

        const shared = {
          brbId,
          parentEmail: order?.email || '',
          parentName: order?.billingPerson?.name || '',
          parentPhone: order?.billingPerson?.phone || '',
          orderId: order?.id ? String(order.id) : '',
          purchaseDate: order?.purchaseDate || '',
        };

        if (name1) {
          enrollmentRows.push(buildEnrollmentRow(enrollIdx, enrollmentHeaders, { ...shared, studentName: name1 }));
        }

        if ((item?.quantity || 0) > 1 && name2) {
          enrollmentRows.push(buildEnrollmentRow(enrollIdx, enrollmentHeaders, { ...shared, studentName: name2 }));
        }
      }
    }
  }

  await overwriteTab(sheets, spreadsheetId, 'Classes', classRows);
  await overwriteTab(sheets, spreadsheetId, 'Enrollments', enrollmentRows);

  console.log(`Synced Classes: ${classRows.length}`);
  console.log(`Synced Enrollments: ${enrollmentRows.length}`);
}

main().catch((err) => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});