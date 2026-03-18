import { google } from 'googleapis';

export function mustEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name} in .env`);
    return v;
}

export async function getClients(scopes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: mustEnv('GOOGLE_KEYFILE'),
    scopes,
  });

  const authClient = await auth.getClient();

  return {
    sheets: google.sheets({ version: 'v4', auth: authClient }),
    forms: google.forms({ version: 'v1', auth: authClient }),
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
  const res = await forms.forms.create({
    requestBody: {
        info: {
            title: `${className} Attendance`,
            description: `Internal class ID: ${brbId}`,
        },
        documentTitle: `${className} Attendance`,
    },
  });

  const formId = res.data.formId;
  const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
  const viewUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

  return { formId, editUrl, viewUrl };
}

export async function getForm(forms, formId) {
  return forms.forms.get({ formId });
}
