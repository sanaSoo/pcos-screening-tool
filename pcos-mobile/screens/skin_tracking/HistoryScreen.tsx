import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-gifted-charts";

import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import { formatShortDate } from "../../lib/date_format";
import { toDateKey } from "../../lib/cycles_api";
import { fetchTrackerHistory, HORMONAL_DISCLAIMER, TrackerEntry } from "../../lib/skin_tracking_api";
import { ResultScreenData } from "./ResultScreen";

const OVERALL_COLOR = "#B52F45";
const HORMONAL_COLOR = "#89b8c2";

function entryToResultData(entry: TrackerEntry): ResultScreenData {
  return {
    zones: {
      forehead: entry.forehead_score,
      temple: entry.temple_score,
      cheeks: entry.cheeks_score,
      chin: entry.chin_score,
      jaw: entry.jaw_score,
      neck: entry.neck_score,
    },
    overall: entry.overall_score,
    hormonalLikelihoodPct: entry.hormonal_likelihood_pct,
    hormonalReasons: entry.hormonal_reasons ?? [],
    disclaimer: HORMONAL_DISCLAIMER,
    loggedAt: entry.logged_at,
    photoUrls: { front: entry.front_photo_url, left: entry.left_photo_url, right: entry.right_photo_url },
  };
}

type Props = {
  onPressCapture?: () => void;
  onSelectEntry?: (data: ResultScreenData) => void;
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function HistoryScreen({ onPressCapture, onSelectEntry, onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackerHistory()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your history."))
      .finally(() => setLoading(false));
  }, []);

  // Backend returns ascending by logged_at (chronological, for the trend
  // chart below); the list itself reads better most-recent-first.
  const mostRecentFirst = [...entries].reverse();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <InfoButton
          title="Why Track Your Skin"
          message="Hormonal acne is one of the most common PCOS symptoms. Photographing it over time makes it easier to see whether treatments are working and to catch flare-ups tied to your cycle."
          style={{ position: "absolute", top: 14, right: 16 }}
        />
        <Text style={styles.title}>ACNE TRACKER</Text>
        <Text style={styles.subtitle}>your history</Text>

        <TouchableOpacity style={styles.addButton} onPress={onPressCapture} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>New Capture</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#e47083" style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.emptyText}>No captures logged yet — take your first photos to get started.</Text>
        ) : (
          <>
            {entries.length > 1 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Trend</Text>
                <LineChart
                  data={entries.map((e) => ({ value: e.overall_score, label: formatShortDate(toDateKey(new Date(e.logged_at))) }))}
                  data2={entries.map((e) => ({ value: e.hormonal_likelihood_pct }))}
                  color={OVERALL_COLOR}
                  color2={HORMONAL_COLOR}
                  thickness={2}
                  dataPointsColor={OVERALL_COLOR}
                  dataPointsColor2={HORMONAL_COLOR}
                  dataPointsRadius={3}
                  curved
                  hideRules
                  yAxisColor="rgba(0,0,0,0.2)"
                  xAxisColor="rgba(0,0,0,0.2)"
                  xAxisLabelTextStyle={{ color: "#000", fontSize: 10 }}
                  noOfSections={3}
                  initialSpacing={16}
                  spacing={44}
                  height={140}
                  maxValue={100}
                />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: OVERALL_COLOR }]} />
                    <Text style={styles.legendText}>Overall severity</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: HORMONAL_COLOR }]} />
                    <Text style={styles.legendText}>Hormonal likelihood</Text>
                  </View>
                </View>
              </View>
            )}

            {mostRecentFirst.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => onSelectEntry?.(entryToResultData(entry))}
                activeOpacity={0.8}
              >
                <View style={styles.entryPhotoRow}>
                  {entry.front_photo_url && <Image source={{ uri: entry.front_photo_url }} style={styles.entryThumb} />}
                  {entry.left_photo_url && <Image source={{ uri: entry.left_photo_url }} style={styles.entryThumb} />}
                  {entry.right_photo_url && <Image source={{ uri: entry.right_photo_url }} style={styles.entryThumb} />}
                </View>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryDate}>{new Date(entry.logged_at).toLocaleDateString()}</Text>
                  <Text style={styles.entryStat}>Overall: {entry.overall_score.toFixed(0)}</Text>
                  <Text style={styles.entryStat}>Hormonal likelihood: {entry.hormonal_likelihood_pct.toFixed(0)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 14, paddingBottom: 40, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#000" },
  subtitle: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 4 },
  addButton: {
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  addButtonText: { fontSize: 14, fontWeight: "800", color: "#fff7e7" },
  errorText: { color: "#7a1f2b", fontWeight: "700", marginTop: 24, textAlign: "center" },
  emptyText: { fontSize: 14, fontWeight: "700", color: "rgba(0,0,0,0.5)", marginTop: 24, textAlign: "center" },
  chartCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 14,
    marginTop: 24,
  },
  chartTitle: { fontSize: 14, fontWeight: "800", color: "#000", marginBottom: 8 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 10, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: "700", color: "#333" },
  entryCard: {
    width: "100%",
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  entryPhotoRow: { flexDirection: "row", gap: 4 },
  entryThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: "#fff" },
  entryInfo: { flex: 1, gap: 2 },
  entryDate: { fontSize: 14, fontWeight: "800", color: "#fff7e7" },
  entryStat: { fontSize: 12, fontWeight: "700", color: "rgba(255,247,231,0.9)" },
});
