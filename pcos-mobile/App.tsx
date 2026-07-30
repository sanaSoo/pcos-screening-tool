import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import DashboardScreen from "./screens/dashboard/DashboardScreen";
import ProfileScreen from "./screens/profile/ProfileScreen";
import CaptureScreen from "./screens/skin_tracking/CaptureScreen";
import SymptomCheckInScreen from "./screens/symptom_checkin/SymptomCheckInScreen";
import WelcomeScreen from "./screens/welcome/WelcomeScreen";

type Screen = "welcome" | "dashboard" | "symptomCheckIn" | "capture" | "profile";

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  welcome: "#ffcc7d",
  dashboard: "#fff7e7",
  symptomCheckIn: "#fff7e7",
  capture: "#fff7e7",
  profile: "#fff7e7",
};

const comingSoon = (feature: string) => () =>
  Alert.alert(feature, `${feature} is coming soon.`);

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const goHome = () => setScreen("dashboard");
  const goProfile = () => setScreen("profile");

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: SCREEN_BACKGROUNDS[screen] }]}>
        <StatusBar style="auto" />
        {screen === "welcome" && (
          <WelcomeScreen onContinue={() => setScreen("dashboard")} />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            onPressSymptomCheckIn={() => setScreen("symptomCheckIn")}
            onPressProfile={goProfile}
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
            onPressHome={goHome}
            onPressEditPhoto={comingSoon("Editing your photo")}
            onPressSelectDiagnosis={comingSoon("Selecting a diagnosis")}
            onPressChatWithUs={comingSoon("Chat")}
            onPressPrivacy={comingSoon("Privacy settings")}
            onPressSignOut={() => setScreen("welcome")}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
