import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoButton from "../../components/InfoButton";
import { updateCadence, WeightCheckInCadence } from "../../lib/profile_api";

const CADENCE_OPTIONS: { value: WeightCheckInCadence; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

type Props = {
  onSubmitted?: () => void;
};

export default function WeightCadenceScreen({ onSubmitted }: Props) {
  const [cadence, setCadence] = useState<WeightCheckInCadence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!cadence) {
      setError("Pick how often you'd like to check in.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateCadence(cadence);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ScrollView contentContainerStyle={styles.content}>
        <InfoButton
          title="Why We Ask This"
          message="Choosing a cadence lets us gently remind you to log a new weight check-in — weekly, every two weeks, or monthly — so you can see trends over time."
          style={{ position: "absolute", top: 0, right: 16 }}
        />
        <Text style={styles.heading}>STAY ON TRACK</Text>
        <Text style={styles.subheading}>How often would you like to log your weight?</Text>

        <View style={styles.optionColumn}>
          {CADENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionChip, cadence === opt.value && styles.optionChipSelected]}
              onPress={() => {
                setCadence(opt.value);
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionChipText, cadence === opt.value && styles.optionChipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, !cadence && styles.primaryButtonDisabled]}
          onPress={handleContinue}
          disabled={submitting || !cadence}
          activeOpacity={0.8}
        >
          {submitting ? <ActivityIndicator color="#fff7e7" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
  content: { padding: 16, paddingTop: 40, alignItems: "center", paddingBottom: 24 },
  heading: { fontSize: 26, fontWeight: "800", color: "#000", textAlign: "center" },
  subheading: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.6)",
    marginTop: 4,
    marginBottom: 8,
    textAlign: "center",
  },
  optionColumn: { width: "100%", gap: 10, marginTop: 20 },
  optionChip: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  optionChipSelected: { backgroundColor: "#89b8c2" },
  optionChipText: { fontSize: 15, fontWeight: "700", color: "#89b8c2" },
  optionChipTextSelected: { color: "#fff7e7" },
  error: { color: "#7a1f2b", fontWeight: "700", marginTop: 20, textAlign: "center" },
  primaryButton: {
    backgroundColor: "#e47083",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 28,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#fff7e7", fontSize: 16, fontWeight: "800" },
});
