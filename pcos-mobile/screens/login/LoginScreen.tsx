import { useState } from "react";
import { SvgXml } from "react-native-svg";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dividerLineXml, flowerOutlineBigXml } from "../../assets/auth/icons";
import { arrowDownXml } from "../../assets/welcome/icons";
import { signInWithUsername } from "../../lib/auth";

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

type Props = {
  onLoggedIn?: () => void;
  onPressSignUp?: () => void;
};

export default function LoginScreen({ onLoggedIn, onPressSignUp }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  const t = (n: number) => insets.top + s(n);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithUsername({ username, password });
      onLoggedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffcc7d" }}>
      <Text
        style={{ position: "absolute", left: 0, top: t(176), width: screenWidth, fontSize: s(30), fontWeight: "800", color: "#fff", textAlign: "center" }}
      >
        LOGiN
      </Text>

      <TextInput
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setError(null);
        }}
        placeholder="username"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ position: "absolute", left: s(76), top: t(255), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(76), top: t(295) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      <TextInput
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        placeholder="password"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{ position: "absolute", left: s(76), top: t(315), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(77), top: t(355) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={onPressSignUp} style={{ position: "absolute", left: 0, top: t(371), width: screenWidth, alignItems: "center" }}>
        <Text style={{ fontSize: s(10), fontWeight: "800", color: "#fff" }}>
          dont have an account? <Text style={{ textDecorationLine: "underline" }}>sign up</Text>
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ position: "absolute", left: s(30), top: t(388), width: s(330), fontSize: s(12), fontWeight: "700", color: "#7a1f2b", textAlign: "center" }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogin}
        disabled={submitting}
        style={{ position: "absolute", left: s(174), top: t(410), width: s(48.192), height: s(48.192), alignItems: "center", justifyContent: "center" }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <SvgXml xml={arrowDownXml} width={s(48)} height={s(48)} />
        )}
      </TouchableOpacity>

      <View pointerEvents="none" style={{ position: "absolute", left: s(13), top: s(607) }}>
        <SvgXml xml={flowerOutlineBigXml} width={s(148.125)} height={s(237.007)} color="#e47083" />
      </View>
    </View>
  );
}
