import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { homeIconXml } from "../assets/shared/icons";

const profilePhoto = require("../assets/shared/profile-photo.png");
const plusSymbol = require("../assets/shared/nav-plus-symbol.png");

type Props = {
  onPressHome?: () => void;
  onPressQuickCheckIn?: () => void;
  onPressProfile?: () => void;
};

export default function NavigationBar({
  onPressHome,
  onPressQuickCheckIn,
  onPressProfile,
}: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pill, styles.homePill]}
          onPress={onPressHome}
          activeOpacity={0.8}
        >
          <SvgXml xml={homeIconXml} width={28} height={29} style={{ marginLeft: -14 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, styles.plusPill]}
          onPress={onPressQuickCheckIn}
          activeOpacity={0.8}
        >
          <Image source={plusSymbol} style={styles.plusImage} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, styles.profilePill]}
          onPress={onPressProfile}
          activeOpacity={0.8}
        >
          <Image source={profilePhoto} style={styles.profileImage} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 112,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  homePill: {
    left: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e47083",
    zIndex: 1,
  },
  plusPill: {
    bottom: 0,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#89b8c2",
    marginLeft: -26,
    zIndex: 2,
    elevation: 6,
  },
  plusImage: { width: 66, height: 66 },
  profilePill: {
    right: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#a8bf89",
    overflow: "hidden",
    marginLeft: -13,
    zIndex: 1,
  },
  profileImage: { width: "100%", height: "100%" },
});
