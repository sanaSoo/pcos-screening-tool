import AsyncStorage from "@react-native-async-storage/async-storage";

import { toDateKey } from "./cycles_api";

// Local-only persistence, same rationale as lib/cycles_api.ts / lib/notes_api.ts —
// no backend for this yet, and Supabase auth is currently bypassed app-wide.
const STORAGE_KEY = "@pcos/treatments";

// A superset of daily_tracking.ts's TrackerKey ("acne" | "hairSkin") — PCOS
// treatments (e.g. metformin, birth control) often target the cycle or the
// whole body rather than a single tracked symptom.
export const TREATMENT_SYMPTOM_TAGS = ["Acne", "Hair/Skin", "Cycle", "Whole Body"] as const;
export type SymptomTag = (typeof TREATMENT_SYMPTOM_TAGS)[number];

export type Treatment = {
  id: string;
  name: string;
  dosage: string | null;
  date: string; // "YYYY-MM-DD" local calendar date, via toDateKey
  symptomTags: SymptomTag[];
  notes: string | null;
  createdAt: number;
};

export type TreatmentInput = {
  name: string;
  dosage: string | null;
  date: Date;
  symptomTags: SymptomTag[];
  notes: string | null;
};

async function readAll(): Promise<Treatment[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Treatment[];
  } catch {
    return [];
  }
}

async function writeAll(treatments: Treatment[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(treatments));
}

export async function listTreatments(): Promise<Treatment[]> {
  const treatments = await readAll();
  return [...treatments].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

export async function addTreatment(input: TreatmentInput): Promise<Treatment> {
  const treatments = await readAll();
  const treatment: Treatment = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    dosage: input.dosage,
    date: toDateKey(input.date),
    symptomTags: input.symptomTags,
    notes: input.notes,
    createdAt: Date.now(),
  };
  await writeAll([treatment, ...treatments]);
  return treatment;
}

export async function updateTreatment(id: string, input: TreatmentInput): Promise<Treatment> {
  const treatments = await readAll();
  const target = treatments.find((t) => t.id === id);
  if (!target) throw new Error("Treatment not found.");
  const updated: Treatment = {
    ...target,
    name: input.name,
    dosage: input.dosage,
    date: toDateKey(input.date),
    symptomTags: input.symptomTags,
    notes: input.notes,
  };
  await writeAll(treatments.map((t) => (t.id === id ? updated : t)));
  return updated;
}

export async function deleteTreatment(id: string): Promise<void> {
  const treatments = await readAll();
  await writeAll(treatments.filter((t) => t.id !== id));
}
