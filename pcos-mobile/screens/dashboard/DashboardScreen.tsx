import { useEffect, useState } from "react";
import { Path, SvgXml, Text as SvgText, TextPath, Svg } from "react-native-svg";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  bookmarkOutlineXml,
  clockXml,
  doodleSquiggleXml,
  doodleV10Xml,
  mealieXml,
  sealCheckXml,
  sproutXml,
  weatherXml,
} from "../../assets/dashboard/icons";
import DateWheel from "../../components/DateWheel";
import InfoButton from "../../components/InfoButton";
import {
  getMealsLoggedToday,
  hasTrackedThisWeek,
  logMeal,
  MEALS_PER_DAY_COUNT,
} from "../../lib/daily_tracking";

const profilePhoto = require("../../assets/shared/profile-photo.png");

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatClock(date: Date) {
  let h = date.getHours() % 12;
  if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
  };
}

// The dashboard is reproduced with the exact x/y/width/height from the Figma
// frame (390x844), scaled to the device width, rather than approximated with
// flexbox — hand-tuned proportions kept drifting from the design.
const FRAME_WIDTH = 390;

// One squiggle mark repeated 8x in an even ring around the profile photo,
// rather than 5 differently-sized marks that read as inconsistent.
const PHOTO_CENTER = { x: 70, y: 76 };
const DOODLE_RADIUS = 36;
const DOODLE_SIZE = 14;
const DOODLE_RING = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * 360) / 8;
  const rad = (angle * Math.PI) / 180;
  return {
    left: PHOTO_CENTER.x + DOODLE_RADIUS * Math.cos(rad) - DOODLE_SIZE / 2,
    top: PHOTO_CENTER.y + DOODLE_RADIUS * Math.sin(rad) - DOODLE_SIZE / 2,
    // rotated so each mark's own length axis points outward from the photo,
    // like sun rays, instead of all sharing the same fixed orientation
    rotate: angle - 90,
  };
});

type Props = {
  userName?: string;
  daysTracking?: number;
  onPressSymptomCheckIn?: () => void;
  onPressMealTracker?: () => void;
  onPressCycleTracking?: () => void;
  onPressAnalytics?: () => void;
  onSelectDate?: (date: Date) => void;
  onPressProfile?: () => void;
  onPressNotes?: () => void;
};

