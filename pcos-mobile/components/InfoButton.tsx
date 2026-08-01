import { useState } from "react";
import { SvgXml } from "react-native-svg";
import { Modal, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { lightbulbIconXml } from "../assets/shared/icons";

type Props = {
  title: string;
  message: string;
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
};

// A small "why does this matter" explainer — same lightbulb + modal pattern
// on every screen, just different title/message per page.
export default function InfoButton({
  title,
  message,
  style,
  color = "#000",
  backgroundColor = "rgba(0,0,0,0.08)",
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor }, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <SvgXml xml={lightbulbIconXml} width={18} height={18} color={color} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
            <View style={styles.iconBadge}>
              <SvgXml xml={lightbulbIconXml} width={22} height={22} color="#e47083" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)} activeOpacity={0.8}>
              <Text style={styles.closeButtonText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    // Absolutely-positioned instances of this button tend to sit in a
    // screen's top corner, right where other content (title blocks, action
    // cards) also lands — without this, a later sibling in the same screen
    // paints over it and the button becomes invisible even though it's
    // still there and tappable.
    zIndex: 10,
    elevation: 10,
  },
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
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f49aa3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#000", textAlign: "center" },
  message: { fontSize: 14, fontWeight: "600", color: "#000", lineHeight: 20, textAlign: "center" },
  closeButton: {
    backgroundColor: "#e47083",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 6,
  },
  closeButtonText: { fontSize: 15, fontWeight: "800", color: "#fff7e7" },
});
