import AsyncStorage from "@react-native-async-storage/async-storage";

import { toDateKey } from "./cycles_api";

// Mac's LAN IP running the Flask backend (app.py). Re-check with
// `ipconfig getifaddr en0` on the Mac if requests stop connecting.
export const API_BASE_URL = "http://192.168.1.78:5001";

export type ZoneScore = {
  label: string;
  confidence: number;
  severity_score: number;
};

export type SkinCaptureResponse = {
  scores: Record<string, ZoneScore> & { overall: number };
  zones: Record<string, string>;
};

export type SkinCaptureImages = {
  left: string;
  right: string;
  front: string;
};

export async function submitSkinCapture(
  images: SkinCaptureImages
): Promise<SkinCaptureResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/skin-capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as SkinCaptureResponse;
}

// Local-only, same rationale as lib/cycles_api.ts — no backend table for
// this yet. Only the zone scores are kept, never the base64 zone crop
// images (results.zones) — those are large and only useful in the moment
// the capture is reviewed, so persisting them would bloat AsyncStorage for
// no lasting benefit.
const HISTORY_STORAGE_KEY = "@pcos/skinCaptureHistory";

export type SkinCaptureHistoryEntry = {
  id: string;
  date: string; // "YYYY-MM-DD" local calendar date
  overall: number;
  scores: Record<string, ZoneScore>;
};

async function readHistory(): Promise<SkinCaptureHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SkinCaptureHistoryEntry[];
  } catch {
    return [];
  }
}

async function writeHistory(entries: SkinCaptureHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export async function listSkinCaptureHistory(): Promise<SkinCaptureHistoryEntry[]> {
  const entries = await readHistory();
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function saveSkinCaptureHistory(
  data: SkinCaptureResponse,
): Promise<SkinCaptureHistoryEntry> {
  const { overall, ...scores } = data.scores;
  const entries = await readHistory();
  const entry: SkinCaptureHistoryEntry = {
    id: Date.now().toString(36),
    date: toDateKey(new Date()),
    overall,
    scores,
  };
  await writeHistory([...entries, entry]);
  return entry;
}
