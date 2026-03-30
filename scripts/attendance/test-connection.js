import path from 'path';
import dotenv from 'dotenv';
import { google } from 'googleapis';

// Load .env (adjust path if needed)
dotenv.config({ path: path.join(process.cwd(),'..', '.env') });

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
];

async function main() {
  console.log('--- Checking ENV ---');

  const clientId = mustEnv('GOOGLE_CLIENT_ID');
  const clientSecret = mustEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = mustEnv('GOOGLE_REDIRECT_URI');
  const refreshToken = mustEnv('GOOGLE_REFRESH_TOKEN');

  console.log('CLIENT_ID OK');
  console.log('CLIENT_SECRET OK');
  console.log('REDIRECT_URI OK');
  console.log('REFRESH_TOKEN OK');

  console.log('\n--- Creating OAuth client ---');

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  console.log('OAuth client created');

  console.log('\n--- Testing token refresh ---');

  const accessToken = await auth.getAccessToken();

  if (!accessToken?.token) {
    throw new Error('Failed to obtain access token');
  }

  console.log('Access token acquired');

  console.log('\n--- Testing Drive API ---');

  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    pageSize: 5,
    fields: 'files(id, name)',
  });

  console.log('Drive API success');
  console.log('Sample files:', res.data.files);

  console.log('\n--- SUCCESS ---');
  console.log('OAuth + scopes are working correctly');
}

main().catch((err) => {
  console.error('\n--- FAILED ---');
  console.error('Message:', err?.message || err);
  console.error('Status:', err?.response?.status);
  console.error('Data:', JSON.stringify(err?.response?.data, null, 2));
  process.exit(1);
});