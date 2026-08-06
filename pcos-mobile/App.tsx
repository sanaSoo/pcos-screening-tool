import { Pacifico_400Regular, useFonts } from "@expo-google-fonts/pacifico";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ScreenTransition from "./components/ScreenTransition";
import WeightCheckInPrompt from "./components/WeightCheckInPrompt";
import { getSession, signOut } from "./lib/auth";
import { listCycles } from "./lib/cycles_api";
import { ageFromBirthdate, daysTrackingSince } from "./lib/date_utils";
import { hasCompletedIntake, IntakeResult } from "./lib/intake_api";
import { getProfile, missingOnboardingStep } from "./lib/profile_api";
import { supabase } from "./lib/supabase";
import { getLatestWeightLog, getWeightCheckInStatus, logWeight } from "./lib/weight_api";
import AnalyticsScreen from "./screens/analytics/AnalyticsScreen";
import CycleTrackingScreen from "./screens/cycles/CycleTrackingScreen";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import HairTrackerScreen from "./screens/hair/HairTrackerScreen";
import IntakeQuestionnaireScreen from "./screens/intake/IntakeQuestionnaireScreen";
import IntakeResultScreen from "./screens/intake/IntakeResultScreen";
import ForgotPasswordScreen from "./screens/login/ForgotPasswordScreen";
import LoginScreen from "./screens/login/LoginScreen";
import ResetPasswordScreen from "./screens/login/ResetPasswordScreen";
import NotesScreen from "./screens/notes/NotesScreen";
import BaseInfoScreen from "./screens/onboarding/BaseInfoScreen";
import WeightCadenceScreen from "./screens/onboarding/WeightCadenceScreen";
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
  | "baseInfo"
  | "weightCadence"
  | "forgotPassword"
  | "resetPassword"
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
  | "treatmentLog"
  | "intakeQuestionnaire"
  | "intakeResult";

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  welcome: "#ffcc7d",
  login: "#ffcc7d",
  signUp: "#ffcc7d",
  baseInfo: "#fff7e7",
  weightCadence: "#fff7e7",
  forgotPassword: "#ffcc7d",
  resetPassword: "#ffcc7d",
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
  intakeQuestionnaire: "#fff7e7",
  intakeResult: "#fff7e7",
};

