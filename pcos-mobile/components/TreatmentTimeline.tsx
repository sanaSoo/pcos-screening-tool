import { useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SymptomTag, Treatment } from "../lib/treatments_api";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShort(dateKey: string) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

// Same tag palette used for the chips further down the screen, just applied
// to the dot instead — lets the timeline hint at "what kind" without a label.
const TAG_DOT_COLORS: Record<SymptomTag, string> = {
  Acne: "#ffcc7d",
  "Hair/Skin": "#a8bf89",
  Cycle: "#e47083",
  "Whole Body": "#89b8c2",
};
const DEFAULT_DOT_COLOR = "#f49aa3";

function dotColorFor(treatment: Treatment) {
  return treatment.symptomTags[0] ? TAG_DOT_COLORS[treatment.symptomTags[0]] : DEFAULT_DOT_COLOR;
}

const DOT_SIZE = 22;
const STOP_WIDTH = 60;

type DateGroup = { date: string; items: Treatment[] };

type Props = {
  treatments: Treatment[];
  onSelectDate: (group: DateGroup) => void;
};

// A horizontal "map" of when things were tried, oldest to newest — a quicker
// way to spot what changed around a given date than scrolling the full log.
export default function TreatmentTimeline({ treatments, onSelectDate }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, Treatment[]>();
    for (const t of treatments) {
      const list = byDate.get(t.date) ?? [];
      list.push(t);
      byDate.set(t.date, list);
    }
    return [...byDate.entries()]
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [treatments]);

  useEffect(() => {
    if (groups.length === 0) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  }, [groups.length]);

  if (groups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Your Timeline</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        <View style={styles.line} />
        {groups.map((group) => (
          <TouchableOpacity
            key={group.date}
            style={styles.stop}
            activeOpacity={0.7}
            onPress={() => onSelectDate(group)}
          >
            <View style={[styles.dot, { backgroundColor: dotColorFor(group.items[0]) }]}>
              {group.items.length > 1 && <Text style={styles.dotCount}>{group.items.length}</Text>}
            </View>
            <Text style={styles.dotLabel} numberOfLines={1}>
              {formatShort(group.date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", marginTop: 20 },
  label: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.45)", letterSpacing: 0.5 },
  track: { alignItems: "flex-start", paddingTop: 18, paddingHorizontal: 8 },
  line: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 18 + DOT_SIZE / 2 - 1,
    height: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  stop: { width: STOP_WIDTH, alignItems: "center" },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fff7e7",
    alignItems: "center",
    justifyContent: "center",
  },
  dotCount: { fontSize: 10, fontWeight: "800", color: "#fff7e7" },
  dotLabel: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