export default function DashboardScreen({
  userName = "Jane",
  daysTracking = 0,
  onPressSymptomCheckIn,
  onPressMealTracker,
  onPressCycleTracking,
  onPressAnalytics,
  onSelectDate,
  onPressProfile,
  onPressNotes,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  // Every element is pushed down by the safe-area inset so it clears the
  // status bar/notch, EXCEPT the notes ribbon, which is deliberately placed
  // using `s()` alone so it bleeds up behind the status bar like the design.
  // LIFT pulls everything back up a bit — the full inset left too much air
  // at the top since the ribbon already occupies that space visually.
  const LIFT = s(36);
  const t = (n: number) => insets.top + s(n) - LIFT;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Only H:MM is shown, so a 30s cadence keeps the minute accurate to
    // within 30s without re-rendering the screen every second.
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const { hour, minute } = formatClock(now);

  // Both start "true" (no dot) until loaded, so there's no flash of a dot
  // that's about to disappear a moment later.
  const [acneTrackedThisWeek, setAcneTrackedThisWeek] = useState(true);
  const [hairSkinTrackedThisWeek, setHairSkinTrackedThisWeek] = useState(true);
  const [mealsLoggedToday, setMealsLoggedToday] = useState(MEALS_PER_DAY_COUNT);
  useEffect(() => {
    hasTrackedThisWeek("acne").then(setAcneTrackedThisWeek);
    hasTrackedThisWeek("hairSkin").then(setHairSkinTrackedThisWeek);
    getMealsLoggedToday().then(setMealsLoggedToday);
  }, []);
  const symptomDotsRemaining = (acneTrackedThisWeek ? 0 : 1) + (hairSkinTrackedThisWeek ? 0 : 1);

  function handlePressMealTracker() {
    logMeal().then(setMealsLoggedToday);
    onPressMealTracker?.();
  }

  return (
    <ScrollView
      style={styles.screenWrapper}
      contentContainerStyle={{
        width: screenWidth,
        height: insets.top + s(790) - LIFT + insets.bottom,
        paddingBottom: insets.bottom,
      }}
    >
      {/* profile photo + hand-drawn halo */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressProfile}
        style={{ position: "absolute", left: s(35), top: t(31), width: s(70), height: s(90) }}
      >
        <Image source={profilePhoto} style={{ width: s(70), height: s(90), borderRadius: s(12) }} />
      </TouchableOpacity>
      {DOODLE_RING.map((mark, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s(mark.left),
            top: t(mark.top),
            transform: [{ rotate: `${mark.rotate}deg` }],
          }}
        >
          <SvgXml xml={doodleV10Xml} width={s(DOODLE_SIZE)} height={s(DOODLE_SIZE)} />
        </View>
      ))}

      {/* greeting + time */}
      <Text
        style={{
          position: "absolute",
          left: s(33),
          top: t(134),
          width: s(254),
          fontSize: s(48),
          lineHeight: s(58),
          fontWeight: "800",
          color: "#000",
        }}
      >
        {greetingForHour(now.getHours())} {userName}!
      </Text>
      <View style={{ position: "absolute", left: s(262), top: t(150), width: s(90), alignItems: "center" }}>
        <Text numberOfLines={1} style={{ fontSize: s(44), fontWeight: "800", color: "#000", lineHeight: s(48) }}>
          {hour}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: s(44), fontWeight: "800", color: "#000", lineHeight: s(48) }}>
          :{minute}
        </Text>
      </View>
      <View style={{ position: "absolute", left: s(278), top: t(245) }}>
        <SvgXml xml={weatherXml} width={s(65)} height={s(45)} color="#000" />
      </View>

      {/* notes ribbon */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressNotes}
        style={{ position: "absolute", left: s(260), top: s(1), width: s(95), alignItems: "center" }}
      >
        <View style={{ position: "absolute" }}>
          <SvgXml xml={doodleSquiggleXml} width={s(96.85)} height={s(171.6)} />
        </View>
        <View style={{ position: "absolute" }}>
          <SvgXml xml={bookmarkOutlineXml} width={s(96.85)} height={s(171.6)} />
        </View>
        <Text
          style={{
            marginTop: s(29),
            fontSize: s(23),
            fontWeight: "800",
            color: "#89b8c2",
            textAlign: "center",
            lineHeight: s(26),
          }}
        >
          NOTES{"\n"}NOTES{"\n"}NOTES
        </Text>
      </TouchableOpacity>

      {/* days of the week */}
      <View style={{ position: "absolute", left: s(36), top: t(319), width: s(318), height: s(92) }}>
        <DateWheel onSelectDate={onSelectDate} />
      </View>

      {/* whats up today — curved along an arc, matching the text-path in the
          Figma source rather than a straight line */}
      <Svg
        width={screenWidth}
        height={s(80)}
        style={{ position: "absolute", left: 0, top: t(430) }}
      >
        <Path
          id="whatsUpArc"
          d={`M ${s(20)} ${s(60)} Q ${screenWidth / 2} ${s(-10)} ${screenWidth - s(20)} ${s(60)}`}
          fill="none"
        />
        <SvgText fill="#000" fontSize={s(32)} fontStyle="italic" textAnchor="middle">
          <TextPath href="#whatsUpArc" startOffset="50%">
            Whats up today?
          </TextPath>
        </SvgText>
      </Svg>

      {/* sprout (renders before the cards so the card colors mask the overlap, reading as growing up from behind them) */}
      <SvgXml
        xml={sproutXml}
        width={s(184)}
        height={s(248)}
        pointerEvents="none"
        style={{ position: "absolute", left: s(200), top: t(603) }}
      />

      {/* cards */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressSymptomCheckIn}
        style={{ position: "absolute", left: s(28), top: t(509), width: s(100), height: s(138), borderRadius: s(10), backgroundColor: "#ffcc7d" }}
      />
      <Text style={{ position: "absolute", left: s(23), top: t(536), width: s(109), fontSize: s(14), fontWeight: "800", color: "#fff7e7", textAlign: "center" }}>
        Symptom{"\n"}Check-In
      </Text>
      <View style={{ position: "absolute", left: s(52), top: t(573) }} pointerEvents="none">
        <SvgXml xml={sealCheckXml} width={s(48)} height={s(48)} color="#fff7e7" />
      </View>
      {/* one dot per sub-tracker (acne, hair/skin) not yet submitted this week */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: s(28 + 100 - 32), top: t(509 + 10), flexDirection: "row", gap: s(4) }}
      >
        {Array.from({ length: symptomDotsRemaining }).map((_, i) => (
          <View key={i} style={{ width: s(10), height: s(10), borderRadius: s(5), backgroundColor: "#fff7e7" }} />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePressMealTracker}
        style={{ position: "absolute", left: s(145), top: t(509), width: s(100), height: s(138), borderRadius: s(10), backgroundColor: "#a8bf89" }}
      />
      <Text style={{ position: "absolute", left: s(140), top: t(536), width: s(109), fontSize: s(14), fontWeight: "800", color: "#fff7e7", textAlign: "center" }}>
        Meal{"\n"}Tracker
      </Text>
      <View style={{ position: "absolute", left: s(171), top: t(573) }} pointerEvents="none">
        <SvgXml xml={mealieXml} width={s(48)} height={s(48)} color="#fff7e7" />
      </View>
      {/* one dot per meal not yet logged today — taps one meal off with each press */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: s(145 + 100 - 42), top: t(509 + 10), flexDirection: "row", gap: s(4) }}
      >
        {Array.from({ length: Math.max(0, MEALS_PER_DAY_COUNT - mealsLoggedToday) }).map((_, i) => (
          <View key={i} style={{ width: s(8), height: s(8), borderRadius: s(4), backgroundColor: "#fff7e7" }} />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressCycleTracking}
        style={{ position: "absolute", left: s(262), top: t(509), width: s(100), height: s(138), borderRadius: s(10), backgroundColor: "#e47083" }}
      />
      <Text style={{ position: "absolute", left: s(257), top: t(536), width: s(109), fontSize: s(14), fontWeight: "800", color: "#fff7e7", textAlign: "center" }}>
        Cycle{"\n"}Tracking
      </Text>
      <View style={{ position: "absolute", left: s(288), top: t(573) }} pointerEvents="none">
        <SvgXml xml={clockXml} width={s(48)} height={s(48)} color="#fff7e7" />
      </View>

      {/* analytics button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressAnalytics}
        style={{ position: "absolute", left: s(29), top: t(672), width: s(191), height: s(61), borderRadius: s(10), backgroundColor: "#89b8c2" }}
      />
      <Text style={{ position: "absolute", left: s(64), top: t(695), fontSize: s(14), fontWeight: "800", color: "#fff7e7" }} pointerEvents="none">
        Analytics/Trends
      </Text>

      {/* caption */}
      <Text style={{ position: "absolute", left: s(29), top: t(750), width: s(221), fontSize: s(14), fontWeight: "800", color: "#000" }}>
        documenting your journey for{" "}
        <Text style={{ color: "#e47083" }}>{daysTracking || "XX"}</Text> days!
      </Text>

      <InfoButton
        title="Why Track?"
        message="Consistent tracking helps you and your care team spot patterns in your cycle, skin, and symptoms over time — small day-to-day changes can reveal a lot about how PCOS is affecting your body."
        style={{ position: "absolute", left: s(340), top: t(750) }}
        backgroundColor="rgba(0,0,0,0.08)"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
});
