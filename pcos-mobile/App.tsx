import { Pacifico_400Regular, useFonts } from "@expo-google-fonts/pacifico";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ScreenTransition from "./components/ScreenTransition";
import { getSession, signOut } from "./lib/auth";
import { listCycles } from "./lib/cycles_api";
import { clearNonDemoData, isDemoDataEnabled, setDemoDataEnabled } from "./lib/seed_demo_data";
import AnalyticsScreen from "./screens/analytics/AnalyticsScreen";
import CycleTrackingScreen from "./screens/cycles/CycleTrackingScreen";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import HairTrackerScreen from "./screens/hair/HairTrackerScreen";
import LoginScreen from "./screens/login/LoginScreen";
import NotesScreen from "./screens/notes/NotesScreen";
import ProfileScreen from "./screens/profile/ProfileScreen";
import CaptureScreen from "./screens/skin_tracking/CaptureScreen";
import HistoryScreen from "./screens/skin_tracking/HistoryScreen";
import ResultScreen, { ResultScreenData } from "./screens/skin_tracking/ResultScreen";
import SignUpScreen from "./screens/signup/SignUpScreen";
import SymptomCheckInScreen from "./screens/symptom_checkin/SymptomCheckInScreen";
import TreatmentLogScreen from "./screens/treatments/TreatmentLogScreen";
import WelcomeScreen from "./screens/welcome/WelcomeScreen";

type Screen =
  | "welcome"
  | "login"
  | "signUp"
  | "dashboard"
  | "symptomCheckIn"
  | "trackerHistory"
  | "capture"
  | "trackerResult"
  | "hairTracker"
  | "analytics"
  | "profile"
  | "cycleTracking"
  | "notes"
  | "treatmentLog";

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  welcome: "#ffcc7d",
  login: "#ffcc7d",
  signUp: "#ffcc7d",
  dashboard: "#fff7e7",
  symptomCheckIn: "#fff7e7",
  trackerHistory: "#fff7e7",
  capture: "#fff7e7",
  trackerResult: "#fff7e7",
  hairTracker: "#fff7e7",
  analytics: "#fff7e7",
  profile: "#fff7e7",
  cycleTracking: "#fff7e7",
  notes: "#fff7e7",
  treatmentLog: "#fff7e7",
};

// Rough "distance from Welcome" per screen — used only to decide which way
// a transition should slide (deeper = forward/slide-from-right, shallower =
// back/slide-from-left). Not a real navigation stack, just a heuristic.
const SCREEN_DEPTH: Record<Screen, number> = {
  welcome: 0,
  login: 1,
  signUp: 1,
  dashboard: 2,
  symptomCheckIn: 3,
  trackerHistory: 3,
  hairTracker: 3,
  analytics: 3,
  profile: 3,
  cycleTracking: 3,
  notes: 3,
  treatmentLog: 3,
  capture: 4,
  trackerResult: 5,
};

const comingSoon = (feature: string) => () =>
  Alert.alert(feature, `${feature} is coming soon.`);

