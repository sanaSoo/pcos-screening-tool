import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const RANGE_DAYS = 90; // ~3 months each direction
const VISIBLE_ITEMS = 5; // odd, so there's a true center slot
const PILL_FILL_RATIO = 0.82;

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
// Matches the day-letter scheme the old static week row used (M, Tu, W, Th,
// F, Su) plus "Sa" for Saturday, which that row never needed to show.
const DAY_LETTERS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

type DayItem = {
  type: "day";
  key: string;
  date: Date;
  dayLetter: string;
  dayNum: string;
  isToday: boolean;
  isWeekend: boolean;
};

type DividerItem = {
  type: "divider";
  key: string;
  monthLabel: string;
  yearLabel: string;
};

type DateItem = DayItem | DividerItem;

function buildDateItems(today: Date): { items: DateItem[]; todayIndex: number } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - RANGE_DAYS);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + RANGE_DAYS);

  const items: DateItem[] = [];
  let todayIndex = 0;
  let cursor = new Date(start);
  let prevMonth = cursor.getMonth();
  let prevYear = cursor.getFullYear();
  let first = true;

  while (cursor.getTime() <= end.getTime()) {
    if (!first && (cursor.getMonth() !== prevMonth || cursor.getFullYear() !== prevYear)) {
      items.push({
        type: "divider",
        key: `divider-${cursor.getFullYear()}-${cursor.getMonth()}`,
        monthLabel: MONTH_ABBR[cursor.getMonth()],
        yearLabel: String(cursor.getFullYear()).slice(-2),
      });
    }

    const isToday =
      cursor.getFullYear() === today.getFullYear() &&
      cursor.getMonth() === today.getMonth() &&
      cursor.getDate() === today.getDate();
    if (isToday) todayIndex = items.length;

    const dayOfWeek = cursor.getDay();
    items.push({
      type: "day",
      key: cursor.toISOString().slice(0, 10),
      date: new Date(cursor),
      dayLetter: DAY_LETTERS[dayOfWeek],
      dayNum: String(cursor.getDate()),
      isToday,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });

    prevMonth = cursor.getMonth();
    prevYear = cursor.getFullYear();
    first = false;
    // Rebuilding via y/m/d+1 (rather than mutating with setDate) lets Date
    // normalize month/year rollovers and DST safely.
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  return { items, todayIndex };
}

type WheelItemProps = {
  item: DateItem;
  index: number;
  scrollX: Animated.Value;
  itemPitch: number;
  pillWidth: number;
  pillHeight: number;
};

const WheelItem = memo(function WheelItem({
  item,
  index,
  scrollX,
  itemPitch,
  pillWidth,
  pillHeight,
}: WheelItemProps) {
  const isFaded = item.type === "day" && item.isWeekend && !item.isToday;
  const isActive = item.type === "day" && item.isToday;

  const inputRange = [
    (index - 2) * itemPitch,
    (index - 1) * itemPitch,
    index * itemPitch,
    (index + 1) * itemPitch,
    (index + 2) * itemPitch,
  ];
  // Gentler than a true coverflow falloff — the goal is a wheel that still
  // *reads* as rotating, while keeping at least 4 neighboring days legible
  // and front-facing at once, rather than dropping off sharply after the
  // dead center item.
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.88, 0.95, 1, 0.95, 0.88],
    extrapolate: "clamp",
  });
  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ["20deg", "10deg", "0deg", "-10deg", "-20deg"],
    extrapolate: "clamp",
  });
  // Regular days: the front three (±1 from center) read clearly less faded
  // than the two on the sides. Today's pill is the exception — it stays
  // strongly highlighted through the front three and only actually fades
  // once it's pushed out to the sides, so "today" reads as findable at a
  // glance even when it's not the exact centered item.
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: isActive ? [0.85, 1, 1, 1, 0.85] : [0.4, 0.95, 1, 0.95, 0.4],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{
        width: itemPitch,
        height: pillHeight,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ perspective: 800 }, { scale }, { rotateY }],
        opacity,
      }}
    >
      {item.type === "divider" ? (
        <View style={{ width: pillWidth, alignItems: "center", justifyContent: "center", gap: pillHeight * 0.04 }}>
          <Text style={{ fontSize: pillHeight * 0.22, fontWeight: "800", color: "#89b8c2" }}>
            {item.monthLabel}
          </Text>
          <Text style={{ fontSize: pillHeight * 0.15, fontWeight: "700", color: "rgba(0,0,0,0.35)" }}>
            '{item.yearLabel}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.pill,
            {
              width: pillWidth,
              height: pillHeight,
              borderRadius: pillWidth * 0.42,
              gap: pillHeight * 0.04,
              backgroundColor: isActive ? "#e47083" : isFaded ? "rgba(244,154,163,0.54)" : "#f49aa3",
            },
            isActive && styles.pillActiveShadow,
          ]}
        >
          <Text
            style={{
              fontSize: pillHeight * (isFaded ? 0.185 : 0.22),
              fontWeight: "800",
              color: isFaded ? "rgba(255,247,231,0.54)" : "#fff7e7",
            }}
          >
            {item.dayLetter}
          </Text>
          <Text
            style={{
              fontSize: pillHeight * (isFaded ? 0.185 : 0.22),
              fontWeight: "800",
              color: isFaded ? "rgba(255,247,231,0.54)" : "#fff7e7",
            }}
          >
            {item.dayNum}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

