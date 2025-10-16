import dotenv from 'dotenv';
import { getAllClasses, STARTING_SOON_ID, ON_DEMAND_ID, IN_PROGRESS_ID, ROBOTICS_ID, SINGLE_ID,
    CODING_ID, GAME_DEV_ID, MATH_ID, SCIENCE_ID, AI_ID, SESSIONS_ID, SUBSCRIPTIONS_ID, getAttributeValue } from './ecwid.js';
import path from 'path';
import { writeMdFile, cleanUpHugoFiles, writePartialFile, readJson } from './fs-helpers.js';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });
const products = await getAllClasses();

function ordinalToNumber(s) {
  const digits = s.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

function scheduleTags(categoryIds) {
    const schedule_tags = [];
    if (categoryIds.includes(STARTING_SOON_ID)) {
        // Handle starting soon case
        schedule_tags.push("Starting Soon");
    } else if (categoryIds.includes(ON_DEMAND_ID)) {
        // Handle on demand case
        schedule_tags.push("On-Demand");
    } else if (categoryIds.includes(IN_PROGRESS_ID)) {
        // Handle in progress case
        schedule_tags.push("Join Now");
    }
    return schedule_tags;
}

function subjectTags(categoryIds) {
    const subjects = [];
    for (const catId of categoryIds) {
        if (catId === ROBOTICS_ID) {
            subjects.push("Robotics");
        } else if (catId === CODING_ID) {
            subjects.push("Computer Coding");
        } else if (catId === GAME_DEV_ID) {
            subjects.push("Game Development");
        } else if (catId === MATH_ID) {
            subjects.push("Math");
        } else if (catId === SCIENCE_ID) {
            subjects.push("Science");
        } else if (catId === AI_ID) {
            subjects.push("AI");
        }
    }
    return subjects;
}


function courseInstances(item) {
    const to24H = (time12) => {
        // e.g., "4:05 PM", "12:00 am", "7 pm"
        const [_, h, m = "00", ap] = time12.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i) || [];
        if (!_) throw new Error(`Invalid time: ${time12}`);
        let hour = parseInt(h, 10) % 12 + (ap.toLowerCase() === "pm" ? 12 : 0);
        const min = parseInt(m, 10);
        return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
    const genericInstance = {
        "@type": "CourseInstance",
        "name": `${item.name} (2025-2026)`,
        "courseMode": "InPerson",
        "location": {
            "@type": "Place",
            "name": "Blue Ridge Boost",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "2171 Ivy Rd",
                "addressLocality": "Charlottesville",
                "addressRegion": "VA",
                "postalCode": "22903",
                "addressCountry": "US"
            }
        },
    };

    const startTime = getAttributeValue('start_time');
    if (startTime) {
        genericInstance.startTime = to24H(startTime);
    }
    const endTime = getAttributeValue('end_time');
    if (endTime) {
        genericInstance.endTime = to24H(endTime);
    }

    if (item.categoryIds.includes(SESSIONS_ID)) {
        const sessions = [];
        const dates = JSON.parse(getAttributeValue('session'));
        for (const option in item.options) {
            if (typeof option?.name === 'string' && option.name.toLowerCase().startsWith('session')) {
                for (let i = 0; i<option.choices.length; i++) {
                    const courseInstance = { ... genericInstance };
                    const choice = option.choices[i];
                    courseInstance.name = choice.text;
                    if ( i < dates.length ) {
                        const startDate = dates[i][0];
                        const endDate = dates[i][3];
                        const subevents = [];
                        for (let j=0; j<dates[i].length; j++) {
                            subevents.push({ 
                                "@type": "Event", 
                                "name": `Class ${j+1}`, 
                                "startDate": `${dates[i][j]}T${genericInstance.startTime}-04:00`, 
                                "endDate": `${dates[i][j]}T${genericInstance.endTime}-04:00`
                            });
                        }
                        courseInstance.subEvent = subevents;
                    } 
                    sessions.push( courseInstance );
                }
            } 
        }
        return sessions;
    } else if (item.categoryIds.includes(SUBSCRIPTIONS_ID)) {
        const startDate = getAttributeValue('start_date');
        if (startDate) {
            genericInstance.startDate = startDate;
        }
        const endDate = getAttributeValue('end_date');
        if (endDate) {
            genericInstance.endDate = endDate;
        }
        genericInstance.eventSchedule = {
            "@type": "Schedule",
            "byDay": byDay(item),
            "repeatFrequency": "P1W"
        };
        return [genericInstance];
    } else {
        const startDate = getAttributeValue('start_date');
        if (startDate) {
            genericInstance.startDate = startDate;
        }
        const endDate = getAttributeValue('end_date');
        if (endDate) {
            genericInstance.endDate = endDate;
        }
        return [genericInstance];
    }
}

