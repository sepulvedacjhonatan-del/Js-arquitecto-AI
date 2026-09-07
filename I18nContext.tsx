import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

import { storage } from "@/src/utils/storage";

type Lang = "es" | "en";

const STRINGS = {
  es: {
    // Auth
    signIn: "INICIAR SESIÓN",
    signUp: "REGISTRARSE",
    email: "Correo",
    password: "Contraseña",
    name: "Nombre",
    signInCta: "Entrar",
    signUpCta: "Crear cuenta",
    switchToSignUp: "¿No tienes cuenta? Regístrate",
    switchToSignIn: "¿Ya tienes cuenta? Inicia sesión",
    tagline: "TU AGENTE CREADOR DE APPS",
    // Chat
    newChat: "Nuevo chat",
    history: "Historial",
    settings: "Configuración",
    about: "Acerca de",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    signOut: "Cerrar sesión",
    placeholder: "Describe la app que quieres crear...",
    watermark: "js.AI",
    emptyHint: "Empieza describiendo tu app o pregunta lo que sea",
    suggest1: "Crea una app de tareas",
    suggest2: "Explica React Native",
    suggest3: "Genera un login en React",
    delete: "Eliminar",
    rename: "Renombrar",
    cancel: "Cancelar",
    save: "Guardar",
    typing: "js.AI está escribiendo...",
    aboutText:
      "js.AI es tu agente de inteligencia artificial creador de apps. Impulsado por GPT-5.4. Gratis para siempre.",
    account: "Cuenta",
    // Errors
    fillFields: "Completa todos los campos",
    invalidEmail: "Correo inválido",
    passwordShort: "La contraseña debe tener al menos 6 caracteres",
  },
  en: {
    signIn: "SIGN IN",
    signUp: "SIGN UP",
    email: "Email",
    password: "Password",
    name: "Name",
    signInCta: "Enter",
    signUpCta: "Create account",
    switchToSignUp: "No account yet? Sign up",
    switchToSignIn: "Already have an account? Sign in",
    tagline: "YOUR AI APP-BUILDER AGENT",
    newChat: "New chat",
    history: "History",
    settings: "Settings",
    about: "About",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    signOut: "Sign out",
    placeholder: "Describe the app you want to build...",
    watermark: "js.AI",
    emptyHint: "Start by describing your app or ask anything",
    suggest1: "Build a to-do app",
    suggest2: "Explain React Native",
    suggest3: "Generate a React login",
    delete: "Delete",
    rename: "Rename",
    cancel: "Cancel",
    save: "Save",
    typing: "js.AI is typing...",
    aboutText:
      "js.AI is your AI app-builder agent. Powered by GPT-5.4. Free forever.",
    account: "Account",
    fillFields: "Fill all fields",
    invalidEmail: "Invalid email",
    passwordShort: "Password must be at least 6 characters",
  },
} as const;

type StringKey = keyof typeof STRINGS.es;

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
};

const I18nContext = createContext<I18n | undefined>(undefined);
const LANG_KEY = "jsai_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(LANG_KEY, "");
      if (stored === "es" || stored === "en") setLangState(stored);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback((k: StringKey) => STRINGS[lang][k] ?? k, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
