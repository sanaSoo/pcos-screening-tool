import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getSession, signOut } from "./lib/auth";
import { listCycles } from "./lib/cycles_api";
import CycleTrackingScreen from "./screens/cycles/CycleTrackingScreen";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import LoginScreen from "./screens/login/LoginScreen";
import NotesScreen from "./screens/notes/NotesScreen";
import ProfileScreen from "./screens/profile/ProfileScreen";
import CaptureScreen from "./screens/skin_tracking/CaptureScreen";
import SignUpScreen from "./screens/signup/SignUpScreen";
import SymptomCheckInScreen from "./screens/symptom_checkin/SymptomCheckInScreen";
import WelcomeScreen from "./screens/welcome/WelcomeScreen";

type Screen =
  | "welcome"
  | "login"
  | "signUp"
  | "dashboard"
  | "symptomCheckIn"
  | "capture"
  | "profile"
  | "cycleTracking"
  | "notes";

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  welcome: "#ffcc7d",
  login: "#ffcc7d",
  signUp: "#ffcc7d",
  dashboard: "#fff7e7",
  symptomCheckIn: "#fff7e7",
  capture: "#fff7e7",
  profile: "#fff7e7",
  cycleTracking: "#fff7e7",
  notes: "#fff7e7",
};

const comingSoon = (feature: string) => () =>
  Alert.alert(feature, `${feature} is coming soon.`);

export default function App() {
  // null while we check for a persisted Supabase session on launch — a
  // returning logged-in user should land straight on the Dashboard instead
  // of being bounced through Welcome/Login again.
  const [screen, setScreen] = useState<Screen | null>(null);
  const [periodsThisYear, setPeriodsThisYear] = useState(0);
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
  }, [screen]);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // best-effort — even if the network call fails, still send the user
      // back to the login gate locally
    }
    setScreen("login");
  }

  if (screen === null) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, { backgroundColor: SCREEN_BACKGROUNDS.welcome }]} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: SCREEN_BACKGROUNDS[screen] }]}>
        <StatusBar style="auto" hidden={screen === "capture"} />
        {screen === "welcome" && <WelcomeScreen onContinue={goHome} />}
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
            onPressProfile={goProfile}
            onPressNotes={() => setScreen("notes")}
          />
        )}
        {screen === "symptomCheckIn" && (
          <SymptomCheckInScreen
            onPressAcneTracker={() => setScreen("capture")}
            onPressHairTracker={comingSoon("Hair Tracker")}
            onPressHome={goHome}
            onPressProfile={goProfile}
          />
        )}
        {screen === "capture" && (
          <CaptureScreen
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
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
