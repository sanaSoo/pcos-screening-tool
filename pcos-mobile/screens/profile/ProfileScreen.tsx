import { SvgXml } from "react-native-svg";
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

import { dropdownArrowXml, helpIconXml, pencilIconXml } from "../../assets/profile/icons";
import { homeIconXml } from "../../assets/shared/icons";

const profilePhoto = require("../../assets/shared/profile-photo.png");

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

type Props = {
  daysTracking?: number;
  periodsThisYear?: number;
  weightLbs?: number;
  age?: number;
  diagnosis?: string;
  onPressHome?: () => void;
  onPressEditPhoto?: () => void;
  onPressSelectDiagnosis?: () => void;
  onPressChatWithUs?: () => void;
  onPressPrivacy?: () => void;
  onPressSignOut?: () => void;
};

export default function ProfileScreen({
  daysTracking,
  periodsThisYear,
  weightLbs,
  age,
  diagnosis,
  onPressHome,
  onPressEditPhoto,
  onPressSelectDiagnosis,
  onPressChatWithUs,
  onPressPrivacy,
  onPressSignOut,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  const t = (n: number) => insets.top + s(n);

  return (
    <ScrollView
      style={styles.screenWrapper}
      contentContainerStyle={{ width: screenWidth, height: insets.top + s(844) + insets.bottom, paddingBottom: insets.bottom }}
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

      {/* stats card */}
      <View style={{ position: "absolute", left: s(32), top: t(260), width: s(326), height: s(304), borderRadius: s(15), backgroundColor: "#89b8c2" }} />

      <View style={{ position: "absolute", left: s(46), top: t(279), width: s(22), height: s(22), borderRadius: s(11), backgroundColor: "#fff7e7", alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={helpIconXml} width={s(16)} height={s(16)} color="#000" />
      </View>

      <Text style={{ position: "absolute", left: s(64), top: t(390), width: s(260), fontSize: s(18), fontWeight: "800", color: "#000", lineHeight: s(24) }}>
        days tracking: {daysTracking ?? "XXX"}{"\n"}
        periods this year: {periodsThisYear ?? "XX"} (so far)
      </Text>

      <Text style={{ position: "absolute", left: s(64), top: t(453), fontSize: s(18), fontWeight: "800", color: "#000" }}>
        current diagnosis:
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressSelectDiagnosis}
        style={{ position: "absolute", left: s(228), top: t(453), width: s(99), height: s(22), borderRadius: s(15), backgroundColor: "#ffcc7d", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s(6) }}
      >
        <Text style={{ fontSize: s(15), fontWeight: "800", color: "#000" }}>{diagnosis ?? "select"}</Text>
        <SvgXml xml={dropdownArrowXml} width={s(11.25)} height={s(5.625)} color="#000" />
      </TouchableOpacity>

      <Text style={{ position: "absolute", left: s(64), top: t(490), fontSize: s(18), fontWeight: "800", color: "#000", lineHeight: s(24) }}>
        weight: {weightLbs ?? "XX"} lbs{"\n"}
        age: {age ?? "XX"} y.o.
      </Text>

      {/* profile photo, ring, edit badge — floats above the card per the design */}
      <View style={{ position: "absolute", left: s(70), top: t(116), width: s(249), height: s(249), borderRadius: s(124.5), backgroundColor: "#e47083" }} />
      <Image
        source={profilePhoto}
        style={{ position: "absolute", left: s(82), top: t(128), width: s(225), height: s(225), borderRadius: s(112.5) }}
      />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressEditPhoto}
        style={{
          position: "absolute",
          left: s(246),
          top: t(303),
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

      <Text style={{ position: "absolute", left: s(77), top: t(577), width: s(280), fontSize: s(18), fontWeight: "800", color: "#000", lineHeight: s(24) }}>
        how are you feeling today?{"\n"}
        ____________________________
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressChatWithUs}
        style={{ position: "absolute", left: s(99), top: t(683), width: s(184), height: s(38), borderRadius: s(19), backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#000" }}>chat with us</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressPrivacy}
        style={{ position: "absolute", left: s(99), top: t(730), width: s(184), height: s(38), borderRadius: s(19), backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#000" }}>privacy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressSignOut}
        style={{ position: "absolute", left: s(99), top: t(777), width: s(184), height: s(38), borderRadius: s(19), borderWidth: s(3), borderColor: "#ae0000", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: s(20), fontWeight: "800", color: "#ae0000" }}>sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
});
