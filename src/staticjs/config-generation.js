import dotenv from 'dotenv';
import { createWriteStream } from 'fs';
import { getCatalog } from './ecwid-commons.js';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '..', '.env');

// Load the .env file
dotenv.config({ path: envPath });

console.log( process.env )

console.log(`Bearer ${process.env.ECWID_REST_SECRET}`)
console.log(process.cwd());

const keepers = [
    '_index.md', 'math.md', 'coding.md', 'robotics.md', 
    'chess.md', 'science.md', 'ai.md', 'game-development.md'
];

async function cleanUp() {
    await deleteClassesMdFiles();
    // await deletePartials();
}

async function deletePartials() {
    const folderPath = path.join(
        'layouts', 'partials/event-list'
    );
    await deleteFiles(path.join(folderPath, 'classes'));
}

async function deleteClassesMdFiles() {
    const folderPath = path.join(
        process.cwd(), 'content', 'english'
    );
    await deleteFiles(path.join(folderPath, 'classes'));
    // await deleteFile(path.join(folderPath, 'adults.html'));
    // TODO add more
}

async function deleteFile() {

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
//   console.log("Digits", s, digits[0]);
  return digits ? Number(digits[0]) : null;
}

async function generateClassFiles() {
    const classesCategoryId = 175340602;
    const products = await getCatalog([classesCategoryId]);

    const folderPath = path.join(
         
        'content', 'english', 'classes'
    );
    
    // sort by grade
    products.sort((a, b) => {
        const aGrade = ordinalToNumber(JSON.parse(getAttributeValue(a, 'grades'))[0]);
        const bGrade = ordinalToNumber(JSON.parse(getAttributeValue(b, 'grades'))[0]);
        return aGrade < bGrade ? -1 : (aGrade > bGrade ? 1 : 0);
    });

    for (let i = 0; i < products.length; i++) {
        console.log(`Processing product: ${products[i].name}`);
        //const item = await getProductById(products[i]);
        const item = products[i];
        if (item.enabled) {
            console.log(`Processing ${item.name}`);
            
            const brbId = getAttributeValue(item, 'brb_id');
            const stream = createWriteStream(`${folderPath}/${brbId}.md`, { flags: 'w' });
            
            stream.write("---\n");
            stream.write(`ecwid: ${item.id}\n`);
            stream.write(`product_id: ${brbId}\n`);     
            // stream.write(`robots: noindex, follow\n`);
            stream.write(`layout: single\n`);
            
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
            // sorting order
            stream.write(`weight: ${i}\n`);

            const start_date = getAttributeValue(item, 'start_date');
            start_date && stream.write(`start_date: ${start_date}\n`);
            const end_date = getAttributeValue(item, 'end_date');
            end_date && stream.write(`end_date: ${end_date}\n`);
            const start_time = getAttributeValue(item, 'start_time');
            start_time && stream.write(`start_time: "${start_time}"\n`);
            const end_time = getAttributeValue(item, 'end_time');
            end_time && stream.write(`end_time: "${end_time}"\n`);

            item.name && stream.write(`page_title: "${item.name}"\n`);
            item.subtitle && stream.write(`page_subtitle: "${item.subtitle}"\n`);
            item.ribbon && stream.write(`ribbon: "${item.ribbon.text}"\n`);
            item.name && stream.write(`title: "${item.name} | Blue Ridge Boost"\n`);
            const day_tags = JSON.parse(getAttributeValue(item, 'day_of_week') || "[]").map(d => String(d).slice(0, 3));
            stream.write(`day_tags: ${JSON.stringify(day_tags)}\n`);

            const grade_tags = getAttributeValue(item, 'grades');
            stream.write(`grade_tags: ${grade_tags}\n`);

            stream.write(`description: "${item.seoDescription}" \n`);
    
            stream.write(`featured: ${item.showOnFrontpage || 0}\n`);
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
                            if (t === 'PERCENT') return !isZeroish(m);         // 0% -> skip
                            if (t === 'ABSOLUTE') return !isZeroish(m);        // +0 -> skip
                            // For unknown or base/no-modifier types, skip since no change
                            return false;
                        }).map(v => [v.text, priceForChoice(v)]);
                        console.log(`Offers: ${JSON.stringify(offers)}`);
                        stream.write(`offers: ${JSON.stringify(offers)}\n`);
                        break;
                    }
                }
                
            }
            // image url
            stream.write(`image_url: "${item.originalImage.url}"\n`)
            
            stream.write("---\n");
            stream.close();
        }
    }
}

async function main() {
    try {
        await cleanUp();
        await generateClassFiles();
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();