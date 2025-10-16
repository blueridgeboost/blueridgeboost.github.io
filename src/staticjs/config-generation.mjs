import dotenv from 'dotenv';
import { createWriteStream } from 'fs';
import { getCatalog } from './ecwid-commons.js';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';


// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

const CLASSES_ID = 175340602;
const SUBSCRIPTIONS_ID = 187846124;
const SESSIONS_ID = 187846125;
const SINGLE_ID = 187847129;

const ROBOTICS_ID = 175336104;
const CODING_ID = 175336105;
const GAME_DEV_ID = 187847606;
const MATH_ID = 175336109;
const SCIENCE_ID = 177442108;
const AI_ID = 187847627;

const IN_PROGRESS_ID = 187846081;
const STARTING_SOON_ID = 187846083;
const ON_DEMAND_ID = 187847569;

const products = await getCatalog([CLASSES_ID]);

const keepers = [
    '_index.md', 'math.md', 'coding.md', 'robotics.md', 
    'chess.md', 'science.md', 'ai.md', 'game-development.md'
];

async function cleanUp() {
    await deleteFiles(path.join(
         process.cwd(), 'src', 'layouts', 'partials', "rich-search-results"
    ));
    await deleteFiles(path.join(
          process.cwd(), 'src', 'content', 'english', 'classes'
    ));
}