function pricePerUnit(item) {
    if (item.categoryIds.includes(SESSIONS_ID)) {
        return `for ${duration} sessions`;
    } else if (item.categoryIds.includes(SUBSCRIPTIONS_ID)) {
        return "price_unit: per month";
    } else {
        return "per session";
    }
}

function category(item) {
    if (item.categoryIds.includes(SESSIONS_ID)) {
        return "Session";
    } else if (item.categoryIds.includes(SUBSCRIPTIONS_ID)) {
        return "Ongoing";
    } else {
        return "One Time";
    }
}

function duration(item) {
    const duration = getAttributeValue(item, 'Duration (in weeks)');
    if (item.categoryIds.includes(SESSIONS_ID)) {
       return `${duration} wk`;
    } else if (item.categoryIds.includes(SUBSCRIPTIONS_ID)) {
        if (duration === undefined) {
            return "Flexible";
        } else if (duration <= 12) {
            return "2-3 mo";
        } else if (duration <= 24) {
            return "4-6 mo";
        } else {
            return "6+ mo";
        }
    } else if (item.categoryIds.includes(SINGLE_ID)) {
        return "1 wk";
    }
}

function dayTags(item) {
    const day_tags = JSON.parse(getAttributeValue(item, 'day_of_week') || "[]").map(d => String(d).slice(0, 3));
    return JSON.stringify(day_tags);
}

function gradeTags(item) {
    return getAttributeValue(item, 'grades');
}

async function generateClassFiles() {
    products.sort((a, b) => {
        const aGrade = ordinalToNumber(JSON.parse(getAttributeValue(a, 'grades'))[0]);
        const bGrade = ordinalToNumber(JSON.parse(getAttributeValue(b, 'grades'))[0]);
        return aGrade < bGrade ? -1 : (aGrade > bGrade ? 1 : 0);
    });
    // for each product, create a markdown file
    for (let i = 0; i < products.length; i++) {
        console.log(`Processing product: ${products[i].name}`);
        const item = products[i];
        if (!item.enabled) continue;
        console.log(`Processing ${item.name}`);
        const brbId = getAttributeValue(item, 'brb_id');
        const classDict = {
            "ecwid": item.id,
            "product_id": brbId,
            "layout": "single",
            "schedule_tags": scheduleTags(item.categoryIds),
            "subject_tags": subjectTags( item.categoryIds),
            "price": item.price,
            "price_unit": pricePerUnit(item),
            "category": category(item),
            "duration": duration(item),
            "weight": i+1,
            "page_title": item.name,
            "page_subtitle": item.subtitle,
            "ribbon": item.ribbon.text,
            "title":  `${item.name} | Blue Ridge Boost`,
            "description": item.seoDescription,
            "day_tags": dayTags(item),
            "grade_tags" : gradeTags(item),
        };
        console.log(classDict);
        await writeMdFile(`${brbId}.md`, classDict);
    }
}


