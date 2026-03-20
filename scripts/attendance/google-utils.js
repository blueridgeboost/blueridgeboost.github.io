import { google } from 'googleapis';

export function mustEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name} in .env`);
    return v;
}

function hasOAuthEnv() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

export async function getAuthClient(scopes = []) {
  if (hasOAuthEnv()) { // only if oAuth variables are set
    const oauth2Client = new google.auth.OAuth2(
      mustEnv('GOOGLE_CLIENT_ID'),
      mustEnv('GOOGLE_CLIENT_SECRET'),
      mustEnv('GOOGLE_REDIRECT_URI')
    );

    oauth2Client.setCredentials({refresh_token: mustEnv('GOOGLE_REFRESH_TOKEN'),});
    return oauth2Client;
  }
  // else use service account
  const auth = new google.auth.GoogleAuth({
    keyFile: mustEnv('GOOGLE_KEYFILE'),
    scopes,
  });

  return auth.getClient();
}

export async function getClients(scopes = []) {
  const authClient = await getAuthClient(scopes);

  return {
    sheets: google.sheets({ version: 'v4', auth: authClient }),
    forms: google.forms({ version: 'v1', auth: authClient }),
    drive: google.drive({ version: 'v3', auth: authClient }),
  };
}

// logic for converting column count -> A1 column letter (1->A, 26->Z, 27->AA)
export function colToA1(n) {
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}


export async function writeCell(sheets, spreadsheetId, sheetName, colIndex0, rowIndex1, value) {
    const colLetter = colToA1(colIndex0 + 1);
    const range = `${sheetName}!${colLetter}${rowIndex1}`;
    await sheets.spreadsheets.values.update({spreadsheetId,range,valueInputOption: 'RAW',requestBody: { values: [[value]] },});
}

export async function overwriteTab(sheets, spreadsheetId, tabName,rows) {
  // Clear everything below the header row, then write new data starting A2.
  await sheets.spreadsheets.values.clear({spreadsheetId,range: `${tabName}!A2:ZZ`,});
  
  if (!rows.length) return;

  await sheets.spreadsheets.values.update({spreadsheetId,
    range: `${tabName}!A2`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}


export async function readHeaders(sheets, spreadsheetId, tabName) {
  const res = await sheets.spreadsheets.values.get({spreadsheetId,range: `${tabName}!1:1`,});
  const headers = (res.data.values?.[0] || []).map(h => (h || '').trim());
  const idx = (name) => headers.indexOf(name);
  return { headers, idx };
}

export async function readSheetTable(sheets, spreadsheetId, range) {
    const res = await sheets.spreadsheets.values.get({spreadsheetId,range,});
    const values = res.data.values || [];
    const headers = (values[0] || []).map((h) => (h || '').trim());
    const rows = values.slice(1);
    const idx = (name) => headers.indexOf(name);

    return { headers, rows, idx };
}

export async function readClassesTable(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({spreadsheetId,range: 'Classes!A1:Z',});

  const values = res.data.values || [];
  if (values.length < 2) return { headers: values[0] || [], rows: [] };

  const headers = values[0].map((h) => (h || '').trim());
  const rows = values.slice(1);
  const idx = (name) => headers.indexOf(name);

  const required = ['brb_id', 'class_name', 'form_id'];
  for (const r of required) {
    if (idx(r) === -1) throw new Error(`Classes sheet missing required header: ${r}`);
  }

  return { headers, rows, idx };
}

export async function createAttendanceForm(forms, className, brbId) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await forms.forms.create({
        requestBody: {
          info: {
            title: `${className} Attendance`,
            documentTitle: `${className} Attendance`,
          },
        },
      });

      const formId = res.data.formId;
      const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
      const viewUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

      return { formId, editUrl, viewUrl };
    } catch (e) {
      lastError = e;
      const status = e?.response?.status;

      if (attempt < 3 && (status === 500 || status === 502 || status === 503 || status === 504 || !status)) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }

      throw e;
    }
  }

  throw lastError;
}

export async function getForm(forms, formId) {
  return forms.forms.get({ formId });
}
