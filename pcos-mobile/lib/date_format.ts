const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "YYYY-MM-DD" -> "Jan 5"
export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${MONTH_NAMES_SHORT[m - 1]} ${d}`;
}

// Inclusive day count from start to end (same day counts as 1) — used for
// "how many days did this period/cycle last".
export function inclusiveDayCount(startKey: string, endKey: string): number {
  return Math.round((dateFromKey(endKey).getTime() - dateFromKey(startKey).getTime()) / 86400000) + 1;
}

// Exclusive day difference between two dates — used for gaps between events
// (e.g. days between one cycle's start and the next).
export function daysBetween(aKey: string, bKey: string): number {
  return Math.round((dateFromKey(bKey).getTime() - dateFromKey(aKey).getTime()) / 86400000);
}
