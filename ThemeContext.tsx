import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";

import { storage } from "@/src/utils/storage";

type ThemeMode = "system" | "light" | "dark";

type Palette = {
  surface: string;
  onSurface: string;
  surfaceSecondary: string;
  onSurfaceSecondary: string;
  surfaceTertiary: string;
  onSurfaceTertiary: string;
  brand: string;
  onBrand: string;
  error: string;
  border: string;
  borderStrong: string;
  divider: string;
  muted: string;
};

const LIGHT: Palette = {
  surface: "#FFFFFF",
  onSurface: "#000000",
  surfaceSecondary: "#F5F5F5",
  onSurfaceSecondary: "#333333",
  surfaceTertiary: "#E5E5E5",
  onSurfaceTertiary: "#000000",
  brand: "#FF5722",
  onBrand: "#FFFFFF",
  error: "#D50000",
  border: "#E0E0E0",
  borderStrong: "#000000",
  divider: "#EEEEEE",
  muted: "#888888",
};

const DARK: Palette = {
  surface: "#000000",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#1A1A1A",
  onSurfaceSecondary: "#CCCCCC",
  surfaceTertiary: "#2A2A2A",
  onSurfaceTertiary: "#FFFFFF",
  brand: "#FF5722",
  onBrand: "#FFFFFF",
  error: "#FF5252",
  border: "#333333",
  borderStrong: "#FFFFFF",
  divider: "#222222",
  muted: "#777777",
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Palette;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "jsai_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(THEME_KEY, "");
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    storage.setItem(THEME_KEY, m);
  }, []);

  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const colors = isDark ? DARK : LIGHT;

  const value = useMemo(() => ({ mode, isDark, colors, setMode }), [mode, isDark, colors, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const FONTS = {
  mono: "Menlo",
  display: "Menlo",
};