// Rough "distance from Welcome" per screen — used only to decide which way
// a transition should slide (deeper = forward/slide-from-right, shallower =
// back/slide-from-left). Not a real navigation stack, just a heuristic.
const SCREEN_DEPTH: Record<Screen, number> = {
  welcome: 0,
  login: 1,
  signUp: 1,
  baseInfo: 1.3,
  weightCadence: 1.6,
  forgotPassword: 2,
  resetPassword: 2,
  dashboard: 2,
  symptomCheckIn: 3,
  trackerHistory: 3,
  hairTracker: 3,
  analytics: 3,
  profile: 3,
  cycleTracking: 3,
  notes: 3,
  treatmentLog: 3,
  intakeQuestionnaire: 4,
  capture: 4,
  trackerResult: 5,
  intakeResult: 5,
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
  const [trackerResultData, setTrackerResultData] = useState<ResultScreenData | null>(null);
  const showTrackerResult = (data: ResultScreenData) => {
    setTrackerResultData(data);
    setScreen("trackerResult");
  };
  const [intakeResultData, setIntakeResultData] = useState<IntakeResult | null>(null);
  const showIntakeResult = (data: IntakeResult) => {
    setIntakeResultData(data);
    setScreen("intakeResult");
  };
  const [accountStats, setAccountStats] = useState<{
    daysTracking?: number;
    age?: number;
    weightLbs?: number;
  }>({});
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const goHome = () => setScreen("dashboard");
  const goProfile = () => setScreen("profile");

  // Routes a signed-in user to whichever mandatory onboarding step (if any)
  // is still missing, otherwise straight to the Dashboard — used on session
  // restore, and after login/signup/password-reset, so existing users
  // missing this data get routed through it too, not just brand-new ones.
  // Order: base info -> weight cadence -> intake questionnaire -> dashboard.
  async function routeAfterAuth() {
    try {
      const profile = await getProfile();
      const step = missingOnboardingStep(profile);
      if (step === "baseInfo") return setScreen("baseInfo");
      if (step === "cadence") return setScreen("weightCadence");
      if (!(await hasCompletedIntake())) return setScreen("intakeQuestionnaire");
      setScreen("dashboard");
    } catch {
      setScreen("dashboard");
    }
  }

  useEffect(() => {
    getSession()
      .then((session) => (session ? routeAfterAuth() : setScreen("welcome")))
      .catch(() => setScreen("welcome"));
  }, []);

  // Password-reset deep links (pcosmobile://reset-password#access_token=...)
  // arrive with the session tokens in the URL *fragment*, not query params —
  // supabase.ts sets detectSessionInUrl: false (correct for RN, there's no
  // URL bar), so the JS SDK never auto-parses this; it has to be done here.
  useEffect(() => {
    function handleUrl(url: string) {
      const fragment = url.split("#")[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) return;
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (!error) setScreen("resetPassword");
      });
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (screen !== "profile") return;
    listCycles().then((cycles) => {
      const currentYear = new Date().getFullYear();
      const count = cycles.filter((c) => Number(c.startDate.slice(0, 4)) === currentYear).length;
      setPeriodsThisYear(count);
    });
  }, [screen]);

  // Powers the "days tracking" / "age" / "weight" stats on Dashboard and
  // Profile — both screens already had these props, just unwired.
  useEffect(() => {
    if (screen !== "dashboard" && screen !== "profile") return;
    getProfile().then((profile) => {
      setAccountStats((prev) => ({
        ...prev,
        daysTracking: daysTrackingSince(new Date(profile.createdAt)),
        age: profile.birthdate ? ageFromBirthdate(profile.birthdate) : undefined,
      }));
    });
    getLatestWeightLog().then((log) => {
      setAccountStats((prev) => ({ ...prev, weightLbs: log?.weightLbs }));
    });
  }, [screen]);

  // Surfaces the "time to log your weight" prompt on Dashboard once the
  // chosen cadence interval has passed since the last logged weight. No
  // push notifications — purely an in-app check on each Dashboard visit.
  useEffect(() => {
    if (screen !== "dashboard") return;
    getWeightCheckInStatus().then((status) => setShowWeightPrompt(status.isDue));
  }, [screen]);

  async function handleLogWeightFromPrompt(weightLbs: number) {
    await logWeight(weightLbs);
    setShowWeightPrompt(false);
    setAccountStats((prev) => ({ ...prev, weightLbs }));
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
            onLoggedIn={routeAfterAuth}
            onPressSignUp={() => setScreen("signUp")}
            onPressForgotPassword={() => setScreen("forgotPassword")}
          />
        )}
        {screen === "signUp" && (
          <SignUpScreen
            onSignedUp={routeAfterAuth}
            onPressLogIn={() => setScreen("login")}
          />
        )}
        {screen === "baseInfo" && (
          <BaseInfoScreen onSubmitted={() => setScreen("weightCadence")} />
        )}
        {screen === "weightCadence" && (
          <WeightCadenceScreen onSubmitted={() => setScreen("intakeQuestionnaire")} />
        )}
        {screen === "forgotPassword" && (
          <ForgotPasswordScreen onPressLogIn={() => setScreen("login")} />
        )}
        {screen === "resetPassword" && (
          <ResetPasswordScreen onPasswordUpdated={routeAfterAuth} />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            daysTracking={accountStats.daysTracking}
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
            onPressIntake={() => setScreen("intakeQuestionnaire")}
            onPressHome={goHome}
            onPressProfile={goProfile}
          />
        )}
        {screen === "intakeQuestionnaire" && (
          <IntakeQuestionnaireScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
            onSubmitted={showIntakeResult}
          />
        )}
        {screen === "intakeResult" && intakeResultData && (
          <IntakeResultScreen
            data={intakeResultData}
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
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
            daysTracking={accountStats.daysTracking}
            weightLbs={accountStats.weightLbs}
            age={accountStats.age}
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
        {screen === "treatmentLog" && (
          <TreatmentLogScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
          />
        )}
        </ScreenTransition>
        <WeightCheckInPrompt
          visible={screen === "dashboard" && showWeightPrompt}
          onLog={handleLogWeightFromPrompt}
          onDismiss={() => setShowWeightPrompt(false)}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
