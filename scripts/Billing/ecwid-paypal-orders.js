import { writeDataToCsv } from '../fs-helpers.js';
import path from 'path';
import dotenv from 'dotenv';
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '..', '..', '.env');
dotenv.config({ path: envPath });

console.log(envPath, process.env.ECWID_STORE_ID, process.env.ECWID_TOKEN);

const STORE_ID = process.env.ECWID_STORE_ID;
const TOKEN = process.env.ECWID_TOKEN;

console.log(`STORE_ID: ${STORE_ID}`);
console.log(`TOKEN: ${TOKEN}`);

const outputFile =
  'C:\\Users\\NoraEvans\\OneDrive - Blue Ridge Boost\\BRB Finances - Documents\\PayPal\\ecwid-paypal-sales-receipts-2025.csv';

const accountName = 'PayPal';

// Fallback item name if an order item name is missing.
// Ideally this should match an existing QuickBooks item.
const DEFAULT_ITEM = 'Camp Registration';

if (!STORE_ID || !TOKEN) {
  throw new Error(
    'Missing ECWID_STORE_ID or ECWID_TOKEN environment variable.'
  );
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${mm}/${dd}/${yyyy}`;
}

function cleanAmount(value) {
  const n = Number.parseFloat(value || '0');
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizeString(value) {
  return String(value || '').trim();
}

function isPaypalOrder(order) {
  const paymentMethod = normalizeString(order.paymentMethod).toLowerCase();
  const paymentModule = normalizeString(order.paymentModule).toLowerCase();

  return (
    paymentMethod.includes('paypal') ||
    paymentModule.includes('paypal')
  );
}

function getCustomerName(order) {
  return (
    normalizeString(order.billingPerson?.name) ||
    normalizeString(order.shippingPerson?.name) ||
    normalizeString(order.email)
  );
}

function getTransactionDate(order) {
  // Ecwid docs show createDate in order payloads.
  return formatDate(order.createDate || order.updateDate);
}

function getOrderRef(order) {
  // Docs show orderid as customer-facing order number.
  // id also exists, but orderid is usually the better import ref.
  return normalizeString(order.orderNumber || order.orderid || order.id);
}

function getDescription(order, item) {
  return (
    normalizeString(item?.name) ||
    normalizeString(order.privateAdminNotes) ||
    `Ecwid order ${getOrderRef(order)}`
  );
}

function getItemName(item, order) {
  return normalizeString(item?.name) || DEFAULT_ITEM;
}

async function fetchOrdersPage({ createdFrom, createdTo, offset = 0, limit = 100 }) {
  const params = new URLSearchParams({
    createdFrom,
    createdTo,
    offset: String(offset),
    limit: String(limit),
  });

  const url = `https://app.ecwid.com/api/v3/${STORE_ID}/orders?${params.toString()}`;

console.log(`Fetching Ecwid orders: ${url}`);   

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ecwid API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function fetchAllOrders2025() {
  const createdFrom = '2025-01-01 00:00:00';
  const createdTo = '2025-12-31 23:59:59';

  const allOrders = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await fetchOrdersPage({
      createdFrom,
      createdTo,
      offset,
      limit,
    });

    const items = Array.isArray(page.items) ? page.items : [];
    allOrders.push(...items);

    if (items.length < limit) {
      break;
    }

    offset += limit;
  }

  return allOrders;
}

const allOrders = await fetchAllOrders2025();
const paypalOrders = allOrders.filter(isPaypalOrder);

// One Rightworks row per Ecwid order item.
// If an order has multiple items, it will produce multiple sales receipt lines
// with the same RefNumber / Customer / Transaction Date.
const salesReceipts = [];

for (const order of paypalOrders) {
  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : [
        {
          name: DEFAULT_ITEM,
          quantity: 1,
          price: order.total || 0,
        },
      ];

  for (const item of items) {
    const quantity = Number.parseFloat(item.quantity || '1') || 1;
    const price = Number.parseFloat(item.price || '0') || 0;

    salesReceipts.push({
      Customer: getCustomerName(order),
      'Transaction Date': getTransactionDate(order),
      RefNumber: getOrderRef(order),
      'Payment Method': 'PayPal',
      Item: getItemName(item, order),
      Quantity: quantity,
      Description: getDescription(order, item),
      Price: cleanAmount(price),
      'Deposit To': accountName,
      'Cust. Tax Code': 'Non',
      'Sales Tax Code': 'Non',
    });
  }
}

await writeDataToCsv(salesReceipts, outputFile);

console.log(`Fetched ${allOrders.length} Ecwid orders.`);
console.log(`Filtered ${paypalOrders.length} PayPal orders.`);
console.log(`Created ${outputFile} with ${salesReceipts.length} rows.`);