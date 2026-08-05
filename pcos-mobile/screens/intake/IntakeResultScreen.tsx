import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import NavigationBar from "../../components/NavigationBar";
import { IntakeResult } from "../../lib/intake_api";

const LABEL_COPY: Record<IntakeResult["risk_label"], { title: string; color: string }> = {
  lower: { title: "Lower Risk Signal", color: "#a8bf89" },
  moderate: { title: "Moderate Risk Signal", color: "#e0a458" },
  higher: { title: "Higher Risk Signal", color: "#c0392b" },
};

type Props = {
  data: IntakeResult;
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function IntakeResultScreen({ data, onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  const copy = LABEL_COPY[data.risk_label];

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>YOUR RESULT</Text>

        <View style={[styles.resultCard, { backgroundColor: copy.color }]}>
          <Text style={styles.resultTitle}>{copy.title}</Text>
          <Text style={styles.resultPct}>{data.risk_score_pct.toFixed(0)}%</Text>
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{data.disclaimer}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onPressHome} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
  content: { padding: 16, paddingTop: 40, alignItems: "center", paddingBottom: 24 },
  heading: { fontSize: 28, fontWeight: "800", color: "#000", textAlign: "center" },
  resultCard: {
    width: "100%",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
  },
  resultTitle: { fontSize: 16, fontWeight: "800", color: "#fff7e7" },
  resultPct: { fontSize: 48, fontWeight: "800", color: "#fff7e7", marginTop: 8 },
  disclaimerBox: {
    width: "100%",
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    padding: 14,
  },
  disclaimerText: { fontSize: 13, color: "rgba(0,0,0,0.7)", lineHeight: 18, fontStyle: "italic" },
  primaryButton: {
    backgroundColor: "#e47083",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 28,
  },
  primaryButtonText: { color: "#fff7e7", fontSize: 16, fontWeight: "800" },
});
