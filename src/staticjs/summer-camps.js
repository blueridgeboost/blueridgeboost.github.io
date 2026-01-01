import path from "path"
import { readCsvFile } from "./fs-helpers.js"

const SUMMER_CAMPS_1_3_DIRECTORY = "G:\\Shared drives\\BRB\\Summer 2026\\Gr1-3"
const SUMMER_CAMPS_1_3_LIST = path.join(SUMMER_CAMPS_1_3_DIRECTORY, "Summer Camps 2026 list - Grades 1-3.csv")

async function generateEcwidGr1_3SummerCamps(camp) {
    const camps = await readCsvFile(SUMMER_CAMPS_1_3_LIST);
    console.log(camps);
    // for (const camp of camps) {
    //     console.log(camp);
    // }


}


await generateEcwidGr1_3SummerCamps();

