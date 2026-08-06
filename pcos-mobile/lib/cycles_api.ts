import { getUserId } from "./auth";
import { supabase } from "./supabase";

// Backed by the `cycles` table (supabase/migrations/0005_cycles.sql) — RLS
// scopes every row to the signed-in user, so no explicit user_id filter is
// needed on selects, only on inserts (to satisfy the `with check`).
export type Cycle = {
  id: string;
  startDate: string; // "YYYY-MM-DD" local calendar date
  endDate: string | null; // null = ongoing/open cycle
};

type CycleRow = { id: string; start_date: string; end_date: string | null };

function fromRow(row: CycleRow): Cycle {
  return { id: row.id, startDate: row.start_date, endDate: row.end_date };
}

// Local y/m/d, not toISOString() — that's UTC and can shift the date near
// local midnight.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function listCycles(): Promise<Cycle[]> {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CycleRow[]).map(fromRow);
}

export async function getOpenCycle(): Promise<Cycle | null> {
  const { data, error } = await supabase.from("cycles").select("*").is("end_date", null).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as CycleRow) : null;
}

export async function startCycle(date: Date = new Date()): Promise<Cycle> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("cycles")
    .insert({ user_id: userId, start_date: toDateKey(date), end_date: null })
    .select()
    .single();
  if (error) {
    // 23505 = unique_violation on the cycles_one_open_per_user partial index.
    if (error.code === "23505") throw new Error("A period is already logged as in progress.");
    throw new Error(error.message);
  }
  return fromRow(data as CycleRow);
}

export async function endOpenCycle(date: Date = new Date()): Promise<Cycle> {
  const { data, error } = await supabase
    .from("cycles")
    .update({ end_date: toDateKey(date) })
    .is("end_date", null)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No period is currently in progress.");
  return fromRow(data as CycleRow);
}

// For backdating a period that's already fully over — both dates are known
// up front, so this never touches the single-open-cycle invariant above.
export async function logPastCycle(startDate: Date, endDate: Date): Promise<Cycle> {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  if (endKey < startKey) {
    throw new Error("End date can't be before the start date.");
  }
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("cycles")
    .insert({ user_id: userId, start_date: startKey, end_date: endKey })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as CycleRow);
}

export async function deleteCycle(id: string): Promise<void> {
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
