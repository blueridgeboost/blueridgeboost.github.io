import {GAMING_FRIDAYS_CATEGORY_ID, getCatalog, createEcwidProduct, unassignCategory, updateEcwidProduct, updateEcwidCategoryOrder, updateProductMedia, ONE_DAY_CAMPS_CATEGORY_ID, GAME_DEV_CATEGORY_ID, ELEMENTARY_CATEGORY_ID, CODING_CATEGORY_ID, getFridayGaming} from '../ecwid.js';
import {minecraftDescription} from './minecraft.js'
import { secondFridayDescription } from './second-friday.js';
import { fortniteDescription } from './fortnite.js';
import { robloxDescription } from './roblox.js';
import { fifthFridayDescription } from './fifth-friday.js';
import { getNext5FridaysWithOrdinal } from '../date-helpers.js'
import { isPastDate, formatIsoDateToLong } from '../date-helpers.js';
import path from 'path';
import { audience, gamingURL, location, provider } from '../rich-results-helpers.js';
import { writePartialFile } from '../fs-helpers.js';


const skipDates = ["2025-10-31", "2025-11-28", "2025-12-26", "2026-01-02"];

function getAttributeValue(item, name) {
    const attribute = item.attributes?.find(attr => attr.name === name);
    return attribute ? attribute.value : undefined;
}

function shuffleInPlace(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1)); // 0 ≤ j ≤ i
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr; // shuffled in place
}

async function getRelatedProducts() {
	// one day camp
	// one game development class
	// one robotics class
	const products = [ (await getCatalog([ONE_DAY_CAMPS_CATEGORY_ID], true, 1))[0],
		shuffleInPlace(await getCatalog([GAME_DEV_CATEGORY_ID, ELEMENTARY_CATEGORY_ID], true, 100))[0],
		shuffleInPlace(await getCatalog([CODING_CATEGORY_ID, ELEMENTARY_CATEGORY_ID], true, 100))[0],
	];
	return products.map(p => p.id);
}


async function createProduct(friday) {
	let productName = "";
	let description = "";
	if ( friday.ordinalInMonth === 1 ) {
		productName = "Game Night: Minecraft + Free Pizza!";
		description = minecraftDescription(formatIsoDateToLong(friday.date));
	} else if ( friday.ordinalInMonth == 2 ) {
		productName = "Second Friday: Exploration + Free Pizza!";
		description = secondFridayDescription(formatIsoDateToLong(friday.date));
	} else if ( friday.ordinalInMonth === 3 ) {
		productName = "Fortnite + Free Pizza!";
		description = fortniteDescription(formatIsoDateToLong(friday.date));
	} else if ( friday.ordinalInMonth === 4 ) {
		productName = "Game Night: Roblox + Free Pizza!";
		description = robloxDescription(formatIsoDateToLong(friday.date));
	} else if ( friday.ordinalInMonth === 5 ) {
		productName = "Game Night: Your choice of Game + Free Pizza!";
		description = fifthFridayDescription(formatIsoDateToLong(friday.date));
	}
	// elementary school related products starting soon or join now, game development
	return {
		name: productName,
		quantity: 16,
		price: 45.00,
		customSlug: `gaming-friday-${friday.date}`,
		sku: `GF-${friday.date}`,
		enabled: true,
		warningLimit: 8,
		description: description,
		isShippingRequired: false,
		categoryIds: [GAMING_FRIDAYS_CATEGORY_ID],
		defaultCategoryId: GAMING_FRIDAYS_CATEGORY_ID,
		seoTitle: productName + " | Blue Ridge Boost",
		relatedProducts: {
			productIds: await getRelatedProducts()
		},
		subtitle: formatIsoDateToLong(friday.date),
		outOfStockVisibilityBehaviour: "SHOW",
		maxPurchaseQuantity: 3,
		attributes: [
			{
				name: "start_date",
				value: friday.date
			},
			{
				name: "end_date",
				value: friday.date
			},
			{
				name: "brb_id",
				value: `Gaming-Friday-${friday.date}`
			},
			{
				name: "start_time",
				value: "5:30  PM"
			},
			{
				name: "end_time",
				value: "8:30  PM"
			},
			{
				name: "day_of_week",
				value: JSON.stringify(["Friday"])
			},
			{
				name: "Subtitle",
				value: formatIsoDateToLong(friday.date)
			}
		],
		"ribbon": {
    		"text": `${formatIsoDateToLong(friday.date)}`,
    		"color": "#F35A66"
  		}
	};
}

function imageURL(friday) {
	if ( friday.ordinalInMonth == 1 ) {
		// Minecraft
		// return "https://drive.google.com/file/d/1B5CjmH5OgY5FZprqhZsiF8IxyYXpMNeu/view?usp=sharing";
		return "https://drive.google.com/uc?export=download&id=1B5CjmH5OgY5FZprqhZsiF8IxyYXpMNeu";
	} else if (friday.ordinalInMonth == 2) {
		// free choice
		// return "https://drive.google.com/file/d/1-NjSULjmKcz2x9PGOpSruUt-HpmPLlUE/view?usp=sharing";
		return "https://drive.google.com/uc?export=download&id=1-NjSULjmKcz2x9PGOpSruUt-HpmPLlUE";
	} else if (friday.ordinalInMonth == 3) {
		// Fortnite
		// return "https://drive.google.com/file/d/1D7ElLbTQrjG0Gjl6fvCVjfB2Zy-HBNuc/view?usp=sharing";
		return "https://drive.google.com/uc?export=download&id=1D7ElLbTQrjG0Gjl6fvCVjfB2Zy-HBNuc";
	} else if (friday.ordinalInMonth == 4) {
		// Roblox
		// return "https://drive.google.com/file/d/1OJ-kHmq0abJfXaOoWimMgmJ1J46CqQyS/view?usp=sharing";
		return "https://drive.google.com/uc?export=download&id=1OJ-kHmq0abJfXaOoWimMgmJ1J46CqQyS";
	} else {
		// Fifth Friday
		// return "https://drive.google.com/file/d/1-NjSULjmKcz2x9PGOpSruUt-HpmPLlUE/view?usp=sharing";
		return "https://drive.google.com/uc?export=download&id=1-NjSULjmKcz2x9PGOpSruUt-HpmPLlUE";
	}
	
}