async function deleteFiles(folderPath) {
    try {
        const files = await readdir(folderPath);
        for (const file of files) {
            if (!keepers.includes(file)) {
                console.log(`Deleting file: ${file}`);
                const filePath = path.join(folderPath, file);
                const fileStats = await stat(filePath);
                
                if (fileStats.isFile()) {
                    await unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                }
            } else {
                console.log(`Keeping file: ${file}`);
            }
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

function getAttributeValue(item, name) {
    const attribute = item.attributes?.find(attr => attr.name === name);
    return attribute ? attribute.value : undefined;
}

function ordinalToNumber(s) {
  const digits = s.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

async function generateClassFiles() {
    const folderPath = path.join('src', 'content', 'english', 'classes');
    // sort by grade
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
        const stream = createWriteStream(`${folderPath}/${brbId}.md`, { flags: 'w' });
        stream.write("---\n");
        stream.write(`ecwid: ${item.id}\n`);
        stream.write(`product_id: ${brbId}\n`);     
        stream.write(`layout: single\n`);
        // schedule: Starting Soon, On Demand, Join Now
        const schedule_tags = [];
        if (item.categoryIds.includes(STARTING_SOON_ID)) {
            // Handle starting soon case
            schedule_tags.push("Starting Soon");
        } else if (item.categoryIds.includes(ON_DEMAND_ID)) {
            // Handle on demand case
            schedule_tags.push("On-Demand");
        } else if (item.categoryIds.includes(IN_PROGRESS_ID)) {
            // Handle in progress case
            schedule_tags.push("Join Now");
        }
        stream.write(`schedule_tags: ${JSON.stringify(schedule_tags)}\n`);

        // subjects: Robotics, Computer Coding, Game Development, Math, Science, AI
        const subjects = [];
        for (const catId of item.categoryIds) {
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
        stream.write(`subject_tags: ${JSON.stringify(subjects)}\n`);

        // price, category, duration
        let price = item.price;
        stream.write(`price: ${price}\n`);
        const duration = getAttributeValue(item, 'Duration (in weeks)');
        if (item.categoryIds.includes(SESSIONS_ID)) {
            stream.write(`category: Session\n`);
            stream.write(`price_unit: for ${duration} sessions\n`);
            stream.write(`duration: ${duration} wk\n`);
        } else if (item.categoryIds.includes(SUBSCRIPTIONS_ID)) {
            stream.write(`price_unit: per month\n`);
            if (duration === undefined) {
                stream.write(`duration: Flexible\n`);
            } else if (duration <= 12) {
                stream.write(`duration: 2-3 mo\n`);
            } else if (duration <= 24) {
                stream.write(`duration: 4-6 mo\n`);
            } else {
                stream.write(`duration: 6+ mo\n`);
            }
            stream.write(`category: Ongoing\n`);
        } else if (item.categoryIds.includes(SINGLE_ID)) {
            stream.write(`price_unit: per session\n`);
            stream.write(`category: One Time\n`);
            stream.write(`duration: 1 wk\n`);
        }
        // save weight, start_date, end_date, start_time, end_time
        stream.write(`weight: ${i}\n`);
        const start_date = getAttributeValue(item, 'start_date');
        start_date && stream.write(`start_date: ${start_date}\n`);
        const end_date = getAttributeValue(item, 'end_date');
        end_date && stream.write(`end_date: ${end_date}\n`);
        const start_time = getAttributeValue(item, 'start_time');
        start_time && stream.write(`start_time: "${start_time}"\n`);
        const end_time = getAttributeValue(item, 'end_time');
        end_time && stream.write(`end_time: "${end_time}"\n`);
        // title, subtitle, ribbon, day_tags, grade_tags, description
        item.name && stream.write(`page_title: "${item.name}"\n`);
        item.subtitle && stream.write(`page_subtitle: "${item.subtitle}"\n`);
        item.ribbon && stream.write(`ribbon: "${item.ribbon.text}"\n`);
        item.name && stream.write(`title: "${item.name} | Blue Ridge Boost"\n`);
        const day_tags = JSON.parse(getAttributeValue(item, 'day_of_week') || "[]").map(d => String(d).slice(0, 3));
        stream.write(`day_tags: ${JSON.stringify(day_tags)}\n`);
        const grade_tags = getAttributeValue(item, 'grades');
        stream.write(`grade_tags: ${grade_tags}\n`);
        stream.write(`description: "${item.seoDescription}" \n`);
        stream.write("---\n");
        stream.close();
    }
}

export async function writePartialFile(fileName, content) {
  // Resolve folder path relative to project root (cwd)
  const folderPath = path.join(
    process.cwd(),
    "src",
    "layouts",
    "partials",
    "rich-search-results"
  );
  const filePath = path.join(folderPath, fileName);

  // Create write stream for the target file
  const stream = createWriteStream(filePath, { flags: "w" });

  // Start the script tag for JSON-LD (Schema.org)
  stream.write('<script type="application/ld+json">\n');

  // If content is already an object, stringify it prettily.
  // If it's a JSON string, parse first so we don't end up double-quoted.
  const json =
    typeof content === "string"
      ? JSON.stringify(JSON.parse(content), null, 2)
      : JSON.stringify(content, null, 2);

  stream.write(json);
  stream.write("\n</script>\n");

  // Return a promise that resolves when the stream is closed
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
    stream.end(); // end flushes and closes the stream
  });

  return filePath;
}

async function generateClassesRichResults() {
    const folderPath = path.join(
        process.cwd(), 'layouts', 'partials', "rich-search-results"
    );
    const classes = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": []
    };
    for (let i=0; i < products.length; i++) {
        const c = products[i];
        if (!c.enabled) continue;
        classes.itemListElement.push({
            "@type": "ListItem",
            "position": i,
            "item": {
                "@type": "Course",
                "@id": getAttributeValue(c, 'brb_id'),
                "url": `https://blueridgeboost.com/classes/${getAttributeValue(c, 'brb_id')}`,
                "name": c.name,
                "image": c.originalImage?.url,
            }
        });
        const detailedItem = {
            "@type": "Course",
            "@context": "https://schema.org",
            "@id": getAttributeValue(c, 'brb_id'),
            "url": `https://blueridgeboost.com/classes/${getAttributeValue(c, 'brb_id')}`,
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
            "offers": getOffers(c)
        };
        await writePartialFile(`${getAttributeValue(c, 'brb_id')}.html`, JSON.stringify(classes, null, 2));
        
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
        await cleanUp();
        // await generateClassFiles();
        generateClassesRichResults();
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();