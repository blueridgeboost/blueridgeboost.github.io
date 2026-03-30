import { getOrdersByProductId } from '../ecwid.js';
import path from 'path';
import dotenv from 'dotenv';
import {mustEnv, getClients, writeCellsBatch, readSheetTable, colToA1,} from './google-utils.js';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
];

// ---------- helpers ----------

function normalizeBool(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function nowIso() {
  return new Date().toISOString();
}

function toISODateUTC(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getWeekStartMonday(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// possible day values in days_of_week
const DAY_NAME_MAP = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizeDaysOfWeek(raw) {
  if (!raw) return [];

  let values = [];

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      values = raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  } else {
    values = [String(raw)];
  }

  const unique = new Set();

  for (const value of values) {
    const key = String(value).trim().toLowerCase();
    const dayIndex = DAY_NAME_MAP[key];
    if (dayIndex != null) unique.add(dayIndex);
  }

  return Array.from(unique).sort((a, b) => a - b);
}

function extractDaysOfWeekFromOrder(order, productId) {
  const candidates = [];

  if (Array.isArray(order?.items)) {
    for (const item of order.items) {
      if (String(item?.productId || '') === String(productId)) {
        if (item.days_of_week) candidates.push(item.days_of_week);
        if (item?.options?.days_of_week) candidates.push(item.options.days_of_week);
        if (item?.selectionInfo?.days_of_week) candidates.push(item.selectionInfo.days_of_week);

        if (Array.isArray(item?.selectedOptions)) {
          for (const opt of item.selectedOptions) {
            if (/days?_of_week/i.test(String(opt?.name || ''))) {
              candidates.push(opt.value);
            }
          }
        }
      }
    }
  }

  if (Array.isArray(order?.customFields)) {
    for (const field of order.customFields) {
      if (/days?_of_week/i.test(String(field?.title || field?.name || ''))) {
        candidates.push(field.value);
      }
    }
  }

  if (order?.days_of_week) candidates.push(order.days_of_week);

  for (const candidate of candidates) {
    const normalized = normalizeDaysOfWeek(candidate);
    if (normalized.length) return normalized;
  }

  return [];
}

function buildOrderDayLookup(orders, productId) {
  const map = new Map();

  for (const order of orders) {
    const orderId = String(order?.id || '').trim();
    if (!orderId) continue;
    map.set(orderId, extractDaysOfWeekFromOrder(order, productId));
  }

  return map;
}

function buildStudentsPerDay({ enrollments, orderDaysMap, classDefaultDays }) {
  const studentsByDay = new Map();
  for (let d = 0; d < 7; d++) studentsByDay.set(d, []);

  for (const enrollment of enrollments) {
    if (!normalizeBool(enrollment.active)) continue;

    const studentKey = String(enrollment.student_key || '').trim();
    const studentName = String(enrollment.student_name || '').trim();
    const orderId = String(enrollment.order_id || '').trim();

    if (!studentKey || !studentName) continue;

    const allowedDays = orderDaysMap.get(orderId)?.length
      ? orderDaysMap.get(orderId)
      : classDefaultDays;

    for (const dayIndex of allowedDays) {
      studentsByDay.get(dayIndex).push({
        studentKey,
        studentName,
      });
    }
  }

  for (const [dayIndex, students] of studentsByDay.entries()) {
    const seen = new Set();
    const unique = students
      .filter((s) => {
        const key = s.studentKey || s.studentName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    studentsByDay.set(dayIndex, unique);
  }

  return studentsByDay;
}

function buildWeekSessionsFromDayIndexes(dayIndexes, weekStart) {
  const weekStartDow = weekStart.getUTCDay();

  return dayIndexes.map((dayIndex) => {
    const offset = dayIndex - weekStartDow;
    const sessionDate = addDaysUTC(weekStart, offset);

    return {
      dayIndex,
      dayName: DAY_LABELS[dayIndex],
      isoDate: toISODateUTC(sessionDate),
      questionTitle: DAY_LABELS[dayIndex],
    };
  });
}

async function getForm(forms, formId) {
  return forms.forms.get({ formId });
}

async function replaceFormQuestions(forms, formId, { classId, className, weekStart, sessions }) {
  const formRes = await getForm(forms, formId);
  const items = formRes.data.items || [];

  const deleteRequests = items
    .filter((item) => typeof item.index === 'number')
    .map((item) => ({
      deleteItem: { location: { index: item.index } },
    }))
    .sort((a, b) => b.deleteItem.location.index - a.deleteItem.location.index);

  const weekStartIso = toISODateUTC(weekStart);
  const weekEndIso = toISODateUTC(addDaysUTC(weekStart, 6));

  const updateInfoRequest = {
    updateFormInfo: {
      info: {
        title: `${className} Attendance`,
        description: [
          `Internal class ID: ${classId}`,
          `Current week: ${weekStartIso} to ${weekEndIso}`,
          'Generated automatically. Each question is a class day for this week.',
        ].join('\n'),
      },
      updateMask: 'title,description',
    },
  };

  const createRequests = sessions.map((session, index) => ({
    createItem: {
      location: { index },
      item: {
        title: session.questionTitle,
        description: session.isoDate,
        questionItem: {
          question: {
            required: false,
            choiceQuestion: {
              type: 'CHECKBOX',
              options: session.students.length
                ? session.students.map((s) => ({
                    value: `${s.studentName} [${s.studentKey}]`,
                  }))
                : [{ value: '(No students scheduled)' }],
            },
          },
        },
      },
    },
  }));

  const requests = [updateInfoRequest, ...deleteRequests, ...createRequests];

  await forms.forms.batchUpdate({
    formId,
    requestBody: { requests },
  });
}

// ---------- main ----------
async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');
  const { sheets, forms } = await getClients(SCOPES);

  const classesTable = await readSheetTable(sheets, spreadsheetId, 'Classes!A1:Z');
  const enrollmentsTable = await readSheetTable(sheets, spreadsheetId, 'Enrollments!A1:Z');

  const { rows: classRows, idx: classIdx } = classesTable;
  const { rows: enrollmentRows, idx: enrollmentIdx } = enrollmentsTable;

  const iBrb = classIdx('brb_id');
  const iName = classIdx('class_name');
  const iProductId = classIdx('ecwid_product_id');
  const iClassDays = classIdx('day_of_week');
  const iFormId = classIdx('form_id');
  const iLastSync = classIdx('last_roster_sync_at');

  const eBrb = enrollmentIdx('brb_id');
  const eStudentKey = enrollmentIdx('student_key');
  const eStudentName = enrollmentIdx('student_name');
  const eOrderId = enrollmentIdx('order_id');
  const eActive = enrollmentIdx('active');

  const weekStart = getWeekStartMonday(new Date());

  for (let r = 0; r < classRows.length; r++) {
    const row = classRows[r];

    const brbId = (row[iBrb] || '').trim();
    const className = (row[iName] || '').trim();
    const productId = (row[iProductId] || '').trim();
    const formId = (row[iFormId] || '').trim();
    const classDefaultDays = normalizeDaysOfWeek(row[iClassDays] || '');

    if (!brbId || !className || !productId || !formId) continue;

    console.log(`Updating weekly attendance questions for ${brbId} - ${className}...`);

    const classEnrollments = enrollmentRows
      .map((erow) => ({
        brb_id: erow[eBrb] || '',
        student_key: erow[eStudentKey] || '',
        student_name: erow[eStudentName] || '',
        order_id: erow[eOrderId] || '',
        active: erow[eActive] || '',
      }))
      .filter((e) => String(e.brb_id).trim() === brbId);

    /* Has issue with with Ecwis Api - returns: Failed to fetch orders: Forbidden
    const orders = await getOrdersByProductId(productId);
    const orderDaysMap = buildOrderDayLookup(Array.isArray(orders) ? orders : [], productId);

    const studentsByDay = buildStudentsPerDay({
      enrollments: classEnrollments,
      orderDaysMap,
      classDefaultDays,
    });
    */

   // for now just use the google sheet to build roster. 
    const studentsByDay = buildStudentsPerDay({
      enrollments: classEnrollments,
      orderDaysMap: new Map(),
      classDefaultDays,
    });

    const activeDayIndexes = Array.from(studentsByDay.entries())
      .filter(([, students]) => students.length > 0)
      .map(([dayIndex]) => dayIndex)
      .sort((a, b) => a - b);

    const fallbackDayIndexes = activeDayIndexes.length ? activeDayIndexes : classDefaultDays;

    const sessions = buildWeekSessionsFromDayIndexes(fallbackDayIndexes, weekStart).map((session) => ({
      ...session,
      students: studentsByDay.get(session.dayIndex) || [],
    }));

    await replaceFormQuestions(forms, formId, {
      classId: brbId,
      className,
      weekStart,
      sessions,
    });

    const sheetRow = r + 2;
    if (iLastSync !== -1) {
      await writeCellsBatch(sheets, spreadsheetId, [
        {
          range: `Classes!${colToA1(iLastSync + 1)}${sheetRow}`,
          values: [[nowIso()]],
        },
      ]);
    }

    console.log(`Updated formId=${formId}`);
  }

  console.log('Done updating weekly attendance questions.');
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});