async function generateClassesRichResults() {
    const classes = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": []
    };
    
    for (let i=0; i < products.length; i++) {
        const c = products[i];
        if (!c.enabled) continue;
        const brbId =  getAttributeValue(c, 'brb_id');
        classes.itemListElement.push({
            "@type": "ListItem",
            "position": i,
            "item": {
                "@type": "Course",
                "@id": `https://blueridgeboost.com/classes/${brbId}`,
                "url": `https://blueridgeboost.com/classes/${brbId}`,
                "name": c.name,
                "image": c.originalImage?.url,
                "description": c.seoDescription,
                "provider": {
                    "@type": "Organization",
                    "name": "Blue Ridge Boost",
                    "sameAs": "https://blueridgeboost.com"
                },
            }
        });
        const detailedItem = {
            "@type": "Course",
            "@context": "https://schema.org",
            "@id": `https://blueridgeboost.com/classes/${brbId}`,
            "url": `https://blueridgeboost.com/classes/${brbId}`,
            "name": c.name,
            "image": c.originalImage?.url,
            "description": c.seoDescription,
            "provider": {
                "@type": "Organization",
                "name": "Blue Ridge Boost",
                "sameAs": "https://blueridgeboost.com"
            },
            "inLanguage": "en",
            "educationalLevel": "Beginner",
            "learningResourceType": "Course",
            // "keywords":  await extractKeywords(c.description, 12),
            // "about": topics.map(t => ({"@type": "Thing", "name": t})),
            "thumbnailUrl": c.originalImage?.url,
            "isAccessibleForFree": false,
            "offers": getOffers(c),
            "keywords": await readJson(`${brbId}.keywords`),
            "topics": await readJson(`${brbId}.topics`),
        };
        await writePartialFile(`${brbId}.html`, JSON.stringify(detailedItem, null, 2));
        
    }

    await writePartialFile('classes.html', JSON.stringify(classes, null, 2));
}


function getOffers(item) {
    if ((item?.options?.length ?? 0) > 0) {
        console.log(`Item ${item.name} has options`);
        for (const option of item.options) {
            console.log(`Option: ${option.name}`);
            if (typeof option?.name === 'string' && option.name.toLowerCase().startsWith('group size')) {
                console.log(`Group option found: ${option.name}`);
                function priceForChoice(choice) {
                    if (choice.priceModifierType === 'PERCENT') {
                        return (item.price * (1 + choice.priceModifier / 100)).toFixed(2);
                    } else if (choice.priceModifierType === 'ABSOLUTE') {
                        return (item.price + choice.priceModifier).toFixed(2);
                    } else {
                        return item.price.toFixed(2);
                    }
                }
                const isZeroish = (n) => Math.abs(Number(n) || 0) < 1e-3;
                const offers = option.choices?.filter(ch => {
                    const t = String(ch.priceModifierType || '').toUpperCase();
                    const m = Number(ch.priceModifier) || 0;
                    if (t === 'PERCENT') return !isZeroish(m); // 0% -> skip
                    if (t === 'ABSOLUTE') return !isZeroish(m); // +0 -> skip

                    // For unknown or base/no-modifier types, skip since no change
                    return false;
                }).map(v => {
                    return {
                        "@type": "Offer",
                        "name": `${option.name}`,
                        "price": priceForChoice(v),
                        "priceCurrency": "USD",
                        "availability": "https://schema.org/InStock",
                        "url": `https://blueridgeboost.com/classes/${getAttributeValue(item, 'brb_id')}`
                    };
                });
                return {
                    "@type": "AggregateOffer",
                    "offerCount": offers.length,
                    "lowPrice": item.price.toFixed(2),
                    "priceCurrency": "USD",
                    "offers": offers,
                };
            }
        }
    } 
    return {
        "@type": "Offer",
        "price": item.price.toFixed(2),
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": `https://blueridgeboost.com/classes/${getAttributeValue(item, 'brb_id')}`
    };
}

async function main() {
    try {
        // await cleanUpHugoFiles();
        // await generateClassFiles();
        await generateClassesRichResults();
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();