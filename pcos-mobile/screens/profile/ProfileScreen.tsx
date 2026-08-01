import { useRef, useState } from "react";
import { SvgXml } from "react-native-svg";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dropdownArrowXml, helpIconXml, pencilIconXml } from "../../assets/profile/icons";
import { homeIconXml } from "../../assets/shared/icons";
import InfoButton from "../../components/InfoButton";

const profilePhoto = require("../../assets/shared/profile-photo.png");

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

const DIAGNOSIS_OPTIONS = ["Formal diagnosis", "None"];

type Props = {
  daysTracking?: number;
  periodsThisYear?: number;
  weightLbs?: number;
  age?: number;
  diagnosis?: string;
  onPressHome?: () => void;
  onPressEditPhoto?: () => void;
  onSelectDiagnosis?: (diagnosis: string) => void;
  onPressChatWithUs?: () => void;
  onPressPrivacy?: () => void;
  onPressSignOut?: () => void;
  onPressSeedDemoData?: () => void;
};

export default function ProfileScreen({
  daysTracking,
  periodsThisYear,
  weightLbs,
  age,
  diagnosis,
  onPressHome,
  onPressEditPhoto,
  onSelectDiagnosis,
  onPressChatWithUs,
  onPressPrivacy,
  onPressSignOut,
  onPressSeedDemoData,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  // Pulls content back up — the full safe-area inset alone left too much
  // empty air above the home button/title, same fix as DashboardScreen.
  const LIFT = s(45);
  const t = (n: number) => insets.top + s(n) - LIFT;

  const [selectedDiagnosis, setSelectedDiagnosis] = useState(diagnosis ?? null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  function toggleMenu() {
    if (isMenuOpen) {
      Animated.timing(menuAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() =>
        setIsMenuOpen(false),
      );
    } else {
      setIsMenuOpen(true);
      Animated.timing(menuAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  }

  function closeMenu() {
    Animated.timing(menuAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() =>
      setIsMenuOpen(false),
    );
  }

  function selectDiagnosis(option: string) {
    setSelectedDiagnosis(option);
    onSelectDiagnosis?.(option);
    closeMenu();
  }

  return (
    <ScrollView
      style={styles.screenWrapper}
      contentContainerStyle={{ width: screenWidth, height: insets.top + s(780) - LIFT + insets.bottom, paddingBottom: insets.bottom }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressHome}
        style={{ position: "absolute", left: s(16), top: t(37), width: s(80), height: s(80), borderRadius: s(40), backgroundColor: "#e47083", alignItems: "center", justifyContent: "center" }}
      >
        <SvgXml xml={homeIconXml} width={s(28)} height={s(29)} color="#fff" />
      </TouchableOpacity>

      <Text style={{ position: "absolute", left: s(112), top: t(60), width: s(251), fontSize: s(30), fontWeight: "800", color: "#000" }}>
        ALL ABOUT YOU!
      </Text>

      <InfoButton
        title="Why These Numbers Matter"
        message="Your days tracked, period count, weight, and age all help paint a fuller picture of your PCOS journey, and give your care team helpful context at a glance."
        style={{ position: "absolute", left: s(334), top: t(45) }}
      />

      {/* stats card */}
      <View style={{ position: "absolute", left: s(32), top: t(260), width: s(326), height: s(304), borderRadius: s(15), backgroundColor: "#89b8c2" }} />

      <View style={{ position: "absolute", left: s(46), top: t(279), width: s(22), height: s(22), borderRadius: s(11), backgroundColor: "#fff7e7", alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={helpIconXml} width={s(16)} height={s(16)} color="#000" />
      </View>

      <Text style={{ position: "absolute", left: s(64), top: t(390), width: s(260), fontSize: s(18), fontWeight: "800", color: "#000", lineHeight: s(24) }}>
        days tracking: {daysTracking ?? "XXX"}{"\n"}
        periods this year: <Text style={{ color: "#e47083" }}>{periodsThisYear ?? 0}</Text> (so far)
      </Text>

      <Text style={{ position: "absolute", left: s(64), top: t(453), fontSize: s(18), fontWeight: "800", color: "#000" }}>
        current diagnosis:
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleMenu}
        style={{ position: "absolute", left: s(228), top: t(453), width: s(115), height: s(24), borderRadius: s(15), backgroundColor: "#ffcc7d", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s(6), zIndex: 21 }}
      >
        <Text style={{ fontSize: s(14), fontWeight: "800", color: "#000" }}>{selectedDiagnosis ?? "select"}</Text>
        <Animated.View style={{ transform: [{ rotate: menuAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
          <SvgXml xml={dropdownArrowXml} width={s(11.25)} height={s(5.625)} color="#000" />
        </Animated.View>
      </TouchableOpacity>

      {isMenuOpen && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeMenu}
          />
          <Animated.View
            style={{
              position: "absolute",
              left: s(228),
              top: t(453) + s(30),
              width: s(150),
              borderRadius: s(12),
              backgroundColor: "#fff7e7",
              overflow: "hidden",
              opacity: menuAnim,
              transform: [
                { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                { scaleY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 6,
              zIndex: 22,
            }}
          >
            {DIAGNOSIS_OPTIONS.map((option, i) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.7}
                onPress={() => selectDiagnosis(option)}
                style={{
                  paddingVertical: s(10),
                  paddingHorizontal: s(14),
                  borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: "rgba(0,0,0,0.15)",
                }}
              >
                <Text style={{ fontSize: s(15), fontWeight: "700", color: "#000" }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </>
      )}

      <Text style={{ position: "absolute", left: s(64), top: t(490), fontSize: s(18), fontWeight: "800", color: "#000", lineHeight: s(24) }}>
        weight: {weightLbs ?? "XX"} lbs{"\n"}
        age: {age ?? "XX"} y.o.
      </Text>

      {/* profile photo, ring, edit badge — floats above the card per the design */}
      <View style={{ position: "absolute", left: s(70), top: t(116), width: s(249), height: s(249), borderRadius: s(124.5), backgroundColor: "#e47083" }} />
      <Image
        source={profilePhoto}
        style={{ position: "absolute", left: s(74), top: t(120), width: s(241), height: s(241), borderRadius: s(120.5) }}
      />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressEditPhoto}
        style={{
          position: "absolute",
          left: s(250),
          top: t(307),
          width: s(70),
          height: s(70),
          borderRadius: s(35),
          backgroundColor: "#ffcc7d",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <SvgXml xml={pencilIconXml} width={s(30)} height={s(30)} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressChatWithUs}
        style={{ position: "absolute", left: s(99), top: t(593), width: s(184), height: s(38), borderRadius: s(19), backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#000" }}>chat with us</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressPrivacy}
        style={{ position: "absolute", left: s(99), top: t(640), width: s(184), height: s(38), borderRadius: s(19), backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#000" }}>privacy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressSignOut}
        style={{ position: "absolute", left: s(99), top: t(687), width: s(184), height: s(38), borderRadius: s(19), borderWidth: s(3), borderColor: "#ae0000", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#ae0000" }}>sign out</Text>
      </TouchableOpacity>

      {__DEV__ && onPressSeedDemoData && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressSeedDemoData}
          style={{ position: "absolute", left: s(99), top: t(734), width: s(184), height: s(30), borderRadius: s(15), borderWidth: s(2), borderColor: "#89b8c2", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: s(13), fontWeight: "800", color: "#89b8c2" }}>seed demo data (dev)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
});
