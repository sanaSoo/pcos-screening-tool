import { CameraView, useCameraPermissions } from "expo-camera";
import { File } from "expo-file-system";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { cameraRetakeXml, profileSilhouetteXml } from "../../assets/camera/icons";
import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import { markTrackedThisWeek } from "../../lib/daily_tracking";
import {
  SkinCaptureResponse,
  submitSkinCapture,
} from "../../lib/skin_tracking_api";

const STEP_NAMES = ["Left profile", "Right profile", "Front"];

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

// expo-camera always writes the captured photo to a cache file on disk (photo.uri)
// even when we only use the inline base64 data. We never need that file, so delete
// it immediately — otherwise every capture leaves a residual copy of the photo on
// the device after this screen only ever needed the in-memory base64 string.
function deleteCachedPhoto(uri: string) {
  if (!uri.startsWith("file://")) return; // e.g. web, where uri is just the base64 data
  try {
    new File(uri).delete();
  } catch {
    // best-effort cleanup; not fatal if it fails
  }
}

export default function CaptureScreen({ onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SkinCaptureResponse | null>(null);
  const [zoomedZone, setZoomedZone] = useState<string | null>(null);

  if (!permission) {
    return <SafeAreaView style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.prompt}>
          Camera access is needed to capture skin-tracking photos.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant camera access</Text>
        </TouchableOpacity>
        {onPressHome && (
          <TouchableOpacity style={styles.homeLink} onPress={onPressHome}>
            <Text style={styles.homeLinkText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    setError(null);

    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.8,
    });
    if (!photo?.base64) {
      setError("Failed to capture photo, please try again.");
      return;
    }
    const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
    deleteCachedPhoto(photo.uri);

    const nextCaptures = [...captures];
    nextCaptures[step] = dataUrl;
    setCaptures(nextCaptures);

    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitSkinCapture({
        left: nextCaptures[0]!,
        right: nextCaptures[1]!,
        front: nextCaptures[2]!,
      });
      setResults(data);
      markTrackedThisWeek("acne");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
      setStep(0);
      setCaptures([null, null, null]);
    }
  }

  function handleCaptureAgain() {
    setResults(null);
    setError(null);
    setStep(0);
    setCaptures([null, null, null]);
  }

  if (results) {
    const zoomed = zoomedZone
      ? { name: zoomedZone, score: results.scores[zoomedZone] as any, uri: results.zones[zoomedZone] }
      : null;

    return (
      <SafeAreaView style={styles.screenWrapper}>
      <ScrollView contentContainerStyle={styles.resultsContainer}>
        <InfoButton
          title="Why Track Your Skin"
          message="Hormonal acne is one of the most common PCOS symptoms. Photographing it over time makes it easier to see whether treatments are working and to catch flare-ups tied to your cycle."
          style={{ position: "absolute", top: 40, right: 16 }}
        />
        <Text style={styles.heading}>ACNE TRACKER</Text>
        <Text style={styles.overall}>
          Overall severity: {results.scores.overall}
        </Text>
        <View style={styles.zoneGrid}>
          {Object.keys(results.zones).map((zoneName) => {
            const score = results.scores[zoneName] as any;
            return (
              <TouchableOpacity
                key={zoneName}
                style={styles.zoneCard}
                onPress={() => setZoomedZone(zoneName)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: results.zones[zoneName] }}
                  style={styles.zoneImage}
                />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>
                    {zoneName.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.zoneDetail}>
                    {score.label} · confidence {score.confidence} · severity{" "}
                    {score.severity_score}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCaptureAgain}>
          <Text style={styles.primaryButtonText}>Capture again</Text>
        </TouchableOpacity>

        <Modal
          visible={zoomed !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomedZone(null)}
        >
          <TouchableOpacity
            style={styles.zoomOverlay}
            activeOpacity={1}
            onPress={() => setZoomedZone(null)}
          >
            {zoomed && (
              <View style={styles.zoomCard}>
                {/* contain (not cover) so the crop's real aspect ratio shows —
                    e.g. jaw crops are wide/thin, temple crops are more square */}
                <Image
                  source={{ uri: zoomed.uri }}
                  style={styles.zoomImage}
                  resizeMode="contain"
                />
                <Text style={styles.zoomName}>{zoomed.name.replace(/_/g, " ")}</Text>
                <Text style={styles.zoomDetail}>
                  {zoomed.score.label} · confidence {zoomed.score.confidence} ·
                  severity {zoomed.score.severity_score}
                </Text>
                <Text style={styles.zoomHint}>Tap anywhere to close</Text>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      </ScrollView>
      <NavigationBar onPressHome={onPressHome} onPressQuickCheckIn={onPressQuickCheckIn} onPressProfile={onPressProfile} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
    <View style={styles.container}>
      <InfoButton
        title="Why Track Your Skin"
        message="Hormonal acne is one of the most common PCOS symptoms. Photographing it over time makes it easier to see whether treatments are working and to catch flare-ups tied to your cycle."
        style={{ position: "absolute", top: 40, right: 16, zIndex: 1 }}
      />
      <Text style={styles.heading}>ACNE TRACKER</Text>

      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <SvgXml
          xml={profileSilhouetteXml}
          width={160}
          height={143}
          color="#365013"
          opacity={0.6}
          style={styles.silhouetteOverlay}
        />
      </View>

      <Text style={styles.prompt}>
        Position yourself: we&apos;ll take three photos — left profile, right
        profile, then front.
      </Text>

      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>Step: {STEP_NAMES[step]}</Text>
        <View style={styles.thumbRow}>
          {captures.map((capture, i) => {
            const canRetake = capture && !submitting;
            return (
              <TouchableOpacity
                key={i}
                disabled={!canRetake}
                onPress={() => setStep(i)}
                style={[
                  styles.thumb,
                  i === step ? styles.thumbActive : styles.thumbInactive,
                ]}
              >
                {capture && (
                  <Image source={{ uri: capture }} style={styles.thumbImage} />
                )}
                {canRetake && (
                  <View style={styles.retakeBadge}>
                    <SvgXml xml={cameraRetakeXml} width={14} height={13} color="#365013" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleCapture}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {step < 2 ? "Capture" : "Submit"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
    <NavigationBar onPressHome={onPressHome} onPressProfile={onPressProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#fff7e7" },
  container: { flex: 1, padding: 16, paddingTop: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  cameraFrame: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#365013",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  camera: { flex: 1 },
  silhouetteOverlay: {
    position: "absolute",
    alignSelf: "center",
    top: "20%",
  },
  prompt: { fontSize: 14, color: "#444", marginTop: 12, textAlign: "center" },
  stepRow: { marginTop: 12, alignItems: "center" },
  stepLabel: { fontWeight: "600", marginBottom: 8 },
  thumbRow: { flexDirection: "row", gap: 8 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 2,
    overflow: "visible",
    backgroundColor: "#f5f5f5",
  },
  thumbActive: { borderColor: "#365013" },
  thumbInactive: { borderColor: "#ddd" },
  thumbImage: { width: "100%", height: "100%", borderRadius: 4 },
  retakeBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff7e7",
    borderWidth: 1,
    borderColor: "#365013",
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#c0392b", marginTop: 12, textAlign: "center" },
  primaryButton: {
    backgroundColor: "#365013",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  homeLink: { marginTop: 16 },
  homeLinkText: { color: "#365013", fontSize: 14, fontWeight: "600" },
  resultsContainer: { padding: 16, paddingTop: 40 },
  overall: { fontSize: 20, fontWeight: "600", marginBottom: 16 },
  zoneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  zoneCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
  },
  zoneImage: { width: "100%", height: 140 },
  zoneInfo: { padding: 8 },
  zoneName: { fontWeight: "600", textTransform: "capitalize" },
  zoneDetail: { fontSize: 12, color: "#555", marginTop: 2 },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  zoomCard: { width: "100%", alignItems: "center" },
  zoomImage: { width: "100%", height: 400, backgroundColor: "#111", borderRadius: 8 },
  zoomName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
    textTransform: "capitalize",
    marginTop: 16,
  },
  zoomDetail: { color: "#ddd", fontSize: 14, marginTop: 4, textAlign: "center" },
  zoomHint: { color: "#999", fontSize: 12, marginTop: 16 },
});
