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
import { requestPasswordReset } from "../../lib/auth";

// Same exact-Figma-coordinates-scaled-to-device-width approach as
// DashboardScreen.tsx — see that file's header comment for why.
const FRAME_WIDTH = 390;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onPressLogIn?: () => void;
};

export default function ForgotPasswordScreen({ onPressLogIn }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = screenWidth / FRAME_WIDTH;
  const s = (n: number) => n * scale;
  const t = (n: number) => insets.top + s(n);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email) {
      setError("Enter your email.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
        FORGOT PASSWORD
      </Text>

      {sent ? (
        <Text style={{ position: "absolute", left: s(30), top: t(260), width: s(330), fontSize: s(14), fontWeight: "700", color: "#fff", textAlign: "center" }}>
          If an account exists for {email}, a password reset link has been sent — check your inbox.
        </Text>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            placeholder="email"
            placeholderTextColor="rgba(255,255,255,0.75)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={{ position: "absolute", left: s(76), top: t(255), width: s(238), height: s(30), fontSize: s(20), fontWeight: "800", color: "#fff", textAlign: "center" }}
          />
          <View style={{ position: "absolute", left: s(76), top: t(295) }}>
            <SvgXml xml={dividerLineXml} width={s(238)} height={s(5)} color="#fff" />
          </View>

          {error && (
            <Text style={{ position: "absolute", left: s(30), top: t(312), width: s(330), fontSize: s(12), fontWeight: "700", color: "#7a1f2b", textAlign: "center" }}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
            style={{ position: "absolute", left: s(174), top: t(345), width: s(48.192), height: s(48.192), alignItems: "center", justifyContent: "center" }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <SvgXml xml={arrowDownXml} width={s(48)} height={s(48)} />
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity activeOpacity={0.7} onPress={onPressLogIn} style={{ position: "absolute", left: 0, top: t(sent ? 340 : 415), width: screenWidth, alignItems: "center" }}>
        <Text style={{ fontSize: s(10), fontWeight: "800", color: "#fff" }}>
          back to <Text style={{ textDecorationLine: "underline" }}>log in</Text>
        </Text>
      </TouchableOpacity>

      <View pointerEvents="none" style={{ position: "absolute", left: s(13), top: s(607) }}>
        <SvgXml xml={flowerOutlineBigXml} width={s(148.125)} height={s(237.007)} color="#e47083" />
      </View>
    </View>
  );
}
