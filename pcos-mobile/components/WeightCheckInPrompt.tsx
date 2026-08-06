import { useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onLog: (weightLbs: number) => Promise<void>;
  onDismiss: () => void;
};

// A lightweight due-prompt modal, styled like InfoButton's modal card —
// not a full screen, since logging a weight is a single number. Reappears
// on the next Dashboard visit if dismissed while still overdue; no snooze
// persistence.
export default function WeightCheckInPrompt({ visible, onLog, onDismiss }: Props) {
  const [weightLbs, setWeightLbs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const weight = Number(weightLbs);
    if (!weightLbs || Number.isNaN(weight) || weight <= 0) {
      setError("Enter a valid weight in lbs.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onLog(weight);
      setWeightLbs("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Time to log your weight!</Text>
          <Text style={styles.message}>It&apos;s been a while since your last check-in.</Text>
          <TextInput
            value={weightLbs}
            onChangeText={(v) => {
              setWeightLbs(v);
              setError(null);
            }}
            placeholder="e.g. 145"
            keyboardType="numeric"
            style={styles.textInput}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={submitting} activeOpacity={0.8}>
            {submitting ? <ActivityIndicator color="#fff7e7" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} disabled={submitting}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff7e7",
    borderRadius: 15,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#000", textAlign: "center" },
  message: { fontSize: 14, fontWeight: "600", color: "#000", lineHeight: 20, textAlign: "center" },
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
    marginTop: 6,
  },
  error: { color: "#7a1f2b", fontWeight: "700", textAlign: "center" },
  saveButton: {
    backgroundColor: "#e47083",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 6,
    width: "100%",
  },
  saveButtonText: { fontSize: 15, fontWeight: "800", color: "#fff7e7" },
  dismissText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.5)", marginTop: 2 },
});
