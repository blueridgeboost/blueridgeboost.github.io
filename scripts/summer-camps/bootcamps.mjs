import path from "path"
import { readCsvDataFromPath } from "../fs-helpers.js"
import { readFile } from "fs/promises"
import { extractSeo } from "../ai-queries.js"
import { toISODate } from "../date-helpers.js"
import {createEcwidProduct, 
        BOOTCAMPS_CATEGORY_ID} from "../ecwid.js"
const SUMMER_CAMPS_HOME_DIRECTORY = "G:\\Shared drives\\BRB\\Summer 2026\\"
const SUMMER_CAMPS_LIST = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "Bootcamps 2026 list.csv")
const SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "descriptions")

const OPTION_NAME = "Session"

const startDate2Week = {
        '2026-06-01': ['June 1-5', 'June 8-12', "June 1-12"],
        '2026-06-15': ['June 15-19', 'June 22-26', "June 15-26"],
        '2026-06-29': ['June 29 - July 3', 'July 6-10', "June 29 - July 10"],
        '2026-07-06': ['July 6-10', 'July 13-17', "July 6-17"],
        '2026-07-20': ['July 20-24', 'July 27-31', "July 20-31"],
    }

async function generateRoboticsBootcamps() {
    const camps = await readCsvDataFromPath(SUMMER_CAMPS_LIST);
    const week =  startDate2Week[toISODate(camp['Start Date'.toLowerCase()])];
    for (const camp of camps) {
        console.log(camp);
        const fileContent = await readFile(path.join(SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY, `${camp['brb id']}.txt`), 'utf8');
        const campInfo = `<section aria-labelledby="essentials-title">
                <h3 id="essentials-title">Bootcamp Essentials</h3>
                <ul>
                    <li><strong>Ages:</strong> 13 and up.</li>
                    <li><strong>Dates:</strong>
                        <ul>
                        <li>Full-Day (one week), ${week[0]}, 8:30 AM–5:00 PM</li>
                        <li>Full-Day (one week), ${week[1]}, 8:30 AM–5:00 PM</li>
                        <li>AM, ${week[2]}, 8:30 AM–1:00 PM</li>
                        <li>PM, ${week[2]}, 12:30–5:00 PM</li>
                        </ul>
                    </li>
                    <li><strong>Certification:</strong> Carnegie Mellon Robotics Academy — complete all projects and score ≥ 70% on the final exam. All past BRB students have earned their certificate.</li>
                    <li><strong>Location:</strong> 2171 Ivy Rd, Charlottesville, VA 22903</li>
                    <li><strong>What to Bring:</strong> Water bottle, lunch, and one or two light snacks.</li>
                    <li><strong>Video gaming</strong>: Not allowed — bootcamp sessions are fully structured.</li>
                    <li><strong>Tech Provided:</strong> Computers and robotics kits <em>(for in‑camp use only; equipment stays with us)</em>.</li>
                    <li><strong>Skill Level:</strong> No prior robotics experience required — the curriculum starts from the basics and progresses to certification-level challenges.</li>
                    <li><strong>Dress Code:</strong> Comfortable clothes; indoor‑friendly shoes</li>
                    <li><strong>Contact:</strong> camps@blueridgeboost.com • (434) 260‑0636</li>
                    <li><strong>Allergies/Medical:</strong> Share details during registration; bring any necessary meds</li>
                    <li><strong>Behavior & Safety:</strong> Kindness first; follow staff directions; internet safety rules apply</li>
                </ul>
                </section>`;

        const subtitle = `${camp['Subtitle'.toLowerCase()]}`;
        const description = `${fileContent}\n\n${campInfo}`;
        const seo = await extractSeo(description);
        const options = [
            {
                name: OPTION_NAME,
                type: "RADIO",
                choices: [
                    { text: `Full-Day Week1 (${week[0]})`, }, { text: `Full-Day Week2 (${week[1]})`, }, 
                    { text: `AM (${week[2]})`,},{text: `PM (${week[2]})`,}
                ],
                defaultChoice: 0,
            }];
        options.push(
                {
                    name: "Camper's Name",
                    type: "TEXTFIELD",
                    required: true,
                });
        options.push(
                {
                    name: "Camper's Age",
                    type: "TEXTFIELD",
                    required: false,
                });
        const quantity = parseInt(camp['Max'], 8);
        const campData = {
            name: camp['name'],
            quantity: camp['Max'],
            price: 1299.99,
            isShippingRequired: false,
            sku: `SUMMER26-${camp['brb id'].toUpperCase()}`,
            customSlug: `summer-2026-${slugify(camp['brb id'])}`,
            enabled: true,
            discountsAllowed: true,
            options: options,
            warningLimit: 1,
            description:  description,
            categoryIds: [BOOTCAMPS_CATEGORY_ID],
            seoTitle: camp['name'] + "-" + subtitle + " | Blue Ridge Boost",
            seoDescription: seo.seoDescription,
            discountsAllowed: true,
            subtitle: subtitle,
            outOfStockVisibilityBehaviour: "SHOW",
            minPurchaseQuantity: 1,
            maxPurchaseQuantity: 3,
            googleProductCategory: 543,
            productClassId: 46004502,
            combinations: [
                {
                    combinationNumber: 1,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: `Full-Day Week1 (${week[0]})`,
                        }],
                    quantity: quantity,
                    price: 1299.99,
                },
                {
                    combinationNumber: 2,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: `Full-Day Week2 (${week[1]})`,
                        }],
                    quantity: quantity,
                    price: 1299.99,
                },
                {
                    combinationNumber: 3,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: `AM (${week[2]})`,
                        }
                    ],
                    quantity: quantity,
                    price: 1299.99,
                }
                {
                    combinationNumber: 4,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: `PM (${week[2]})`,
                        }
                    ],
                    quantity: quantity,
                    price: 1299.99,
                }
            ],
            attributes: [
                {
                    name: "brb_id",
                    value: camp['brb id'],
                },
                {
                    name: "Camp Week",
                    value: startDate2Week[toISODate(camp['Start Date'.toLowerCase()])][2] || "Unknown Week",
                },
                {
                    name: "Camp Topic",
                    value: topic,
                },
                {
                    name: "Max",
                    value: max,},
            ],
        };
        console.log(JSON.stringify(campData, null, 2));
        await createEcwidProduct(campData);
    }

}


function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60); // Ecwid limit-safe
}
