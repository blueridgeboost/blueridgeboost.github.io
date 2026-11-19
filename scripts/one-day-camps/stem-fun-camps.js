// Create Ecwid products for the "STEM Fun" One-Day Camp dates listed below.
// Usage: npm run create-stem-fun-camps
//
// Notes:
// - Pricing follows the camps-hub regular-price convention: Full-Day $165,
//   AM $115 (modeled as base $165 with an AM -$50 modifier).
// - SKUs use the same ODC-YYYY-MM-DD pattern as scripts/one-day-camps/one-day-camps.js,
//   so Ecwid will reject duplicates if a product with the same SKU already exists
//   (safe no-op per date).

import { createEcwidProduct } from "../ecwid.js";
import { formatIsoDateToLong } from '../date-helpers.js';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '..', '.env');
await dotenv.config({ path: envPath });

// Thursday 2026-11-19 · Friday 2026-11-20 · Tuesday 2026-11-24 · Wednesday 2026-11-25
const dates = [
  "2026-11-19",
  "2026-11-20",
  "2026-11-24",
  "2026-11-25",
];

const DEFAULT_CATEGORY_ID = 175336115; // 1-Day Camps category

const STEM_FUN_DESCRIPTION = `
<h3>STEM Fun: One-Day Camp</h3>
<p>A full day of hands-on discovery, creative challenges, and STEM fun! Campers explore activities such as building and programming robots, tackling coding puzzles, designing games, and playing strategic games that encourage planning and problem-solving.</p>
<p>With a mix of guided projects and collaborative challenges, campers can try something new, stretch their imaginations, and connect with other curious kids. No prior robotics or coding experience is needed&mdash;just curiosity and a willingness to explore!</p>
<p><strong>Example activities:</strong></p>
<ul>
  <li><strong>Robotics:</strong> Build, program, and test robots through fun challenges.</li>
  <li><strong>Coding:</strong> Explore programming through interactive puzzles and projects.</li>
  <li><strong>Game Design:</strong> Create game ideas, design levels, and test how they play.</li>
  <li><strong>Strategic Games:</strong> Practice logic, teamwork, and thinking ahead.</li>
</ul>
<p><em>Activities vary by camp date and are adapted to campers&rsquo; ages and experience levels.</em></p>
`.trim();

const options = [
  {
    name: "Length",
    type: "RADIO",
    choices: [
      {
        text: "AM (8:30 AM to 1:00 PM)",
        priceModifier: -50,
        priceModifierType: "ABSOLUTE",
      },
      {
        text: "Full-Day (8:30 AM to 5:30 PM)",
        priceModifier: 0,
        priceModifierType: "ABSOLUTE",
      },
    ],
    defaultChoice: 1,
  },
  {
    name: "Grade Level",
    type: "RADIO",
    choices: [
      { text: "1st to 3rd" },
      { text: "4th to 6th" },
    ],
    defaultChoice: 0,
  },
  {
    name: "Gaming during Exploration Time",
    type: "CHECKBOX",
    choices: [
      { text: "Minecraft" },
      { text: "Roblox" },
    ],
  },
];

async function createStemFunCamps() {
  const results = { created: [], failed: [] };

  for (const date of dates) {
    const payload = {
      name: `One-Day Camp — ${formatIsoDateToLong(date)}`,
      description: STEM_FUN_DESCRIPTION,
      price: 165,
      sku: `ODC-${date}`,
      enabled: true,
      quantity: 16,
      unlimited: false,
      defaultCategoryId: DEFAULT_CATEGORY_ID,
      categoryIds: [DEFAULT_CATEGORY_ID],
      options,
      attributes: [
        { name: "Type", value: "One-Day Camp" },
        { name: "Theme", value: "STEM Fun" },
        { name: "Date", value: date },
      ],
    };

    try {
      console.log(`Creating product for ${date} …`);
      const id = await createEcwidProduct(payload);
      console.log(`  ✓ created product id=${id}`);
      results.created.push({ date, id });
    } catch (error) {
      console.error(`  ✗ ${date}: ${error.message}`);
      results.failed.push({ date, error: error.message });
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Created: ${results.created.length}`);
  results.created.forEach(({ date, id }) => console.log(`  ${date} → id=${id}`));
  if (results.failed.length) {
    console.log(`Failed:  ${results.failed.length}`);
    results.failed.forEach(({ date, error }) => console.log(`  ${date} → ${error.split('\n')[0]}`));
  }
}

await createStemFunCamps();
