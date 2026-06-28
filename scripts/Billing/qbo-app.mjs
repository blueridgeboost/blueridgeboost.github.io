import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import qs from 'qs';
import cookieSession from 'cookie-session';
import crypto from 'crypto';
import {deleteUnusedItems, deleteStripeReceiptsInRange} from './qbo-commons.mjs'

dotenv.config({ path: path.join('..', '.env') });

const app = express();
app.use(express.json());
app.use(cookieSession({ 
    name: 'sess', 
    keys: [process.env.SESSION_SECRET], 
    sameSite: 'lax', 
    secure: true }));
app.set('trust proxy', 1);

app.get('/deleteUnusedItems', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId in session. Reconnect.');
  if (needsRefresh(tokens)) {
      try {
        const newTokens = await refreshTokens(tokens.refresh_token);
        req.session.tokens = newTokens; // persist
        tokens = newTokens;
      } catch (err) {
        // If refresh fails, force reconnect
        if (err.response?.status === 400) {
          return res.status(401).send('QBO session expired. Please reconnect at /auth/connect');
        }
        throw err;
      }
    }

  try {
    const items = await deleteUnusedItems({ tokens, realmId, apiBase: process.env.API_BASE });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>BRB </h1>
    <p><a href="/auth/connect">Connect to QuickBooks</a></p>
    <p><a href="/deleteUnusedItems">Delete Unused Products/Services</a></p>
    <p><a href="/logout">Logout</a></p>
  `);
});

app.get('/auth/connect', (req, res) => {
  const state = b64url(crypto.randomBytes(16));
  req.session.state = state;

  const scope = encodeURIComponent('com.intuit.quickbooks.accounting');

  const authUrl =
    `${process.env.AUTH_URL}?client_id=${encodeURIComponent(process.env.QBO_CLIENT_ID)}`+
    `&scope=${scope}`+
    `&redirect_uri=${encodeURIComponent(process.env.QBO_REDIRECT_URI)}`+
    `&response_type=code`+
    `&state=${state}`;

  // console.log('/auth/connect', authUrl);
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  // console.log('Processing /auth/callback');
  // console.log('callback query:', req.query);
  // console.log('session before:', req.session);
  const { code, state, realmId, error, error_description } = req.query;
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.status(400).send(`${error}: ${error_description || ''}`);
  }


  if (!code || !state) return res.status(400).send('Missing code or state');
  if (state !== req.session.state) return res.status(400).send('Invalid state');

  const clientId = (process.env.QBO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.QBO_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.QBO_REDIRECT_URI || '').trim();

  try {
    const body = qs.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const tokenRes = await axios.post(process.env.TOKEN_URL, body, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      timeout: 15000
    });

    req.session.tokens = tokenRes.data;
    req.session.realmId = realmId;

    console.log('Token exchange OK (Basic). realmId:', realmId || '(missing)');
    if (!realmId) {
      return res.status(400).send('Missing realmId in callback (no company selected).');
    }
    // console.log('session after token:', req.session);
    res.redirect('/me');
  } catch (e) {
    // Axios-style error details
    const status = e.response?.status;
    const statusText = e.response?.statusText;
    const data = e.response?.data;
    const headers = e.response?.headers;
    // Fallbacks
    const message = e.message;
    const stack = e.stack;

    console.error('Token exchange failed:');
    if (status) console.error('  HTTP:', status, statusText || '');
    if (headers) console.error('  Headers:', headers);
    if (data) {
      console.error('  Response data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console.error('  Message:', message);
    }
    res.status(500).send('Token exchange failed');
  }
});

app.get('/me', async (req, res) => {
  const { tokens, realmId } = req.session;
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId in session. Reconnect.');

  try {
    const url = `${process.env.API_BASE}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=70`;
    const r = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json'
      }
    });
    res.json({ realmId, data: r.data });
  } catch (e) {
    console.error('API error:', e.response?.data || e.message);
    res.status(500).json(e.response?.data || { error: e.message });
    console.error('/me error:', e, e.error_description);
  }
});


app.get('/logout', (req, res) => {
  res.clearCookie('sess', { path: '/', sameSite: 'lax', secure: true });
  req.session = null;
  res.redirect('/');
});

app.get('/deleteStripeReceipts', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId in session. Reconnect.');
  if (needsRefresh(tokens)) {
    const newTokens = await refreshTokens(tokens.refresh_token);
    req.session.tokens = newTokens;
    tokens = newTokens;
  }
  try {
    const result = await deleteStripeReceiptsInRange(
      { tokens, realmId, apiBase: process.env.API_BASE },
      {
        startDate: req.query.start,
        endDate:   req.query.end,
        dryRun:    req.query.confirm !== 'yes'
      }
    );
    res.json(result);
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || err.response?.status || 500;

  // Minimal but useful context
  const log = {
    method: req.method,
    url: req.originalUrl,
    requestId: req.headers['x-request-id'],
    message: err.message,
  };

  // If it's an Axios error, capture key details (no secrets)
  if (err.isAxiosError) {
    log.axios = {
      method: (err.config?.method || 'GET').toUpperCase(),
      url: err.config?.url,
      status: err.response?.status,
      data: typeof err.response?.data === 'object'
        ? JSON.stringify(err.response.data)
        : err.response?.data
    };
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    log.stack = err.stack;
  }

  console.error('Error:', log);
  res.status(status).json({ error: 'Internal Server Error' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Public (set in QBO_REDIRECT_URI):', process.env.QBO_REDIRECT_URI);
});

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

function needsRefresh(tokens) {
  // refresh if missing or expiring within 60 seconds
  return !tokens?.access_token || !tokens?.expires_at || Date.now() > tokens.expires_at - 60_000;
}

async function refreshTokens(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const r = await axios.post(
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    body.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(
            process.env.QBO_CLIENT_ID + ':' + process.env.QBO_CLIENT_SECRET
          ).toString('base64')
      }
    }
  );

  const d = r.data; // { access_token, refresh_token, expires_in, ... }
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token || refreshToken,
    expires_at: Date.now() + d.expires_in * 1000
  };
}