import { getAttributeValue, getOneDayCamps } from "./ecwid.js";
import { provider, location, audience, campURL } from "./rich-results-helpers.js";
import { writePartialFile } from './fs-helpers.js';




function threeDaysBefore(dateStr) {
  const d = new Date(dateStr); // interprets as UTC if using YYYY-MM-DD
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function offer(fullDayPrice, halfDayPrice, earlyBirdDiscountPercent, startDate) {
    return ({
        "@type": "AggregateOffer",
        "priceCurrency": "USD",
        "highPrice": fullDayPrice,
        "lowPrice": Number(halfDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
        "validFom": "2025-09-12",
        "availability": "https://schema.org/InStock",
        "offers": [
            {
                "@type": "Offer",
                "name": "Half-Day",
                "price": halfDayPrice,
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "sessionLength",
                    "value": "half-day"
                }
            },
            {
                "@type": "Offer",
                "name": `Half-Day (Early Bird -${earlyBirdDiscountPercent}%)`,
                "price": Number(halfDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "validThrough": `${threeDaysBefore(startDate)}T00:00:00-05:00`,
                "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": 3 },
                "additionalProperty": [
                    { "@type": "PropertyValue", "name": "sessionLength", "value": "half-day" },
                    { "@type": "PropertyValue", "name": "discountType", "value": "early-bird" },
                    { "@type": "PropertyValue", "name": "discountPercent", "value": earlyBirdDiscountPercent }
                ]
            },
            {
                "@type": "Offer",
                "name": "Full-Day",
                "price": fullDayPrice,
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "sessionLength",
                    "value": "full-day"
                }
            },
            {
                "@type": "Offer",
                "name": `Full-Day (Early Bird -${earlyBirdDiscountPercent}%)`,
                "price": Number(fullDayPrice)*(1-Number(earlyBirdDiscountPercent)/100),
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "validThrough":  `${threeDaysBefore(startDate)}T00:00:00-05:00`,
                "eligibleQuantity": { "@type": "QuantitativeValue", "maxValue": 3 },
                "additionalProperty": [
                    { "@type": "PropertyValue", "name": "sessionLength", "value": "full-day" },
                    { "@type": "PropertyValue", "name": "discountType", "value": "early-bird" },
                    { "@type": "PropertyValue", "name": "discountPercent", "value": earlyBirdDiscountPercent }
                ]
            }
        ]
    })
}

export async function generateOneDayCampsRichResults() {
    const camps = await getOneDayCamps();
    const webPage = {
        "@context": "https://schema.org",
        "@type": ["WebPage", "CollectionPage"],
        "name": "One-Day Camps | Blue Ridge Boost",
        "url": "https://blueridgeboost.com/1-day-camps/",
        "description": "Blue Ridge Boosts offers half-day and full-day instructional programs for ages 6-13 during school breaks in Charlottesville, VA. Choose from robotics, Minecraft coding, Roblox game design, and strategic games. Early bird discount available.",
        "mainEntity": {
            "@type": "ItemList",
            "name": "Upcoming One-Day Camps",
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
            "url": campURL(camp), 
            "item": {
                "@type": "Event",
                "name": camp.name,
                "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                "eventStatus": "https://schema.org/EventScheduled",
                "startDate": `${getAttributeValue(camp, 'start_date')}T08:30:00-04:00`,
                "endDate": `${getAttributeValue(camp, 'start_date')}T17:00:00-04:00`,
                "location": location(),
                "organizer": provider(),
                "audience": audience(),
                "typicalAgeRange": "6-13",
                "doorTime": `${getAttributeValue(camp, 'start_date')}T08:30:00-04:00`,
                "offers": offer(165, 140, 25, getAttributeValue(camp, 'start_date')),
                "image": [
                    camp.originalImage.url
                ],
                "description": "One-day instructional camp in robotics, coding, and math. Half-day and full-day options. Drop-off starts at 8:30 AM; pick-up by 1:00 PM (half-day) or 5:00 PM (full-day)."
            }
        };
        webPage.mainEntity.itemListElement.push(listItem);
    }
    await writePartialFile('camps.html', JSON.stringify(webPage, null, 2));
}