import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join('..', '.env') });

// Helper to run a QBO query
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


// Find unused products and services 
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
            ctx );
        // console.log(r);
        const receipts = r.SalesReceipt || [];

        if (receipts.length === 0) break;
        for (const sr of receipts) {
            const lines = Array.isArray(sr.Line) ? sr.Line : [];
            for (const line of lines) {
                const itemId = line.SalesItemLineDetail?.ItemRef?.value;
                if (itemId) {
                    items.push(itemId);
                }
            }
    }
    start += receipts.length; // or start += pageSize
  }
  return items;
}

// Get Items not used on common sales documents
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
    //console.log("inactivateItems called");
    const url = `${apiBase}/v3/company/${realmId}/batch?minorversion=${minor}`;
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
        chunks.push(items.slice(i, i + 25));
    }
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
        const batchRes = await axios.post( url,
            { BatchItemRequest },
            { headers: headersJson } );
        
        results.push(...batchRes.data?.BatchItemResponse || []);
    }
    return results;
}

export async function deleteUnusedItems(ctx) {
    const unused = await getUnusedSalesItems(ctx);
    console.log("----------------------------------")
    const items = await inactivateItems(unused, ctx);
    const faults = await getUnusedSalesItems(ctx);
    for (const item of faults) {
        console.log(item.Name);
        console.log("\n--------------------------------------\n");
    }
    const activeNames = faults.map( e => e.Name );
    return activeNames.join("\n");
}

// === Sales receipt deletion by account and date range ===
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export async function fetchReceiptsForAccount(ctx, { startDate, endDate, accountId, entityType = 'SalesReceipt' }) {
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

        // QBO doesn't support WHERE on DepositToAccountRef in IDS queries
        // this should be the account we are filtering through 
        for (const sr of chunk) {
            if (sr.DepositToAccountRef?.value === String(accountId)) {
                matched.push(sr);
            }
        }
        console.log(`Fetched ${start} - ${start + chunk.length - 1}, matched so far: ${matched.length}`);
        if (chunk.length < page) break;
        start += chunk.length;
    }
    return matched;
}

async function deleteReceiptsBatch(receipts, { tokens, realmId, apiBase = process.env.API_BASE, minor = 70 }, entityType = 'SalesReceipt') {
    const url = `${apiBase}/v3/company/${realmId}/batch?minorversion=${minor}`;
    const headers = {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
    const results = [];
    for (let i = 0; i < receipts.length; i += 30) {
        const group = receipts.slice(i, i + 30);
        const BatchItemRequest = group.map((sr, idx) => ({
            bId: String(idx + 1),
            operation: 'delete',
            [entityType]: { Id: sr.Id, SyncToken: sr.SyncToken }
        }));
        const res = await axios.post(url, { BatchItemRequest }, { headers });
        const batch = res.data?.BatchItemResponse || [];
        results.push(...batch);
        const failures = batch.filter(r => r.Fault);
        if (failures.length) console.error('Batch failures:', JSON.stringify(failures, null, 2));
        await sleep(200); // stay under 500 req/min rate limit
    }
    return results;
}

// Main export: call this from your Express route
// dryRun: true  → preview only, nothing deleted
// dryRun: false → permanent delete
export async function deleteStripeReceiptsInRange(ctx, { startDate, endDate, entityType = 'SalesReceipt', dryRun = true }) {
    if (!startDate || !endDate) throw new Error("startDate and endDate ('YYYY-MM-DD') are required");

    const accountId = await findAccountId(ctx, 'Stripe Clearing');
    const receipts  = await fetchReceiptsForAccount(ctx, { startDate, endDate, accountId });

    const preview = receipts.map(sr => ({
        Id:       sr.Id,
        DocNumber: sr.DocNumber,
        TxnDate:  sr.TxnDate,
        TotalAmt: sr.TotalAmt,
        Customer: sr.CustomerRef?.name,
        DepositTo: sr.DepositToAccountRef?.name
    }));

    console.log(`Matched ${receipts.length} ${entityType} receipts deposited to "Stripe Clearing"`);

    if (dryRun) {
        return { dryRun: true, entityType, matchedCount: receipts.length, receipts: preview };
    }

    const results  = await deleteReceiptsBatch(receipts, ctx, entityType);
    const failures = results.filter(r => r.Fault);
    return {
        dryRun:       false,
        entityType,
        matchedCount: receipts.length,
        deletedCount: results.length - failures.length,
        failureCount: failures.length,
        receipts:     preview
    };
}

