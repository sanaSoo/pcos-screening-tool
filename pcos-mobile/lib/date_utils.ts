// Pacific-Time-aware date helpers. Separate from cycles_api.ts's toDateKey,
// which is deliberately device-local — these use America/Los_Angeles
// specifically for the "days tracking" stat, so it reads the same regardless
// of which timezone the device itself is set to.

const PACIFIC_TIME_ZONE = "America/Los_Angeles";

function pacificDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function toPacificDateKey(date: Date = new Date()): string {
  const { year, month, day } = pacificDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Diffs two Pacific-Time calendar dates via Date.UTC on the extracted y/m/d
// parts (not raw ms subtraction, which drifts by an hour across DST
// transitions and could round to the wrong whole-day count).
export function pacificCalendarDaysBetween(fromDate: Date, toDate: Date): number {
  const from = pacificDateParts(fromDate);
  const to = pacificDateParts(toDate);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86400000);
}

export function daysTrackingSince(createdAt: Date, now: Date = new Date()): number {
  return pacificCalendarDaysBetween(createdAt, now);
}

// Age in whole years from a "YYYY-MM-DD" birthdate. Plain calendar math, not
// Pacific-Time-specific — a birthday doesn't need timezone precision the way
// the days-tracking stat explicitly does.
export function ageFromBirthdate(birthdateKey: string, today: Date = new Date()): number {
  const [year, month, day] = birthdateKey.split("-").map(Number);
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
