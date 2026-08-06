import { API_BASE_URL } from "./api_config";
import { getAccessToken } from "./auth";

// Answers for the PCOS risk questionnaire — keys/shape mirror
// intake/features.py's REQUIRED_KEYS on the Flask side exactly.
export type IntakeAnswers = {
  periodFrequency: 1 | 2 | 3; // 1 = every month, 2 = every 2 months, 3 = irregular/longer
  excessiveHairGrowth: 0 | 1;
  skinDarkening: 0 | 1;
  weightKg: number;
  recentWeightGain: 0 | 1;
  hairThinning: 0 | 1;
  jawFaceAcne: 0 | 1;
  periodLengthDays: number;
  moodSwings: 0 | 1;
};

export type IntakeResult = {
  risk_score_pct: number;
  risk_label: "lower" | "moderate" | "higher";
  disclaimer: string;
  model_version: string;
};

export async function submitIntake(answers: IntakeAnswers): Promise<IntakeResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("You're not signed in.");

  const resp = await fetch(`${API_BASE_URL}/intake/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      period_frequency: answers.periodFrequency,
      excessive_hair_growth: answers.excessiveHairGrowth,
      skin_darkening: answers.skinDarkening,
      weight_kg: answers.weightKg,
      recent_weight_gain: answers.recentWeightGain,
      hair_thinning: answers.hairThinning,
      jaw_face_acne: answers.jawFaceAcne,
      period_length_days: answers.periodLengthDays,
      mood_swings: answers.moodSwings,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as IntakeResult;
}

// Used to decide whether a signed-in user still needs to be routed through
// the mandatory intake step during onboarding — true as soon as any
// intake_results row exists for them, even from before this app version.
export async function hasCompletedIntake(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error("You're not signed in.");

  const resp = await fetch(`${API_BASE_URL}/intake/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return Array.isArray(data) && data.length > 0;
}