async function productSort() {
	
	const products = await getCatalog([GAMING_FRIDAYS_CATEGORY_ID], false);

	// sort the products from this category by their start_date
	const cat_sorted = products.sort( (p1, p2) => {
		let d1 = new Date(getAttributeValue(p1, "start_date"))
		let d2 = new Date(getAttributeValue(p2, "start_date"))
		return d1 - d2
	})
	//
	try {
		// retrieve the ids from the list of products
		const ids = cat_sorted.map( p => p.id);
		await updateEcwidCategoryOrder(GAMING_FRIDAYS_CATEGORY_ID, ids);
	} catch (error) {
		console.error('Error updating category sort:', error);
	}
}

export async function updateGamingFridays() {
	
	const nextFridays = getNext5FridaysWithOrdinal().filter( f => !skipDates.includes(f.date) );
	console.log("Next 5 Fridays:", nextFridays);
	const startDates = [];
	const products = await getCatalog([GAMING_FRIDAYS_CATEGORY_ID], false);
	for (const p of products) {
		// if start_date in the past, disable it and remove it from the category
		const startDateStr = getAttributeValue(p, "start_date");
		console.log(`Product ${p.id} start_date:`, startDateStr, isPastDate(startDateStr) ? "(past)" : "(upcoming)");
		if ( isPastDate(startDateStr) ) {
			// disable the product and remove it from the category
			p.enabled = false;
			await updateEcwidProduct(p);
			await unassignCategory(GAMING_FRIDAYS_CATEGORY_ID, [p.id]);
		} else {
			// record that we have a product for this date
			startDates.push(startDateStr);
			await updateProductMedia( p.id, imageURL(nextFridays.find(
				f => f.date == startDateStr
			)) );
		}
	}
	// check if we have to create new products
	for (const friday of nextFridays) {
		if ( !(startDates.includes(friday.date)) ) {
			// Create a new product for this Friday
			console.log(`Creating new product for ${friday.date}`);
			const newProduct = await createProduct(friday);
			const productId = await createEcwidProduct(newProduct);
			await updateProductMedia( productId, imageURL(friday) )
		} 
	}
	productSort()
}

function offer() {
    return ({
        "@type": "AggregateOffer",
        "priceCurrency": "USD",
        "highPrice": 65.00,
        "lowPrice": 45.00,
        "validFom": "2025-09-12",
        "availability": "https://schema.org/InStock",
        "offers": [
            {
                "@type": "Offer",
                "name": "Ages 6-10",
                "price": 45.00,
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "Ages",
                    "value": "6-10"
                }
            },
            {
                "@type": "Offer",
                "name": "Ages 10+",
                "price": 65.00,
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "Ages",
                    "value": "10+"
                }
            },
        ]
    })
}


export async function generateGamingRichResults() {
	const camps = await getFridayGaming();
	const webPage = {
		"@context": "https://schema.org",
		"@type": ["WebPage", "CollectionPage"],
		"name": "Gaming Fridays | Blue Ridge Boost",
		"url": "https://blueridgeboost.com/gaming/",
		"description": "Gaming Fridays in Charlottesville, 5:30–8:30 PM. Ages 6–10 & 10+. Minecraft, Fortnite, Roblox. Safe, supervised, free pizza. Limited seats—reserve now!",
		"mainEntity": {
			"@type": "ItemList",
			"name": "Upcoming Gaming Fridays",
			"itemListOrder": "http://schema.org/ItemListUnordered",
			"numberOfItems": camps.length,
			"itemListElement": [],
		}
	}
	for (let i=0; i<camps.length; i++) {
		const camp = camps[i];
		console.log(camp.name);
		const listItem = {
			"@type": "ListItem",
			"position": (i+1),
			"url": gamingURL(camp), 
			"item": {
				"@type": "Event",
				"name": camp.name,
				"eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
				"eventStatus": "https://schema.org/EventScheduled",
				"startDate": `${getAttributeValue(camp, 'start_date')}T017:30:00-04:00`,
				"endDate": `${getAttributeValue(camp, 'start_date')}T20:30:00-04:00`,
				"location": location(),
				"organizer": provider(),
				"audience": audience(),
				"typicalAgeRange": "6-14",
				"doorTime": `${getAttributeValue(camp, 'start_date')}T17:30:00-04:00`,
				"offers": offer(),
				"image": [
					camp.originalImage.url
				],
				"description": webPage.description,
			}
		};
		webPage.mainEntity.itemListElement.push(listItem);
	}
	await writePartialFile('gaming-fridays.html', JSON.stringify(webPage, null, 2));
}