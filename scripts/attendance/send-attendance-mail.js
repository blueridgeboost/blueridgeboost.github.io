import mailchimp from '@mailchimp/mailchimp_transactional';
import path from 'path';
import dotenv from 'dotenv';
import { mustEnv, getClients, readClassesTable } from './google-utils.js';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const client = new mailchimp(mustEnv('MAILCHIMP_KEY'));

function sendAttendanceEmail(teacherEmail, classes) {
  const classListHtml = classes
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px; border:1px solid #ddd;">${c.className}</td>
          <td style="padding:8px 12px; border:1px solid #ddd;">
            <a href="${c.formUrl}">${c.formUrl}</a>
          </td>
        </tr>`
    )
    .join('\n');

  const html = `
    <p>Hi,</p>
    <p>Here are your attendance forms. Please fill these out for each class session:</p>
    <table style="border-collapse:collapse; margin:16px 0;">
      <thead>
        <tr>
          <th style="padding:8px 12px; border:1px solid #ddd; text-align:left;">Class</th>
          <th style="padding:8px 12px; border:1px solid #ddd; text-align:left;">Attendance Form</th>
        </tr>
      </thead>
      <tbody>
        ${classListHtml}
      </tbody>
    </table>
    <p>Thank you,<br>Blue Ridge Boost</p>
  `;

  return client.messages.send({
    message: {
      from_email: 'lain@blueridgeboost.com',
      from_name: 'Blue Ridge Boost',
      to: [{ email: teacherEmail, type: 'to' }],
      subject: 'Your Attendance Forms',
      html,
    },
  });
}

async function main() {
  const spreadsheetId = mustEnv('ATTENDANCE_SPREADSHEET_ID');
  const { sheets } = await getClients(SCOPES);

  const { rows, idx } = await readClassesTable(sheets, spreadsheetId);

  const iName = idx('class_name');
  const iFormId = idx('form_id');
  const iRespUrl = idx('form_response_url');
  const iTeacherEmail = idx('teacher_email');

  if (iTeacherEmail === -1) {
    throw new Error('Classes sheet is missing "teacher_email" column');
  }

  // Group classes by teacher email so each teacher gets one email
  const teacherMap = new Map();

  for (const row of rows) {
    const className = (row[iName] || '').trim();
    const formId = (row[iFormId] || '').trim();
    const formUrl = (row[iRespUrl] || '').trim();
    const teacherEmail = (row[iTeacherEmail] || '').trim().toLowerCase();

    if (!teacherEmail || !formId || !className) continue;

    const url = formUrl || `https://docs.google.com/forms/d/${formId}/viewform`;

    if (!teacherMap.has(teacherEmail)) {
      teacherMap.set(teacherEmail, []);
    }
    teacherMap.set(teacherEmail, [
      ...teacherMap.get(teacherEmail),
      { className, formUrl: url },
    ]);
  }

  if (teacherMap.size === 0) {
    console.log('No classes with teacher emails and form IDs found. Nothing to send.');
    return;
  }

  let sentCount = 0;

  for (const [teacherEmail, classes] of teacherMap) {
    console.log(`Sending ${classes.length} form(s) to ${teacherEmail}...`);
    try {
      const result = await sendAttendanceEmail(teacherEmail, classes);
      console.log(`  Sent to ${teacherEmail}:`, result?.[0]?.status || 'ok');
      sentCount++;
    } catch (err) {
      console.error(`  Failed to send to ${teacherEmail}: ${err.message}`);
    }
  }

  console.log(`Done. Sent emails to ${sentCount} teacher(s).`);
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});
