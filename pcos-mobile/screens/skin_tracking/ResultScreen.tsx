import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import { LogicalZoneScores } from "../../lib/skin_tracking_api";

const ZONE_LABELS: Record<keyof LogicalZoneScores, string> = {
  forehead: "Forehead",
  temple: "Temple",
  cheeks: "Cheeks",
  chin: "Chin",
  jaw: "Jaw",
  neck: "Neck",
};
const ZONE_ORDER: (keyof LogicalZoneScores)[] = ["forehead", "temple", "cheeks", "chin", "jaw", "neck"];

export type ResultScreenData = {
  zones: LogicalZoneScores;
  overall: number;
  hormonalLikelihoodPct: number;
  hormonalReasons: string[];
  disclaimer: string;
  loggedAt?: string;
  photoUrls?: { front?: string | null; left?: string | null; right?: string | null };
};

type Props = {
  data: ResultScreenData;
  onPressBack?: () => void;
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

function severityColor(score: number): string {
  if (score < 35) return "#a8bf89";
  if (score < 65) return "#e0a458";
  return "#c0392b";
}

export default function ResultScreen({ data, onPressBack, onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ScrollView contentContainerStyle={styles.content}>
        <InfoButton
          title="Reading Your Results"
          message="Zone scores run 0-100, based on visible acne severity in that region. The hormonal pattern likelihood compares acne on androgen-sensitive zones (jaw, chin, neck) against the T-zone (forehead, temple), plus a couple of related symptoms — it's a pattern match, not a diagnosis."
          style={{ position: "absolute", top: 0, right: 16 }}
        />
        <Text style={styles.heading}>RESULTS</Text>
        {data.loggedAt && <Text style={styles.date}>{new Date(data.loggedAt).toLocaleDateString()}</Text>}

        {data.photoUrls && (data.photoUrls.front || data.photoUrls.left || data.photoUrls.right) && (
          <View style={styles.photoRow}>
            {data.photoUrls.front && <Image source={{ uri: data.photoUrls.front }} style={styles.photoThumb} />}
            {data.photoUrls.left && <Image source={{ uri: data.photoUrls.left }} style={styles.photoThumb} />}
            {data.photoUrls.right && <Image source={{ uri: data.photoUrls.right }} style={styles.photoThumb} />}
          </View>
        )}

        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Severity</Text>
          <Text style={[styles.overallValue, { color: severityColor(data.overall) }]}>
            {data.overall.toFixed(1)}
          </Text>
        </View>

        <View style={styles.zoneList}>
          {ZONE_ORDER.map((zone) => {
            const score = data.zones[zone];
            return (
              <View key={zone} style={styles.zoneRow}>
                <Text style={styles.zoneLabel}>{ZONE_LABELS[zone]}</Text>
                <View style={styles.zoneTrack}>
                  <View
                    style={[
                      styles.zoneFill,
                      { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: severityColor(score) },
                    ]}
                  />
                </View>
                <Text style={styles.zoneScore}>{score.toFixed(0)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.hormonalCard}>
          <Text style={styles.hormonalTitle}>Hormonal Pattern Likelihood</Text>
          <Text style={styles.hormonalPct}>{data.hormonalLikelihoodPct.toFixed(0)}%</Text>

          {data.hormonalReasons.length > 0 ? (
            <View style={styles.reasonList}>
              {data.hormonalReasons.map((reason, i) => (
                <Text key={i} style={styles.reasonText}>
                  • {reason}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.reasonText}>No hormonal-pattern signals detected this time.</Text>
          )}

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{data.disclaimer}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onPressBack} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Back to History</Text>
        </TouchableOpacity>
      </ScrollView>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
  content: { padding: 16, paddingTop: 40, alignItems: "center", paddingBottom: 24 },
  heading: { fontSize: 28, fontWeight: "800", color: "#000", textAlign: "center" },
  date: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)", marginTop: 4 },
  photoRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  photoThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#eee" },
  overallCard: {
    width: "100%",
    backgroundColor: "#f49aa3",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
  },
  overallLabel: { fontSize: 13, fontWeight: "800", color: "#fff7e7" },
  overallValue: { fontSize: 40, fontWeight: "800", marginTop: 4 },
  zoneList: { width: "100%", marginTop: 20, gap: 10 },
  zoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  zoneLabel: { width: 70, fontSize: 13, fontWeight: "700", color: "#000" },
  zoneTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  zoneFill: { height: "100%", borderRadius: 5 },
  zoneScore: { width: 30, fontSize: 13, fontWeight: "800", color: "#000", textAlign: "right" },
  hormonalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 18,
    marginTop: 24,
  },
  hormonalTitle: { fontSize: 16, fontWeight: "800", color: "#000" },
  hormonalPct: { fontSize: 34, fontWeight: "800", color: "#89b8c2", marginTop: 4 },
  reasonList: { marginTop: 12, gap: 6 },
  reasonText: { fontSize: 13, color: "#333", lineHeight: 19 },
  disclaimerBox: {
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    padding: 12,
  },
  disclaimerText: { fontSize: 12, color: "rgba(0,0,0,0.7)", lineHeight: 17, fontStyle: "italic" },
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
