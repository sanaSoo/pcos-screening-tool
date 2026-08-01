import { useState } from "react";
import { SvgXml } from "react-native-svg";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { dropdownArrowXml } from "../assets/profile/icons";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInclusive(a: Date, b: Date) {
  const start = startOfDay(a);
  const end = startOfDay(b);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

type ViewMonth = { year: number; month: number };

function shiftMonth(view: ViewMonth, delta: number): ViewMonth {
  const d = new Date(view.year, view.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

type Props = {
  initialDate?: Date;
  maxDate?: Date;
  minDate?: Date;
  onSelect: (date: Date) => void;
  // When set (e.g. the period's start date), shows a live "N days" readout
  // against whichever date is currently selected — lets the user gauge
  // period length while they're still picking the end date.
  dayCountFrom?: Date;
};

// Deliberately NOT its own <Modal> — this is meant to be embedded inside a
// screen's existing Modal (e.g. as a "step" within a form). Two simultaneous
// RN <Modal>s on iOS don't reliably present both at once, so callers should
// render this directly inside whatever Modal/overlay they already have.
export default function MiniCalendar({ initialDate, maxDate, minDate, onSelect, dayCountFrom }: Props) {
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => {
    const d = initialDate ?? new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cap = maxDate ? startOfDay(maxDate) : null;
  const floor = minDate ? startOfDay(minDate) : null;
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const leadingBlanks = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.year, viewMonth.month, i + 1)),
  ];
  const nextMonthDisabled = cap ? new Date(viewMonth.year, viewMonth.month + 1, 1) > cap : false;
  const dayCount = dayCountFrom && initialDate ? daysInclusive(dayCountFrom, initialDate) : null;

  // dayCountFrom doubles as the range anchor (e.g. the period's start date) —
  // when it's set and doesn't come after the current selection, every day
  // from there through initialDate gets a soft "in range" highlight, with
  // initialDate itself getting the full solid highlight.
  const rangeFloor = dayCountFrom ? startOfDay(dayCountFrom) : null;
  const rangeCeil = initialDate ? startOfDay(initialDate) : null;
  const rangeActive = !!(rangeFloor && rangeCeil && rangeFloor.getTime() <= rangeCeil.getTime());

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => setViewMonth((v) => shiftMonth(v, -1))} activeOpacity={0.7}>
          <SvgXml
            xml={dropdownArrowXml}
            width={12}
            height={12}
            color="#000"
            style={{ transform: [{ rotate: "90deg" }] }}
          />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
        </Text>
        <TouchableOpacity
          onPress={() => setViewMonth((v) => shiftMonth(v, 1))}
          activeOpacity={0.7}
          disabled={nextMonthDisabled}
        >
          <SvgXml
            xml={dropdownArrowXml}
            width={12}
            height={12}
            color={nextMonthDisabled ? "rgba(0,0,0,0.2)" : "#000"}
            style={{ transform: [{ rotate: "-90deg" }] }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {DAY_LETTERS.map((letter, i) => (
          <Text key={i} style={styles.weekLabel}>{letter}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cellOuter} />;
          const disabled = (cap ? date > cap : false) || (floor ? date < floor : false);
          const selected = initialDate ? isSameDay(date, initialDate) : false;
          const inRange = rangeActive && !selected && date >= rangeFloor! && date <= rangeCeil!;
          return (
            <View key={i} style={styles.cellOuter}>
              <TouchableOpacity
                style={[styles.cell, inRange && styles.cellInRange, selected && styles.cellSelected]}
                disabled={disabled}
                onPress={() => onSelect(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cellText,
                    disabled && styles.cellTextDisabled,
                    selected && styles.cellTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {dayCount !== null && (
        <Text style={styles.dayCountText}>
          {dayCount} day{dayCount === 1 ? "" : "s"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
  },
  monthLabel: { fontSize: 16, fontWeight: "800", color: "#89b8c2", width: 150, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#89b8c2",
    marginBottom: 6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellOuter: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    width: "78%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  cellInRange: {
    backgroundColor: "rgba(228,112,131,0.3)",
  },
  cellSelected: {
    backgroundColor: "#e47083",
    shadowColor: "rgba(244,154,163,0.49)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  cellText: { fontSize: 14, fontWeight: "700", color: "#000" },
  cellTextDisabled: { color: "rgba(0,0,0,0.2)" },
  cellTextSelected: { color: "#fff7e7" },
  dayCountText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e47083",
    textAlign: "center",
    marginTop: 12,
  },
});
