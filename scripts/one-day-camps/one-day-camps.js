import { createEcwidProduct, getOneDayCamps } from "../ecwid.js";
import { provider, location, audience, campURL } from "../classes/rich-results-helpers.js";
import { writePartialFile } from '../fs-helpers.js';
import { formatIsoDateToLong } from '../date-helpers.js';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '..', '.env');
await dotenv.config({ path: envPath });

const entries = [
  { entryDate: "2026-08-21", schools: ["Covenant"] },
  { entryDate: "2026-09-07", schools: ["CCS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2026-09-08", schools: ["ACPS"] },
  { entryDate: "2026-09-18", schools: ["CCS", "Charlottesville Day School"] },

  { entryDate: "2026-10-02", schools: ["CCS"] },
  { entryDate: "2026-10-12", schools: ["ACPS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2026-10-13", schools: ["ACPS", "Covenant"] },
  { entryDate: "2026-10-16", schools: ["CCS"] },
  { entryDate: "2026-10-29", schools: ["Covenant"] },
  { entryDate: "2026-10-30", schools: ["Covenant"] },

  { entryDate: "2026-11-02", schools: ["CCS", "ACPS", "Charlottesville Day School"] },
  { entryDate: "2026-11-03", schools: ["CCS", "ACPS", "Charlottesville Day School"] },
  { entryDate: "2026-11-23", schools: ["Covenant"] },
  { entryDate: "2026-11-24", schools: ["Charlottesville Day School"] },
  { entryDate: "2026-11-25", schools: ["CCS", "ACPS", "Charlottesville Day School"] },
  { entryDate: "2026-11-26", schools: ["Charlottesville Day School"] },
  { entryDate: "2026-11-27", schools: ["CCS", "ACPS", "Covenant", "Charlottesville Day School"] },

  { entryDate: "2026-12-18", schools: ["Covenant"] },
  { entryDate: "2026-12-21", schools: ["CCS", "Charlottesville Day School"] },

  { entryDate: "2027-01-04", schools: ["CCS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2027-01-18", schools: ["CCS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2027-01-19", schools: ["Charlottesville Day School"] },

  { entryDate: "2027-02-03", schools: ["CCS"] },
  { entryDate: "2027-02-12", schools: ["Covenant"] },
  { entryDate: "2027-02-15", schools: ["CCS", "ACPS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2027-02-16", schools: ["Charlottesville Day School"] },

  { entryDate: "2027-03-05", schools: ["CCS", "Charlottesville Day School"] },
  { entryDate: "2027-03-12", schools: ["Covenant"] },
  { entryDate: "2027-03-18", schools: ["ACPS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2027-03-19", schools: ["CCS", "ACPS", "Covenant", "Charlottesville Day School"] },
  { entryDate: "2027-03-26", schools: ["Covenant"] },
  { entryDate: "2027-03-29", schools: ["Covenant"] }
];

const DEFAULT_CATEGORY_ID = 175336115;

const SCHOOL_CATEGORY_MAP = {
  "CCS": 182125822,
  "ACPS": 182132326,
  "Covenant": 182129830,
  "Charlottesville Day School": 186014508
};

async function createEcwidProducts() {
  for (const entry of entries) {
    const options = [
      {
        name: "Length",
        type: "RADIO",
        choices: [
          {
            text: "AM (8:30 AM to 1:00 PM)",
            priceModifier: -50,
            priceModifierType: "ABSOLUTE"
          },
          {
            text: "Full-Day (8:30 AM to 5:30 PM)",
            priceModifier: 0,
            priceModifierType: "ABSOLUTE"
          }
        ],
        defaultChoice: 1
      },
      {
        name: "Grade Level",
        type: "RADIO",
        choices: [
          {
            text: "1st to 3rd"
          },
          {
            text: "4th to 6th"
          }
        ],
        defaultChoice: 0
      },
      {
        name: "Gaming during Exploration Time",
        type: "CHECKBOX",
        choices: [
          { text: "Minecraft" },
          { text: "Roblox" }
        ]
      }
    ];

    const schoolCategoryIds = entry.schools
      .map(school => SCHOOL_CATEGORY_MAP[school])
      .filter(Boolean);

    const categoryIds = [...new Set([DEFAULT_CATEGORY_ID, ...schoolCategoryIds])];

    const productPayload = {
      name: `One-Day Camp - ${formatIsoDateToLong(entry.entryDate)}`,
      price: 135,
      sku: `ODC-${entry.entryDate}`,
      enabled: true,
      quantity: 32,
      unlimited: false,
      defaultCategoryId: DEFAULT_CATEGORY_ID,
      categoryIds,
      options,
      attributes: [
        {
          name: "Type",
          value: "One-Day Camp"
        },
        {
          name: "Date",
          value: entry.entryDate
        }
      ],
    };

    try {
        console.log(`Creating product for ${JSON.stringify(productPayload)}`);
        await createEcwidProduct(productPayload);
    } catch (error) {
      console.error(`Error creating ${entry.entryDate}:`, error);
    }
  }
}

await createEcwidProducts();

// function threeDaysBefore(dateStr) {
//   const d = new Date(dateStr); // interprets as UTC if using YYYY-MM-DD
//   d.setUTCDate(d.getUTCDate() - 3);
//   return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
// }

// function offer(fullDayPrice, halfDayPrice, earlyBirdDiscountPercent, startDate) {
//     return ({
//         "@type": "AggregateOffer",
//         "priceCurrency": "USD",
//         "highPrice": fullDayPrice,
//         "lowPrice": Number(halfDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
//         "validFom": "2025-09-12",
//         "availability": "https://schema.org/InStock",
//         "offers": [
//             { 
//                 "@type": "Offer",
//                 "name": "Half-Day",
//                 "price": halfDayPrice,
//                 "priceCurrency": "USD",
//                 "availability": "https://schema.org/InStock",
//                 "additionalProperty": {
//                     "@type": "PropertyValue",
//                     "name": "sessionLength",
//                     "value": "half-day"
//                 }
//             },
//             {
//                 "@type": "Offer",
//                 "name": `Half-Day (Early Bird -${earlyBirdDiscountPercent}%)`,
//                 "price": Number(halfDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
//                 "priceCurrency": "USD",
//                 "availability": "https://schema.org/InStock",
//                 "validThrough": `${threeDaysBefore(startDate)}T00:00:00-05:00`,
//                 "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": 3 },
//                 "additionalProperty": [
//                     { "@type": "PropertyValue", "name": "sessionLength", "value": "half-day" },
//                     { "@type": "PropertyValue", "name": "discountType", "value": "early-bird" },
//                     { "@type": "PropertyValue", "name": "discountPercent", "value": earlyBirdDiscountPercent }
//                 ]
//             },
//             {
//                 "@type": "Offer",
//                 "name": "Full-Day",
//                 "price": fullDayPrice,
//                 "priceCurrency": "USD",
//                 "availability": "https://schema.org/InStock",
//                 "additionalProperty": {
//                     "@type": "PropertyValue",
//                     "name": "sessionLength",
//                     "value": "full-day"
//                 }
//             },
//             {
//                 "@type": "Offer",
//                 "name": `Full-Day (Early Bird -${earlyBirdDiscountPercent}%)`,
//                 "price": Number(fullDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
//                 "priceCurrency": "USD",
//                 "availability": "https://schema.org/InStock",
//                 "validThrough":  `${threeDaysBefore(startDate)}T00:00:00-05:00`,
//                 "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": 3 },
//                 "additionalProperty": [
//                     { "@type": "PropertyValue", "name": "sessionLength", "value": "full-day" },
//                     { "@type": "PropertyValue", "name": "discountType", "value": "early-bird" },
//                     { "@type": "PropertyValue", "name": "discountPercent", "value": earlyBirdDiscountPercent }
//                 ]
//             }
//         ]
//     })
// }

// export async function generateOneDayCampsRichResults() {
//     const camps = await getOneDayCamps();
//     const webPage = {
//         "@context": "https://schema.org",
//         "@type": ["WebPage", "CollectionPage"],
//         "name": "One-Day Camps | Blue Ridge Boost",
//         "url": "https://blueridgeboost.com/1-day-camps/",
//         "description": "Blue Ridge Boosts offers half-day and full-day instructional programs for ages 6-13 during school breaks in Charlottesville, VA. Choose from robotics, Minecraft coding, Roblox game design, and strategic games. Early bird discount available.",
//         "mainEntity": {
//             "@type": "ItemList",
//             "name": "Upcoming One-Day Camps",
//             "itemListOrder": "http://schema.org/ItemListUnordered",
//             "numberOfItems": camps.length,
//             "itemListElement": [],
//         }
//     }
//     for (let i=0; i<camps.length; i++) {
//         const camp = camps[i];
//         console.log(camp.name);
//         const listItem = {
//             "@type": "ListItem",
//             "position": (i+1),
//             "url": campURL(camp), 
//             "item": {
//                 "@type": "Event",
//                 "name": camp.name,
//                 "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
//                 "eventStatus": "https://schema.org/EventScheduled",
//                 "startDate": `${getAttributeValue(camp, 'start_date')}T08:30:00-04:00`,
//                 "endDate": `${getAttributeValue(camp, 'start_date')}T17:00:00-04:00`,
//                 "location": location(),
//                 "organizer": provider(),
//                 "audience": audience(),
//                 "typicalAgeRange": "6-13",
//                 "doorTime": `${getAttributeValue(camp, 'start_date')}T08:30:00-04:00`,
//                 "offers": offer(165, 140, 25, getAttributeValue(camp, 'start_date')),
//                 "image": [
//                     camp.originalImage.url
//                 ],
//                 "description": "One-day instructional camp in robotics, coding, and math. Half-day and full-day options. Drop-off starts at 8:30 AM; pick-up by 1:00 PM (half-day) or 5:00 PM (full-day)."
//             }
//         };
//         webPage.mainEntity.itemListElement.push(listItem);
//     }
//     await writePartialFile('camps.html', JSON.stringify(webPage, null, 2));
// }