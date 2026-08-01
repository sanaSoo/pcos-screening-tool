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

import { dividerLineXml, flowerRemixXml, flowerSolidXml } from "../../assets/auth/icons";
import { arrowDownXml } from "../../assets/welcome/icons";
import { signUp } from "../../lib/auth";

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onSignedUp?: () => void;
  onPressLogIn?: () => void;
};

export default function SignUpScreen({ onSignedUp, onPressLogIn }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  const t = (n: number) => insets.top + s(n);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function clearError() {
    setError(null);
  }

  async function handleSignUp() {
    if (!username || !password || !confirmPassword || !email) {
      setError("Fill in every field.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { session } = await signUp({ email, username, password });
      if (session) {
        onSignedUp?.();
      } else {
        setPendingConfirmation(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffcc7d" }}>
      <Text
        style={{ position: "absolute", left: 0, top: t(176), width: screenWidth, fontSize: s(30), fontWeight: "800", color: "#fff", textAlign: "center" }}
      >
        SiGN UP
      </Text>

      <TextInput
        value={username}
        onChangeText={(v) => { setUsername(v); clearError(); }}
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
        onChangeText={(v) => { setPassword(v); clearError(); }}
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

      <TextInput
        value={confirmPassword}
        onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
        placeholder="re-type password"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{ position: "absolute", left: s(76), top: t(383), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(76), top: t(423) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      <TextInput
        value={email}
        onChangeText={(v) => { setEmail(v); clearError(); }}
        placeholder="email"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={{ position: "absolute", left: s(76), top: t(450), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(76), top: t(490) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={onPressLogIn} style={{ position: "absolute", left: 0, top: t(507), width: screenWidth, alignItems: "center" }}>
        <Text style={{ fontSize: s(10), fontWeight: "800", color: "#fff" }}>
          already have an account? <Text style={{ textDecorationLine: "underline" }}>log in</Text>
        </Text>
      </TouchableOpacity>

      {pendingConfirmation ? (
        <Text style={{ position: "absolute", left: s(30), top: t(524), width: s(330), fontSize: s(12), fontWeight: "700", color: "#000", textAlign: "center" }}>
          Check your email to confirm your account, then log in.
        </Text>
      ) : (
        error && (
          <Text style={{ position: "absolute", left: s(30), top: t(524), width: s(330), fontSize: s(12), fontWeight: "700", color: "#7a1f2b", textAlign: "center" }}>
            {error}
          </Text>
        )
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSignUp}
        disabled={submitting}
        style={{ position: "absolute", left: s(172), top: t(538), width: s(48.192), height: s(48.192), alignItems: "center", justifyContent: "center" }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <SvgXml xml={arrowDownXml} width={s(48)} height={s(48)} />
        )}
      </TouchableOpacity>

      <View pointerEvents="none" style={{ position: "absolute", left: s(244), top: t(604) }}>
        <SvgXml xml={flowerRemixXml} width={s(108)} height={s(108)} color="#e47083" />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: s(31), top: t(77), transform: [{ rotate: "20.93deg" }] }}>
        <SvgXml xml={flowerRemixXml} width={s(70.097)} height={s(70.097)} color="#e47083" />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: s(181), top: t(691) }}>
        <SvgXml xml={flowerSolidXml} width={s(67.798)} height={s(67.798)} color="#e47083" />
      </View>
    </View>
  );
}
