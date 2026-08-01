import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { hairSkinXml } from "../../assets/symptom_checkin/icons";
import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import { markTrackedThisWeek } from "../../lib/daily_tracking";
import { formatShortDate } from "../../lib/date_format";
import { HairLog, HairSeverity, listHairLogs, logHair } from "../../lib/hair_tracking_api";

const SEVERITY_LABELS = ["None", "Mild", "Moderate", "Severe"] as const;
const formatShort = formatShortDate;

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

function SeverityPicker({
  value,
  onChange,
}: {
  value: HairSeverity;
  onChange: (next: HairSeverity) => void;
}) {
  return (
    <View style={styles.severityRow}>
      {SEVERITY_LABELS.map((label, i) => {
        const selected = value === i;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.severityPill, selected && styles.severityPillActive]}
            onPress={() => onChange(i as HairSeverity)}
            activeOpacity={0.8}
          >
            <Text style={[styles.severityText, selected && styles.severityTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HairTrackerScreen({
  onPressHome,
  onPressQuickCheckIn,
  onPressProfile,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<HairLog[]>([]);
  const [hairGrowth, setHairGrowth] = useState<HairSeverity>(0);
  const [hairThinning, setHairThinning] = useState<HairSeverity>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listHairLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const log = await logHair(hairGrowth, hairThinning);
      setLogs((prev) => [log, ...prev]);
      await markTrackedThisWeek("hairSkin");
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <InfoButton
          title="Why Track Your Hair"
          message="Excess hair growth and scalp hair thinning are both common signs of the hormonal imbalances behind PCOS. Logging them regularly helps reveal patterns your doctor can act on."
          style={{ position: "absolute", top: 14, right: 16 }}
        />

        <SvgXml xml={hairSkinXml} width={64} height={60} />
        <Text style={styles.title}>HAIR TRACKER</Text>

        <Text style={styles.sectionLabel}>Excess Hair Growth</Text>
        <SeverityPicker value={hairGrowth} onChange={setHairGrowth} />

        <Text style={styles.sectionLabel}>Hair Thinning / Shedding</Text>
        <SeverityPicker value={hairThinning} onChange={setHairThinning} />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Check-In"}</Text>
        </TouchableOpacity>
        {saved && <Text style={styles.savedText}>Logged for today.</Text>}

        <Text style={styles.historyHeading}>Recent Check-Ins</Text>
        {loading ? null : logs.length === 0 ? (
          <Text style={styles.emptyText}>No hair check-ins logged yet.</Text>
        ) : (
          logs.slice(0, 10).map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logDate}>{formatShort(log.date)}</Text>
              <Text style={styles.logDetail}>
                Growth: {SEVERITY_LABELS[log.hairGrowth]} · Thinning: {SEVERITY_LABELS[log.hairThinning]}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <NavigationBar
        onPressHome={onPressHome}
        onPressQuickCheckIn={onPressQuickCheckIn}
        onPressProfile={onPressProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 14, alignItems: "center" },
  title: { fontSize: 30, fontWeight: "800", color: "#000", marginTop: 8 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    alignSelf: "flex-start",
    marginTop: 22,
    marginBottom: 10,
  },
  severityRow: { flexDirection: "row", gap: 8, width: "100%" },
  severityPill: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  severityPillActive: { backgroundColor: "#a8bf89" },
  severityText: { fontSize: 12, fontWeight: "800", color: "#000" },
  severityTextActive: { color: "#fff7e7" },
  saveButton: {
    backgroundColor: "#365013",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: { fontSize: 16, fontWeight: "800", color: "#fff7e7" },
  savedText: { fontSize: 13, fontWeight: "700", color: "#365013", marginTop: 10 },
  historyHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    alignSelf: "flex-start",
    marginTop: 32,
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, fontWeight: "700", color: "rgba(0,0,0,0.5)" },
  logRow: {
    width: "100%",
    backgroundColor: "#a8bf89",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  logDate: { fontSize: 14, fontWeight: "800", color: "#fff7e7" },
  logDetail: { fontSize: 12, fontWeight: "700", color: "rgba(255,247,231,0.9)", marginTop: 2 },
});