type Props = {
  onSelectDate?: (date: Date) => void;
};

export default function DateWheel({ onSelectDate }: Props) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [showJumpToToday, setShowJumpToToday] = useState(false);
  const flatListRef = useRef<FlatList<DateItem>>(null);
  const lastFiredKeyRef = useRef<string | null>(null);
  const hasFiredInitialRef = useRef(false);
  const scrollXRef = useRef<Animated.Value | null>(null);

  const { items, todayIndex } = useMemo(() => buildDateItems(new Date()), []);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  const itemPitch = viewport.width > 0 ? viewport.width / VISIBLE_ITEMS : 0;
  const pillWidth = itemPitch * PILL_FILL_RATIO;
  const pillHeight = viewport.height * 0.95;

  if (itemPitch > 0 && scrollXRef.current === null) {
    // Seeded to the same offset `initialScrollIndex` lands on — without
    // this, the very first frame would compute transforms as if scrollX
    // were 0, showing item 0 as "focused" instead of today.
    scrollXRef.current = new Animated.Value(todayIndex * itemPitch);
  }
  const scrollX = scrollXRef.current;
  const isReady = itemPitch > 0;

  useEffect(() => {
    if (!isReady || hasFiredInitialRef.current) return;
    hasFiredInitialRef.current = true;
    const today = items[todayIndex];
    lastFiredKeyRef.current = today.key;
    if (today.type === "day") onSelectDate?.(today.date);
    // Intentionally fires once, only when the wheel becomes measurable —
    // not re-run if `onSelectDate`/`items`/`todayIndex` identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemPitch, offset: itemPitch * index, index }),
    [itemPitch],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: DateItem; index: number }) =>
      scrollX ? (
        <WheelItem
          item={item}
          index={index}
          scrollX={scrollX}
          itemPitch={itemPitch}
          pillWidth={pillWidth}
          pillHeight={pillHeight}
        />
      ) : null,
    [scrollX, itemPitch, pillWidth, pillHeight],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!itemPitch) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const rawIndex = Math.round(offsetX / itemPitch);
      const index = Math.max(0, Math.min(items.length - 1, rawIndex));
      const settled = items[index];

      if (settled.type === "divider") {
        // Never rest the wheel on a month label — a divider is always
        // bordered by day items on both sides, so index+1 is safe.
        const nextIndex = Math.min(items.length - 1, index + 1);
        flatListRef.current?.scrollToOffset({ offset: nextIndex * itemPitch, animated: true });
        return;
      }
      setShowJumpToToday(index !== todayIndex);
      if (settled.key !== lastFiredKeyRef.current) {
        lastFiredKeyRef.current = settled.key;
        onSelectDate?.(settled.date);
      }
    },
    [items, itemPitch, todayIndex, onSelectDate],
  );

  const jumpToToday = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: todayIndex * itemPitch, animated: true });
    setShowJumpToToday(false);
  }, [todayIndex, itemPitch]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {itemPitch > 0 && scrollX && (
        <Animated.FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={todayIndex}
          snapToInterval={itemPitch}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={{ paddingHorizontal: (viewport.width - itemPitch) / 2 }}
        />
      )}
      {showJumpToToday && (
        <View style={styles.jumpToTodayRow} pointerEvents="box-none">
          <TouchableOpacity style={styles.jumpToTodayButton} onPress={jumpToToday} activeOpacity={0.8}>
            <Text style={styles.jumpToTodayText}>Today</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    // soft pink drop shadow on every pill, not just today's
    shadowColor: "#e47083",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  pillActiveShadow: {
    shadowColor: "rgba(244,154,163,0.49)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  jumpToTodayRow: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  jumpToTodayButton: {
    backgroundColor: "#89b8c2",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  jumpToTodayText: { color: "#fff7e7", fontWeight: "800", fontSize: 12 },
});
