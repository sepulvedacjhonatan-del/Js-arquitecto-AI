import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { JsLogo } from "@/src/components/JsLogo";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setErr(null);
    if (!email || !password || (mode === "signup" && !name)) {
      setErr(t("fillFields"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(t("invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setErr(t("passwordShort"));
      return;
    }
    try {
      setBusy(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim());
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }, [email, password, name, mode, signIn, signUp, t]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brandBlock}>
          <JsLogo size={88} variant="solid" />
          <View style={{ height: 20 }} />
          <Text style={[styles.brand, { color: colors.onSurface, fontFamily: FONTS.display }]}>
            js.AI
          </Text>
          <View style={[styles.accentBar, { backgroundColor: colors.brand }]} />
          <Text style={[styles.tagline, { color: colors.muted, fontFamily: FONTS.mono }]}>
            {t("tagline")}
          </Text>
        </View>

        {/* Mode toggle */}
        <View
          style={[
            styles.tabsRow,
            { borderColor: colors.borderStrong, backgroundColor: colors.surface },
          ]}
        >
          <ModeTab
            active={mode === "signin"}
            label={t("signIn")}
            onPress={() => setMode("signin")}
            testID="tab-signin"
          />
          <ModeTab
            active={mode === "signup"}
            label={t("signUp")}
            onPress={() => setMode("signup")}
            testID="tab-signup"
          />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === "signup" && (
            <BrutalInput
              testID="input-name"
              label={t("name")}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <BrutalInput
            testID="input-email"
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <BrutalInput
            testID="input-password"
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {err && (
            <View
              testID="auth-error"
              style={[styles.errorBox, { borderColor: colors.error, backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={{ color: colors.error, fontFamily: FONTS.mono, fontSize: 12 }}>
                ! {err}
              </Text>
            </View>
          )}

          <Pressable
            testID="auth-submit-button"
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: colors.brand,
                opacity: pressed || busy ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={[styles.submitText, { color: colors.onBrand, fontFamily: FONTS.mono }]}>
                {mode === "signin" ? t("signInCta") : t("signUpCta")} {" >"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setErr(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            style={styles.switchLink}
            testID="auth-switch-mode"
          >
            <Text style={{ color: colors.muted, fontFamily: FONTS.mono, fontSize: 12 }}>
              {mode === "signin" ? t("switchToSignUp") : t("switchToSignIn")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModeTab({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeTab,
        {
          backgroundColor: active ? colors.onSurface : colors.surface,
        },
      ]}
      testID={testID}
    >
      <Text
        style={{
          color: active ? colors.surface : colors.onSurface,
          fontFamily: FONTS.mono,
          fontWeight: "900",
          fontSize: 12,
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BrutalInput(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences";
  keyboardType?: "default" | "email-address";
  autoCorrect?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: 2,
          marginBottom: 6,
          fontWeight: "700",
        }}
      >
        // {props.label.toUpperCase()}
      </Text>
      <TextInput
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize}
        autoCorrect={props.autoCorrect}
        keyboardType={props.keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            color: colors.onSurface,
            backgroundColor: colors.surface,
            borderColor: focused ? colors.brand : colors.borderStrong,
            borderWidth: focused ? 2 : 1,
            fontFamily: FONTS.mono,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  brandBlock: {
    alignItems: "flex-start",
    marginBottom: 32,
  },
  brand: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -3,
  },
  accentBar: {
    width: 80,
    height: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    borderWidth: 2,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    width: "100%",
  },
  inputWrap: {
    marginBottom: 20,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorBox: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 16,
  },
  submit: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  switchLink: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
});
