import { View, Text, StyleSheet } from "react-native";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { Message } from "@/src/api/client";

type Props = { message: Message };

/**
 * Brutalist chat bubble. Splits assistant messages into text and ```code``` blocks.
 */
export function MessageBubble({ message }: Props) {
  const { colors } = useTheme();
  const isUser = message.role === "user";

  const parts = parseContent(message.content);

  const containerStyle = isUser
    ? {
        alignSelf: "flex-end" as const,
        backgroundColor: colors.surfaceSecondary,
        borderLeftColor: colors.brand,
        marginLeft: 40,
      }
    : {
        alignSelf: "flex-start" as const,
        backgroundColor: colors.surface,
        borderLeftColor: colors.onSurface,
        marginRight: 40,
      };

  return (
    <View style={styles.row} testID={`message-${message.role}`}>
      <View style={[styles.bubble, containerStyle]}>
        <Text
          style={[
            styles.roleLabel,
            {
              color: isUser ? colors.brand : colors.onSurface,
              fontFamily: FONTS.mono,
            },
          ]}
        >
          {isUser ? "> YOU" : "> js.AI"}
        </Text>
        {parts.map((p, i) =>
          p.type === "code" ? (
            <View
              key={i}
              style={[
                styles.codeBlock,
                { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong },
              ]}
            >
              {p.lang ? (
                <Text
                  style={{
                    color: colors.brand,
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    letterSpacing: 1,
                    marginBottom: 6,
                    fontWeight: "700",
                  }}
                >
                  {p.lang.toUpperCase()}
                </Text>
              ) : null}
              <Text
                style={{
                  color: colors.onSurfaceTertiary,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {p.content}
              </Text>
            </View>
          ) : (
            <Text
              key={i}
              style={{
                color: colors.onSurface,
                fontFamily: FONTS.mono,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {p.content}
            </Text>
          ),
        )}
      </View>
    </View>
  );
}

type Part = { type: "text" | "code"; content: string; lang?: string };

function parseContent(text: string): Part[] {
  const parts: Part[] = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      const chunk = text.slice(last, match.index).trim();
      if (chunk) parts.push({ type: "text", content: chunk });
    }
    parts.push({ type: "code", lang: match[1], content: match[2].trimEnd() });
    last = regex.lastIndex;
  }
  if (last < text.length) {
    const tail = text.slice(last).trim();
    if (tail) parts.push({ type: "text", content: tail });
  }
  if (parts.length === 0) parts.push({ type: "text", content: text });
  return parts;
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bubble: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: "92%",
  },
  roleLabel: {
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    fontWeight: "900",
  },
  codeBlock: {
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
});
