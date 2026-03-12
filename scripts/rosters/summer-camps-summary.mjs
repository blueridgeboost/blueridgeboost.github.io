import path from 'path';
import { updateSummerCampSeats } from '../summer-camps/update-availability.mjs';
import { writeDataToCsv } from '../fs-helpers.js';
import dotenv from 'dotenv';
const SUMMER_CAMPS_HOME_DIRECTORY = "G:\\Shared drives\\BRB\\Summer 2026\\";


const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

async function main() {
    const summary = await updateSummerCampSeats();
    await writeDataToCsv(summary, path.join(SUMMER_CAMPS_HOME_DIRECTORY, 'summer-camps-count.csv'));
}
main();