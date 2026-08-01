import { useEffect, useMemo, useState } from "react";
import { SvgXml } from "react-native-svg";
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

import { pinIconXml } from "../../assets/notes/icons";
import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import {
  Note,
  addNote,
  deleteNote,
  listNotes,
  togglePin,
  updateNoteText,
} from "../../lib/notes_api";

const COLUMN_COUNT = 2;
// The Figma mock parks the "NOTES" title in column 1's top slot and starts
// column 2 flush with the top — these seed heights reproduce that same
// staggered-column look while staying dynamic for any number of real notes.
const TITLE_BLOCK_HEIGHT = 150;
const ADD_BLOCK_HEIGHT = 70;
// Rough chars-per-line for a ~160pt-wide card at the note font size — used
// only to balance the two columns, not to size the card itself (that's left
// to actually wrapping the text, so short notes stay short).
const CHARS_PER_LINE = 20;

function estimateNoteHeight(note: Note) {
  const lines = Math.max(1, Math.ceil(note.text.length / CHARS_PER_LINE));
  return 28 /* header row + gap */ + lines * 18 /* text line height */ + 28; /* padding */
}

// Simple "shortest column first" bin-packing — no measurement or masonry
// library needed since each note's height is estimated from its own text
// length. Because pinned notes are sorted to the front before this runs,
// they land at (or near) the top of whichever column they're assigned to.
function splitColumns(notes: Note[]): Note[][] {
  const columns: Note[][] = Array.from({ length: COLUMN_COUNT }, () => []);
  const heights = [TITLE_BLOCK_HEIGHT, ADD_BLOCK_HEIGHT];
  for (const note of notes) {
    let shortest = 0;
    for (let i = 1; i < COLUMN_COUNT; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(note);
    heights[shortest] += estimateNoteHeight(note) + 14;
  }
  return columns;
}

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function NotesScreen({ onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);

  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .finally(() => setLoading(false));
  }, []);

  const ordered = useMemo(() => {
    const pinned = notes.filter((n) => n.pinned);
    const rest = notes.filter((n) => !n.pinned);
    return [...pinned, ...rest];
  }, [notes]);
  const columns = useMemo(() => splitColumns(ordered), [ordered]);
  const menuNote = notes.find((n) => n.id === menuNoteId) ?? null;

  function openAddForm() {
    setEditingNoteId(null);
    setDraftText("");
    setShowForm(true);
  }

  function openEditForm(note: Note) {
    setEditingNoteId(note.id);
    setDraftText(note.text);
    setShowForm(true);
    setMenuNoteId(null);
  }

  async function handleSaveForm() {
    const text = draftText.trim();
    if (!text) return;
    setSaving(true);
    try {
      if (editingNoteId) {
        const updated = await updateNoteText(editingNoteId, text);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const note = await addNote(text);
        setNotes((prev) => [note, ...prev]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleMenuPin() {
    if (!menuNoteId) return;
    const updated = await togglePin(menuNoteId);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setMenuNoteId(null);
  }

  async function handleMenuDelete() {
    if (!menuNoteId) return;
    const id = menuNoteId;
    setMenuNoteId(null);
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function renderNote(note: Note) {
    return (
      <View key={note.id} style={[styles.noteCard, { backgroundColor: note.color }]}>
        <View style={styles.noteHeader}>
          {note.pinned && (
            <SvgXml xml={pinIconXml} width={14} height={14} color={note.textColor} />
          )}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuNoteId(note.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuButtonText, { color: note.textColor }]}>⋮</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.noteText, { color: note.textColor }]}>{note.text}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <InfoButton
            title="Why Keep Notes"
            message="Jotting down how you're feeling — physically and emotionally — builds a personal record you can look back on, and can surface patterns that structured tracking alone might miss."
          />
        </View>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.title}>{"NOTES\nNOTES\nNOTES"}</Text>
            {columns[0]?.map(renderNote)}
          </View>
          <View style={styles.column}>
            <TouchableOpacity style={styles.addCard} onPress={openAddForm} activeOpacity={0.8}>
              <Text style={styles.addCardText}>+ Add a note</Text>
            </TouchableOpacity>
            {columns[1]?.map(renderNote)}
          </View>
        </View>

        {loading && <ActivityIndicator color="#e47083" style={{ marginTop: 24 }} />}
      </ScrollView>

      <NavigationBar
        onPressHome={onPressHome}
        onPressQuickCheckIn={onPressQuickCheckIn}
        onPressProfile={onPressProfile}
      />

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingNoteId ? "Edit Note" : "New Note"}</Text>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Write something..."
              placeholderTextColor="rgba(0,0,0,0.35)"
              multiline
              autoFocus
              style={styles.input}
            />
            <View style={styles.formButtonRow}>
              <TouchableOpacity
                style={styles.formCancelButton}
                onPress={() => setShowForm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formSaveButton}
                onPress={handleSaveForm}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.formSaveText}>{editingNoteId ? "Save" : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuNoteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuNoteId(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuNoteId(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.menuCard} onPress={() => {}}>
            <TouchableOpacity style={styles.menuRow} onPress={handleMenuPin} activeOpacity={0.7}>
              <SvgXml xml={pinIconXml} width={18} height={18} color="#000" />
              <Text style={styles.menuRowText}>{menuNote?.pinned ? "Unpin" : "Pin"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => menuNote && openEditForm(menuNote)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { width: "100%", flexDirection: "row", justifyContent: "flex-end" },
  columnsRow: { flexDirection: "row", width: "100%", gap: 14, marginTop: 4 },
  column: { flex: 1, gap: 14 },
  title: {
    fontSize: 46,
    fontWeight: "800",
    color: "#89b8c2",
    lineHeight: 48,
  },
  addCard: {
    minHeight: ADD_BLOCK_HEIGHT,
    backgroundColor: "#89b8c2",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addCardText: { fontSize: 14, fontWeight: "800", color: "#fff7e7", textAlign: "center" },
  noteCard: {
    width: "100%",
    paddingTop: 16,
    paddingHorizontal: 16,
    // The header row (pin/menu) above the text eats into the top space that
    // padding alone doesn't account for below it — extra bottom padding
    // balances the text out so it reads as evenly inset, not bottom-heavy.
    paddingBottom: 32,
    borderRadius: 8,
  },
  noteHeader: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  menuButton: { paddingHorizontal: 4 },
  menuButtonText: { fontSize: 18, fontWeight: "800" },
  noteText: { fontSize: 14, fontWeight: "800", marginTop: 6 },
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
  input: {
    minHeight: 90,
    backgroundColor: "#f49aa3",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    textAlignVertical: "top",
  },
  formButtonRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  formCancelButton: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#89b8c2",
    paddingVertical: 12,
    alignItems: "center",
  },
  formCancelText: { fontSize: 15, fontWeight: "800", color: "#89b8c2" },
  formSaveButton: {
    flex: 1,
    borderRadius: 20,
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
