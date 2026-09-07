import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { api, Chat, Message } from "@/src/api/client";
import { JsLogo } from "@/src/components/JsLogo";
import { DrawerMenu } from "@/src/components/DrawerMenu";
import { MessageBubble } from "@/src/components/MessageBubble";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatsVersion, setChatsVersion] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const openDrawer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDrawerOpen(true);
  }, []);

  const loadChat = useCallback(async (chatId: string) => {
    try {
      const msgs = await api.getMessages(chatId);
      setMessages(msgs);
    } catch {}
  }, []);

  const selectChat = useCallback(
    async (chatId: string) => {
      const chats = await api.listChats().catch(() => [] as Chat[]);
      const found = chats.find((c) => c.id === chatId);
      if (found) setActiveChat(found);
      await loadChat(chatId);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    },
    [loadChat],
  );

  const startNewChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let chat = activeChat;
      if (!chat) {
        chat = await api.createChat();
        setActiveChat(chat);
      }
      const reply = await api.sendMessage(chat.id, text);
      // Reload messages so ids match server
      const server = await api.getMessages(chat.id);
      setMessages(server);
      setChatsVersion((v) => v + 1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `! ${e?.message || "Error"}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, activeChat]);

  const suggestions = [t("suggest1"), t("suggest2"), t("suggest3")];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.borderStrong,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable onPress={openDrawer} hitSlop={12} style={styles.menuBtn} testID="header-menu-button">
          <Feather name="menu" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.onSurface, fontFamily: FONTS.display },
            ]}
            numberOfLines={1}
          >
            {activeChat?.title || "js.AI"}
          </Text>
        </View>
        <Pressable onPress={startNewChat} hitSlop={12} style={styles.menuBtn} testID="header-new-chat-button">
          <Feather name="edit" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap} testID="empty-state">
            <View style={[styles.watermarkWrap, { pointerEvents: "none" }]}>
              <JsLogo size={220} variant="watermark" />
            </View>
            <Text style={[styles.emptyHint, { color: colors.muted, fontFamily: FONTS.mono }]}>
              {t("emptyHint")}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={[styles.typingText, { color: colors.muted, fontFamily: FONTS.mono }]}>
                  {t("typing")}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Suggestions when empty */}
        {messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestRow}
          >
            {suggestions.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => setInput(s)}
                style={[
                  styles.suggestChip,
                  { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
                ]}
                testID={`suggest-chip-${i}`}
              >
                <Text style={{ color: colors.onSurface, fontFamily: FONTS.mono, fontSize: 12 }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.borderStrong,
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder={t("placeholder")}
            placeholderTextColor={colors.muted}
            multiline
            style={[
              styles.input,
              {
                color: colors.onSurface,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderStrong,
                fontFamily: FONTS.mono,
              },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={sending || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !sending ? colors.brand : colors.surfaceTertiary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="chat-send-button"
          >
            {sending ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Feather
                name="arrow-up"
                size={20}
                color={input.trim() ? colors.onBrand : colors.muted}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeChatId={activeChat?.id ?? null}
        onSelectChat={selectChat}
        onNewChat={startNewChat}
        onOpenSettings={() => router.push("/settings")}
        onOpenAbout={() => router.push("/about")}
        chatsVersion={chatsVersion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  menuBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    maxWidth: "80%",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  watermarkWrap: {
    marginBottom: 24,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  suggestRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginRight: 8,
    flexShrink: 0,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    letterSpacing: 1,
  },
});
