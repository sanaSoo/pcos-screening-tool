import AsyncStorage from "@react-native-async-storage/async-storage";

import { addTreatment } from "./treatments_api";
import { logPastCycle, toDateKey } from "./cycles_api";
import { logHair } from "./hair_tracking_api";
import type { SkinCaptureHistoryEntry, ZoneScore } from "./skin_tracking_api";

// Dev-only helper — fills AsyncStorage with a plausible month of data for
// someone showing classic PCOS signs: a long, prolonged, irregular cycle
// history; a hormonal jawline-pattern acne flare that worsens over the
// month; worsening hirsutism + scalp thinning; and a treatment titration
// (spironolactone + metformin) responding to that worsening.
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

// One row per weekly capture, oldest -> newest, showing the classic PCOS
// androgenic pattern (jawline/chin/neck worse than forehead/temples) and a
// gradual flare over the month.
const SKIN_WEEKS: Record<string, number>[] = [
  { forehead: 0, chin: 1, jaw_left: 2, jaw_right: 2, left_cheek: 1, right_cheek: 1, left_temple: 0, right_temple: 0, neck_left: 1, neck_right: 1 },
  { forehead: 0, chin: 2, jaw_left: 2, jaw_right: 2, left_cheek: 1, right_cheek: 1, left_temple: 0, right_temple: 0, neck_left: 1, neck_right: 1 },
  { forehead: 1, chin: 2, jaw_left: 3, jaw_right: 3, left_cheek: 2, right_cheek: 2, left_temple: 0, right_temple: 1, neck_left: 2, neck_right: 2 },
  { forehead: 1, chin: 3, jaw_left: 3, jaw_right: 3, left_cheek: 2, right_cheek: 2, left_temple: 1, right_temple: 1, neck_left: 2, neck_right: 2 },
  { forehead: 1, chin: 3, jaw_left: 4, jaw_right: 4, left_cheek: 2, right_cheek: 2, left_temple: 1, right_temple: 1, neck_left: 2, neck_right: 2 },
];

async function seedSkinCaptureHistory(now: Date): Promise<void> {
  const raw = await AsyncStorage.getItem(SKIN_HISTORY_KEY);
  const existing: SkinCaptureHistoryEntry[] = raw ? JSON.parse(raw) : [];

  const offsets = [28, 21, 14, 7, 0];
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

async function seedCycles(now: Date): Promise<void> {
  // Long, prolonged, irregular cycles — a hallmark of PCOS (oligomenorrhea).
  // Gaps of 28 then 62 days give high cycle-length variance, and 5-9 day
  // periods are on the longer/heavier end.
  const cycleC = { start: daysAgo(27, now), end: daysAgo(19, now) }; // 9-day period, within the last month
  const cycleB = { start: daysAgo(27 + 62, now), end: daysAgo(27 + 62 - 5, now) }; // 6-day period
  const cycleA = { start: daysAgo(27 + 62 + 28, now), end: daysAgo(27 + 62 + 28 - 4, now) }; // 5-day period

  await logPastCycle(cycleA.start, cycleA.end);
  await logPastCycle(cycleB.start, cycleB.end);
  await logPastCycle(cycleC.start, cycleC.end);
}

async function seedHairLogs(now: Date): Promise<void> {
  // Worsening hirsutism (excess growth) + scalp thinning over the month —
  // both androgen-driven PCOS symptoms.
  const offsets = [28, 21, 14, 7, 0];
  const growth: [number, number, number, number, number] = [2, 2, 3, 3, 3];
  const thinning: [number, number, number, number, number] = [1, 2, 2, 2, 3];

  for (let i = 0; i < offsets.length; i++) {
    await logHair(growth[i] as 0 | 1 | 2 | 3, thinning[i] as 0 | 1 | 2 | 3, daysAgo(offsets[i], now));
  }
}

async function seedTreatments(now: Date): Promise<void> {
  // A titration story that tracks the worsening symptoms above: starting
  // doses a month ago, stepped up mid-month once they weren't enough.
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
