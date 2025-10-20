import { getAttributeValue, getAllClasses } from "./ecwid.js";
import { cleanUpAiGen, writeJson } from "./fs-helpers.js";
import { extractKeywords, extractTopics } from "./ai-queries.js"



async function main() {
    try {
        await cleanUpAiGen();
        const classes = await getAllClasses();;
        for (let c of classes) {
            const brbId = await getAttributeValue(c, "brb_id");
            const keywords = await extractKeywords( c.name + ' ' + c.description );
            writeJson(`${brbId}.keywords`, keywords);
            const topics = await extractTopics( c.description );
            writeJson(`${brbId}.topics`, topics);
        }
        
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();