import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join('..', '.env') });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function qboQuery(sql, { tokens, realmId, apiBase = process.env.API_BASE, minor = 70 }) {
  console.log(sql);
  const url = `${apiBase}/v3/company/${realmId}/query?minorversion=${minor}`;
  const r = await axios.post(url, sql, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/json',
      'Content-Type': 'application/text'
    }
  });
  return r.data.QueryResponse;
}

async function fetchAllActiveItemsID(ctx) {
  const items = [];
  let start = 1;
  const page = 1000;
  while (true) {
    const resp = await qboQuery(
      `select Id, SyncToken, Name from Item where Active = true order by Name startposition ${start} maxresults ${page}`,
      ctx
    );
    const chunk = resp.Item || [];
    items.push(...chunk);
    if (chunk.length < page) break;
    start += page;
  }
  return items;
}

async function fetchAllSalesReceiptLines(ctx) {
  const items = [];
  let start = 1;
  const pageSize = 1000;
  while (true) {
    const r = await qboQuery(
      `SELECT Line FROM SalesReceipt STARTPOSITION ${start} MAXRESULTS ${pageSize}`.trim(),
      ctx
    );
    const receipts = r.SalesReceipt || [];
    if (receipts.length === 0) break;
    for (const sr of receipts) {
      const lines = Array.isArray(sr.Line) ? sr.Line : [];
      for (const line of lines) {
        const itemId = line.SalesItemLineDetail?.ItemRef?.value;
        if (itemId) items.push(itemId);
      }
    }
    start += receipts.length;
  }
  return items;
}

async function getUnusedSalesItems(ctx) {
  const items = await fetchAllActiveItemsID(ctx);
  console.log(`Items count: ${items.length}`);
  const srRefs = await fetchAllSalesReceiptLines(ctx);
  console.log(`Used count: ${srRefs.length}`);
  const used = new Set([...srRefs]);
  const unused = items.filter(it => !used.has(it.Id));
  console.log(`Unused item count: ${unused.length}`);
  return unused;
}

async function inactivateItems(items, { tokens, realmId, apiBase = process.env.API_BASE, minor = 70 }) {
  const url = `${apiBase}/v3/company/${realmId}/batch?minorversion=${minor}`;
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));
  console.log("# of unused items", items.length);
  console.log("# of chunks", chunks.length);
  const results = [];
  const headersJson = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  for (const group of chunks) {
    const BatchItemRequest = group.map((it, idx) => ({
      bId: String(idx + 1),
      operation: 'update',
      Item: { Id: it.Id, SyncToken: it.SyncToken, Active: false, sparse: true }
    }));
    const batchRes = await axios.post(url, { BatchItemRequest }, { headers: headersJson });
    results.push(...batchRes.data?.BatchItemResponse || []);
  }
  return results;
}

export async function deleteUnusedItems(ctx) {
  const unused = await getUnusedSalesItems(ctx);
  console.log("----------------------------------");
  await inactivateItems(unused, ctx);
  const faults = await getUnusedSalesItems(ctx);
  for (const item of faults) console.log(item.Name, "\n--------------------------------------\n");
  return faults.map(e => e.Name).join("\n");
}

// ─── Account-based deletion ───────────────────────────────────────────────────

// These are the QBO transaction types that support hard delete
// and are commonly deposited to a clearing account
const DELETABLE_TYPES = ['SalesReceipt', 'Payment', 'Transfer', 'Deposit', 'Purchase',];

export async function findAccountId(ctx, name) {
  const resp = await qboQuery(
    `SELECT Id, Name FROM Account WHERE Name = '${name}'`,
    ctx
  );
  const accounts = resp.Account || [];
  if (accounts.length === 0) throw new Error(`Account not found: "${name}"`);
  console.log(`Found account "${name}" with Id: ${accounts[0].Id}`);
  return accounts[0].Id;
}

