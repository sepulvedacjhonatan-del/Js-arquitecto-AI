import { View, Text, StyleSheet } from "react-native";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";

type Props = {
  size?: number;
  variant?: "solid" | "outline" | "watermark";
};

/**
 * js.AI brand mark. Brutalist square with "js" letters and orange accent bar.
 */
export function JsLogo({ size = 64, variant = "solid" }: Props) {
  const { colors } = useTheme();

  const isWatermark = variant === "watermark";
  const isOutline = variant === "outline";

  const bg = isWatermark
    ? "transparent"
    : isOutline
    ? colors.surface
    : colors.onSurface;
  const fg = isWatermark
    ? colors.onSurface
    : isOutline
    ? colors.onSurface
    : colors.surface;
  const borderColor = isOutline ? colors.borderStrong : "transparent";
  const borderWidth = isOutline ? 3 : 0;

  const letterSize = size * 0.42;
  const accentHeight = size * 0.1;
  const opacity = isWatermark ? 0.12 : 1;

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderColor,
          borderWidth,
          opacity,
        },
      ]}
      testID="jsai-logo"
    >
      <View style={styles.content}>
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: letterSize,
            fontWeight: "900",
            color: fg,
            letterSpacing: -2,
            lineHeight: letterSize * 1.05,
          }}
        >
          js
        </Text>
        <View
          style={{
            width: size * 0.55,
            height: accentHeight,
            backgroundColor: colors.brand,
            marginTop: size * 0.02,
          }}
        />
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: letterSize * 0.4,
            fontWeight: "700",
            color: fg,
            letterSpacing: 2,
            marginTop: size * 0.02,
          }}
        >
          .AI
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  content: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
