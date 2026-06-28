import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import qs from 'qs';
import cookieSession from 'cookie-session';
import crypto from 'crypto';
import { deleteUnusedItems, deleteAllInAccount, qboQuery } from './qbo-commons.mjs';

dotenv.config({ path: path.join('..', '.env') });

const app = express();
app.use(express.json());
app.use(cookieSession({ 
    name: 'sess', 
    keys: [process.env.SESSION_SECRET], 
    sameSite: 'lax', 
    secure: true }));
app.set('trust proxy', 1);

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.get('/auth/connect', (req, res) => {
  const state = b64url(crypto.randomBytes(16));
  req.session.state = state;
  const scope = encodeURIComponent('com.intuit.quickbooks.accounting');
  const authUrl =
    `${process.env.AUTH_URL}?client_id=${encodeURIComponent(process.env.QBO_CLIENT_ID)}` +
    `&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(process.env.QBO_REDIRECT_URI)}` +
    `&response_type=code` +
    `&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, realmId, error, error_description } = req.query;
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.status(400).send(`${error}: ${error_description || ''}`);
  }
  if (!code || !state) return res.status(400).send('Missing code or state');
  if (state !== req.session.state) return res.status(400).send('Invalid state');

  const clientId     = (process.env.QBO_CLIENT_ID     || '').trim();
  const clientSecret = (process.env.QBO_CLIENT_SECRET || '').trim();
  const redirectUri  = (process.env.QBO_REDIRECT_URI  || '').trim();

  try {
    const tokenRes = await axios.post(
      process.env.TOKEN_URL,
      qs.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        timeout: 15000
      }
    );

    if (!realmId) return res.status(400).send('Missing realmId in callback (no company selected).');

    const d = tokenRes.data;
    req.session.tokens = {
      access_token:  d.access_token,
      refresh_token: d.refresh_token,
      expires_at:    Date.now() + d.expires_in * 1000
    };
    req.session.realmId = realmId;
    console.log('Token exchange OK. realmId:', realmId);
    res.redirect('/me');
  } catch (e) {
    const status = e.response?.status;
    const data   = e.response?.data;
    console.error('Token exchange failed:', status, data || e.message);
    res.status(500).send('Token exchange failed');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('sess', { path: '/', sameSite: 'lax', secure: true });
  req.session = null;
  res.redirect('/');
});

// ─── Info ─────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send(`
    <h1>BRB</h1>
    <p><a href="/auth/connect">Connect to QuickBooks</a></p>
    <p><a href="/me">Company Info</a></p>
    <p><a href="/accounts">All Accounts</a></p>
    <p><a href="/findAccount?name=stripe">Find Stripe Accounts</a></p>
    <p><a href="/deleteUnusedItems">Delete Unused Products/Services</a></p>
    <p><a href="/deleteStripeReceipts?start=2025-01-01&end=2025-01-31">Preview Stripe Clearing Deletions</a></p>
    <p><a href="/logout">Logout</a></p>
  `);
});

app.get('/me', async (req, res, next) => {
  const { tokens, realmId } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId. Reconnect.');
  try {
    const url = `${process.env.API_BASE}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=70`;
    const r = await axios.get(url, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' }
    });
    res.json({ realmId, data: r.data });
  } catch (e) { next(e); }
});

app.get('/accounts', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  try {
    const resp = await qboQuery(
      `SELECT Id, Name, AccountType, AccountSubType, Active FROM Account ORDER BY Name`,
      { tokens, realmId, apiBase: process.env.API_BASE }
    );
    res.json(resp.Account || []);
  } catch (e) { next(e); }
});

app.get('/findAccount', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  try {
    const resp = await qboQuery(
      `SELECT Id, Name, FullyQualifiedName, AccountType, AccountSubType, Active, ParentRef FROM Account WHERE Active = true`,
      { tokens, realmId, apiBase: process.env.API_BASE }
    );
    const accounts = resp.Account || [];
    const search = (req.query.name || '').toLowerCase();
    const filtered = search
      ? accounts.filter(a =>
          a.Name?.toLowerCase().includes(search) ||
          a.FullyQualifiedName?.toLowerCase().includes(search)
        )
      : accounts;
    res.json(filtered);
  } catch (e) { next(e); }
});

// ─── Actions ──────────────────────────────────────────────────────────────────

app.get('/deleteUnusedItems', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId. Reconnect.');
  tokens = await maybeRefresh(req, tokens);
  try {
    const items = await deleteUnusedItems({ tokens, realmId, apiBase: process.env.API_BASE });
    res.json(items);
  } catch (e) { next(e); }
});

// Preview:  ?start=2025-03-01&end=2025-03-31
// Delete:   ?start=2025-03-01&end=2025-03-31&confirm=yes
// Account:  ?start=2025-03-01&end=2025-03-31&account=Stripe Clearing
app.get('/deleteStripeReceipts', async (req, res, next) => {
  const { realmId } = req.session || {};
  let { tokens } = req.session || {};
  if (!tokens) return res.redirect('/auth/connect');
  if (!realmId) return res.status(400).send('Missing realmId. Reconnect.');
  tokens = await maybeRefresh(req, tokens);
  try {
    const result = await deleteAllInAccount(
      { tokens, realmId, apiBase: process.env.API_BASE },
      {
        startDate:   req.query.start,
        endDate:     req.query.end,
        accountName: req.query.account || 'Stripe Clearing',
        dryRun:      req.query.confirm !== 'yes'
      }
    );
    res.json(result);
  } catch (e) { next(e); }
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || err.response?.status || 500;
  const log = {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
  };
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
  if (process.env.NODE_ENV !== 'production' && err.stack) log.stack = err.stack;
  console.error('Error:', log);
  res.status(status).json({ error: 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Public (set in QBO_REDIRECT_URI):', process.env.QBO_REDIRECT_URI);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function needsRefresh(tokens) {
  return !tokens?.access_token || !tokens?.expires_at || Date.now() > tokens.expires_at - 60_000;
}

async function maybeRefresh(req, tokens) {
  if (!needsRefresh(tokens)) return tokens;
  try {
    const newTokens = await refreshTokens(tokens.refresh_token);
    req.session.tokens = newTokens;
    return newTokens;
  } catch (err) {
    if (err.response?.status === 400) throw Object.assign(new Error('QBO session expired. Please reconnect at /auth/connect'), { status: 401 });
    throw err;
  }
}

async function refreshTokens(refreshToken) {
  const r = await axios.post(
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(
          process.env.QBO_CLIENT_ID + ':' + process.env.QBO_CLIENT_SECRET
        ).toString('base64')
      }
    }
  );
  const d = r.data;
  return {
    access_token:  d.access_token,
    refresh_token: d.refresh_token || refreshToken,
    expires_at:    Date.now() + d.expires_in * 1000
  };
}