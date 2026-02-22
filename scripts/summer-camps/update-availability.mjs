import { getSummerCamps, getOrdersByProductId, updateEcwidProduct } from '../ecwid.js';
import path from 'path';
import dotenv from 'dotenv';
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loading environment variables from: ${envPath}`);
// Load the .env file
await dotenv.config({ path: envPath });


const SESSION_TIME = "Session Time";
const FULL_DAY = "Full-Day";
const AM_SESSION = "AM";
const PM_SESSION = "PM"; 

async function updateSummerCampSeats() {
    const camps = await getSummerCamps();
    for (const camp of camps) {
        if (camp.enabled) {
            const maxAttribute = camp?.attributes?.find(attribute => attribute?.name === "Max");
            const maxSeats = parseInt(maxAttribute.value, 10);
            if (!maxAttribute || !maxAttribute.value?.trim()) {
                console.error(`No start_date attribute for product ${camp.id}`);
            } else {
                const orders = await getOrdersByProductId(camp.id);
                var full_enrollment =0;
                var am_enrollment = 0;
                var pm_enrollment = 0;
                for (let order of orders) {
                    for (let item of order.items) {
                        if (item.productId === camp.id) { 
                            const selectedSession = item?.selectedOptions?.find(
                                opt => opt?.name === SESSION_TIME).value;
                            // console.log(`Order ${order.id} - Selected Session: ${selectedSession}`);
                            if (selectedSession === FULL_DAY) {
                                full_enrollment += 1;
                            } else if (selectedSession === AM_SESSION) {
                                am_enrollment += 1;
                            } else if (selectedSession === PM_SESSION) {
                                pm_enrollment += 1;
                            }
                        }
                    }
                }
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
                // update to seats available
                const fullDaySeats = maxSeats - (full_enrollment + Math.max(am_enrollment, pm_enrollment)); ;
                const amSeats = maxSeats - (full_enrollment + am_enrollment);
                const pmSeats = maxSeats - (full_enrollment + pm_enrollment);
                console.log(`Camp: ${camp.name} (${camp.id}) - Full-Day Seats Available: ${fullDaySeats}, AM Seats Available: ${amSeats}, PM Seats Available: ${pmSeats}`);
                for (const combination of camp.combinations) {
                    console.log(combination);
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
                console.log(`Updated combinations for camp ${camp.name} (${camp.id})`);
                await updateEcwidProduct(camp);
            }
        }
    }
}

updateSummerCampSeats();