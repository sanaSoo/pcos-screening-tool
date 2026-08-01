import AsyncStorage from "@react-native-async-storage/async-storage";

import { toDateKey } from "./cycles_api";

// Local-only persistence — same rationale as lib/cycles_api.ts: no backend
// table for this yet.
const STORAGE_KEY = "@pcos/hairLogs";

// 0 = none, 1 = mild, 2 = moderate, 3 = severe.
export type HairSeverity = 0 | 1 | 2 | 3;

export type HairLog = {
  id: string;
  date: string; // "YYYY-MM-DD" local calendar date
  hairGrowth: HairSeverity; // excess body/facial hair growth
  hairThinning: HairSeverity; // scalp hair thinning/shedding
};

async function readAll(): Promise<HairLog[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HairLog[];
  } catch {
    return [];
  }
}

async function writeAll(logs: HairLog[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export async function listHairLogs(): Promise<HairLog[]> {
  const logs = await readAll();
  return [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function logHair(
  hairGrowth: HairSeverity,
  hairThinning: HairSeverity,
  date: Date = new Date(),
): Promise<HairLog> {
  const logs = await readAll();
  const log: HairLog = {
    id: Date.now().toString(36),
    date: toDateKey(date),
    hairGrowth,
    hairThinning,
  };
  await writeAll([...logs, log]);
  return log;
}

export async function deleteHairLog(id: string): Promise<void> {
  const logs = await readAll();
  await writeAll(logs.filter((l) => l.id !== id));
}
