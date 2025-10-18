/**
* Get the next N Fridays starting from a given date (includes the start date if it's Friday).
* Each item includes:
* - date: ISO local date (YYYY-MM-DD)
* - ordinalInMonth: 1..5 (the nth Friday in that month)
* - month: 1..12
* - year: full year
*
* @param {number} count - How many Fridays to return (default 5)
* @param {Date} [fromDate=new Date()] - Starting point (local time)
* @returns {{date:string, ordinalInMonth:number, month:number, year:number}[]}
*/
export function getNextFridaysWithOrdinal(count = 5, fromDate = new Date()) {
	if (!Number.isInteger(count) || count <= 0) {
		throw new Error("count must be a positive integer");
	}
	
	// Normalize to local midnight
	const start = atLocalMidnight(fromDate);
	
	// 0=Sun ... 5=Fri
	const day = start.getDay();
	const daysUntilFriday = (5 - day + 7) % 7; // 0 if already Friday
	const firstFriday = addDays(start, daysUntilFriday);
	
	const result = [];
	for (let i = 0; i < count; i++) {
		const d = addDays(firstFriday, i * 7);
		result.push({
			date: toISODate(d),
			ordinalInMonth: fridayOrdinalInMonth(d),
			month: d.getMonth() + 1,
			year: d.getFullYear()
		});
	}
	return result;
}

/**
* Convenience: Get the next 5 Fridays with ordinal info.
* @returns {{date:string, ordinalInMonth:number, month:number, year:number}[]}
*/
export function getNext5FridaysWithOrdinal() {
	return getNextFridaysWithOrdinal(5);
}

/**
* Compute the ordinal (1..5) of the Friday within its month.
* For example, if the date is the 3rd Friday of that month, returns 3.
* @param {Date} date - Must be a Friday (function does not enforce, but works regardless)
* @returns {number}
*/
export function fridayOrdinalInMonth(date) {
	const d = atLocalMidnight(date);
	const year = d.getFullYear();
	const month = d.getMonth();
	
	// Find the first Friday of this month
	const firstOfMonth = new Date(year, month, 1);
	const firstDow = firstOfMonth.getDay(); // 0..6
	const offsetToFriday = (5 - firstDow + 7) % 7; // days from the 1st to the first Friday
	const firstFriday = addDays(firstOfMonth, offsetToFriday);
	
	// Difference in days between the given date and the first Friday
	const diffDays = Math.floor((d - firstFriday) / DAY_MS);
	// If date is before first Friday (e.g., not actually a Friday), ordinal would be <= 0,
	// but for actual Fridays this will be 0,7,14,21,28...
	return Math.floor(diffDays / 7) + 1;
}

// Helpers
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function atLocalMidnight(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toISODate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/**
* Check if a 'YYYY-MM-DD' date is in the past (relative to local today).
* - Returns true if strictly before today.
* - Returns false if today or in the future.
* - Throws if the string is not a valid calendar date in the expected format.
*
* This implementation avoids regex and uses Date parsing/fields for validation.
* It relies on the fact that new Date('YYYY-MM-DD') parses as UTC in modern JS engines.
*
* @param {string} isoDate
* @returns {boolean}
*/
export function isPastDate(isoDate) {
	// Parse using the built-in ISO parser (interpreted as UTC).
	const parsed = new Date(isoDate);
	
	// Reject if Date is invalid
	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Invalid date string or format. Expected 'YYYY-MM-DD'.");
	}
	
	// Validation: ensure the string corresponds exactly to YYYY-MM-DD (no time, no timezone, real date)
	// Reconstruct YYYY-MM-DD from the parsed UTC components.
	const yyyy = parsed.getUTCFullYear();
	const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(parsed.getUTCDate()).padStart(2, "0");
	const normalized = `${yyyy}-${mm}-${dd}`;
	
	if (isoDate !== normalized) {
		// This catches inputs like '2025-2-3', '2025-02-30', '2025-08-08T10:00', etc.
		throw new Error("Invalid date string or format. Expected 'YYYY-MM-DD'.");
	}
	
	// Compare against today's date at local midnight (so today is not "past").
	const now = new Date();
	const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	
	// Convert the parsed UTC date to a local-midnight Date for an apples-to-apples comparison.
	const inputLocal = new Date(yyyy, Number(mm) - 1, Number(dd));
	
	return inputLocal < todayLocal;
}

/**
* Convert 'YYYY-MM-DD' to 'MonthName D, YYYY' using Date functions.
* Example: '2025-09-08' -> 'September 8, 2025'
* Throws on invalid date or format.
*
* @param {string} isoDate
* @param {string | string[]} [locale='en-US'] - Optional locale(s) for month names
* @returns {string}
*/
export function formatIsoDateToLong(isoDate, locale = 'en-US') {
	// Parse using built-in ISO parsing (interpreted as UTC)
	const d = new Date(isoDate);
	if (Number.isNaN(d.getTime())) {
		throw new Error("Invalid date string or format. Expected 'YYYY-MM-DD'.");
	}
	
	// Validate: ensure input exactly matches YYYY-MM-DD and is a real date
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	const normalized = `${y}-${m}-${day}`;
	if (isoDate !== normalized) {
		throw new Error("Invalid date string or format. Expected 'YYYY-MM-DD'.");
	}
	
	// Create a local Date with those components for consistent formatting
	const localDate = new Date(y, Number(m) - 1, Number(day));
	
	// Use Intl.DateTimeFormat for month name day, year
	return new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(localDate);
}
