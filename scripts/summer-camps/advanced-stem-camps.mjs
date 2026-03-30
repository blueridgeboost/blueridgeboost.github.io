import path from "path"
import { readCsvDataFromPath } from "../fs-helpers.js"
import { readFile } from "fs/promises"
import { extractSeo } from "../ai-queries.js"
import { toISODate } from "../date-helpers.js"
import { getProductFilters, listProductTypes, updateProductTypeById, 
        getProductTypeById, createEcwidProduct, getSummerCampsCategoryIds, 
        deleteSummerCamps, getSummerCamps, getProductById, updateEcwidProduct, 
        SUMMER_CAMPS_CATEGORY_ID,
        ADVANCED_STEM_CAMPS_CATEGORY_ID} from "../ecwid.js"

const SUMMER_CAMPS_HOME_DIRECTORY = "G:\\Shared drives\\BRB\\Summer 2026\\"
const SUMMER_CAMPS_LIST = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "Advanced STEM Camps 2026 list.csv")
const SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "descriptions")

const OPTION_NAME = "Session Time"

const startDate2Week = {
        '2026-06-01': 'Week June 1-5',
        '2026-06-08': 'Week June 8-12',
        '2026-06-15': 'Week June 15-19',
        '2026-06-22': 'Week June 22-26',
        '2026-06-29': 'Week June 29 - July 3',
        '2026-07-06': 'Week July 6-10',
        '2026-07-13': 'Week July 13-17',
        '2026-07-20': 'Week July 20-24',
        '2026-07-27': 'Week July 27-31',
        '2026-08-03': 'Week August 3-7',
    }

async function generateEcwidAdvancedSTEMCamps(camp) {
    const camps = await readCsvDataFromPath(SUMMER_CAMPS_LIST);
    for (const camp of camps) {
        console.log(camp);
        const fileContent = await readFile(path.join(SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY, `${camp['brb id']}.txt`), 'utf8');
        const campInfo = `<section aria-labelledby="essentials-title">
                <h3 id="essentials-title">Camp Essentials</h3>
                <ul>
                    <li><strong>Ages:</strong> 13 and up (advanced 11–12‑year‑olds welcome).</li>
                    <li><strong>Dates:</strong> Monday, ${camp['Start Date'.toLowerCase()]} to Friday, ${camp['End Date'.toLowerCase()]}</li>
                    <li><strong>Times:</strong> 
                        <ul>
                        <li>Full-Day, 8:30 AM–5:00 PM</li>
                        <li>AM, 8:30 AM–1:00 PM</li>
                        <li>PM, 12:30–5:00 PM</li>
                        </ul>
                    </li>
                    <li><strong>Location:</strong> 2171 Ivy Rd, Charlottesville, VA 22903</li>
                    <li><strong>What to Bring:</strong> Water bottle, lunch, and one or two light snacks.</li>
                    <li><strong>Video gaming</strong>:
                        ${camp['No gaming']?.toLowerCase() === 'yes' ? 
                            "Not allowed" : 
                            "Allowed with parent permission during Exploration Time"}
                    </li>
                    <li><strong>Tech Provided:</strong> Computers and robotics kits <em>(for in‑camp use only; equipment stays with us)</em>.</li>
                    <li><strong>Skill Level:</strong> No prior experience needed — we start with the fundamentals and build up. Campers who already have some background will be challenged with advanced extensions.</li>
                    <li><strong>Dress Code:</strong> Comfortable clothes; indoor‑friendly shoes</li>
                    <li><strong>Contact:</strong> camps@blueridgeboost.com • (434) 260‑0636</li>
                    <li><strong>Allergies/Medical:</strong> Share details during registration; bring any necessary meds</li>
                    <li><strong>Behavior & Safety:</strong> Kindness first; follow staff directions; internet safety rules apply</li>
                </ul>
                </section>`;

        const subtitle = `${camp['Start Date'.toLowerCase()]} - ${camp['End Date'.toLowerCase()]} | Ages ${camp['Age 1']}-${camp['Age 2']}`;
        const description = `${fileContent}\n\n${campInfo}`;
        const seo = await extractSeo(description);
        const options = [
            {
                name: OPTION_NAME,
                type: "RADIO",
                choices: [
                    { text: "Full-Day", }, { text: "AM",},{text: "PM",}
                ],
                defaultChoice: 0,
            }];
        if (camp['No gaming']?.toLowerCase() !== 'yes') {
            options.push(            
                    {
                        name: "Gaming Option (Exploration Time)",
                        type: "CHECKBOX",
                        required: true,
                        choices: [
                            { text: "No Gaming", value: "No Gaming" }, 
                            { text: "Minecraft", value: "Minecraft" }, 
                            { text: "Roblox", value: "Roblox" }],
                        defaultChoice: 0,
                    });
        }
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
        const quantity = parseInt(camp['Max'], 10);
        const campData = {
            name: camp['name'],
            quantity: camp['Max'],
            price: 599.99,
            isShippingRequired: false,
            sku: `SUMMER26-${camp['brb id'].toUpperCase()}`,
            customSlug: `summer-2026-${slugify(camp['brb id'])}`,
            enabled: true,
            discountsAllowed: true,
            options: options,
            warningLimit: 1,
            description: [ADVANCED_STEM_CAMPS_CATEGORY_ID],
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
                            value: "Full-Day",
                        }],
                    quantity: quantity,
                    price: 599.99,
                },
                {
                    combinationNumber: 2,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: "AM",
                        }],
                    quantity: quantity,
                    price: 399.99,
                },
                {
                    combinationNumber: 3,
                    options: [
                        {
                            name: OPTION_NAME,
                            value: "PM",
                        }
                    ],
                    quantity: quantity,
                    price: 399.99,
                }
            ],
            attributes: [
                {
                    name: "brb_id",
                    value: camp['brb id'],
                },
                {
                    name: "Camp Week",
                    value: startDate2Week[toISODate(camp['Start Date'.toLowerCase()])],
                },
                {
                    name: "Camp Topic",
                    value: topic,
                },
                {
                    name: "Camper's Age",
                    value: `${camp['Age 1']}-${camp['Age 2']}`,
                },
               { 
                    name: "Gaming",
                    value: camp['No gaming']?.toLowerCase() === 'yes' ? "No Gaming" : "With parent permission during Exploration Time",
               }
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
