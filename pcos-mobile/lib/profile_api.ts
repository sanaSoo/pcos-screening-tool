import { getUserId } from "./auth";
import { toDateKey } from "./cycles_api";
import { logWeight } from "./weight_api";
import { supabase } from "./supabase";

// Backed by the `profiles` table, extended in
// supabase/migrations/0010_profile_onboarding.sql. RLS scopes every row to
// the signed-in user via the existing "profiles: select/insert/update own
// row" policies from 0001/0002.
export type WeightCheckInCadence = "weekly" | "biweekly" | "monthly";

export type Profile = {
  id: string;
  username: string;
  email: string;
  createdAt: string; // ISO timestamp
  birthdate: string | null; // "YYYY-MM-DD"
  startingWeightLbs: number | null;
  weightCheckInCadence: WeightCheckInCadence | null;
};

type ProfileRow = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  birthdate: string | null;
  starting_weight_lbs: number | null;
  weight_checkin_cadence: WeightCheckInCadence | null;
};

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.created_at,
    birthdate: row.birthdate,
    startingWeightLbs: row.starting_weight_lbs,
    weightCheckInCadence: row.weight_checkin_cadence,
  };
}

export async function getProfile(): Promise<Profile> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error(error.message);
  return fromRow(data as ProfileRow);
}

// Which onboarding step (if any) is still missing. Returns a step name
// rather than a navigation Screen value, so this file stays decoupled from
// App.tsx's routing.
export function missingOnboardingStep(profile: Profile): "baseInfo" | "cadence" | null {
  if (profile.birthdate === null || profile.startingWeightLbs === null) return "baseInfo";
  if (profile.weightCheckInCadence === null) return "cadence";
  return null;
}

export type BaseInfoInput = { birthdate: Date; startingWeightLbs: number };

// Saves birthdate + starting weight, and seeds weight_logs with a first
// entry dated today (onboarding-completion date, not the birthdate) at the
// starting weight — so cadence/due-date logic never needs a "no logs yet"
// special case.
export async function updateBaseInfo({ birthdate, startingWeightLbs }: BaseInfoInput): Promise<Profile> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ birthdate: toDateKey(birthdate), starting_weight_lbs: startingWeightLbs })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logWeight(startingWeightLbs);

  return fromRow(data as ProfileRow);
}

export async function updateCadence(cadence: WeightCheckInCadence): Promise<Profile> {
  const userId = await getUserId();
  if (!userId) throw new Error("You're not signed in.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ weight_checkin_cadence: cadence })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as ProfileRow);
}
