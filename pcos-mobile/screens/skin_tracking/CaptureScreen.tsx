import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { cameraRetakeXml } from "../../assets/camera/icons";
import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import { markTrackedThisWeek } from "../../lib/daily_tracking";
import { HORMONAL_SYMPTOM_KEYS, uploadAcnePhoto } from "../../lib/skin_tracking_api";
import { ResultScreenData } from "./ResultScreen";

type StepKey = "front" | "left" | "right";

const STEPS: { key: StepKey; label: string; instruction: string }[] = [
  { key: "front", label: "Front", instruction: "Face the camera directly, with even lighting." },
  {
    key: "left",
    label: "Left profile",
    instruction: "Turn so your left cheek faces the camera, keeping your ear and jaw visible.",
  },
  {
    key: "right",
    label: "Right profile",
    instruction: "Turn so your right cheek faces the camera, keeping your ear and jaw visible.",
  },
];

function stepKeyFromError(message: string): StepKey | null {
  if (/front photo/i.test(message)) return "front";
  if (/left profile/i.test(message)) return "left";
  if (/right profile/i.test(message)) return "right";
  return null;
}

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
  onSubmitted?: (result: ResultScreenData) => void;
};

export default function CaptureScreen({ onPressHome, onPressQuickCheckIn, onPressProfile, onSubmitted }: Props) {
  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<Record<StepKey, string | null>>({
    front: null,
    left: null,
    right: null,
  });
  const [excessiveHairGrowth, setExcessiveHairGrowth] = useState(false);
  const [recentWeightGain, setRecentWeightGain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];

  function goToStep(key: StepKey) {
    setError(null);
    setStepIndex(STEPS.findIndex((s) => s.key === key));
    setPhase("capture");
  }

  async function handleCapture() {
    setError(null);

    // Camera preferred over the library so each capture is fresh, per the
    // capture flow's whole point — falls back to the library if camera
    // access is denied rather than dead-ending the user.
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          cameraType: ImagePicker.CameraType.front,
        })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const next = { ...captures, [step.key]: result.assets[0].uri };
    setCaptures(next);

    if (STEPS.every((s) => next[s.key])) {
      setPhase("review");
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  async function handleSubmit() {
    if (!captures.front || !captures.left || !captures.right) return;
    setSubmitting(true);
    setError(null);
    try {
      const symptomAnswers = {
        [HORMONAL_SYMPTOM_KEYS.excessiveHairGrowth]: excessiveHairGrowth ? 1 : 0,
        [HORMONAL_SYMPTOM_KEYS.recentWeightGain]: recentWeightGain ? 1 : 0,
      };
      const result = await uploadAcnePhoto(
        { front: captures.front, left: captures.left, right: captures.right },
        symptomAnswers,
      );
      markTrackedThisWeek("acne");
      onSubmitted?.({
        zones: result.scores.zones,
        overall: result.scores.overall,
        hormonalLikelihoodPct: result.hormonal_pattern.likelihood_pct,
        hormonalReasons: result.hormonal_pattern.reasons,
        disclaimer: result.hormonal_pattern.disclaimer,
        loggedAt: new Date().toISOString(),
        // Local capture URIs, not the storage-backed signed URLs — good
        // enough for an immediate post-submit preview.
        photoUrls: { front: captures.front, left: captures.left, right: captures.right },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const errorStepKey = error ? stepKeyFromError(error) : null;

  if (phase === "review") {
    return (
      <SafeAreaView style={styles.screenWrapper}>
        <ScrollView contentContainerStyle={styles.content}>
          <InfoButton
            title="Why Track Your Skin"
            message="Hormonal acne is one of the most common PCOS symptoms. Photographing it over time makes it easier to see whether treatments are working and to catch flare-ups tied to your cycle."
            style={{ position: "absolute", top: 0, right: 16 }}
          />
          <Text style={styles.heading}>REVIEW PHOTOS</Text>
          <Text style={styles.subheading}>Retake any photo before submitting.</Text>

          <View style={styles.reviewGrid}>
            {STEPS.map((s) => (
              <View key={s.key} style={styles.reviewCard}>
                {captures[s.key] && <Image source={{ uri: captures[s.key]! }} style={styles.reviewImage} />}
                <Text style={styles.reviewLabel}>{s.label}</Text>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => goToStep(s.key)}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  <SvgXml xml={cameraRetakeXml} width={14} height={13} color="#fff7e7" />
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={styles.checklistTitle}>Quick symptom check</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setExcessiveHairGrowth((v) => !v)}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <View style={[styles.checkbox, excessiveHairGrowth && styles.checkboxChecked]}>
              {excessiveHairGrowth && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Excessive facial/body hair growth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRecentWeightGain((v) => !v)}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <View style={[styles.checkbox, recentWeightGain && styles.checkboxChecked]}>
              {recentWeightGain && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Recent weight gain</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.errorRetakeButton}
                onPress={() => (errorStepKey ? goToStep(errorStepKey) : undefined)}
                activeOpacity={0.8}
              >
                <Text style={styles.errorRetakeText}>
                  {errorStepKey ? `Retake ${STEPS.find((s) => s.key === errorStepKey)?.label} photo` : "Try again"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff7e7" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
          {submitting && (
            <Text style={styles.submittingHint}>
              Analyzing your photos locally — this can take a few seconds.
            </Text>
          )}
        </ScrollView>
        <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.content}>
        <InfoButton
          title="Why Track Your Skin"
          message="Hormonal acne is one of the most common PCOS symptoms. Photographing it over time makes it easier to see whether treatments are working and to catch flare-ups tied to your cycle."
          style={{ position: "absolute", top: 0, right: 16, zIndex: 1 }}
        />
        <Text style={styles.heading}>ACNE TRACKER</Text>
        <Text style={styles.stepCount}>
          Step {stepIndex + 1} of {STEPS.length}: {step.label}
        </Text>
        <Text style={styles.instruction}>{step.instruction}</Text>

        <View style={styles.thumbRow}>
          {STEPS.map((s, i) => (
            <View
              key={s.key}
              style={[styles.thumb, i === stepIndex ? styles.thumbActive : styles.thumbInactive]}
            >
              {captures[s.key] && <Image source={{ uri: captures[s.key]! }} style={styles.thumbImage} />}
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleCapture} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        {onPressHome && (
          <TouchableOpacity style={styles.homeLink} onPress={onPressHome}>
            <Text style={styles.homeLinkText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </View>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
  content: { flex: 1, padding: 16, paddingTop: 40, alignItems: "center" },
  heading: { fontSize: 28, fontWeight: "800", color: "#000", textAlign: "center" },
  subheading: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.6)", marginTop: 4, marginBottom: 16 },
  stepCount: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 16 },
  instruction: { fontSize: 14, color: "#444", marginTop: 8, textAlign: "center", paddingHorizontal: 12 },
  thumbRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  thumbActive: { borderColor: "#e47083" },
  thumbInactive: { borderColor: "#ddd" },
  thumbImage: { width: "100%", height: "100%" },
  error: { color: "#7a1f2b", fontWeight: "700", marginTop: 16, textAlign: "center" },
  primaryButton: {
    backgroundColor: "#e47083",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 28,
  },
  primaryButtonText: { color: "#fff7e7", fontSize: 16, fontWeight: "800" },
  homeLink: { marginTop: 16 },
  homeLinkText: { color: "#e47083", fontSize: 14, fontWeight: "700" },
  reviewGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  reviewCard: {
    width: "30%",
    alignItems: "center",
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    padding: 8,
  },
  reviewImage: { width: "100%", height: 90, borderRadius: 6, backgroundColor: "#fff" },
  reviewLabel: { fontSize: 12, fontWeight: "800", color: "#fff7e7", marginTop: 6, textAlign: "center" },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  retakeButtonText: { fontSize: 11, fontWeight: "700", color: "#fff7e7" },
  checklistTitle: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 24, alignSelf: "flex-start" },
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
  checkboxLabel: { fontSize: 14, fontWeight: "600", color: "#000" },
  errorBox: {
    width: "100%",
    backgroundColor: "rgba(174,0,0,0.08)",
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    alignItems: "center",
    gap: 10,
  },
  errorText: { color: "#7a1f2b", fontWeight: "700", textAlign: "center" },
  errorRetakeButton: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#7a1f2b",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorRetakeText: { color: "#7a1f2b", fontWeight: "800", fontSize: 13 },
  submittingHint: { fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 10, textAlign: "center" },
});
