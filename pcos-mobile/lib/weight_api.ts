import { getUserId } from "./auth";
import { toDateKey } from "./cycles_api";
import { getProfile } from "./profile_api";
import { supabase } from "./supabase";

// Backed by the `weight_logs` table (supabase/migrations/0010_profile_onboarding.sql).
// RLS scopes every row to the signed-in user, so no explicit user_id filter
// is needed on selects, only on inserts (to satisfy the `with check`).
export type WeightLog = {
  id: string;
  date: string; // "YYYY-MM-DD" local calendar date
  weightLbs: number;
};

type WeightLogRow = { id: string; logged_date: string; weight_lbs: number };

function fromRow(row: WeightLogRow): WeightLog {
  return { id: row.id, date: row.logged_date, weightLbs: row.weight_lbs };
}

export async function listWeightLogs(): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .order("logged_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as WeightLogRow[]).map(fromRow);
}

export async function getLatestWeightLog(): Promise<WeightLog | null> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .order("logged_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as WeightLogRow) : null;
}

// Upserts on (user_id, logged_date): logging twice in the same day corrects
// that day's value instead of erroring or duplicating.
export async function logWeight(weightLbs: number, date: Date = new Date()): Promise<WeightLog> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: userId, logged_date: toDateKey(date), weight_lbs: weightLbs },
      { onConflict: "user_id,logged_date" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as WeightLogRow);
}

function addCadenceInterval(dateKey: string, cadence: "weekly" | "biweekly" | "monthly"): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  if (cadence === "weekly") next.setDate(next.getDate() + 7);
  else if (cadence === "biweekly") next.setDate(next.getDate() + 14);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export type WeightCheckInStatus = {
  isDue: boolean;
  lastLoggedDate: string | null;
  nextDueDate: string | null; // null if cadence unset or nothing logged yet
};

// Reads cadence off the profile and the most recent log, so callers don't
// need to plumb either in themselves.
export async function getWeightCheckInStatus(): Promise<WeightCheckInStatus> {
  const [profile, latest] = await Promise.all([getProfile(), getLatestWeightLog()]);

  if (!profile.weightCheckInCadence || !latest) {
    return { isDue: false, lastLoggedDate: latest?.date ?? null, nextDueDate: null };
  }

  const nextDue = addCadenceInterval(latest.date, profile.weightCheckInCadence);
  const nextDueKey = toDateKey(nextDue);
  return {
    isDue: toDateKey(new Date()) >= nextDueKey,
    lastLoggedDate: latest.date,
    nextDueDate: nextDueKey,
  };
}
