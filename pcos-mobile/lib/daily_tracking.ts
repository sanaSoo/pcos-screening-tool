import AsyncStorage from "@react-native-async-storage/async-storage";

// Local-only, same rationale as lib/cycles_api.ts / lib/notes_api.ts — no
// backend for this yet. Both "reset" behaviors below fall out of comparing
// a stored key to the current day/week key, rather than needing a timer:
// once the stored key no longer matches "now", the old value reads as stale
// and the dot count/flag naturally reverts.
const TRACKER_WEEK_KEY_PREFIX = "@pcos/lastTrackedWeek:";
const MEALS_LOGGED_KEY = "@pcos/mealsLoggedToday";

// Each symptom sub-tracker (acne, hair/skin) clears its own dot independently
// — and only when the user actually submits data through that tracker's real
// flow, not just from opening/tapping into the Symptom Check-In screen.
export type TrackerKey = "acne" | "hairSkin";
const MEALS_PER_DAY = 3;

function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ISO-8601 week key (e.g. "2026-W05") — Monday-start week, matching the
// standard "week of the year" definition.
function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function hasTrackedThisWeek(tracker: TrackerKey): Promise<boolean> {
  const stored = await AsyncStorage.getItem(TRACKER_WEEK_KEY_PREFIX + tracker);
  return stored === isoWeekKey();
}

export async function markTrackedThisWeek(tracker: TrackerKey): Promise<void> {
  await AsyncStorage.setItem(TRACKER_WEEK_KEY_PREFIX + tracker, isoWeekKey());
}

export async function getMealsLoggedToday(): Promise<number> {
  const raw = await AsyncStorage.getItem(MEALS_LOGGED_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed.date === todayKey() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export async function logMeal(): Promise<number> {
  const current = await getMealsLoggedToday();
  const next = Math.min(MEALS_PER_DAY, current + 1);
  await AsyncStorage.setItem(MEALS_LOGGED_KEY, JSON.stringify({ date: todayKey(), count: next }));
  return next;
}

export const MEALS_PER_DAY_COUNT = MEALS_PER_DAY;
