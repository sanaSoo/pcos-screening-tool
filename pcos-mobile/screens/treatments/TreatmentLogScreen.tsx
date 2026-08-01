import { useEffect, useMemo, useState } from "react";
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
import { SvgXml } from "react-native-svg";

import { pillIconXml } from "../../assets/treatments/icons";
import InfoButton from "../../components/InfoButton";
import MiniCalendar from "../../components/MiniCalendar";
import NavigationBar from "../../components/NavigationBar";
import TreatmentTimeline from "../../components/TreatmentTimeline";
import {
  addTreatment,
  deleteTreatment,
  listTreatments,
  SymptomTag,
  Treatment,
  TREATMENT_SYMPTOM_TAGS,
  updateTreatment,
} from "../../lib/treatments_api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatShort(dateKey: string) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

function toggleTag(tags: SymptomTag[], tag: SymptomTag): SymptomTag[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function TreatmentLogScreen({ onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDosage, setDraftDosage] = useState("");
  const [draftDate, setDraftDate] = useState(new Date());
  const [draftTags, setDraftTags] = useState<SymptomTag[]>([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [menuTreatmentId, setMenuTreatmentId] = useState<string | null>(null);
  const menuTreatment = treatments.find((t) => t.id === menuTreatmentId) ?? null;

  // Set when a timeline dot is tapped — shows just that date's treatments so
  // the user doesn't have to hunt through the full log to answer "what did I
  // try around then?"
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const dayDetailTreatments = treatments.filter((t) => t.date === dayDetailDate);

  useEffect(() => {
    listTreatments()
      .then(setTreatments)
      .finally(() => setLoading(false));
  }, []);

  const ordered = useMemo(() => treatments, [treatments]);

  function openAddForm() {
    setEditingId(null);
    setDraftName("");
    setDraftDosage("");
    setDraftDate(new Date());
    setDraftTags([]);
    setDraftNotes("");
    setFormError(null);
    setShowDatePicker(false);
    setShowForm(true);
  }

  function openEditForm(treatment: Treatment) {
    const [y, m, d] = treatment.date.split("-").map(Number);
    setEditingId(treatment.id);
    setDraftName(treatment.name);
    setDraftDosage(treatment.dosage ?? "");
    setDraftDate(new Date(y, m - 1, d));
    setDraftTags(treatment.symptomTags);
    setDraftNotes(treatment.notes ?? "");
    setFormError(null);
    setShowDatePicker(false);
    setShowForm(true);
    setMenuTreatmentId(null);
    setDayDetailDate(null);
  }

  function closeForm() {
    setShowForm(false);
    setShowDatePicker(false);
  }

  async function handleSaveForm() {
    const name = draftName.trim();
    if (!name) {
      setFormError("Give the treatment a name.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const input = {
        name,
        dosage: draftDosage.trim() || null,
        date: draftDate,
        symptomTags: draftTags,
        notes: draftNotes.trim() || null,
      };
      if (editingId) {
        const updated = await updateTreatment(editingId, input);
        setTreatments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => (a.date < b.date ? 1 : -1)));
      } else {
        const treatment = await addTreatment(input);
        setTreatments((prev) => [treatment, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1)));
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save that treatment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMenuDelete() {
    if (!menuTreatmentId) return;
    const id = menuTreatmentId;
    setMenuTreatmentId(null);
    await deleteTreatment(id);
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    // Deleting the last treatment on a date shouldn't leave an empty modal open.
    if (dayDetailDate && dayDetailTreatments.length === 0) setDayDetailDate(null);
  }, [dayDetailDate, dayDetailTreatments.length]);

  function renderTreatment(treatment: Treatment) {
    return (
      <View key={treatment.id} style={styles.row}>
        <View style={styles.rowInfo}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowName}>{treatment.name}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuTreatmentId(treatment.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuButtonText}>⋮</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.rowSubline}>
            {treatment.dosage ? `${treatment.dosage} · ` : ""}
            {formatShort(treatment.date)}
          </Text>
          {treatment.symptomTags.length > 0 && (
            <View style={styles.tagRow}>
              {treatment.symptomTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {treatment.notes && <Text style={styles.rowNotes}>{treatment.notes}</Text>}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <InfoButton
          title="Why Log Treatments"
          message="Recording what you're using — and when — makes it possible to spot which treatments actually line up with changes in your symptoms, cycle, or skin over time."
          style={{ position: "absolute", top: 14, right: 16 }}
        />
        <Text style={styles.title}>TREATMENT LOG</Text>
        <Text style={styles.subtitle}>what are you using?</Text>

        <TouchableOpacity style={styles.addButton} onPress={openAddForm} activeOpacity={0.8}>
          <SvgXml xml={pillIconXml} width={20} height={20} color="#fff7e7" />
          <Text style={styles.addButtonText}>Log a Treatment</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#e47083" style={{ marginTop: 24 }} />
        ) : ordered.length === 0 ? (
          <Text style={styles.emptyText}>No treatments logged yet.</Text>
        ) : (
          <>
            <TreatmentTimeline
              treatments={treatments}
              onSelectDate={(group) => setDayDetailDate(group.date)}
            />
            {ordered.map(renderTreatment)}
          </>
        )}
      </ScrollView>

      <NavigationBar
        onPressHome={onPressHome}
        onPressQuickCheckIn={onPressQuickCheckIn}
        onPressProfile={onPressProfile}
      />

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={closeForm}>
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            {showDatePicker ? (
              <>
                <Text style={styles.formTitle}>Select date</Text>
                <MiniCalendar
                  initialDate={draftDate}
                  maxDate={new Date()}
                  onSelect={(d) => setDraftDate(d)}
                />
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formCancelText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <Text style={styles.formTitle}>{editingId ? "Edit Treatment" : "New Treatment"}</Text>

                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Treatment name"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={styles.input}
                />
                <TextInput
                  value={draftDosage}
                  onChangeText={setDraftDosage}
                  placeholder="Dosage / frequency (e.g. 50mg, once daily)"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateFieldLabel}>Date</Text>
                  <Text style={styles.dateFieldValue}>
                    {formatShort(
                      `${draftDate.getFullYear()}-${String(draftDate.getMonth() + 1).padStart(2, "0")}-${String(draftDate.getDate()).padStart(2, "0")}`,
                    )}
                    , {draftDate.getFullYear()}
                  </Text>
                </TouchableOpacity>

                <View style={styles.tagPickerRow}>
                  {TREATMENT_SYMPTOM_TAGS.map((tag) => {
                    const selected = draftTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagOption, selected && styles.tagOptionSelected]}
                        onPress={() => setDraftTags((prev) => toggleTag(prev, tag))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tagOptionText, selected && styles.tagOptionTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  multiline
                  style={[styles.input, styles.notesInput]}
                />

                {formError && <Text style={styles.error}>{formError}</Text>}

                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.formCancelButton} onPress={closeForm} activeOpacity={0.8}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.formSaveButton}
                    onPress={handleSaveForm}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.formSaveText}>{editingId ? "Save" : "Add"}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuTreatmentId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuTreatmentId(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuTreatmentId(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.menuCard} onPress={() => {}}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => menuTreatment && openEditForm(menuTreatment)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuRowIcon}>✎</Text>
              <Text style={styles.menuRowText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={handleMenuDelete}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuRowIcon, styles.menuRowDeleteText]}>✕</Text>
              <Text style={[styles.menuRowText, styles.menuRowDeleteText]}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={dayDetailDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDayDetailDate(null)}
      >
        <TouchableOpacity
          style={styles.formOverlay}
          activeOpacity={1}
          onPress={() => setDayDetailDate(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.formCard} onPress={() => {}}>
            <Text style={styles.formTitle}>{dayDetailDate ? formatShort(dayDetailDate) : ""}</Text>
            <ScrollView contentContainerStyle={{ gap: 12, paddingTop: 4 }}>
              {dayDetailTreatments.map(renderTreatment)}
            </ScrollView>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setDayDetailDate(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.formCancelText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  addButtonText: { fontSize: 14, fontWeight: "800", color: "#fff7e7" },
  emptyText: { fontSize: 14, fontWeight: "700", color: "rgba(0,0,0,0.5)", marginTop: 24 },
  row: {
    width: "100%",
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  rowInfo: { gap: 4 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowName: { fontSize: 16, fontWeight: "800", color: "#fff7e7", flex: 1 },
  menuButton: { paddingHorizontal: 4, marginLeft: 8 },
  menuButtonText: { fontSize: 18, fontWeight: "800", color: "#fff7e7" },
  rowSubline: { fontSize: 13, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tagChip: {
    backgroundColor: "rgba(255,247,231,0.35)",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  tagChipText: { fontSize: 11, fontWeight: "800", color: "#fff7e7" },
  rowNotes: { fontSize: 13, fontWeight: "600", color: "#fff7e7", marginTop: 4 },
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
    maxHeight: "85%",
    backgroundColor: "#fff7e7",
    borderRadius: 15,
    padding: 20,
  },
  formTitle: { fontSize: 20, fontWeight: "800", color: "#000", textAlign: "center", marginBottom: 4 },
  input: {
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  notesInput: { minHeight: 70, textAlignVertical: "top" },
  dateField: {
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dateFieldLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,247,231,0.85)" },
  dateFieldValue: { fontSize: 16, fontWeight: "800", color: "#fff7e7", marginTop: 2 },
  tagPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagOption: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagOptionSelected: { backgroundColor: "#89b8c2" },
  tagOptionText: { fontSize: 13, fontWeight: "800", color: "#89b8c2" },
  tagOptionTextSelected: { color: "#fff7e7" },
  error: { color: "#7a1f2b", fontWeight: "700", fontSize: 13, textAlign: "center" },
  formButtonRow: { flexDirection: "row", gap: 12, marginTop: 4 },
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
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  menuCard: {
    width: "100%",
    maxWidth: 260,
    backgroundColor: "#fff7e7",
    borderRadius: 15,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowIcon: { fontSize: 16, fontWeight: "800", color: "#000", width: 18, textAlign: "center" },
  menuRowText: { fontSize: 15, fontWeight: "800", color: "#000" },
  menuRowDeleteText: { color: "#ae0000" },
});
