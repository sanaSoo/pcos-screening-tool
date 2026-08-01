import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { Cycle, listCycles } from "../../../lib/cycles_api";
import { daysBetween, formatShortDate, inclusiveDayCount } from "../../../lib/date_format";
import WidgetCard from "./WidgetCard";

const LINE_COLOR = "#e47083";

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const mean = average(values);
  return Math.sqrt(average(values.map((v) => (v - mean) ** 2)));
}

export default function PeriodWidget() {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);

  useEffect(() => {
    listCycles().then(setCycles);
  }, []);

  if (!cycles) return null;

  // Chronological (oldest first) for both the gap math and the chart's x-axis.
  const chronological = [...cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  const cycleLengths = chronological
    .slice(1)
    .map((cycle, i) => ({
      days: daysBetween(chronological[i].startDate, cycle.startDate),
      label: formatShortDate(cycle.startDate),
    }));

  const periodLengths = chronological
    .filter((c): c is Cycle & { endDate: string } => c.endDate !== null)
    .map((c) => inclusiveDayCount(c.startDate, c.endDate));

  const avgCycleLength = cycleLengths.length > 0 ? average(cycleLengths.map((c) => c.days)) : null;
  const avgPeriodLength = periodLengths.length > 0 ? average(periodLengths) : null;
  const regularity =
    cycleLengths.length >= 2 ? (standardDeviation(cycleLengths.map((c) => c.days)) <= 4 ? "Regular" : "Irregular") : null;

  return (
    <WidgetCard title="Period Trends" accentColor="#f49aa3">
      {cycleLengths.length === 0 ? (
        <Text style={styles.emptyText}>
          Log at least two periods in Cycle Tracking to see your cycle-length trend here.
        </Text>
      ) : (
        <>
          <View style={styles.statsRow}>
            {avgCycleLength !== null && (
              <Text style={styles.statText}>Avg cycle: {avgCycleLength.toFixed(0)}d</Text>
            )}
            {avgPeriodLength !== null && (
              <Text style={styles.statText}>Avg period: {avgPeriodLength.toFixed(0)}d</Text>
            )}
            {regularity && <Text style={styles.statText}>{regularity}</Text>}
          </View>
          <LineChart
            data={cycleLengths.map((c) => ({ value: c.days, label: c.label }))}
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
        </>
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  statsRow: { flexDirection: "row", gap: 14, marginBottom: 12 },
  statText: { fontSize: 13, fontWeight: "800", color: "#fff7e7" },
});
