import AsyncStorage from "@react-native-async-storage/async-storage";

import { addTreatment, endTreatment } from "./treatments_api";
import { logPastCycle } from "./cycles_api";
import { logHair, type HairSeverity } from "./hair_tracking_api";

// Dev-only helper — fills AsyncStorage with a plausible ~3 months of data
// for someone showing classic PCOS signs: a long, prolonged, irregular
// cycle history; worsening hirsutism + scalp thinning; and a treatment
// titration (an initial contraceptive trial, then spironolactone +
// metformin) responding to that worsening.
//
// Acne demo data isn't seeded here anymore — acne_entries now lives in
// Supabase (with real photo files in Storage) instead of AsyncStorage, so
// seeding a fake history means inserting real rows/photos through the
// backend, not a local JSON blob. Not built yet; demo mode currently skips
// the acne tracker.
const CYCLES_KEY = "@pcos/cycles";
const HAIR_LOGS_KEY = "@pcos/hairLogs";
const TREATMENTS_KEY = "@pcos/treatments";
const DEMO_DATA_KEYS = [CYCLES_KEY, HAIR_LOGS_KEY, TREATMENTS_KEY];

// Toggle state + a snapshot of whatever was in those keys right before demo
// data was turned on, so turning it back off restores the real state
// exactly instead of just wiping everything.
const DEMO_MODE_KEY = "@pcos/demoModeEnabled";
const SNAPSHOT_KEY = "@pcos/preDemoDataSnapshot";

function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

// Long, prolonged, irregular cycles — a hallmark of PCOS (oligomenorrhea).
// Gaps between starts vary a lot (34-62 days) to give high cycle-length
// variance, and 4-9 day periods are on the longer/heavier end. Oldest ->
// newest; the most recent cycle started 27 days ago, same as before.
const CYCLE_GAPS = [45, 62, 34, 50]; // days between consecutive cycle starts
const PERIOD_LENGTHS = [5, 6, 4, 9, 7]; // one per cycle, oldest -> newest
const MOST_RECENT_CYCLE_START_OFFSET = 27;

async function seedCycles(now: Date): Promise<void> {
  const startOffsets: number[] = [MOST_RECENT_CYCLE_START_OFFSET];
  for (const gap of [...CYCLE_GAPS].reverse()) {
    startOffsets.push(startOffsets[startOffsets.length - 1] + gap);
  }
  startOffsets.reverse(); // back to oldest -> newest

  // Oldest first, so cycle ids/insertion order read chronologically.
  for (let i = 0; i < startOffsets.length; i++) {
    const start = daysAgo(startOffsets[i], now);
    const end = daysAgo(startOffsets[i] - (PERIOD_LENGTHS[i] - 1), now);
    await logPastCycle(start, end);
  }
}

// Worsening hirsutism (excess growth) + scalp thinning across the run —
// both androgen-driven PCOS symptoms.
const HAIR_GROWTH_LEVELS = { start: 1, end: 3 };
const HAIR_THINNING_LEVELS = { start: 0, end: 3 };
const HAIR_WEEKS_COUNT = 12;

async function seedHairLogs(now: Date): Promise<void> {
  const offsets = Array.from({ length: HAIR_WEEKS_COUNT }, (_, i) => (HAIR_WEEKS_COUNT - 1 - i) * 7);

  for (let i = 0; i < offsets.length; i++) {
    const t = offsets.length === 1 ? 1 : i / (offsets.length - 1);
    const growth = Math.round(HAIR_GROWTH_LEVELS.start + (HAIR_GROWTH_LEVELS.end - HAIR_GROWTH_LEVELS.start) * t);
    const thinning = Math.round(
      HAIR_THINNING_LEVELS.start + (HAIR_THINNING_LEVELS.end - HAIR_THINNING_LEVELS.start) * t,
    );
    await logHair(growth as HairSeverity, thinning as HairSeverity, daysAgo(offsets[i], now));
  }
}

