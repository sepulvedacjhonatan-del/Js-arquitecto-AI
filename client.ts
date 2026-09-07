import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = "jsai_auth_token";

export type User = {
  id: string;
  email: string;
  name: string;
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

async function getToken(): Promise<string | null> {
  return await storage.secureGet<string>(TOKEN_KEY, "");
}

export async function setToken(token: string) {
  await storage.secureSet(TOKEN_KEY, token);
}

export async function clearToken() {
  await storage.secureRemove(TOKEN_KEY);
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (data as any)?.detail || (typeof data === "string" ? data : "Error de red");
    throw new Error(typeof message === "string" ? message : "Error");
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, name }) },
      false,
    ),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    ),
  me: () => request<User>("/auth/me"),

  listChats: () => request<Chat[]>("/chats"),
  createChat: (title?: string) =>
    request<Chat>("/chats", { method: "POST", body: JSON.stringify({ title: title || null }) }),
  getMessages: (chatId: string) => request<Message[]>(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, content: string) =>
    request<Message>(`/chats/${chatId}/messages/sync`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  renameChat: (chatId: string, title: string) =>
    request<Chat>(`/chats/${chatId}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteChat: (chatId: string) => request(`/chats/${chatId}`, { method: "DELETE" }),
};
