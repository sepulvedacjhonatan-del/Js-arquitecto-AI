import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { JsLogo } from "@/src/components/JsLogo";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.borderStrong, backgroundColor: colors.surface },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} testID="about-back">
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: colors.onSurface, fontFamily: FONTS.display }]}>
          {t("about")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <JsLogo size={120} variant="solid" />
        <Text style={[styles.brand, { color: colors.onSurface, fontFamily: FONTS.display }]}>
          js.AI
        </Text>
        <View style={[styles.accent, { backgroundColor: colors.brand }]} />
        <Text style={[styles.subtitle, { color: colors.muted, fontFamily: FONTS.mono }]}>
          v1.0.0 · GPT-5.4
        </Text>
        <View
          style={[
            styles.card,
            { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <Text
            style={{
              color: colors.onSurface,
              fontFamily: FONTS.mono,
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            {t("aboutText")}
          </Text>
        </View>
        <Text
          style={{
            color: colors.muted,
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: 2,
            marginTop: 24,
          }}
        >
          FREE FOREVER · BRUTALIST TOOL
        </Text>
        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  body: {
    padding: 24,
    alignItems: "center",
  },
  brand: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -3,
    marginTop: 24,
  },
  accent: {
    width: 80,
    height: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 24,
  },
  card: {
    borderWidth: 2,
    padding: 20,
    width: "100%",
  },
});
