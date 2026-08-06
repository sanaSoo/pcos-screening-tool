import { getUserId } from "./auth";
import { toDateKey } from "./cycles_api";
import { supabase } from "./supabase";

// Backed by the `treatments` table (supabase/migrations/0007_treatments.sql).

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
  endDate: string | null; // "YYYY-MM-DD", set once the treatment is ended
  endReason: string | null;
};

export type TreatmentInput = {
  name: string;
  dosage: string | null;
  date: Date;
  symptomTags: SymptomTag[];
  notes: string | null;
};

type TreatmentRow = {
  id: string;
  name: string;
  dosage: string | null;
  start_date: string;
  symptom_tags: SymptomTag[];
  notes: string | null;
  created_at: string;
  end_date: string | null;
  end_reason: string | null;
};

function fromRow(row: TreatmentRow): Treatment {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    date: row.start_date,
    symptomTags: row.symptom_tags,
    notes: row.notes,
    createdAt: new Date(row.created_at).getTime(),
    endDate: row.end_date,
    endReason: row.end_reason,
  };
}

export async function listTreatments(): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from("treatments")
    .select("*")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as TreatmentRow[]).map(fromRow);
}

export async function addTreatment(input: TreatmentInput): Promise<Treatment> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("treatments")
    .insert({
      user_id: userId,
      name: input.name,
      dosage: input.dosage,
      start_date: toDateKey(input.date),
      symptom_tags: input.symptomTags,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as TreatmentRow);
}

export async function updateTreatment(id: string, input: TreatmentInput): Promise<Treatment> {
  const { data, error } = await supabase
    .from("treatments")
    .update({
      name: input.name,
      dosage: input.dosage,
      start_date: toDateKey(input.date),
      symptom_tags: input.symptomTags,
      notes: input.notes,
    })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Treatment not found.");
  return fromRow(data as TreatmentRow);
}

export async function endTreatment(id: string, endDate: Date, reason: string): Promise<Treatment> {
  const { data, error } = await supabase
    .from("treatments")
    .update({ end_date: toDateKey(endDate), end_reason: reason })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Treatment not found.");
  return fromRow(data as TreatmentRow);
}

export async function deleteTreatment(id: string): Promise<void> {
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