async function seedTreatments(now: Date): Promise<void> {
  // A titration story that tracks the worsening symptoms above: a
  // first-line contraceptive trial 3 months ago that got discontinued,
  // then spironolactone + metformin starting a month ago and stepped up
  // mid-month once they weren't enough.
  const coc = await addTreatment({
    name: "Combined Oral Contraceptive",
    dosage: null,
    date: daysAgo(90, now),
    symptomTags: ["Cycle", "Acne"],
    notes: "Trialed as first-line therapy for irregular cycles and acne.",
  });
  await endTreatment(coc.id, daysAgo(45, now), "Mood side effects — switching approach.");
  await addTreatment({
    name: "Spironolactone",
    dosage: "50mg",
    date: daysAgo(30, now),
    symptomTags: ["Acne", "Hair/Skin"],
    notes: "Starting dose for hormonal acne and excess hair growth.",
  });
  await addTreatment({
    name: "Metformin",
    dosage: "500mg",
    date: daysAgo(30, now),
    symptomTags: ["Cycle", "Whole Body"],
    notes: "Starting dose to help regulate cycles and insulin resistance.",
  });
  await addTreatment({
    name: "Metformin",
    dosage: "1000mg",
    date: daysAgo(14, now),
    symptomTags: ["Cycle", "Whole Body"],
    notes: "Dose increased at follow-up.",
  });
  await addTreatment({
    name: "Spironolactone",
    dosage: "100mg",
    date: daysAgo(2, now),
    symptomTags: ["Acne", "Hair/Skin"],
    notes: "Dose increased — acne wasn't controlled at 50mg.",
  });
}

async function seedPcosDemoData(): Promise<void> {
  const now = new Date();
  await seedCycles(now);
  await seedHairLogs(now);
  await seedTreatments(now);
}

export async function isDemoDataEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEMO_MODE_KEY)) === "true";
}

// Turning demo data on/off is a snapshot-and-restore, not just seed-vs-clear
// — that way any real data that existed before demo mode was switched on
// (or a re-toggle) survives untouched.
export async function setDemoDataEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    const snapshot: Record<string, string | null> = {};
    for (const key of DEMO_DATA_KEYS) {
      snapshot[key] = await AsyncStorage.getItem(key);
    }
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    await seedPcosDemoData();
    await AsyncStorage.setItem(DEMO_MODE_KEY, "true");
  } else {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    const snapshot: Record<string, string | null> = raw ? JSON.parse(raw) : {};
    for (const key of DEMO_DATA_KEYS) {
      const value = snapshot[key];
      if (value == null) {
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    }
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
    await AsyncStorage.setItem(DEMO_MODE_KEY, "false");
  }
}

// Strips out everything that isn't demo data, leaving only what seeding
// added. With demo mode off there's no seeded data at all, so "not demo" is
// just everything — clear the 4 keys outright. With demo mode on, the
// pre-toggle snapshot tells us which ids were real, so filter those out by
// id rather than wiping the keys (which would also delete the demo entries).
export async function clearNonDemoData(): Promise<void> {
  if (!(await isDemoDataEnabled())) {
    for (const key of DEMO_DATA_KEYS) {
      await AsyncStorage.removeItem(key);
    }
    return;
  }

  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  const snapshot: Record<string, string | null> = raw ? JSON.parse(raw) : {};

  for (const key of DEMO_DATA_KEYS) {
    const preDemoRaw = snapshot[key];
    const preDemoIds = new Set<string>(
      preDemoRaw ? (JSON.parse(preDemoRaw) as { id: string }[]).map((item) => item.id) : [],
    );
    const currentRaw = await AsyncStorage.getItem(key);
    const current: { id: string }[] = currentRaw ? JSON.parse(currentRaw) : [];
    const demoOnly = current.filter((item) => !preDemoIds.has(item.id));
    await AsyncStorage.setItem(key, JSON.stringify(demoOnly));
  }

  // The real entries are gone now, so there's nothing left to restore if
  // demo mode gets turned off later.
  await AsyncStorage.setItem(
    SNAPSHOT_KEY,
    JSON.stringify(Object.fromEntries(DEMO_DATA_KEYS.map((key) => [key, null]))),
  );
}
