import { getCatalog, getOrdersByProductId } from '../ecwid.js';
import { mustEnv, getClients, overwriteTab, readHeaders } from './google-utils.js';
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

// ---------- main logic ----------

async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');

  const { sheets } = await getClients(['https://www.googleapis.com/auth/spreadsheets',]);

  // Pull class products from Ecwid, id taken from all-classes in roster
  const CATEGORY_IDS = [175340602];
  const classes = await getCatalog(CATEGORY_IDS);

  // Build rows in Classes based on sheet headers
  const { headers: classHeaders, idx: classIdx } = await readHeaders(sheets,spreadsheetId,'Classes');

  const requiredClassCols = ['brb_id','ecwid_product_id','class_name','teacher_emails','day_of_week',
    'start_date','end_date','class_status'];

  for (const col of requiredClassCols) {
    if (classIdx(col) === -1) {throw new Error(`Missing required column ${col} in Classes tab`);}
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

  for (const c of classes) {
    if (!c?.enabled) continue;

    const brbId = getAttributeValue(c, 'brb_id');
    if (!brbId) {
      console.warn(`Class ${c?.name || '(unnamed)'} is missing brb_id, skipping`);
      continue;
    }

    const classType = getAttributeValue(c, 'class_type');
    const teacherEmails = getAttributeValue(c, 'teacher_emails');
    const dayOfWeek = getAttributeValue(c, 'day_of_week');
    const startDate = getAttributeValue(c, 'start_date');
    const endDate = getAttributeValue(c, 'end_date');
    const classStatus = getAttributeValue(c, 'class_status') || 'planned';

    // --- Classes row ---
    const classRow = new Array(classHeaders.length).fill('');
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
    const orders = await getOrdersByProductId(c.id);

    for (const order of orders || []) {
      if (![IN_PROGRESS, NEW_ORDER].includes(order?.fulfillmentStatus)) continue;

      for (const item of order?.items || []) {
        if (item?.productId !== c.id) continue;

        // prefer extra fields, fallback to selectedOptions
        const getExtra = (title) =>
          order?.orderExtraFields?.find((f) => f?.title === title)?.value;

        let name1 = getExtra("First Student's Name");
        let grade1 = getExtra("First Student's Grade");
        let name2 = getExtra("[Optional] Second Student's Name");
        let grade2 = getExtra("[Optional] Second Student's Grade");

        const options = item?.selectedOptions || [];
        const getOpt = (name) => options.find((opt) => opt?.name === name)?.value;

        if (!name1) name1 = getOpt("Student's Name");
        if (!grade1) grade1 = getOpt("Student's Grade");
        if (!name2) name2 = getOpt("Additional Name (if signing up more than one)");
        if (!grade2) grade2 = getOpt("Additional Grade");

        const parentEmail = order?.email || '';
        const parentName = order?.billingPerson?.name || '';
        const parentPhone = order?.billingPerson?.phone || '';
        const orderId = order?.id ? String(order.id) : '';
        const purchaseDate = order?.purchaseDate || '';

        // add first student
        if (name1) {
          const sk = studentKey(parentEmail, name1);
          const row = new Array(enrollmentHeaders.length).fill('');

          row[enrollIdx('brb_id')] = brbId;
          row[enrollIdx('student_key')] = sk;
          row[enrollIdx('student_name')] = name1;

          if (enrollIdx('parent_name') !== -1) {row[enrollIdx('parent_name')] = parentName;}
          if (enrollIdx('parent_email') !== -1) {row[enrollIdx('parent_email')] = parentEmail;}
          if (enrollIdx('parent_phone') !== -1) {row[enrollIdx('parent_phone')] = parentPhone;}
          if (enrollIdx('order_id') !== -1) {row[enrollIdx('order_id')] = orderId;}
          if (enrollIdx('purchase_date') !== -1) {row[enrollIdx('purchase_date')] = purchaseDate;}
          if (enrollIdx('active') !== -1) {row[enrollIdx('active')] = 'true';}
          if (enrollIdx('last_sync_at') !== -1) {row[enrollIdx('last_sync_at')] = new Date().toISOString();}

          enrollmentRows.push(row);
        }

        // add second student if quantity > 1
        if ((item?.quantity || 0) > 1 && name2) {
          const sk = studentKey(parentEmail, name2);
          const row = new Array(enrollmentHeaders.length).fill('');

          row[enrollIdx('brb_id')] = brbId;
          row[enrollIdx('student_key')] = sk;
          row[enrollIdx('student_name')] = name2;

          if (enrollIdx('parent_name') !== -1) {row[enrollIdx('parent_name')] = parentName;}
          if (enrollIdx('parent_email') !== -1) {row[enrollIdx('parent_email')] = parentEmail;}
          if (enrollIdx('parent_phone') !== -1) {row[enrollIdx('parent_phone')] = parentPhone;}
          if (enrollIdx('order_id') !== -1) {row[enrollIdx('order_id')] = orderId;}
          if (enrollIdx('purchase_date') !== -1) {row[enrollIdx('purchase_date')] = purchaseDate;}
          if (enrollIdx('active') !== -1) {row[enrollIdx('active')] = 'true';}
          if (enrollIdx('last_sync_at') !== -1) {row[enrollIdx('last_sync_at')] = new Date().toISOString();}

          enrollmentRows.push(row);
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