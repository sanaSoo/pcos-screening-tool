import AsyncStorage from "@react-native-async-storage/async-storage";

import { addTreatment } from "./treatments_api";
import { logPastCycle, toDateKey } from "./cycles_api";
import { logHair, type HairSeverity } from "./hair_tracking_api";
import type { SkinCaptureHistoryEntry, ZoneScore } from "./skin_tracking_api";

// Dev-only helper — fills AsyncStorage with a plausible ~3 months of data
// for someone showing classic PCOS signs: a long, prolonged, irregular
// cycle history; a hormonal jawline-pattern acne flare that worsens over
// that time; worsening hirsutism + scalp thinning; and a treatment
// titration (an initial contraceptive trial, then spironolactone +
// metformin) responding to that worsening.
const CYCLES_KEY = "@pcos/cycles";
const HAIR_LOGS_KEY = "@pcos/hairLogs";
const TREATMENTS_KEY = "@pcos/treatments";
const SKIN_HISTORY_KEY = "@pcos/skinCaptureHistory";
const DEMO_DATA_KEYS = [CYCLES_KEY, HAIR_LOGS_KEY, TREATMENTS_KEY, SKIN_HISTORY_KEY];

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

// Mirrors skin_tracking/severity.py's level->score mapping: levels -1..4
// map onto 0..100 via ((level + 1) / 5) * 100.
const LEVEL_LABELS: Record<number, string> = {
  [-1]: "Level -1: Clear Skin",
  0: "Level 0: Occasional Spots",
  1: "Level 1: Mild Acne",
  2: "Level 2: Moderate Acne",
  3: "Level 3: Severe Acne",
  4: "Level 4: Very Severe Acne",
};

function zoneScore(level: number, confidence: number): ZoneScore {
  return {
    label: LEVEL_LABELS[level],
    confidence,
    severity_score: Math.round(((level + 1) / 5) * 100 * 10) / 10,
  };
}

// Weekly captures, oldest -> newest, spanning ~3 months (one per week) and
// showing the classic PCOS androgenic pattern (jawline/chin/neck worse than
// forehead/temples) with a gradual flare over that time. Each zone ramps
// from a start level to an end level across the run rather than being
// hand-typed per week, so the history length can grow independently of the
// zone pattern.
const SKIN_ZONE_LEVELS: Record<string, { start: number; end: number }> = {
  forehead: { start: 0, end: 1 },
  chin: { start: 1, end: 4 },
  jaw_left: { start: 2, end: 4 },
  jaw_right: { start: 2, end: 4 },
  left_cheek: { start: 1, end: 2 },
  right_cheek: { start: 1, end: 2 },
  left_temple: { start: 0, end: 1 },
  right_temple: { start: 0, end: 1 },
  neck_left: { start: 1, end: 2 },
  neck_right: { start: 1, end: 2 },
};
const SKIN_WEEKS_COUNT = 12;

function buildSkinWeeks(weeks: number): Record<string, number>[] {
  return Array.from({ length: weeks }, (_, i) => {
    const t = weeks === 1 ? 1 : i / (weeks - 1);
    const row: Record<string, number> = {};
    for (const [zone, { start, end }] of Object.entries(SKIN_ZONE_LEVELS)) {
      row[zone] = Math.min(4, Math.max(-1, Math.round(start + (end - start) * t)));
    }
    return row;
  });
}
const SKIN_WEEKS = buildSkinWeeks(SKIN_WEEKS_COUNT);

async function seedSkinCaptureHistory(now: Date): Promise<void> {
  const raw = await AsyncStorage.getItem(SKIN_HISTORY_KEY);
  const existing: SkinCaptureHistoryEntry[] = raw ? JSON.parse(raw) : [];

  const offsets = Array.from({ length: SKIN_WEEKS.length }, (_, i) => (SKIN_WEEKS.length - 1 - i) * 7);
  const entries: SkinCaptureHistoryEntry[] = SKIN_WEEKS.map((levels, i) => {
    const scores: Record<string, ZoneScore> = {};
    for (const [zone, level] of Object.entries(levels)) {
      scores[zone] = zoneScore(level, 0.8 + (i % 3) * 0.05);
    }
    const overall =
      Math.round(
        (Object.values(scores).reduce((sum, s) => sum + s.severity_score, 0) / Object.values(scores).length) * 10,
      ) / 10;
    return {
      id: `${Date.now().toString(36)}${i}`,
      date: toDateKey(daysAgo(offsets[i], now)),
      overall,
      scores,
    };
  });

  await AsyncStorage.setItem(SKIN_HISTORY_KEY, JSON.stringify([...existing, ...entries]));
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
  await addTreatment({
    name: "Combined Oral Contraceptive",
    dosage: null,
    date: daysAgo(90, now),
    symptomTags: ["Cycle", "Acne"],
    notes: "Trialed as first-line therapy for irregular cycles and acne.",
  });
  await addTreatment({
    name: "Combined Oral Contraceptive",
    dosage: null,
    date: daysAgo(45, now),
    symptomTags: ["Cycle"],
    notes: "Discontinued — mood side effects. Switching approach.",
  });
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
  await seedSkinCaptureHistory(now);
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
