# app/api/ — HTTP Layer (Presentation for the Backend)

## Purpose

This folder is the **outermost layer** of the backend. It handles HTTP requests
and responses — nothing more.

## What lives here

| File (Phase 2+) | Responsibility |
|-----------------|----------------|
| `routes/auth.py` | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| `routes/chat.py` | `GET /chats`, `POST /messages`, `GET /messages/{chat_id}` |
| `routes/ai.py` | `POST /ai/summary`, `POST /ai/tasks`, `POST /ai/priority` |
| `schemas/` | Pydantic models for request/response JSON validation |
| `deps.py` | FastAPI dependencies (get current user from JWT, get DB session) |

## Clean Architecture Rule

Routers should be **thin**:

1. Validate input (Pydantic schema)
2. Call an application service
3. Return the result as JSON

They should **never** contain SQL queries, password hashing, or LLM calls directly.

## How Flutter talks to this layer

Flutter sends HTTP requests (via `dio` or `http` package) to these endpoints.
Example flow for login:

```
Flutter  →  POST /auth/login  { email, password }
Backend  →  api/routes/auth.py validates input
           →  application/auth_service.py checks credentials
           →  returns { access_token, token_type }
Flutter  ←  stores JWT in secure storage
```
