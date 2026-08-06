import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoButton from "../../components/InfoButton";
import MiniCalendar from "../../components/MiniCalendar";
import NavigationBar from "../../components/NavigationBar";
import { logPastCycle } from "../../lib/cycles_api";
import { IntakeAnswers, IntakeResult, submitIntake } from "../../lib/intake_api";

const PERIOD_FREQUENCY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Every month" },
  { value: 2, label: "Every ~2 months" },
  { value: 3, label: "Irregular / longer" },
];

const PERIOD_LOG_LABELS = ["Most recent period", "2nd most recent", "3rd most recent"];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatPeriodDate(d: Date) {
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type CheckboxKey =
  | "excessiveHairGrowth"
  | "skinDarkening"
  | "recentWeightGain"
  | "hairThinning"
  | "jawFaceAcne"
  | "moodSwings";

const CHECKBOX_QUESTIONS: { key: CheckboxKey; label: string }[] = [
  { key: "excessiveHairGrowth", label: "Excessive body/facial hair growth" },
  { key: "skinDarkening", label: "Noticing skin darkening recently" },
  { key: "recentWeightGain", label: "Recent weight gain" },
  { key: "hairThinning", label: "Hair thinning or baldness" },
  { key: "jawFaceAcne", label: "Pimples/acne on your face or jawline" },
  { key: "moodSwings", label: "Mood swings" },
];

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
  onSubmitted?: (result: IntakeResult) => void;
};

