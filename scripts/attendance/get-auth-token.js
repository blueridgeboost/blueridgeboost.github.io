// this is a startup script to get a refresh token for O-Auth2.0 authentication
import { google } from 'googleapis';
import readline from 'readline';
import path from 'path';
import dotenv from 'dotenv';
import { mustEnv } from './google-utils.js';

const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// which google API's we need to use
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
];

function askQuestion(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {rl.close();resolve(answer.trim());});
  });
}

async function main() {
    // can be obtained from google cloud console auth2.0 credentials page
    const clientId = mustEnv('GOOGLE_CLIENT_ID');
    const clientSecret = mustEnv('GOOGLE_CLIENT_SECRET');
    const redirectUri = mustEnv('GOOGLE_REDIRECT_URI');

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const authUrl = oAuth2Client.generateAuthUrl({access_type: 'offline',prompt: 'consent',scope: SCOPES,});
  
    console.log('Authorize this app by visiting this url:', authUrl);
    const code = await askQuestion('Enter the code from that page here: ');

    const { tokens } = await oAuth2Client.getToken(code);

    console.log('\nSuccess.\n');
    console.log('Add these to your .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || ''}`);
    console.log('\nFull token response:\n');
    console.log(JSON.stringify(tokens, null, 2));

    if (!tokens.refresh_token) {console.log(
        '\nNo refresh token was returned. Make sure you used prompt="consent", access_type="offline", and approved with a test user account that has not already granted this exact app/scopes combination.'
    );
  }
}


main().catch((err) => {
    console.error('OAuth setup failed.');
    console.error('Message:', err?.message || err);
    console.error('Status:', err?.response?.status);
    console.error('Data:', JSON.stringify(err?.response?.data, null, 2));
    process.exit(1);
});