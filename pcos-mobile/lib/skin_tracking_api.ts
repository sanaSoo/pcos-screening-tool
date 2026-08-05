import { getAccessToken } from "./auth";

// Mac's LAN IP running the Flask backend (app.py). Re-check with
// `ipconfig getifaddr en0` on the Mac if requests stop connecting.
export const API_BASE_URL = "http://192.168.4.61:5001";

export type ZoneScore = {
  label: string;
  confidence: number;
  severity_score: number;
};

export type LogicalZoneScores = {
  forehead: number;
  temple: number;
  cheeks: number;
  chin: number;
  jaw: number;
  neck: number;
};

export type TrackerScores = {
  sub_zones: Record<string, ZoneScore>;
  zones: LogicalZoneScores;
  overall: number;
};

export type HormonalPattern = {
  likelihood_pct: number;
  reasons: string[];
  zone_comparison: { hormonal_zone_avg: number; t_zone_avg: number };
  disclaimer: string;
};

export type UploadAcnePhotoResponse = {
  scores: TrackerScores;
  hormonal_pattern: HormonalPattern;
};

// Mirrors analysis/hormonal_signal.py's DISCLAIMER — the disclaimer text
// itself isn't a stored column on acne_entries (only reasons/likelihood
// are), so history-detail views need a local copy of the static wording.
export const HORMONAL_DISCLAIMER =
  "This is a pattern-matching estimate based on acne location and reported symptoms — " +
  "it is not a medical diagnosis. Please consult a dermatologist or doctor for a proper evaluation.";

// Keys expected server-side by analysis/hormonal_signal.py — keep the
// checkboxes in CaptureScreen keyed on these exact strings.
export const HORMONAL_SYMPTOM_KEYS = {
  excessiveHairGrowth: "Excessive Hair Growth (Body/Facial)",
  recentWeightGain: "Recent Weight Gain",
} as const;

export type AcnePhotos = {
  front: string; // local file uri
  left: string;
  right: string;
};

export async function uploadAcnePhoto(
  photos: AcnePhotos,
  symptomAnswers: Record<string, number>,
): Promise<UploadAcnePhotoResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error("You're not signed in.");

  const form = new FormData();
  // React Native's fetch reads the `uri`/`name`/`type` shape below to build
  // the multipart body — not a real Blob/File, this is the RN-specific form.
  form.append("front_photo", { uri: photos.front, name: "front.jpg", type: "image/jpeg" } as any);
  form.append("left_profile_photo", { uri: photos.left, name: "left.jpg", type: "image/jpeg" } as any);
  form.append("right_profile_photo", { uri: photos.right, name: "right.jpg", type: "image/jpeg" } as any);
  form.append(
    "excessive_hair_growth",
    String(symptomAnswers[HORMONAL_SYMPTOM_KEYS.excessiveHairGrowth] ?? 0),
  );
  form.append("recent_weight_gain", String(symptomAnswers[HORMONAL_SYMPTOM_KEYS.recentWeightGain] ?? 0));

  // Deliberately no Content-Type header — fetch sets the multipart
  // boundary itself; setting it manually breaks the boundary.
  const resp = await fetch(`${API_BASE_URL}/tracker/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as UploadAcnePhotoResponse;
}

export type TrackerEntry = {
  id: string;
  user_id: string;
  logged_at: string;
  front_photo_path: string;
  left_photo_path: string;
  right_photo_path: string;
  front_photo_url: string | null;
  left_photo_url: string | null;
  right_photo_url: string | null;
  forehead_score: number;
  temple_score: number;
  cheeks_score: number;
  chin_score: number;
  jaw_score: number;
  neck_score: number;
  overall_score: number;
  hormonal_likelihood_pct: number;
  hormonal_reasons: string[];
};

export async function fetchTrackerHistory(): Promise<TrackerEntry[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("You're not signed in.");

  const resp = await fetch(`${API_BASE_URL}/tracker`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as TrackerEntry[];
}
