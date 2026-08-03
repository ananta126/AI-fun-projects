# features/ai/ — AI Intelligence Feature (Phase 4)

## Purpose

Surfaces AI-generated insights from conversations. This is the **core differentiator**
of the POC — proving conversations can become actionable.

## Screens (presentation/)

| Screen | Purpose |
|--------|---------|
| `ConversationInsightsScreen` | Shows summary, extracted tasks, and priority for a chat |

## AI Modules

### 1. Conversation Summary
- **Input:** All messages in a conversation
- **Output:** 3–5 bullet points
- **Endpoint:** `POST /ai/summary`

### 2. Task Extraction
- **Input:** One or more messages
- **Output:** JSON with `tasks[]` and `events[]`
- **Endpoint:** `POST /ai/tasks`

### 3. Priority Detection
- **Input:** A message
- **Output:** JSON `{ "category": "work" | "personal" | "reminder" | "promotion" }`
- **Endpoint:** `POST /ai/priority`

## Architecture Note

The Flutter `ai/` feature only **displays** results. All LLM calls happen on the
backend (`infrastructure/ai/`). This keeps API keys secure and allows prompt
engineering without redeploying the mobile app.
