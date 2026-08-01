import { useEffect, useState } from "react";
import { SvgXml } from "react-native-svg";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { dropdownArrowXml } from "../../assets/profile/icons";
import InfoButton from "../../components/InfoButton";
import MiniCalendar from "../../components/MiniCalendar";
import NavigationBar from "../../components/NavigationBar";
import {
  Cycle,
  deleteCycle,
  endOpenCycle,
  listCycles,
  logPastCycle,
  startCycle,
  toDateKey,
} from "../../lib/cycles_api";
import { formatShortDate, inclusiveDayCount } from "../../lib/date_format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMonth = { year: number; month: number };

function shiftMonth(view: ViewMonth, delta: number): ViewMonth {
  // Rebuilt via y/m/d+delta (rather than mutated) so Date normalizes
  // month/year rollovers safely — same approach as DateWheel.tsx.
  const d = new Date(view.year, view.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const formatShort = formatShortDate;
const dayCount = inclusiveDayCount;

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function CycleTrackingScreen({
  onPressHome,
  onPressQuickCheckIn,
  onPressProfile,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPastForm, setShowPastForm] = useState(false);
  const [pastStart, setPastStart] = useState<Date | null>(null);
  const [pastEnd, setPastEnd] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const [pastError, setPastError] = useState<string | null>(null);
  const [pastSaving, setPastSaving] = useState(false);

  useEffect(() => {
    listCycles()
      .then(setCycles)
      .finally(() => setLoading(false));
  }, []);

  const openCycle = cycles.find((c) => c.endDate === null) ?? null;

  async function handleStartPeriod() {
    if (actionPending) return;
    setActionPending(true);
    setError(null);
    try {
      const cycle = await startCycle();
      setCycles((prev) => [cycle, ...prev]);
      const today = new Date();
      setViewMonth({ year: today.getFullYear(), month: today.getMonth() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log period start.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleEndPeriod() {
    if (actionPending) return;
    setActionPending(true);
    setError(null);
    try {
      const updated = await endOpenCycle();
      setCycles((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log period end.");
    } finally {
      setActionPending(false);
    }
  }

  function openPastForm() {
    setPastStart(null);
    setPastEnd(null);
    setPastError(null);
    setShowPastForm(true);
  }

  function closePastForm() {
    setShowPastForm(false);
    setPickerTarget(null);
  }

  async function handleSavePast() {
    if (!pastStart || !pastEnd) {
      setPastError("Pick both a start and end date.");
      return;
    }
    setPastSaving(true);
    setPastError(null);
    try {
      const cycle = await logPastCycle(pastStart, pastEnd);
      setCycles((prev) => [cycle, ...prev]);
      setViewMonth({ year: pastStart.getFullYear(), month: pastStart.getMonth() });
      closePastForm();
    } catch (err) {
      setPastError(err instanceof Error ? err.message : "Couldn't save that period.");
    } finally {
      setPastSaving(false);
    }
  }

  function handleDeleteCycle(cycle: Cycle) {
    Alert.alert(
      "Delete this period?",
      `${formatShort(cycle.startDate)} – ${cycle.endDate ? formatShort(cycle.endDate) : "Ongoing"}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCycle(cycle.id);
            setCycles((prev) => prev.filter((c) => c.id !== cycle.id));
          },
        },
      ],
    );
  }

  const monthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
  const cyclesInMonth = cycles.filter((c) => c.startDate.startsWith(monthKey));

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <InfoButton
          title="Why Track Your Cycle"
          message="Irregular periods are a hallmark of PCOS. Logging start and end dates helps you and your doctor understand your cycle length and regularity, which is key to diagnosis and treatment."
          style={{ position: "absolute", top: 14, right: 16 }}
        />
        <Text style={styles.title}>CYCLE TRACKING</Text>
        <Text style={styles.subtitle}>what&apos;s new this month?</Text>

        {openCycle ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Period started {formatShort(openCycle.startDate)} · Day{" "}
              {dayCount(openCycle.startDate, toDateKey(new Date()))}
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEndPeriod}
              disabled={actionPending}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>End Period</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStartPeriod}
            disabled={actionPending}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Log Period Start</Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.secondaryLink} onPress={openPastForm} activeOpacity={0.7}>
          <Text style={styles.secondaryLinkText}>Log a past period</Text>
        </TouchableOpacity>

        <View style={styles.monthNavRow}>
          <TouchableOpacity onPress={() => setViewMonth((v) => shiftMonth(v, -1))} activeOpacity={0.7}>
            <SvgXml
              xml={dropdownArrowXml}
              width={14}
              height={14}
              color="#000"
              style={{ transform: [{ rotate: "90deg" }] }}
            />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
          </Text>
          <TouchableOpacity onPress={() => setViewMonth((v) => shiftMonth(v, 1))} activeOpacity={0.7}>
            <SvgXml
              xml={dropdownArrowXml}
              width={14}
              height={14}
              color="#000"
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#e47083" style={{ marginTop: 24 }} />
        ) : cyclesInMonth.length === 0 ? (
          <Text style={styles.emptyText}>No periods logged this month.</Text>
        ) : (
          cyclesInMonth.map((c) => (
            <View key={c.id} style={styles.cycleRow}>
              <View style={styles.cycleRowInfo}>
                <Text style={styles.cycleRowText}>
                  {formatShort(c.startDate)} – {c.endDate ? formatShort(c.endDate) : "Ongoing"}
                </Text>
                {c.endDate && (
                  <Text style={styles.cycleRowDuration}>{dayCount(c.startDate, c.endDate)} days</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteCycle(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <NavigationBar
        onPressHome={onPressHome}
        onPressQuickCheckIn={onPressQuickCheckIn}
        onPressProfile={onPressProfile}
      />

      <Modal visible={showPastForm} transparent animationType="fade" onRequestClose={closePastForm}>
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            {pickerTarget ? (
              <>
                <Text style={styles.formTitle}>
                  {pickerTarget === "start" ? "Select start date" : "Select end date"}
                </Text>
                <MiniCalendar
                  key={pickerTarget}
                  initialDate={(pickerTarget === "start" ? pastStart : pastEnd) ?? pastStart ?? new Date()}
                  maxDate={new Date()}
                  minDate={pickerTarget === "end" ? pastStart ?? undefined : undefined}
                  dayCountFrom={pickerTarget === "end" ? pastStart ?? undefined : undefined}
                  onSelect={(d) => {
                    if (pickerTarget === "start") {
                      setPastStart(d);
                      if (pastEnd && pastEnd < d) setPastEnd(null);
                    } else {
                      setPastEnd(d);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setPickerTarget(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formCancelText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Log a Past Period</Text>

                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setPickerTarget("start")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateFieldLabel}>Start date</Text>
                  <Text style={styles.dateFieldValue}>
                    {pastStart ? `${formatShort(toDateKey(pastStart))}, ${pastStart.getFullYear()}` : "Select date"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setPickerTarget("end")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateFieldLabel}>End date</Text>
                  <Text style={styles.dateFieldValue}>
                    {pastEnd ? `${formatShort(toDateKey(pastEnd))}, ${pastEnd.getFullYear()}` : "Select date"}
                  </Text>
                </TouchableOpacity>

                {pastError && <Text style={styles.error}>{pastError}</Text>}

                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.formCancelButton} onPress={closePastForm} activeOpacity={0.8}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.formSaveButton}
                    onPress={handleSavePast}
                    disabled={pastSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.formSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 14, paddingBottom: 40, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#000" },
  subtitle: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 4 },
  statusCard: {
    width: "100%",
    backgroundColor: "#f49aa3",
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  statusText: { fontSize: 16, fontWeight: "800", color: "#000", textAlign: "center" },
  actionButton: {
    backgroundColor: "#e47083",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 16,
  },
  actionButtonText: { fontSize: 16, fontWeight: "800", color: "#fff7e7" },
  error: { color: "#7a1f2b", fontWeight: "700", fontSize: 13, marginTop: 10, textAlign: "center" },
  secondaryLink: {
    backgroundColor: "#89b8c2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  secondaryLinkText: { fontSize: 13, fontWeight: "800", color: "#fff7e7" },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: 20,
  },
  monthLabel: { fontSize: 18, fontWeight: "800", color: "#000", width: 170, textAlign: "center" },
  emptyText: { fontSize: 14, fontWeight: "700", color: "rgba(0,0,0,0.5)", marginTop: 16 },
  cycleRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  cycleRowInfo: { gap: 2 },
  cycleRowText: { fontSize: 15, fontWeight: "800", color: "#fff7e7" },
  cycleRowDuration: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  deleteButtonText: { fontSize: 16, fontWeight: "800", color: "#fff7e7" },
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
    gap: 12,
  },
  formTitle: { fontSize: 20, fontWeight: "800", color: "#000", textAlign: "center" },
  dateField: {
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dateFieldLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  dateFieldValue: { fontSize: 16, fontWeight: "800", color: "#fff7e7", marginTop: 2 },
  formButtonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  formCancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 12,
    alignItems: "center",
  },
  formCancelText: { fontSize: 15, fontWeight: "800", color: "#89b8c2" },
  backButton: {
    alignSelf: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  formSaveButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#e47083",
    paddingVertical: 12,
    alignItems: "center",
  },
  formSaveText: { fontSize: 15, fontWeight: "800", color: "#fff7e7" },
});
