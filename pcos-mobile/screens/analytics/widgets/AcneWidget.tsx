import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { toDateKey } from "../../../lib/cycles_api";
import { formatShortDate } from "../../../lib/date_format";
import { fetchTrackerHistory, TrackerEntry } from "../../../lib/skin_tracking_api";
import WidgetCard from "./WidgetCard";

const LINE_COLOR = "#B52F45";

const ZONE_FIELDS: { key: keyof TrackerEntry; label: string }[] = [
  { key: "forehead_score", label: "forehead" },
  { key: "temple_score", label: "temple" },
  { key: "cheeks_score", label: "cheeks" },
  { key: "chin_score", label: "chin" },
  { key: "jaw_score", label: "jaw" },
  { key: "neck_score", label: "neck" },
];

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function rankZones(entries: TrackerEntry[]): { zone: string; avgSeverity: number }[] {
  return ZONE_FIELDS.map(({ key, label }) => ({
    zone: label,
    avgSeverity: average(entries.map((e) => e[key] as number)),
  }))
    .sort((a, b) => b.avgSeverity - a.avgSeverity)
    .slice(0, 3);
}

export default function AcneWidget() {
  const [history, setHistory] = useState<TrackerEntry[] | null>(null);

  useEffect(() => {
    fetchTrackerHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  if (!history) return null;

  // Backend already returns entries ascending by logged_at.
  const topZones = rankZones(history);

  return (
    <WidgetCard title="Acne Trends" accentColor="#f49aa3">
      {history.length === 0 ? (
        <Text style={styles.emptyText}>
          Complete an Acne Tracker capture to start seeing your severity trend here.
        </Text>
      ) : (
        <>
          <LineChart
            data={history.map((entry) => ({
              value: entry.overall_score,
              label: formatShortDate(toDateKey(new Date(entry.logged_at))),
            }))}
            color={LINE_COLOR}
            thickness={2}
            dataPointsColor={LINE_COLOR}
            dataPointsRadius={4}
            curved
            areaChart
            startFillColor={LINE_COLOR}
            endFillColor={LINE_COLOR}
            startOpacity={0.15}
            endOpacity={0.02}
            hideRules
            yAxisColor="rgba(255,255,255,0.4)"
            xAxisColor="rgba(255,255,255,0.4)"
            yAxisTextStyle={{ color: "#fff7e7" }}
            xAxisLabelTextStyle={{ color: "#fff7e7", fontSize: 10 }}
            noOfSections={3}
            initialSpacing={16}
            spacing={44}
            height={140}
          />
          {topZones.length > 0 && (
            <View style={styles.zoneList}>
              <Text style={styles.zoneListTitle}>Most affected zones</Text>
              {topZones.map((z, i) => (
                <Text key={z.zone} style={styles.zoneRow}>
                  {i + 1}. {z.zone.replace(/_/g, " ")} — {z.avgSeverity.toFixed(1)} avg severity
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  zoneList: { marginTop: 14, gap: 4 },
  zoneListTitle: { fontSize: 13, fontWeight: "800", color: "#fff7e7", marginBottom: 2 },
  zoneRow: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.9)", textTransform: "capitalize" },
});
