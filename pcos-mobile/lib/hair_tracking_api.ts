import { getUserId } from "./auth";
import { toDateKey } from "./cycles_api";
import { supabase } from "./supabase";

// Backed by the `hair_logs` table (supabase/migrations/0006_hair_logs.sql).

// 0 = none, 1 = mild, 2 = moderate, 3 = severe.
export type HairSeverity = 0 | 1 | 2 | 3;

export type HairLog = {
  id: string;
  date: string; // "YYYY-MM-DD" local calendar date
  hairGrowth: HairSeverity; // excess body/facial hair growth
  hairThinning: HairSeverity; // scalp hair thinning/shedding
};

type HairLogRow = { id: string; log_date: string; hair_growth: HairSeverity; hair_thinning: HairSeverity };

function fromRow(row: HairLogRow): HairLog {
  return { id: row.id, date: row.log_date, hairGrowth: row.hair_growth, hairThinning: row.hair_thinning };
}

export async function listHairLogs(): Promise<HairLog[]> {
  const { data, error } = await supabase
    .from("hair_logs")
    .select("*")
    .order("log_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as HairLogRow[]).map(fromRow);
}

export async function logHair(
  hairGrowth: HairSeverity,
  hairThinning: HairSeverity,
  date: Date = new Date(),
): Promise<HairLog> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("hair_logs")
    .insert({
      user_id: userId,
      log_date: toDateKey(date),
      hair_growth: hairGrowth,
      hair_thinning: hairThinning,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as HairLogRow);
}

export async function deleteHairLog(id: string): Promise<void> {
  const { error } = await supabase.from("hair_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
