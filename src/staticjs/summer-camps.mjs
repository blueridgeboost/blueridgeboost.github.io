import path from "path"
import { readCsvDataFromPath } from "./fs-helpers.js"
import { readFile } from "fs/promises"
import { extractSeo } from "./ai-queries.js"
import { toISODate } from "./date-helpers.js"
import { createEcwidProduct, getSummerCampsCategoryIds, deleteSummerCamps, getSummerCamps } from "./ecwid.js"

const SUMMER_CAMPS_HOME_DIRECTORY = "G:\\Shared drives\\BRB\\Summer 2026\\"
const SUMMER_CAMPS_LIST = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "Summer Camps 2026 list.csv")
const SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY = path.join(SUMMER_CAMPS_HOME_DIRECTORY, "descriptions")

const OPTION_NAME = "Session Time"

async function generateEcwidSummerCamps(camp) {
    await deleteSummerCamps();
    const camps = await readCsvDataFromPath(SUMMER_CAMPS_LIST);
    for (const camp of camps) {
        console.log(camp);
        const fileContent = await readFile(path.join(SUMMER_CAMPS_DESCRIPTIONS_DIRECTORY, `${camp['brb id']}.txt`), 'utf8');
        const campInfo = `<section aria-labelledby="essentials-title">
                <h3 id="essentials-title">Camp Essentials</h3>
                <ul>
                    <li><strong>Ages:</strong> ${camp['Age 1']} to ${camp['Age 2']} years old.</li>
                    <li><strong>Dates:</strong> Monday, ${camp['Start Date']} to Friday, ${camp['End date']}</li>
                    <li><strong>Times:</strong> 
                        <ul>
                        <li>Full-Day,8:30 AM–5:00 PM</li>
                        <li>AM, 8:30 AM - 1:00 PM</li>
                        <li>PM, 12:30 PM - 5:00 PM</li>
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
                    <li><strong>Skill Level:</strong> Beginners welcome; no prior coding experience required</li>
                    <li><strong>Dress Code:</strong> Comfortable clothes; indoor‑friendly shoes</li>
                    <li><strong>Contact:</strong> camps@yblueridgeboost.com • (434) 260‑0636</li>
                    <li><strong>Allergies/Medical:</strong> Share details during registration; bring any necessary meds</li>
                    <li><strong>Behavior & Safety:</strong> Kindness first; follow staff directions; internet safety rules apply</li>
                </ul>
                <p class="note" aria-live="polite">
                    Note: The camps listed as ages 6 to 12 will be divided by age into two groups.
                </p>
                </section>`;

        const subtitle = `${camp['Start Date']} - ${camp['End date']} | Ages ${camp['Age 1']}-${camp['Age 2']}`;
        const description = `${fileContent}\n\n${campInfo}`;
        const seo = await extractSeo(description);
        const options = [
            {
                name: OPTION_NAME,
                type: "RADIO",
                choices: [
                    {
                        text: "Full-Day",
                        // value: "Full-Day",
                        priceModifier: 0,
                        priceModifierType: "ABSOLUTE",

                    },
                    {
                        text: "AM",
                        // value: "AM",
                        priceModifier: -200.0,
                        priceModifierType: "ABSOLUTE",

                    },
                    {
                        text: "PM",
                        // value: "PM",
                        priceModifier: -200.0,
                        priceModifierType: "ABSOLUTE",
                    }
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
                    name: "Camper 1 Name",
                    type: "TEXTFIELD",
                    required: true,
                });
        options.push(
                {
                    name: "Camper 2 Name",
                    type: "TEXTFIELD",
                    required: false,
                });
        options.push(
                {
                    name: "Camper 3 Name",
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
            ribbon: {
                text: camp['Ribbon Text'],
                color: `${camp["Ribbon Color"].trim()}`, 
                //(c => (c && c[0] !== "#" ? `#${c}` : c))((camp["Ribbon Color"]).trim()),
            },
            options: options,
            warningLimit: 1,
            description:  description,
            categoryIds: getSummerCampsCategoryIds(camp['Age 1'], camp['Age 2']),
            seoTitle: camp['name'] + "-" + subtitle + " | Blue Ridge Boost",
            seoDescription: seo.seoDescription,
            discountsAllowed: true,
            subtitle: subtitle,
            outOfStockVisibilityBehaviour: "SHOW",
            minPurchaseQuantity: 1,
            maxPurchaseQuantity: 3,
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
                    name: "start_date",
                    value: toISODate(new Date(camp['Start Date'])),
                },
                {
                    name: "end_date",
                    value: toISODate(new Date(camp['End date'])),
                },
                {
                    name: "start_time",
                    value: "8:30 AM",
                },
                {
                    name: "end_time",
                    value: "1:00 PM/5:30 PM",
                },
                {
                    name: "grades",
                    value: JSON.stringify(gradesFromAges(camp['Age 1'] , camp['Age 2'])),
                },
                {
                    name: "day_of_week",
                    value: "[\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\"]",
                },
                {
                    name: "Subtitle",
                    value: subtitle,
                },
                {
                    name: "Duration (in weeks)",
                    value: "1",
                },
            ],
        };
        console.log(JSON.stringify(campData, null, 2));
        await createEcwidProduct(campData);
        // break; // For testing, process only the first camp
    }

}

function gradesFromAges(startAge, endAge) {
    const a = Math.min(startAge, endAge);
    const b = Math.max(startAge, endAge);

    const ord = (n) => {
        const v = n % 100;
        if (v >= 11 && v <= 13) return `${n}th`;
        switch (n % 10) {
            case 1: return `${n}st`;
            case 2: return `${n}nd`;
            case 3: return `${n}rd`;
            default: return `${n}th`;
        }
    };
    const result = [];
    for (let age = a; age <= b; age++) {
        const grade = age - 5;
        if (grade > 0) result.push(ord(grade));
    }
    return result;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60); // Ecwid limit-safe
}

// await generateEcwidSummerCamps();

function updateSummerCampsStockLevel() {
    const camps = getSummerCamps();
    const orders = getCampOrders(camps);
    const campsOrders = {};
    for (const order of orders) {
        for (const item of order.items) {
            const brbIdAttr = item.attributes.find(a => a.name === 'brb_id');
            if (brbIdAttr) {
                const brbId = brbIdAttr.value;
                if (!campsOrders[brbId]) {
                    campsOrders[brbId] = 0;
                }
                // check the type of camp
                campsOrders[brbId] += item.quantity;
            }
        }
    }
    for (const camp of camps) {
        const brbIdAttr = camp.attributes.find(a => a.name === 'brb_id');
        const brbId = brbIdAttr?.value;

    }        

}
