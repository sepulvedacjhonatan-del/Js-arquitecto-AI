# js.AI — Product Requirements

## Overview
**js.AI** is a mobile AI agent app (React Native + Expo) built as an "app-builder AI" — a free chat-based assistant powered by GPT-5.4 that helps developers generate code and answer development questions. Designed with a brutalist mobile aesthetic (stark monochrome + industrial orange accent, sharp 0-radius corners, monospace typography) to differentiate from generic AI slop.

## Core Features (v1)
1. **Email/password authentication** (register + login, JWT stored in expo-secure-store).
2. **Chat with GPT-5.4** — multi-turn conversation, persisted per user in MongoDB.
3. **Multiple chat sessions** — new chat, history, delete, auto-titled from first message.
4. **Left drawer menu** — new chat, chat history list, settings, about, sign out.
5. **Settings** — theme (light/dark/system), language (ES/EN), account info.
6. **Empty state watermark** — massive js.AI logo centered on empty chat.
7. **Code block rendering** — assistant messages parse ```lang ... ``` fences into styled blocks.
8. **Suggestion chips** — quick prompts for onboarding.

## Tech
- Frontend: Expo Router, React Native, Reanimated, expo-secure-store, expo-haptics
- Backend: FastAPI, MongoDB, bcrypt, PyJWT, emergentintegrations (GPT-5.4 via Emergent Universal Key)
- Design: Brutalist Mobile — Space Mono / Menlo, `#FF5722` accent, sharp corners, thick borders

## Notes / Future
- Streaming SSE endpoint exists (`/api/chats/{id}/messages`) but mobile uses `/messages/sync` for reliability.
- Future: rename chat UI, share chat, code copy button, image inputs.