// Fetch all transactions of one type in the date range
// then filter client-side to only those touching the target account
async function fetchTransactionsOfType(ctx, { startDate, endDate, accountId, entityType }) {
  const matched = [];
  let start = 1;
  const page = 1000;

  while (true) {
    const resp = await qboQuery(
      `SELECT * FROM ${entityType} ` +
      `WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' ` +
      `STARTPOSITION ${start} MAXRESULTS ${page}`,
      ctx
    );
    const chunk = resp[entityType] || [];
    if (chunk.length === 0) break;

    for (const txn of chunk) {
      if (touchesAccount(txn, entityType, accountId)) {
        matched.push(txn);
      }
    }

    console.log(`[${entityType}] Fetched ${start}-${start + chunk.length - 1}, matched: ${matched.length}`);
    if (chunk.length < page) break;
    start += chunk.length;
  }
  return matched;
}

// Each transaction type stores the account ref differently
function touchesAccount(txn, entityType, accountId) {
  const id = String(accountId);
  switch (entityType) {
    case 'Transfer':
      // Transfer has From and To — match either side
      return txn.FromAccountRef?.value === id || txn.ToAccountRef?.value === id;
    case 'Deposit':
      // Deposit posts to a specific account
      return txn.DepositToAccountRef?.value === id;
    case 'SalesReceipt':
    case 'Payment':
      return txn.DepositToAccountRef?.value === id;
    default:
      return txn.DepositToAccountRef?.value === id;
  }
}

// Hard delete a batch of transactions of a single type
async function deleteBatch(transactions, entityType, { tokens, realmId, apiBase = process.env.API_BASE, minor = 70 }) {
  const url = `${apiBase}/v3/company/${realmId}/batch?minorversion=${minor}`;
  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  const results = [];
  for (let i = 0; i < transactions.length; i += 30) {
    const group = transactions.slice(i, i + 30);
    const BatchItemRequest = group.map((txn, idx) => ({
      bId: String(idx + 1),
      operation: 'delete',
      [entityType]: { Id: txn.Id, SyncToken: txn.SyncToken }
    }));
    const res = await axios.post(url, { BatchItemRequest }, { headers });
    const batch = res.data?.BatchItemResponse || [];
    results.push(...batch);
    const failures = batch.filter(r => r.Fault);
    if (failures.length) console.error(`[${entityType}] Batch failures:`, JSON.stringify(failures, null, 2));
    await sleep(200);
  }
  return results;
}

// Main export — deletes everything in the account across all transaction types
// dryRun: true  → preview only, nothing deleted (default)
// dryRun: false → permanent, cannot be undone
export async function deleteAllInAccount(ctx, { startDate, endDate, accountName = 'Stripe Clearing', dryRun = true }) {
  if (!startDate || !endDate) throw new Error("startDate and endDate ('YYYY-MM-DD') are required");

  const accountId = await findAccountId(ctx, accountName);
  const summary = {};
  const allDeleted = [];
  const allFailures = [];

  for (const entityType of DELETABLE_TYPES) {
    const matched = await fetchTransactionsOfType(ctx, { startDate, endDate, accountId, entityType });
    console.log(`[${entityType}] matched: ${matched.length}`);

    const preview = matched.map(txn => ({
      Id:        txn.Id,
      DocNumber: txn.DocNumber,
      TxnDate:   txn.TxnDate,
      TotalAmt:  txn.TotalAmt,
      Customer:  txn.CustomerRef?.name
    }));

    summary[entityType] = { matchedCount: matched.length, transactions: preview };

    if (!dryRun && matched.length > 0) {
      const results  = await deleteBatch(matched, entityType, ctx);
      const failures = results.filter(r => r.Fault);
      allDeleted.push(...results.filter(r => !r.Fault));
      allFailures.push(...failures);
      summary[entityType].deletedCount = results.length - failures.length;
      summary[entityType].failureCount = failures.length;
    }
  }

  return {
    dryRun,
    accountName,
    startDate,
    endDate,
    summary,
    ...(dryRun ? {} : {
      totalDeleted: allDeleted.length,
      totalFailures: allFailures.length
    })
  };
}