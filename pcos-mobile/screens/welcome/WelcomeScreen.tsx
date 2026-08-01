import { SvgXml } from "react-native-svg";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { arrowDownXml } from "../../assets/welcome/icons";

type Props = {
  onContinue?: () => void;
};

export default function WelcomeScreen({ onContinue }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome to <Text style={styles.titleScript}>Steady</Text>
      </Text>

      <TouchableOpacity
        style={styles.arrowButton}
        onPress={onContinue}
        activeOpacity={0.7}
      >
        <SvgXml xml={arrowDownXml} width={48} height={48} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffcc7d",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  titleScript: {
    fontFamily: "Pacifico_400Regular",
    fontWeight: "400",
  },
  arrowButton: {
    position: "absolute",
    bottom: 50,
  },
});
