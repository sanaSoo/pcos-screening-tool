import AsyncStorage from "@react-native-async-storage/async-storage";

// Local-only persistence — there's no `cycles` table/backend yet, and
// Supabase auth is currently bypassed app-wide, so there's no reliable
// authenticated user to key backend rows off of anyway.
const STORAGE_KEY = "@pcos/cycles";

export type Cycle = {
  id: string;
  startDate: string; // "YYYY-MM-DD" local calendar date
  endDate: string | null; // null = ongoing/open cycle
};

// Local y/m/d, not toISOString() — that's UTC and can shift the date near
// local midnight.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function readAll(): Promise<Cycle[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Cycle[];
  } catch {
    return [];
  }
}

async function writeAll(cycles: Cycle[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cycles));
}

export async function listCycles(): Promise<Cycle[]> {
  const cycles = await readAll();
  return [...cycles].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export async function getOpenCycle(): Promise<Cycle | null> {
  const cycles = await readAll();
  return cycles.find((c) => c.endDate === null) ?? null;
}

export async function startCycle(date: Date = new Date()): Promise<Cycle> {
  const cycles = await readAll();
  if (cycles.some((c) => c.endDate === null)) {
    throw new Error("A period is already logged as in progress.");
  }
  const cycle: Cycle = { id: Date.now().toString(36), startDate: toDateKey(date), endDate: null };
  await writeAll([...cycles, cycle]);
  return cycle;
}

export async function endOpenCycle(date: Date = new Date()): Promise<Cycle> {
  const cycles = await readAll();
  const open = cycles.find((c) => c.endDate === null);
  if (!open) throw new Error("No period is currently in progress.");
  const updated: Cycle = { ...open, endDate: toDateKey(date) };
  await writeAll(cycles.map((c) => (c.id === open.id ? updated : c)));
  return updated;
}

// For backdating a period that's already fully over — both dates are known
// up front, so this never touches the single-open-cycle invariant above.
export async function logPastCycle(startDate: Date, endDate: Date): Promise<Cycle> {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  if (endKey < startKey) {
    throw new Error("End date can't be before the start date.");
  }
  const cycles = await readAll();
  const cycle: Cycle = { id: Date.now().toString(36), startDate: startKey, endDate: endKey };
  await writeAll([...cycles, cycle]);
  return cycle;
}

export async function deleteCycle(id: string): Promise<void> {
  const cycles = await readAll();
  await writeAll(cycles.filter((c) => c.id !== id));
}
