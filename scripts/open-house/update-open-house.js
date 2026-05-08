import { OPEN_HOUSE_CATEGORY_ID, getCatalog, createEcwidProduct, unassignCategory, updateEcwidProduct, updateEcwidCategoryOrder } from '../ecwid.js';
import { nextFirstSaturdayOfMonth, isPastDate, formatIsoDateToLong } from '../date-helpers.js';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loaded environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SKIP_DATES = ["2026-05-09"];

function getAttributeValue(item, name) {
    const attribute = item.attributes?.find(attr => attr.name === name);
    return attribute ? attribute.value : undefined;
}

function createProduct(openHouse) {
    const productName = `Open House - ${formatIsoDateToLong(openHouse.date)}`;
    return {
        name: productName,
        quantity: 25,
        price: 0.00,
        customSlug: `open-house-${openHouse.date}`,
        sku: `OH-${openHouse.date}`,
        enabled: true,
        description: `Join us for our Open House on ${formatIsoDateToLong(openHouse.date)}!`,
        isShippingRequired: false,
        categoryIds: [OPEN_HOUSE_CATEGORY_ID],
        defaultCategoryId: OPEN_HOUSE_CATEGORY_ID,
        seoTitle: productName + " | Blue Ridge Boost",
        subtitle: formatIsoDateToLong(openHouse.date),
        outOfStockVisibilityBehaviour: "SHOW",
        attributes: [
            { name: "start_date", value: openHouse.date },
            { name: "end_date", value: openHouse.date },
            { name: "brb_id", value: `Open-House-${openHouse.date}` },
            { name: "day_of_week", value: JSON.stringify(["Saturday"]) },
            { name: "Subtitle", value: formatIsoDateToLong(openHouse.date) }
        ],
        ribbon: {
            text: formatIsoDateToLong(openHouse.date),
            color: "#F35A66"
        }
    };
}

async function productSort() {
    const products = await getCatalog([OPEN_HOUSE_CATEGORY_ID], false);
    const sorted = products.sort((p1, p2) => {
        const d1 = new Date(getAttributeValue(p1, "start_date"));
        const d2 = new Date(getAttributeValue(p2, "start_date"));
        return d1 - d2;
    });
    try {
        const ids = sorted.map(p => p.id);
        await updateEcwidCategoryOrder(OPEN_HOUSE_CATEGORY_ID, ids);
    } catch (error) {
        console.error('Error updating category sort:', error);
    }
}

export async function updateOpenHouses() {
    const nextOpenHouses = nextFirstSaturdayOfMonth(3).filter(oh => !SKIP_DATES.includes(oh.date));
    console.log("Next 3 Open Houses:", nextOpenHouses);

    const startDates = [];
    const products = await getCatalog([OPEN_HOUSE_CATEGORY_ID], false);

    for (const p of products) {
        const startDateStr = getAttributeValue(p, "start_date");
        console.log(`Product ${p.id} start_date:`, startDateStr, isPastDate(startDateStr) ? "(past)" : "(upcoming)");
        if (isPastDate(startDateStr)) {
            // Disable past product and remove from category
            p.enabled = false;
            await updateEcwidProduct(p);
            await unassignCategory(OPEN_HOUSE_CATEGORY_ID, [p.id]);
        } else {
            startDates.push(startDateStr);
            // TODO: update product media here once an image URL is available
        }
    }

    // Create products for any upcoming open houses that don't exist yet
    for (const oh of nextOpenHouses) {
        if (!startDates.includes(oh.date)) {
            console.log(`Creating new product for ${oh.date}`);
            const newProduct = createProduct(oh);
            const productId = await createEcwidProduct(newProduct);
            // TODO: set product image here once an image URL is available
            // await updateProductMedia(productId, imageURL(oh));
        }
    }

    await productSort();
}