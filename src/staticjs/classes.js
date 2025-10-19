import { getAttributeValue, isAI, isCoding, isGameDev, isInProgress, isMath, isOnDemand, isOngoing, isRobotics, isScience, isSession, isSingle, isStartingSoon } from './ecwid.js';
import { writeMdFile, writePartialFile, readJson } from './fs-helpers.js';
import { to24H, location, provider } from './rich-results-helpers.js';

function scheduleTags(c) {
    const schedule_tags = [];
    if (isStartingSoon(c)) {
        // Handle starting soon case
        schedule_tags.push("Starting Soon");
    } else if (isOnDemand(c)) {
        // Handle on demand case
        schedule_tags.push("On-Demand");
    } else if (isInProgress(c)) {
        // Handle in progress case
        schedule_tags.push("Join Now");
    }
    return schedule_tags;
}

function subjectTags(c) {
    const subjects = [];
    if (isRobotics(c)) {
        subjects.push("Robotics");
    }  
    if (isCoding(c)) {
        subjects.push("Computer Coding");
    }
    if (isGameDev(c)) {
        subjects.push("Game Development");
    } 
    if (isMath(c)) {
        subjects.push("Math");
    }
    if (isScience(c)) {
        subjects.push("Science");
    } else if (isAI(c)) {
        subjects.push("AI");
    }
    return subjects;
}

function typicalAgeRange(item) {
    const grades = JSON.parse( getAttributeValue(item, 'grades') );
    const grade2age = {
        "1st": [6,7],
        "2nd": [7,8],
        "3rd": [8,9],
        "4th": [9,10],
        "5th": [10,11],
        "6th": [11,12],
        "7th": [12,13],
        "8th": [13,14],
        "9th": [14,15],
        "10th": [15,16],
        "11th": [16,17],
        "12th": [17,18],
    }
    return `${grade2age[grades[0]][0]}-${grade2age[grades[grades.length-1]][1]}`
}




function courseInstances(item) {
    
    const genericInstance = {
        "@type": "CourseInstance",
        "name": `${item.name} (2025-2026)`,
        "courseMode": "InPerson",
        "location": location(),
    };
     if ( isOnDemand(item) ) {
        return [genericInstance];
    }

    let startTime = undefined;
    if ( getAttributeValue(item, "start_time")) {
        startTime = to24H(getAttributeValue(item, "start_time"));
    }
    let endTime = undefined;
    if ( getAttributeValue(item, "end_time")) {
        endTime = to24H(getAttributeValue(item, "end_time"));
    }
    let startDate = undefined;
    if ( getAttributeValue(item, "start_date")) {
        startDate = getAttributeValue(item, "start_date");
    }
    let endDate = undefined;
    if ( getAttributeValue(item, "end_date")) {
        endDate = getAttributeValue(item, "end_date");
    }

    if (isSession(item)) {
        const sessions = [];
        const sessionAttr = getAttributeValue(item, 'sessions');
        console.log("SESSIONS", sessionAttr)
        const dates = (sessionAttr)?JSON.parse(sessionAttr):[];        
        for (const option of item.options) {
            console.log(`Option: ${option.name}`);
            if ( option.name == "Session") {
                
                for (let i = 0; i<option.choices.length; i++) {
                    const choice = option.choices[i];
                    const courseInstance = { ... genericInstance };
                    courseInstance.provider = provider();
                    courseInstance.location = location();
                    courseInstance.name = choice.text;
                    courseInstance.startTime = startTime;
                    courseInstance.endTime = endTime;
                    courseInstance.scheduleTimezone = "America/New_York";
                    
                    courseInstance.name = choice.text;
                    if ( i < dates.length ) {
                        courseInstance.startDate = dates[i][0];
                        courseInstance.endDate = dates[i][3];
                        courseInstance.subEvent = [];
                        for (let j=0; j<dates[i].length; j++) {
                            courseInstance.subEvent.push({ 
                                "@type": "Event", 
                                "name": `Class ${j+1}`, 
                                "startDate": dates[i][j], 
                                "endDate": dates[i][j],
                                "location": location()
                            });
                        }
                    } 
                    sessions.push( courseInstance );
                }
            } 
        }
        return sessions;
    } else {
        genericInstance.eventSchedule = {
            "@type": "Schedule",
            "byDay": byDay(item),
            "repeatFrequency": "P1W",
            "scheduleTimezone": "America/New_York",
        };
        
        if (startDate) {
            genericInstance.eventSchedule.startDate = startDate;
        } else {
            genericInstance.eventSchedule.startDate = '2025-09-01';
        }
        if (endDate) {
            genericInstance.eventSchedule.endDate = endDate;
        } else {
            genericInstance.eventSchedule.endDate = '2026-05-26';
        }
        if (startTime) {
            genericInstance.eventSchedule.startTime = startTime;
        }
        if (endTime) {
            genericInstance.eventSchedule.endTime = endTime;
        }
        return [genericInstance];
    } 
}

function pricePerUnit(item) {
    if (isSession(item)) {
        return `for ${duration} sessions`;
    } else if (isOngoing(item)) {
        return "price_unit: per month";
    } else {
        return "per session";
    }
}

function category(item) {
    if (isSession(item)) {
        return "Session";
    } else if (isOngoing(item)) {
        return "Ongoing";
    } else {
        return "One Time";
    }
}