export default function App() {
  // null while we check for a persisted Supabase session on launch — a
  // returning logged-in user should land straight on the Dashboard instead
  // of being bounced through Welcome/Login again.
  const [screen, setScreen] = useState<Screen | null>(null);
  const [fontsLoaded] = useFonts({ Pacifico_400Regular });
  const [periodsThisYear, setPeriodsThisYear] = useState(0);
  const [demoDataEnabled, setDemoDataEnabledState] = useState(false);
  const [trackerResultData, setTrackerResultData] = useState<ResultScreenData | null>(null);
  const showTrackerResult = (data: ResultScreenData) => {
    setTrackerResultData(data);
    setScreen("trackerResult");
  };
  const goHome = () => setScreen("dashboard");
  const goProfile = () => setScreen("profile");

  useEffect(() => {
    getSession()
      .then((session) => setScreen(session ? "dashboard" : "welcome"))
      .catch(() => setScreen("welcome"));
  }, []);

  useEffect(() => {
    if (screen !== "profile") return;
    listCycles().then((cycles) => {
      const currentYear = new Date().getFullYear();
      const count = cycles.filter((c) => Number(c.startDate.slice(0, 4)) === currentYear).length;
      setPeriodsThisYear(count);
    });
    isDemoDataEnabled().then(setDemoDataEnabledState);
  }, [screen]);

  async function handleToggleDemoData(enabled: boolean) {
    try {
      await setDemoDataEnabled(enabled);
      setDemoDataEnabledState(enabled);
      const cycles = await listCycles();
      const currentYear = new Date().getFullYear();
      setPeriodsThisYear(cycles.filter((c) => Number(c.startDate.slice(0, 4)) === currentYear).length);
      Alert.alert(
        enabled ? "Demo data loaded" : "Demo data cleared",
        enabled
          ? "A month of sample PCOS-consistent data was added. Check Cycle Tracking, Symptom Check-In, and Analytics."
          : "Demo data was removed and your previous data (if any) was restored.",
      );
    } catch (err) {
      Alert.alert("Demo data toggle failed", err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleClearNonDemoData() {
    try {
      await clearNonDemoData();
      const cycles = await listCycles();
      const currentYear = new Date().getFullYear();
      setPeriodsThisYear(cycles.filter((c) => Number(c.startDate.slice(0, 4)) === currentYear).length);
      Alert.alert("Real data cleared", "Everything except demo data (if any) has been removed.");
    } catch (err) {
      Alert.alert("Clear failed", err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // best-effort — even if the network call fails, still send the user
      // back to the login gate locally
    }
    setScreen("login");
  }

  const prevDepthRef = useRef(0);
  const depth = screen ? SCREEN_DEPTH[screen] : 0;
  const direction: "forward" | "back" = depth >= prevDepthRef.current ? "forward" : "back";
  useEffect(() => {
    prevDepthRef.current = depth;
  }, [depth]);

  if (screen === null || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, { backgroundColor: SCREEN_BACKGROUNDS.welcome }]} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <ScreenTransition screenKey={screen} direction={direction} backgroundColor={SCREEN_BACKGROUNDS[screen]}>
        {screen === "welcome" && <WelcomeScreen onContinue={() => setScreen("login")} />}
        {screen === "login" && (
          <LoginScreen
            onLoggedIn={goHome}
            onPressSignUp={() => setScreen("signUp")}
          />
        )}
        {screen === "signUp" && (
          <SignUpScreen
            onSignedUp={goHome}
            onPressLogIn={() => setScreen("login")}
          />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            onPressSymptomCheckIn={() => setScreen("symptomCheckIn")}
            onPressCycleTracking={() => setScreen("cycleTracking")}
            onPressAnalytics={() => setScreen("analytics")}
            onPressProfile={goProfile}
            onPressNotes={() => setScreen("notes")}
            onPressTreatmentLog={() => setScreen("treatmentLog")}
          />
        )}
        {screen === "symptomCheckIn" && (
          <SymptomCheckInScreen
            onPressAcneTracker={() => setScreen("trackerHistory")}
            onPressHairTracker={() => setScreen("hairTracker")}
            onPressAnalytics={() => setScreen("analytics")}
            onPressTreatmentLog={() => setScreen("treatmentLog")}
            onPressHome={goHome}
            onPressProfile={goProfile}
          />
        )}
        {screen === "trackerHistory" && (
          <HistoryScreen
            onPressCapture={() => setScreen("capture")}
            onSelectEntry={showTrackerResult}
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "capture" && (
          <CaptureScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
            onSubmitted={showTrackerResult}
          />
        )}
        {screen === "trackerResult" && trackerResultData && (
          <ResultScreen
            data={trackerResultData}
            onPressBack={() => setScreen("trackerHistory")}
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "hairTracker" && (
          <HairTrackerScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "analytics" && (
          <AnalyticsScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            periodsThisYear={periodsThisYear}
            onPressHome={goHome}
            onPressEditPhoto={comingSoon("Editing your photo")}
            onPressChatWithUs={comingSoon("Chat")}
            onPressPrivacy={comingSoon("Privacy settings")}
            onPressSignOut={handleSignOut}
            demoDataEnabled={demoDataEnabled}
            onToggleDemoData={handleToggleDemoData}
            onPressClearNonDemoData={handleClearNonDemoData}
          />
        )}
        {screen === "cycleTracking" && (
          <CycleTrackingScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "notes" && (
          <NotesScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        {screen === "treatmentLog" && (
          <TreatmentLogScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        </ScreenTransition>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
