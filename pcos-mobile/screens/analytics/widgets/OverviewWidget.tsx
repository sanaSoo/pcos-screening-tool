import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { hasTrackedThisWeek } from "../../../lib/daily_tracking";
import { formatShortDate } from "../../../lib/date_format";
import { Cycle, listCycles } from "../../../lib/cycles_api";
import { HairLog, listHairLogs } from "../../../lib/hair_tracking_api";
import { fetchTrackerHistory, TrackerEntry } from "../../../lib/skin_tracking_api";
import WidgetCard from "./WidgetCard";

type Summary = {
  periodsThisYear: number;
  lastPeriod: Cycle | null;
  acneCheckIns: number;
  lastAcne: TrackerEntry | null;
  hairCheckIns: number;
  lastHair: HairLog | null;
  acneTrackedThisWeek: boolean;
  hairTrackedThisWeek: boolean;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default function OverviewWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    Promise.all([
      listCycles(),
      fetchTrackerHistory().catch(() => [] as TrackerEntry[]),
      listHairLogs(),
      hasTrackedThisWeek("acne"),
      hasTrackedThisWeek("hairSkin"),
    ]).then(([cycles, skinHistory, hairLogs, acneTrackedThisWeek, hairTrackedThisWeek]) => {
      const currentYear = new Date().getFullYear();
      setSummary({
        periodsThisYear: cycles.filter((c: Cycle) => Number(c.startDate.slice(0, 4)) === currentYear).length,
        lastPeriod: cycles[0] ?? null,
        acneCheckIns: skinHistory.length,
        // Backend returns ascending by logged_at, so the most recent entry is last.
        lastAcne: skinHistory[skinHistory.length - 1] ?? null,
        hairCheckIns: hairLogs.length,
        lastHair: hairLogs[0] ?? null,
        acneTrackedThisWeek,
        hairTrackedThisWeek,
      });
    });
  }, []);

  if (!summary) return null;

  const hasAnyData = summary.periodsThisYear > 0 || summary.acneCheckIns > 0 || summary.hairCheckIns > 0;

  return (
    <WidgetCard title="Overview" accentColor="#89b8c2">
      {!hasAnyData ? (
        <Text style={styles.emptyText}>
          Log a period, acne check-in, or hair check-in to start building your overview.
        </Text>
      ) : (
        <View style={styles.grid}>
          <StatTile label="Periods this year" value={String(summary.periodsThisYear)} />
          <StatTile
            label="Last period"
            value={summary.lastPeriod ? formatShortDate(summary.lastPeriod.startDate) : "—"}
          />
          <StatTile label="Acne check-ins" value={String(summary.acneCheckIns)} />
          <StatTile
            label="Last acne severity"
            value={summary.lastAcne ? String(summary.lastAcne.overall_score) : "—"}
          />
          <StatTile label="Hair check-ins" value={String(summary.hairCheckIns)} />
          <StatTile
            label="Checked in this week"
            value={`Acne ${summary.acneTrackedThisWeek ? "✓" : "–"}  Hair ${summary.hairTrackedThisWeek ? "✓" : "–"}`}
          />
        </View>
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47%",
    backgroundColor: "rgba(255,247,231,0.18)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tileValue: { fontSize: 20, fontWeight: "800", color: "#fff7e7" },
  tileLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,247,231,0.9)", marginTop: 2 },
});
