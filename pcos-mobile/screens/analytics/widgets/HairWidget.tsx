import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { formatShortDate } from "../../../lib/date_format";
import { HairLog, listHairLogs } from "../../../lib/hair_tracking_api";
import WidgetCard from "./WidgetCard";

const GROWTH_COLOR = "#e47083";
const THINNING_COLOR = "#365013";

export default function HairWidget() {
  const [logs, setLogs] = useState<HairLog[] | null>(null);

  useEffect(() => {
    listHairLogs().then(setLogs);
  }, []);

  if (!logs) return null;

  const chronological = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <WidgetCard title="Hair Trends" accentColor="#a8bf89">
      {chronological.length === 0 ? (
        <Text style={styles.emptyText}>
          Log a Hair Tracker check-in to start seeing your growth and thinning trends here.
        </Text>
      ) : (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GROWTH_COLOR }]} />
              <Text style={styles.legendText}>Excess growth</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: THINNING_COLOR }]} />
              <Text style={styles.legendText}>Thinning / shedding</Text>
            </View>
          </View>
          <LineChart
            data={chronological.map((log) => ({
              value: log.hairGrowth,
              label: formatShortDate(log.date),
            }))}
            data2={chronological.map((log) => ({ value: log.hairThinning }))}
            color={GROWTH_COLOR}
            color2={THINNING_COLOR}
            thickness={2}
            dataPointsColor={GROWTH_COLOR}
            dataPointsColor2={THINNING_COLOR}
            dataPointsRadius={4}
            dataPointsRadius2={4}
            curved
            hideRules
            yAxisColor="rgba(255,255,255,0.4)"
            xAxisColor="rgba(255,255,255,0.4)"
            yAxisTextStyle={{ color: "#fff7e7" }}
            xAxisLabelTextStyle={{ color: "#fff7e7", fontSize: 10 }}
            maxValue={3}
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
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: "700", color: "#fff7e7" },
});
