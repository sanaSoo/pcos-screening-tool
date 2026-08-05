import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoButton from "../../components/InfoButton";
import { updateBaseInfo } from "../../lib/profile_api";

type Props = {
  onSubmitted?: () => void;
};

export default function BaseInfoScreen({ onSubmitted }: Props) {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  // Separate from IntakeQuestionnaireScreen's weightKg — that's a
  // kg-denominated risk-model input, this is a lbs-denominated onboarding
  // fact that seeds weight_logs for the check-in cadence feature.
  const [startingWeightLbs, setStartingWeightLbs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  async function handleContinue() {
    const m = Number(month);
    const d = Number(day);
    const y = Number(year);
    const weight = Number(startingWeightLbs);

    if (!month || !day || !year || Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) {
      setError("Enter a complete birthday.");
      return;
    }
    const birthdate = new Date(y, m - 1, d);
    const isValidCalendarDate =
      birthdate.getFullYear() === y && birthdate.getMonth() === m - 1 && birthdate.getDate() === d;
    if (!isValidCalendarDate) {
      setError("That birthday isn't a real date.");
      return;
    }
    if (birthdate.getTime() >= new Date().getTime()) {
      setError("Birthday has to be in the past.");
      return;
    }
    if (!startingWeightLbs || Number.isNaN(weight) || weight <= 0) {
      setError("Enter a valid weight in lbs.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await updateBaseInfo({ birthdate, startingWeightLbs: weight });
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
          message="Your birthday helps us show your age alongside your tracked data, and your starting weight gives us a baseline to measure future check-ins against."
          style={{ position: "absolute", top: 0, right: 16 }}
        />
        <Text style={styles.heading}>LET&apos;S GET STARTED</Text>
        <Text style={styles.subheading}>A couple quick things before you dive in.</Text>

        <Text style={styles.sectionLabel}>Your birthday</Text>
        <View style={styles.dateRow}>
          <TextInput
            value={month}
            onChangeText={(v) => {
              setMonth(v);
              clearError();
            }}
            placeholder="MM"
            keyboardType="numeric"
            maxLength={2}
            style={[styles.textInput, styles.dateInput]}
          />
          <TextInput
            value={day}
            onChangeText={(v) => {
              setDay(v);
              clearError();
            }}
            placeholder="DD"
            keyboardType="numeric"
            maxLength={2}
            style={[styles.textInput, styles.dateInput]}
          />
          <TextInput
            value={year}
            onChangeText={(v) => {
              setYear(v);
              clearError();
            }}
            placeholder="YYYY"
            keyboardType="numeric"
            maxLength={4}
            style={[styles.textInput, styles.yearInput]}
          />
        </View>

        <Text style={styles.sectionLabel}>Your starting weight (lbs)</Text>
        <TextInput
          value={startingWeightLbs}
          onChangeText={(v) => {
            setStartingWeightLbs(v);
            clearError();
          }}
          placeholder="e.g. 145"
          keyboardType="numeric"
          style={styles.textInput}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} disabled={submitting} activeOpacity={0.8}>
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
  subheading: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.6)", marginTop: 4, marginBottom: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 8,
  },
  dateRow: { flexDirection: "row", gap: 10, width: "100%" },
  textInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  dateInput: { flex: 1 },
  yearInput: { flex: 1.4 },
  error: { color: "#7a1f2b", fontWeight: "700", marginTop: 20, textAlign: "center" },
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
