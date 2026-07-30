import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { faceIdXml, hairSkinXml, trendUpXml } from "../../assets/symptom_checkin/icons";
import NavigationBar from "../../components/NavigationBar";

type Props = {
  onPressAcneTracker?: () => void;
  onPressHairTracker?: () => void;
  onPressAnalytics?: () => void;
  onPressHome?: () => void;
};

export default function SymptomCheckInScreen({
  onPressAcneTracker,
  onPressHairTracker,
  onPressAnalytics,
  onPressHome,
}: Props) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>CHECK - iN</Text>
        <Text style={styles.subtitle}>what&apos;s new with you?</Text>

        <View style={styles.trackerRow}>
          <View style={styles.trackerColumn}>
            <Text style={[styles.trackerLabel, styles.acneLabel]}>ACNE TRACKER</Text>
            <TouchableOpacity
              style={[styles.trackerCircle, styles.acneCircle]}
              onPress={onPressAcneTracker}
              activeOpacity={0.8}
            >
              <SvgXml xml={faceIdXml} width={84} height={84} />
            </TouchableOpacity>
          </View>

          <View style={styles.trackerInfo}>
            <Text style={styles.nextCheckIn}>Next Check-In</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>00:00:00</Text>
            </View>
            <Text style={styles.skip}>skip</Text>
          </View>
        </View>

        <View style={[styles.trackerRow, styles.trackerRowReverse]}>
          <View style={styles.trackerColumn}>
            <Text style={[styles.trackerLabel, styles.hairLabel]}>HAIR TRACKER</Text>
            <TouchableOpacity
              style={[styles.trackerCircle, styles.hairCircle]}
              onPress={onPressHairTracker}
              activeOpacity={0.8}
            >
              <SvgXml xml={hairSkinXml} width={90} height={90} />
            </TouchableOpacity>
          </View>

          <View style={styles.trackerInfo}>
            <Text style={styles.nextCheckIn}>Next Check-In</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>00:00:00</Text>
            </View>
            <Text style={styles.skip}>skip</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={onPressAnalytics}
          activeOpacity={0.8}
        >
          <Text style={styles.analyticsText}>Analytics/Trends</Text>
          <SvgXml xml={trendUpXml} width={22} height={15} />
        </TouchableOpacity>
      </ScrollView>

      <NavigationBar onPressHome={onPressHome} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 14, alignItems: "center" },
  title: { fontSize: 38, fontWeight: "800", color: "#000" },
  subtitle: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 4 },
  trackerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
  trackerRowReverse: { flexDirection: "row-reverse" },
  trackerColumn: { alignItems: "center", gap: 8 },
  trackerCircle: {
    width: 175,
    height: 175,
    borderRadius: 87.5,
    alignItems: "center",
    justifyContent: "center",
  },
  acneCircle: { backgroundColor: "#f49aa3" },
  hairCircle: { backgroundColor: "#a8bf89" },
  trackerLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
  },
  acneLabel: { transform: [{ rotate: "-4deg" }] },
  hairLabel: { transform: [{ rotate: "4deg" }] },
  trackerInfo: { alignItems: "center", gap: 8, width: 110 },
  nextCheckIn: { fontSize: 18, fontWeight: "800", color: "#000", textAlign: "center" },
  timerBadge: {
    backgroundColor: "#89b8c2",
    borderRadius: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timerText: { fontSize: 14, fontWeight: "800", color: "#000" },
  skip: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    textDecorationLine: "underline",
  },
  analyticsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#89b8c2",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  analyticsText: { color: "#fff7e7", fontSize: 14, fontWeight: "800" },
});
