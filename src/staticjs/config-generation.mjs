import dotenv from 'dotenv';
import { getAllClasses, getOneDayCamps } from './ecwid.js';
import path from 'path';
import { cleanUpHugoFiles } from './fs-helpers.js';
import { generateMDClassFiles, generateClassesRichResults } from './classes.js';
import { generateOneDayCampsRichResults } from './one-day-camps.js';
import { generateGamingRichResults, updateGamingFridays } from './gaming/update-gaming-fridays.js';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });


async function main() {
    const classesEcwid = await getAllClasses();
    const oneDayCamps = await getOneDayCamps();
    // try {
    //     await cleanUpHugoFiles();
    //     console.log('cleanUpHugoFiles: done');
    // } catch (err) {
    //     console.error('cleanUpHugoFiles failed:', err);
    // }

    try {
        await generateMDClassFiles(classesEcwid);
        console.log('generateMDClassFiles: done');
    } catch (err) {
        console.error('generateMDClassFiles failed:', err);
    }

    try {
        await generateClassesRichResults(classesEcwid);
        console.log('generateClassesRichResults: done');
    } catch (err) {
        console.error('generateClassesRichResults failed:', err);
    }

    try {
        await generateOneDayCampsRichResults(oneDayCamps);
        console.log('generateOneDayCampsRichResults: done');
    } catch (err) {
        console.error('generateOneDayCampsRichResults failed:', err);
    }

    try {
        await updateGamingFridays();
        console.log('updateGamingFridays: done');
    } catch (err) {
        console.error('updateGamingFridays failed:', err);
    }

    try {
        await generateGamingRichResults();
        console.log('generateGamingRichResults: done');
    } catch (err) {
        console.error('generateGamingRichResults failed:', err);
    }
}

main();