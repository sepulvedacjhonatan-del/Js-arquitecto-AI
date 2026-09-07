import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { useAuth } from "@/src/contexts/AuthContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.borderStrong, backgroundColor: colors.surface },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} testID="settings-back">
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: colors.onSurface, fontFamily: FONTS.display }]}>
          {t("settings")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Account */}
        <SectionLabel label={t("account")} />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.muted, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 }}>
            {t("name").toUpperCase()}
          </Text>
          <Text style={{ color: colors.onSurface, fontFamily: FONTS.mono, fontSize: 14, marginTop: 4 }}>
            {user?.name || "-"}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: FONTS.mono,
              fontSize: 10,
              letterSpacing: 1,
              marginTop: 12,
            }}
          >
            {t("email").toUpperCase()}
          </Text>
          <Text style={{ color: colors.onSurface, fontFamily: FONTS.mono, fontSize: 14, marginTop: 4 }}>
            {user?.email || "-"}
          </Text>
        </View>

        {/* Theme */}
        <SectionLabel label={t("theme")} />
        <SegmentedRow
          testIDPrefix="theme"
          value={mode}
          options={[
            { key: "light", label: t("light") },
            { key: "dark", label: t("dark") },
            { key: "system", label: t("system") },
          ]}
          onChange={(v) => setMode(v as any)}
        />

        {/* Language */}
        <SectionLabel label={t("language")} />
        <SegmentedRow
          testIDPrefix="lang"
          value={lang}
          options={[
            { key: "es", label: "ES · Español" },
            { key: "en", label: "EN · English" },
          ]}
          onChange={(v) => setLang(v as any)}
        />
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: 2,
          fontWeight: "700",
        }}
      >
        // {label.toUpperCase()}
      </Text>
    </View>
  );
}

function SegmentedRow({
  value,
  options,
  onChange,
  testIDPrefix,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
  testIDPrefix: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.segRow,
        { borderColor: colors.borderStrong, marginHorizontal: 20 },
      ]}
    >
      {options.map((opt, i) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segItem,
              {
                backgroundColor: active ? colors.onSurface : colors.surface,
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: colors.borderStrong,
              },
            ]}
            testID={`${testIDPrefix}-${opt.key}`}
          >
            <Text
              style={{
                color: active ? colors.surface : colors.onSurface,
                fontFamily: FONTS.mono,
                fontSize: 12,
                fontWeight: "900",
                letterSpacing: 1,
                textAlign: "center",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
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
  card: {
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
  },
  segRow: {
    flexDirection: "row",
    borderWidth: 2,
  },
  segItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
