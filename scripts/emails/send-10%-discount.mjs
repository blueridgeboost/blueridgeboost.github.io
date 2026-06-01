import path from 'path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mailchimp from '@mailchimp/mailchimp_transactional';
import {
    SUMMER_CAMPS_CATEGORY_ID,
    ADVANCED_STEM_CAMPS_CATEGORY_ID,
    BOOTCAMPS_CATEGORY_ID
} from '../ecwid.js';

const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

const client = new mailchimp(process.env.MAILCHIMP_KEY);

// run with DRY_RUN=false to create coupons + send emails 
const DRY_RUN = process.env.DRY_RUN !== 'false'; // runs dry by default
const SEND_DELAY_MS = 0; // in case of API limit

// List of recipients: each entry is { email, name }.
// Add real recipients here, e.g. { email: 'parent@example.com', name: 'Jordan' }
const EMAIL_LIST = [
    // { email: 'parent@example.com', name: 'Parent Name' },
];

// Escape user-provided text before injecting into HTML.
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Creates a percent-off discount coupon in Ecwid.
async function createDiscount(discountName, discountCode, discountValue) {
    if (DRY_RUN) {
        console.log(`[DRY RUN] Would create coupon "${discountName}" (code ${discountCode}, ${discountValue}% off)`);
        return { dryRun: true };
    }

    const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/discount_coupons`;
    const requestBody = {
        name:           discountName,
        code:           discountCode,
        discountType:   'PERCENT',
        status:         'ACTIVE',
        discount:       discountValue,
        launchDate:     new Date().toISOString(),                               // applies immediately
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // expires in 60 days
        usesLimit:      'ONCEPERCUSTOMER', 
        // the api only supports: ONCEPERCUSTOMER, UNLIMITED, or SINGLE 
        // Manually creating shows a range of uses we can speficify 
        catalogLimit: {
            products: [],
            categories: [
                SUMMER_CAMPS_CATEGORY_ID,
                ADVANCED_STEM_CAMPS_CATEGORY_ID,
                BOOTCAMPS_CATEGORY_ID
            ]
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Ecwid coupon creation failed (${response.status}): ${JSON.stringify(data)}`);
    }
    console.log('Discount created:', data);
    return data;
}

// Generates a random uppercase alphanumeric code.
function generateRandomCode(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

function buildEmailHtml({ parentName, discountCode }) {
    const safeName = escapeHtml(parentName);
    const safeCode = escapeHtml(discountCode);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Blue Ridge Boost &amp; Get Rewarded</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2ef; -webkit-text-size-adjust:100%;">
  <!-- Preview text (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Refer a friend and you both save 10% on Blue Ridge Boost camps.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ef;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(30,58,52,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e4d40; padding:32px 40px; text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-size:24px; font-weight:bold; color:#ffffff; letter-spacing:0.5px;">
                Blue Ridge Boost
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#a7cabb; letter-spacing:2px; text-transform:uppercase; margin-top:6px;">
                Summer &amp; STEM Camps
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; color:#333333; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0; font-size:18px; color:#1e4d40;"><strong>Hi ${safeName},</strong></p>
              <p style="margin:0 0 16px 0;">Thank you for being part of Blue Ridge Boost Camps!</p>
              <p style="margin:0 0 16px 0;">
                We're excited to offer you a special referral reward. Invite a friend to sign up for a
                <strong>new</strong> camp with Blue Ridge Boost and they'll receive
                <strong>10% off</strong> their camp purchase &mdash; and you'll get
                <strong>10% back as store credit</strong> to use toward future Blue Ridge Boost purchases.
              </p>
              <p style="margin:0 0 24px 0;">
                It's our way of saying thank you for spreading the word and helping more families join the fun.
              </p>
            </td>
          </tr>

          <!-- Discount code -->
          <tr>
            <td style="padding:0 40px 8px 40px;" align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#f4f8f5; border:2px dashed #2f8f6e; border-radius:10px; padding:20px;">
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#5a7a6e; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">
                      Your Referral Code
                    </div>
                    <div style="font-family:'Courier New',Courier,monospace; font-size:28px; font-weight:bold; color:#1e4d40; letter-spacing:3px;">
                      ${safeCode}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How to redeem -->
          <tr>
            <td style="padding:24px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; color:#333333; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">
                To redeem the offer, simply share your referral code with a friend and have them use it when
                they register for a new camp.
              </p>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding:8px 40px 36px 40px; font-family:Arial,Helvetica,sans-serif; color:#333333; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 24px 0;">Thanks again for being part of the Blue Ridge Boost community!</p>
              <p style="margin:0; color:#555555;">
                Best,<br>
                <strong style="color:#1e4d40;">Nora Evans</strong>, Owner<br>
                Blue Ridge Boost
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1e4d40; padding:20px 40px; text-align:center; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; color:#a7cabb; line-height:1.5;">
                &copy; ${new Date().getFullYear()} Blue Ridge Boost. All rights reserved.<br>
                This code is valid for one use per customer and expires in 60 days.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ parentName, discountCode }) {
    return `Hi ${parentName},

Thank you for being part of Blue Ridge Boost Camps!

We're excited to offer you a special referral reward. Invite a friend to sign up for a new camp with Blue Ridge Boost and they'll receive 10% off their camp purchase, and you'll get 10% back as store credit to use toward future Blue Ridge Boost purchases.

It's our way of saying thank you for spreading the word and helping more families join the fun.

Share this referral code with your friends: ${discountCode}

To redeem, have your friend enter the code when they register for a new camp.

Thanks again for being part of the Blue Ridge Boost community!

Best,
Nora Evans, Owner
Blue Ridge Boost

This code is valid for one use per customer and expires in 60 days.`;
}

function sendEmail({ parentEmail, parentName, discountCode }) {
    const html = buildEmailHtml({ parentName, discountCode });
    const text = buildEmailText({ parentName, discountCode });

    if (DRY_RUN) {
        console.log(`[DRY RUN] Would send email to ${parentEmail} with code ${discountCode}`);
        return Promise.resolve({ dryRun: true });
    }

    return client.messages.send({
        message: {
            from_email: 'office@blueridgeboost.com',
            from_name: 'Blue Ridge Boost',
            to: [{ email: parentEmail, type: 'to' }],
            subject: 'Share Blue Ridge Boost Camp with a Friend & Get Rewarded',
            html,
            text
        }
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    if (EMAIL_LIST.length === 0) {
        console.warn('EMAIL_LIST is empty — nothing to send. Add recipients to EMAIL_LIST.');
        return;
    }

    console.log(`Starting referral run (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) for ${EMAIL_LIST.length} recipient(s).`);

    for (const { email, name } of EMAIL_LIST) {
        const discountCode = generateRandomCode();
        await createDiscount(`${name}-Referral-Discount`, discountCode, 10);
        await sendEmail({ parentEmail: email, parentName: name, discountCode });
        await sleep(SEND_DELAY_MS);
    }

    console.log('Done.');
}

main().catch((err) => {
    console.error('Fatal error in main:', err);
    process.exitCode = 1;
});