export default function IntakeQuestionnaireScreen({
  onPressHome,
  onPressQuickCheckIn,
  onPressProfile,
  onSubmitted,
}: Props) {
  const [periodFrequency, setPeriodFrequency] = useState<1 | 2 | 3>(1);
  const [weightKg, setWeightKg] = useState("");
  const [periodLengthDays, setPeriodLengthDays] = useState("");
  const [checks, setChecks] = useState<Record<CheckboxKey, boolean>>({
    excessiveHairGrowth: false,
    skinDarkening: false,
    recentWeightGain: false,
    hairThinning: false,
    jawFaceAcne: false,
    moodSwings: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start dates for the user's 3 most recent periods, most recent first.
  // No end dates asked — we derive each one from periodLengthDays below, so
  // the cycles table still gets a real end_date for every past period.
  const [periodDates, setPeriodDates] = useState<(Date | null)[]>([null, null, null]);
  const [editingPeriodIndex, setEditingPeriodIndex] = useState<number | null>(null);

  function toggleCheck(key: CheckboxKey) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    const weight = Number(weightKg);
    const periodLength = Number(periodLengthDays);
    if (!weightKg || Number.isNaN(weight) || weight <= 0) {
      setError("Enter a valid weight in kg.");
      return;
    }
    if (!periodLengthDays || Number.isNaN(periodLength) || periodLength <= 0) {
      setError("Enter how many days your period usually lasts.");
      return;
    }
    if (periodDates.some((d) => d === null)) {
      setError("Log the start dates of your 3 most recent periods.");
      return;
    }
    const [mostRecent, middle, oldest] = periodDates as Date[];
    if (mostRecent.getTime() <= middle.getTime() || middle.getTime() <= oldest.getTime()) {
      setError("List your periods from most to least recent, with no repeated dates.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const answers: IntakeAnswers = {
        periodFrequency,
        excessiveHairGrowth: checks.excessiveHairGrowth ? 1 : 0,
        skinDarkening: checks.skinDarkening ? 1 : 0,
        weightKg: weight,
        recentWeightGain: checks.recentWeightGain ? 1 : 0,
        hairThinning: checks.hairThinning ? 1 : 0,
        jawFaceAcne: checks.jawFaceAcne ? 1 : 0,
        periodLengthDays: periodLength,
        moodSwings: checks.moodSwings ? 1 : 0,
      };
      const result = await submitIntake(answers);

      // Seed cycle history from the 3 logged start dates so Cycle Tracking
      // and Analytics have real data right away, instead of starting empty.
      await Promise.all(
        (periodDates as Date[]).map((start) => {
          const end = new Date(start);
          end.setDate(end.getDate() + periodLength - 1);
          return logPastCycle(start, end);
        }),
      );

      onSubmitted?.(result);
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
          title="About This Check-In"
          message="This questionnaire runs your answers through a machine learning model trained on self-reported PCOS survey data. It's a rough screening signal, not a diagnosis — known accuracy is limited, so use it as a conversation-starter with your doctor, not a verdict."
          style={{ position: "absolute", top: 0, right: 16 }}
        />
        <Text style={styles.heading}>PCOS RISK CHECK-IN</Text>
        <Text style={styles.subheading}>Answer a few questions about your symptoms.</Text>

        <Text style={styles.sectionLabel}>How often do you get your period?</Text>
        <View style={styles.optionRow}>
          {PERIOD_FREQUENCY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionChip, periodFrequency === opt.value && styles.optionChipSelected]}
              onPress={() => setPeriodFrequency(opt.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionChipText, periodFrequency === opt.value && styles.optionChipTextSelected]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Your weight (kg)</Text>
        <TextInput
          value={weightKg}
          onChangeText={(v) => {
            setWeightKg(v);
            setError(null);
          }}
          placeholder="e.g. 65"
          keyboardType="numeric"
          style={styles.textInput}
        />

        <Text style={styles.sectionLabel}>How long does your period usually last (days)?</Text>
        <TextInput
          value={periodLengthDays}
          onChangeText={(v) => {
            setPeriodLengthDays(v);
            setError(null);
          }}
          placeholder="e.g. 5"
          keyboardType="numeric"
          style={styles.textInput}
        />

        <Text style={styles.sectionLabel}>Your 3 most recent periods</Text>
        <Text style={styles.helperText}>
          Just the start dates — we'll fill in the rest using your period length above.
        </Text>
        {PERIOD_LOG_LABELS.map((label, i) => (
          <TouchableOpacity
            key={label}
            style={styles.periodDateField}
            onPress={() => setEditingPeriodIndex(i)}
            activeOpacity={0.8}
          >
            <Text style={styles.periodDateLabel}>{label}</Text>
            <Text style={styles.periodDateValue}>
              {periodDates[i] ? formatPeriodDate(periodDates[i]!) : "Select date"}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Do any of these apply to you?</Text>
        {CHECKBOX_QUESTIONS.map((q) => (
          <TouchableOpacity
            key={q.key}
            style={styles.checkboxRow}
            onPress={() => toggleCheck(q.key)}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <View style={[styles.checkbox, checks[q.key] && styles.checkboxChecked]}>
              {checks[q.key] && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#fff7e7" /> : <Text style={styles.primaryButtonText}>See My Result</Text>}
        </TouchableOpacity>
      </ScrollView>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />

      <Modal
        visible={editingPeriodIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPeriodIndex(null)}
      >
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingPeriodIndex !== null ? PERIOD_LOG_LABELS[editingPeriodIndex] : ""}
            </Text>
            {editingPeriodIndex !== null && (
              <MiniCalendar
                initialDate={periodDates[editingPeriodIndex] ?? undefined}
                maxDate={new Date()}
                onSelect={(d) => {
                  setPeriodDates((prev) => {
                    const next = [...prev];
                    next[editingPeriodIndex] = d;
                    return next;
                  });
                }}
              />
            )}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setEditingPeriodIndex(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "flex-start" },
  optionChip: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  optionChipSelected: { backgroundColor: "#89b8c2" },
  optionChipText: { fontSize: 13, fontWeight: "700", color: "#89b8c2" },
  optionChipTextSelected: { color: "#fff7e7" },
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
  },
  helperText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.5)",
    alignSelf: "flex-start",
    marginTop: -4,
    marginBottom: 8,
  },
  periodDateField: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodDateLabel: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.6)" },
  periodDateValue: { fontSize: 15, fontWeight: "800", color: "#000" },
  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  formCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff7e7",
    borderRadius: 15,
    padding: 20,
  },
  formTitle: { fontSize: 18, fontWeight: "800", color: "#000", textAlign: "center", marginBottom: 12 },
  doneButton: {
    backgroundColor: "#e47083",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: { fontSize: 15, fontWeight: "800", color: "#fff7e7" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, alignSelf: "flex-start" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#e47083",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#e47083" },
  checkboxMark: { color: "#fff7e7", fontSize: 13, fontWeight: "800" },
  checkboxLabel: { fontSize: 14, fontWeight: "600", color: "#000", flexShrink: 1 },
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
