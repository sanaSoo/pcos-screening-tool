import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoButton from "../../components/InfoButton";
import NavigationBar from "../../components/NavigationBar";
import AcneWidget from "./widgets/AcneWidget";
import HairWidget from "./widgets/HairWidget";
import OverviewWidget from "./widgets/OverviewWidget";
import PeriodWidget from "./widgets/PeriodWidget";

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function AnalyticsScreen({ onPressHome, onPressQuickCheckIn, onPressProfile }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <InfoButton
          title="About Your Analytics"
          message="These widgets pull together everything you've logged — periods, acne check-ins, and hair check-ins — so patterns are easier to spot than scrolling back through individual entries."
          style={{ position: "absolute", top: 14, right: 16 }}
        />
        <Text style={styles.title}>ANALYTICS</Text>
        <Text style={styles.subtitle}>your trends, all in one place</Text>

        <OverviewWidget />
        <PeriodWidget />
        <AcneWidget />
        <HairWidget />
      </ScrollView>

      <NavigationBar
        onPressHome={onPressHome}
        onPressQuickCheckIn={onPressQuickCheckIn}
        onPressProfile={onPressProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7e7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 14, alignItems: "center", paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: "800", color: "#000" },
  subtitle: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 4, marginBottom: 8 },
});
