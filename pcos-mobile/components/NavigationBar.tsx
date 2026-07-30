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
      <View style={styles.strip} />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pill, styles.homePill]}
          onPress={onPressHome}
          activeOpacity={0.8}
        >
          <SvgXml xml={homeIconXml} width={32} height={33} style={{ marginLeft: -16 }} />
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
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "75%",
    height: 70,
    marginTop: -5,
    backgroundColor: "#ffcc7d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  homePill: {
    left: 15,
    width: 117,
    height: 117,
    borderRadius: 58.5,
    backgroundColor: "#e47083",
    zIndex: 1,
  },
  plusPill: {
    bottom: 0,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#89b8c2",
    marginLeft: -30,
    zIndex: 2,
    elevation: 6,
  },
  plusImage: { width: 80, height: 80 },
  profilePill: {
    right: 15,
    width: 117,
    height: 117,
    borderRadius: 58.5,
    backgroundColor: "#a8bf89",
    overflow: "hidden",
    marginLeft: -15,
    zIndex: 1,
  },
  profileImage: { width: "100%", height: "100%" },
});
