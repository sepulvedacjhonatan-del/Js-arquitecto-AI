import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme, FONTS } from "@/src/contexts/ThemeContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { api, Chat } from "@/src/api/client";
import { JsLogo } from "@/src/components/JsLogo";

type Props = {
  visible: boolean;
  onClose: () => void;
  activeChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  chatsVersion: number; // bumps to force reload
};

const DRAWER_WIDTH_PCT = 0.82;

export function DrawerMenu({
  visible,
  onClose,
  activeChatId,
  onSelectChat,
  onNewChat,
  onOpenSettings,
  onOpenAbout,
  chatsVersion,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

  const translateX = useSharedValue(-1);
  const backdropOpacity = useSharedValue(0);
  const [renderOverlay, setRenderOverlay] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenderOverlay(true);
      translateX.value = withTiming(0, { duration: 220 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
    } else if (renderOverlay) {
      translateX.value = withTiming(-1, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setRenderOverlay)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listChats();
      setChats(data);
    } catch {
      // ignore silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadChats();
  }, [visible, chatsVersion, loadChats]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 400 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.7,
  }));

  const handleAction = useCallback(
    (fn: () => void) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onClose();
      setTimeout(fn, 220);
    },
    [onClose],
  );

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch {}
  }, []);

  const drawerStyleStatic = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderRightColor: colors.borderStrong,
      paddingTop: insets.top,
    }),
    [colors, insets.top],
  );

  if (!renderOverlay) return null;

  return (
    <Modal transparent visible={renderOverlay} animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "#000000" },
            backdropStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="drawer-backdrop" />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            drawerStyleStatic,
            { width: `${DRAWER_WIDTH_PCT * 100}%` },
            drawerStyle,
          ]}
          testID="drawer-menu"
        >
          {/* Header */}
          <View
            style={[styles.header, { borderBottomColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}
          >
            <JsLogo size={54} variant="solid" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.headerName, { color: colors.onSurface, fontFamily: FONTS.mono }]} numberOfLines={1}>
                {user?.name || "USER"}
              </Text>
              <Text style={[styles.headerEmail, { color: colors.muted, fontFamily: FONTS.mono }]} numberOfLines={1}>
                {user?.email || ""}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              testID="drawer-close-button"
            >
              <Feather name="x" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* New chat */}
          <Pressable
            onPress={() => handleAction(onNewChat)}
            style={[styles.newChatBtn, { backgroundColor: colors.brand }]}
            testID="drawer-new-chat-button"
          >
            <Feather name="plus" size={18} color={colors.onBrand} />
            <Text style={[styles.newChatText, { color: colors.onBrand, fontFamily: FONTS.mono }]}>
              {t("newChat")}
            </Text>
          </Pressable>

          {/* Section: History */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.muted, fontFamily: FONTS.mono }]}>
              // {t("history").toUpperCase()}
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {loading && (
              <View style={{ padding: 16 }}>
                <ActivityIndicator color={colors.brand} />
              </View>
            )}
            {!loading && chats.length === 0 && (
              <Text style={{ padding: 16, color: colors.muted, fontFamily: FONTS.mono, fontSize: 12 }}>
                {"> "} EMPTY
              </Text>
            )}
            {chats.map((c) => {
              const active = c.id === activeChatId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => handleAction(() => onSelectChat(c.id))}
                  style={[
                    styles.chatItem,
                    {
                      backgroundColor: active ? colors.surfaceSecondary : "transparent",
                      borderLeftColor: active ? colors.brand : "transparent",
                    },
                  ]}
                  testID={`drawer-chat-${c.id}`}
                >
                  <Feather name="message-square" size={14} color={colors.onSurface} />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      color: colors.onSurface,
                      fontFamily: FONTS.mono,
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {c.title}
                  </Text>
                  <Pressable onPress={() => deleteChat(c.id)} hitSlop={10} testID={`drawer-delete-${c.id}`}>
                    <Feather name="trash-2" size={14} color={colors.muted} />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer nav */}
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1 }}>
            <FooterItem
              icon="settings"
              label={t("settings")}
              onPress={() => handleAction(onOpenSettings)}
              testID="drawer-settings-button"
            />
            <FooterItem
              icon="info"
              label={t("about")}
              onPress={() => handleAction(onOpenAbout)}
              testID="drawer-about-button"
            />
            <FooterItem
              icon="log-out"
              label={t("signOut")}
              onPress={async () => {
                await signOut();
                onClose();
              }}
              destructive
              testID="drawer-signout-button"
            />
            <View style={{ height: insets.bottom }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function FooterItem({
  icon,
  label,
  onPress,
  destructive,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const color = destructive ? colors.error : colors.onSurface;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerItem,
        { backgroundColor: pressed ? colors.surfaceSecondary : "transparent" },
      ]}
      testID={testID}
    >
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.footerLabel, { color, fontFamily: FONTS.mono }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 2,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  newChatText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