function duration(item) {
    const duration = getAttributeValue(item, 'Duration (in weeks)');
    if (isSession(item)) {
       return `${duration} wk`;
    } else if (isOngoing(item)) {
        if (duration === undefined) {
            return "Flexible";
        } else if (duration <= 12) {
            return "2-3 mo";
        } else if (duration <= 24) {
            return "4-6 mo";
        } else {
            return "6+ mo";
        }
    } else if (isSingle(item)) {
        return "1 wk";
    }
}

function dayTags(item) {
    const day_tags = JSON.parse(getAttributeValue(item, 'day_of_week') || "[]").map(d => String(d).slice(0, 3));
    return day_tags;
}

function byDay(item) {
    return JSON.parse(getAttributeValue(item, 'day_of_week') || "[]").map(d => "https://schema.org/" + d);
}

function gradeTags(item) {
    return JSON.parse(getAttributeValue(item, 'grades'));
}
function ordinalToNumber(s) {
  const digits = s.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

export async function generateMDClassFiles(classesEcwid) {
    classesEcwid.sort((a, b) => {
        const aGrade = ordinalToNumber(JSON.parse(getAttributeValue(a, 'grades'))[0]);
        const bGrade = ordinalToNumber(JSON.parse(getAttributeValue(b, 'grades'))[0]);
        return aGrade < bGrade ? -1 : (aGrade > bGrade ? 1 : 0);
    });
    // for each product, create a markdown file
    for (let i = 0; i < classesEcwid.length; i++) {
        console.log(`Processing product: ${classesEcwid[i].name}`);
        const item = classesEcwid[i];
        if (!item.enabled) continue;
        console.log(`Processing ${item.name}`);
        const brbId = getAttributeValue(item, 'brb_id');
        const classDict = {
            "ecwid": item.id,
            "product_id": brbId,
            "layout": "single",
            "schedule_tags": scheduleTags(item),
            "subject_tags": subjectTags( item),
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


function educationalLevel(c) {
    const grades = JSON.parse(getAttributeValue(c, 'grades')).map( d => d + " grade");
    if (grades.length > 1) 
        return grades;
    else 
        return grades[0];
}

function classUrl(item) {
     return `https://blueridgeboost.com/classes/${getAttributeValue(item, 'brb_id')}/`
}

export async function generateClassesRichResults(classesEcwid) {
    const classes = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": []
    };
    
    for (let i=0; i < classesEcwid.length; i++) {
        const c = classesEcwid[i];
        if (!c.enabled) continue;
        const brbId =  getAttributeValue(c, 'brb_id');
        classes.itemListElement.push({
            "@type": "ListItem",
            "position": i,
            "item": {
                "@type": "Course",
                "@id": `https://blueridgeboost.com/classes/${brbId}/`,
                "url": `https://blueridgeboost.com/classes/${brbId}/`,
                "name": c.name,
                "image": [c.originalImage?.url],
                "description": c.seoDescription,
                "provider": provider(),
                "educationalLevel": educationalLevel(c),
                "typicalAgeRange": typicalAgeRange(c),
            }
        });
        const detailedItem = {
            "@type": "Course",
            "@context": "https://schema.org",
            "@id":  classUrl(c),
            "url":  classUrl(c),
            "name": c.name,
            "image": c.originalImage?.url,
            "description": c.seoDescription,
            "provider": provider(),
            "inLanguage": "en",
            "educationalLevel": educationalLevel(c),
            "typicalAgeRange": typicalAgeRange(c),
            "thumbnailUrl": c.originalImage?.url,
            "isAccessibleForFree": false,
            "offers": getOffers(c),
            "keywords": await readJson(`${brbId}.keywords`),
            "about": (await readJson(`${brbId}.topics`)).map( t => ({ "@type": "Thing", "name": t }) ),
            "hasCourseInstance": await courseInstances(c),
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
                // const isZeroish = (n) => Math.abs(Number(n) || 0) < 1e-3;
                // const offers = option.choices?.filter(ch => {
                //     const t = String(ch.priceModifierType || '').toUpperCase();
                //     const m = Number(ch.priceModifier) || 0;
                //     if (t === 'PERCENT') return !isZeroish(m); // 0% -> skip
                //     if (t === 'ABSOLUTE') return !isZeroish(m); // +0 -> skip

                //     // For unknown or base/no-modifier types, skip since no change
                //     return false;
                // })
                const lowestPrice = (option.choices ?? []).reduce((min, item) => {
                        const p = priceForChoice(item);
                        return p < min ? p : min;
                    }, Infinity);
                const highestPrice = (option.choices ?? []).reduce((max, item) => {
                        const p = priceForChoice(item);
                        return p > max ? p : max;
                    }, -Infinity);
                const offers = option.choices?.map(v => {
                    return {
                        "@type": "Offer",
                        "name": `Group Size: ${v.text}`,
                        "price": priceForChoice(v),
                        "priceCurrency": "USD",
                        "availability": "https://schema.org/InStock",
                        "url": classUrl(item),
                    };
                });
                return {
                    "@type": "AggregateOffer",
                    "offerCount": offers.length,
                    "lowPrice": lowestPrice,
                    "highPrice": highestPrice,
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
        "url": classUrl(item)
    };
}
