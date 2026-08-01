import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  accentColor: string;
  textColor?: string;
  children: ReactNode;
};

// Shared shell for each analytics widget — same card treatment as
// CycleTrackingScreen's statusCard, just parameterized per widget's accent
// color so each domain (period/acne/hair) keeps its established color.
export default function WidgetCard({ title, accentColor, textColor = "#fff7e7", children }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: accentColor }]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 15, padding: 16, marginTop: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
});
