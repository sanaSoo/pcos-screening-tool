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
import { updatePassword } from "../../lib/auth";

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

type Props = {
  // Called once the password has actually been changed — the caller
  // (App.tsx) should route back to a signed-in screen, since updateUser()
  // requires (and leaves in place) an active session from the reset deep link.
  onPasswordUpdated?: () => void;
};

export default function ResetPasswordScreen({ onPasswordUpdated }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  const t = (n: number) => insets.top + s(n);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!password || !confirmPassword) {
      setError("Fill in both fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updatePassword(password);
      onPasswordUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffcc7d" }}>
      <Text
        style={{ position: "absolute", left: 0, top: t(176), width: screenWidth, fontSize: s(24), fontWeight: "800", color: "#fff", textAlign: "center" }}
      >
        RESET PASSWORD
      </Text>

      <TextInput
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        placeholder="new password"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{ position: "absolute", left: s(76), top: t(255), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(76), top: t(295) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      <TextInput
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          setError(null);
        }}
        placeholder="re-type password"
        placeholderTextColor="rgba(255,255,255,0.75)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{ position: "absolute", left: s(76), top: t(315), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
      />
      <View style={{ position: "absolute", left: s(77), top: t(355) }}>
        <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
      </View>

      {error && (
        <Text style={{ position: "absolute", left: s(30), top: t(372), width: s(330), fontSize: s(12), fontWeight: "700", color: "#7a1f2b", textAlign: "center" }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSubmit}
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
