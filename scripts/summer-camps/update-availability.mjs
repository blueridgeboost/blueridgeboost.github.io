import { 
    getSummerCamps,
    getOrdersByProductId,
    updateEcwidProduct,
    getAttributeValue,
    getAdvancedStemCamps,
    getBootcamps,
 } from '../ecwid.js';
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loading environment variables from: ${envPath}`);
await dotenv.config({ path: envPath });

const SESSION_TIME = "Session Time";
const FULL_DAY = "Full-Day";
const AM_SESSION = "AM";
const PM_SESSION = "PM"; 
const BOOTCAMP_SESSION = "Session";

export async function updateSummerCampSeats() {
    const summerCamps = await getSummerCamps();
    const stemCamps = await getAdvancedStemCamps();
    const camps = [...summerCamps, ...stemCamps];
    for (const camp of camps) {
        if (camp.enabled) {
            const maxAttribute = camp?.attributes?.find(attribute => attribute?.name === "Max");
            if (!maxAttribute || !maxAttribute.value?.trim()) {
                console.error(`No max attribute for product ${camp.id}`);
            } else {
                const maxSeats = parseInt(maxAttribute.value, 10);
                const orders = await getOrdersByProductId(camp.id);
                var full_enrollment =0;
                var am_enrollment = 0;
                var pm_enrollment = 0;
                if (orders.length == 0 ) {
                    console.log(`WARNING!! No orders for camp ${camp.name}`);
                }
                for (let order of orders) {
                    // console.log(order);
                    if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)) continue;
                    for (let item of order.items) {
                        if (item.productId === camp.id) { 
                            const selectedSession = item?.selectedOptions?.find(
                                opt => opt?.name === SESSION_TIME).value;
                            // console.log(`Order ${order.id} - Selected Session: ${selectedSession}`);
                            if (selectedSession === FULL_DAY) {
                                full_enrollment += item.quantity; // changed to adding quanity of items
                            } else if (selectedSession === AM_SESSION) {
                                am_enrollment += item.quantity;
                            } else if (selectedSession === PM_SESSION) {
                                pm_enrollment += item.quantity;
                            }
                        }
                    }
                }
                // get the names from the camp
                console.log(`Enrollments for camp ${camp.name} (${camp.id}): Full-Day: ${full_enrollment}, 
                    AM: ${am_enrollment}, PM: ${pm_enrollment}`);
                if (am_enrollment > pm_enrollment) {
                    full_enrollment += pm_enrollment;
                    am_enrollment -= pm_enrollment;
                    pm_enrollment = 0;
                } else {
                    full_enrollment += am_enrollment;
                    pm_enrollment -= am_enrollment;
                    am_enrollment = 0;
                }
                // update to seats available, not including negative values 
                const fullDaySeats = Math.max(0, maxSeats - (full_enrollment + Math.max(am_enrollment, pm_enrollment)));
                const amSeats = Math.max(0,maxSeats - (full_enrollment + am_enrollment));
                const pmSeats = Math.max(0,maxSeats - (full_enrollment + pm_enrollment));

                console.log(`Camp: ${camp.name} (${camp.id}) - Full-Day Seats Available: ${fullDaySeats}, AM Seats Available: ${amSeats}, PM Seats Available: ${pmSeats}`);

                for (const combination of camp.combinations) {
                    // console.log(combination);
                    const sessionOption = combination?.options?.find(
                        opt => opt?.name === SESSION_TIME);
                    if (sessionOption) {
                        if (sessionOption.value === FULL_DAY) {
                            combination.quantity = fullDaySeats;
                        } else if (sessionOption.value === AM_SESSION) {
                            combination.quantity = amSeats;
                        } else if (sessionOption.value === PM_SESSION) {
                            combination.quantity = pmSeats;
                        }
                    }
                }

                if (fullDaySeats <= 0) {
                    camp.ribbon = { text: "Sold Out", color: "#0A175E" };
                } else if (fullDaySeats === 1) {
                    camp.ribbon = { text: "1 Spot Left", color: "#0A175E" };
                } else if (fullDaySeats <= 5) {
                    camp.ribbon = { text: `${fullDaySeats} Spots Left`, color: "#0A175E" };
                } else {
                    camp.ribbon = null; // clears the ribbon
                }
                await updateEcwidProduct(camp);
            }
        }
    }
}

function buildBootcampSessionMap(camp) {
    const option = camp?.options?.find(opt => opt?.name === BOOTCAMP_SESSION);

    const map = {};
    if (!option) return map;

    let fullSeen = 0;
    for (const choice of option.choices) {
        // takes the form Full-Day (June 1-5), each bootcamp has two weeks 
        const text = choice?.text || '';
        if (text.startsWith(FULL_DAY)) {
            fullSeen++;
            map[text] = fullSeen === 1 ? 'fullW1' : 'fullW2';
        } else if (text.startsWith(AM_SESSION)) {
            map[text] = 'am';
        } else if (text.startsWith(PM_SESSION)) {
            map[text] = 'pm';
        }
    }
    return map;
}

export async function updateBootcampSeats() {
    const bootcamps = await getBootcamps();
    for (const camp of bootcamps) {
        if (!camp.enabled) continue;

        const maxAttribute = camp?.attributes?.find(a => a?.name === "Max");
        if (!maxAttribute || !maxAttribute.value?.trim()) {
            console.error(`No max attribute for product ${camp.id}`);
            continue;
        }
        const maxSeats = parseInt(maxAttribute.value, 10);

        const sessionMap = buildBootcampSessionMap(camp);
        const orders = await getOrdersByProductId(camp.id);
        if (orders.length == 0) {
            console.log(`WARNING!! No orders for bootcamp ${camp.name}`);
        }

        var fullW1_enrollment = 0;
        var fullW2_enrollment = 0;
        var am_enrollment = 0;
        var pm_enrollment = 0;

        for (let order of orders) {
            // console.log(order);
            if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)) continue; // added a skip for cancelled orders 
            for (let item of order.items) {
                if (item.productId !== camp.id) continue;
                const selected = item?.selectedOptions?.find(
                    opt => opt?.name === BOOTCAMP_SESSION)?.value || '';
                const bucket = sessionMap[selected];
                if (bucket === 'fullW1') fullW1_enrollment += item.quantity;
                else if (bucket === 'fullW2') fullW2_enrollment += item.quantity;
                else if (bucket === 'am') am_enrollment += item.quantity;
                else if (bucket === 'pm') pm_enrollment += item.quantity;
            }
        }
        console.log(`Enrollments for bootcamp ${camp.name} (${camp.id}): Full Wk1: ${fullW1_enrollment},
             Full Wk2: ${fullW2_enrollment}, AM: ${am_enrollment}, PM: ${pm_enrollment}`);

        // per-week binding pair: full + max(am, pm) <= max
        const fullW1Seats = Math.max(0, maxSeats - (fullW1_enrollment + Math.max(am_enrollment, pm_enrollment)));
        const fullW2Seats = Math.max(0, maxSeats - (fullW2_enrollment + Math.max(am_enrollment, pm_enrollment)));
        // half-day spans both weeks; bounded by the more-constrained week
        const amSeats = Math.max(0, maxSeats - (Math.max(fullW1_enrollment, fullW2_enrollment) + am_enrollment));
        const pmSeats = Math.max(0, maxSeats - (Math.max(fullW1_enrollment, fullW2_enrollment) + pm_enrollment));
        console.log(`Bootcamp: ${camp.name} (${camp.id}) - Full Wk1: ${fullW1Seats}, Full Wk2: ${fullW2Seats}, AM: ${amSeats}, PM: ${pmSeats}`);

        for (const combination of camp.combinations || []) {
            const sessionOption = combination?.options?.find(
                opt => opt?.name === BOOTCAMP_SESSION);
            if (!sessionOption) continue;
            const bucket = sessionMap[sessionOption.value || ''];
            if (bucket === 'fullW1') combination.quantity = fullW1Seats;
            else if (bucket === 'fullW2') combination.quantity = fullW2Seats;
            else if (bucket === 'am') combination.quantity = amSeats;
            else if (bucket === 'pm') combination.quantity = pmSeats;
        }
        // After updating combinations, add ribbon logic
        const minFullSeats = Math.min(fullW1Seats, fullW2Seats);
        const minHalfDaySeats = Math.min(amSeats, pmSeats);
        const overallMin = Math.min(minFullSeats, minHalfDaySeats);

        if (overallMin <= 0) {
            camp.ribbon = { text: "Sold Out", color: "#0A175E" };
        } else if (overallMin === 1) {
            camp.ribbon = { text: "1 Spot Left", color: "#0A175E" };
        } else if (overallMin <= 5) {
            camp.ribbon = { text: `${overallMin} Spots Left`, color: "#0A175E" };
        } else {
            camp.ribbon = null; // clears the ribbon
        }

        await updateEcwidProduct(camp);
    }
}

updateSummerCampSeats();
updateBootcampSeats();