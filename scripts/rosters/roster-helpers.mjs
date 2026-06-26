// some simple date helpers 
export const SUMMER_WEEKS = [
    { startDate: '2026-06-01', label: 'Week June 1-5' },
    { startDate: '2026-06-08', label: 'Week June 8-12' },
    { startDate: '2026-06-15', label: 'Week June 15-19' },
    { startDate: '2026-06-22', label: 'Week June 22-26' },
    { startDate: '2026-06-29', label: 'Week June 29 - July 3' },
    { startDate: '2026-07-06', label: 'Week July 6-10' },
    { startDate: '2026-07-13', label: 'Week July 13-17' },
    { startDate: '2026-07-20', label: 'Week July 20-24' },
    { startDate: '2026-07-27', label: 'Week July 27-31' },
    { startDate: '2026-08-03', label: 'Week August 3-7' },
];

export function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentWeek(referenceDate = todayISO()) {
    const today = referenceDate;
    for (const w of SUMMER_WEEKS) {
        const friday = new Date(w.startDate + 'T00:00:00Z');
        friday.setUTCDate(friday.getUTCDate() + 4);
        const fridayISO = friday.toISOString().slice(0, 10);
        if (today >= w.startDate && today <= fridayISO) return w;
    }
    return SUMMER_WEEKS.find(w => w.startDate >= today) || null;
}