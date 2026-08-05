const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL — check pcos-mobile/.env");
}

// Base URL for the Flask backend (app.py). Local-dev-only for now, so this
// still needs to be kept in sync with whatever LAN IP is running it — see
// the comment next to EXPO_PUBLIC_API_BASE_URL in .env.
export const API_BASE_URL = apiBaseUrl;
