import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import DashboardScreen from "./screens/dashboard/DashboardScreen";
import CaptureScreen from "./screens/skin_tracking/CaptureScreen";
import SymptomCheckInScreen from "./screens/symptom_checkin/SymptomCheckInScreen";
import WelcomeScreen from "./screens/welcome/WelcomeScreen";

type Screen = "welcome" | "dashboard" | "symptomCheckIn" | "capture";

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  welcome: "#ffcc7d",
  dashboard: "#fff7e7",
  symptomCheckIn: "#fff7e7",
  capture: "#fff7e7",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const goHome = () => setScreen("dashboard");

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
          />
        )}
        {screen === "symptomCheckIn" && (
          <SymptomCheckInScreen
            onPressAcneTracker={() => setScreen("capture")}
            onPressHairTracker={() =>
              Alert.alert("Hair Tracker", "Hair tracking is coming soon.")
            }
            onPressHome={goHome}
          />
        )}
        {screen === "capture" && (
          <CaptureScreen
            onPressHome={goHome}
            onPressQuickCheckIn={() => setScreen("symptomCheckIn")}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
