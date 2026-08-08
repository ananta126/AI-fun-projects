# Architecture — AI-First Communication POC

## Vision

Prove that **conversations can automatically become actionable** — summaries, tasks,
events, and priorities extracted from chat without manual effort.

This is not a WhatsApp competitor. It is a **proof of concept** for AI-augmented messaging.

---

## System Overview

```mermaid
flowchart TB
    subgraph Client["Flutter Mobile App"]
        UI["Presentation Layer<br/>(Screens & Widgets)"]
        UC["Domain Layer<br/>(Use Cases)"]
        REPO_F["Data Layer<br/>(Repositories & API Client)"]
        UI --> UC --> REPO_F
    end

    subgraph Server["FastAPI Backend"]
        API["API Layer<br/>(Routers)"]
        APP["Application Layer<br/>(Services)"]
        DOM["Domain Layer<br/>(Entities & Interfaces)"]
        INFRA["Infrastructure Layer<br/>(DB, JWT, LLM)"]
        API --> APP --> DOM
        INFRA --> DOM
    end

    subgraph External["External Services"]
        PG[("PostgreSQL")]
        LLM["OpenAI-Compatible API"]
    end

    REPO_F -->|"HTTPS + JWT"| API
    INFRA --> PG
    INFRA --> LLM
```

---

## Clean Architecture — Both Sides

### The Dependency Rule

Dependencies always point **inward**. Outer layers depend on inner layers, never the reverse.

```
Presentation  →  Application  →  Domain  ←  Infrastructure
   (UI)           (use cases)    (entities)    (DB, HTTP, AI)
```

### Backend Layers

| Layer | Folder | Responsibility | Depends On |
|-------|--------|----------------|------------|
| API | `app/api/` | HTTP routes, JSON validation | application, core |
| Application | `app/application/` | Use case orchestration | domain |
| Domain | `app/domain/` | Entities, repository interfaces | nothing |
| Infrastructure | `app/infrastructure/` | SQLAlchemy, JWT, LLM client | domain |
| Core | `app/core/` | Config, shared utilities | nothing |

### Frontend Layers (per feature)

| Layer | Folder | Responsibility | Depends On |
|-------|--------|----------------|------------|
| Presentation | `features/*/presentation/` | Screens, widgets, state | domain |
| Domain | `features/*/domain/` | Entities, use cases, repo interfaces | nothing |
| Data | `features/*/data/` | API calls, DTOs, repo implementations | domain, core |

---

## Authentication Flow (Phase 2)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Flutter App
    participant A as FastAPI
    participant DB as PostgreSQL

    U->>F: Enter email + password
    F->>A: POST /auth/login
    A->>DB: Find user by email
    DB-->>A: User record
    A->>A: Verify password (bcrypt)
    A->>A: Create JWT token
    A-->>F: { access_token, token_type }
    F->>F: Store JWT in secure storage
    Note over F,A: All future requests include Authorization: Bearer <token>
```

---

## Chat Flow (Phase 3)

```mermaid
sequenceDiagram
    participant A as User A (Flutter)
    participant API as FastAPI
    participant DB as PostgreSQL
    participant B as User B (Flutter)

    A->>API: POST /chats/{id}/messages { content }
    API->>API: Validate JWT → get sender_id
    API->>DB: INSERT message
    DB-->>API: Message saved
    API-->>A: 201 Created

    loop Polling every 3s
        B->>API: GET /chats/{id}/messages?since=...
        API->>DB: SELECT new messages
        DB-->>API: Messages
        API-->>B: [ messages ]
    end
```

---

## AI Pipeline (Phase 4)

```mermaid
flowchart LR
    MSG["Chat Messages"] --> API["POST /ai/summary<br/>POST /ai/tasks<br/>POST /ai/priority"]
    API --> SVC["AI Service<br/>(application layer)"]
    SVC --> PROMPT["Prompt Templates<br/>(infrastructure/ai/prompts)"]
    PROMPT --> LLM["LLM Client<br/>(OpenAI-compatible)"]
    LLM --> PARSE["Parse JSON Response"]
    PARSE --> RESP["Structured Output<br/>to Flutter"]
```

### AI Module Outputs

| Module | Input | Output |
|--------|-------|--------|
| Summary | Full conversation | 3–5 bullet points (string list) |
| Task Extraction | Message text | `{ tasks: [...], events: [...] }` |
| Priority Detection | Message text | `{ category: "work" \| "personal" \| "reminder" \| "promotion" }` |

---

## Database Schema (Planned)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string name
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        text content
        boolean is_read
        timestamp sent_at
    }

    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ MESSAGES : receives
```

No separate `chats` table for the POC — a conversation is implied by the pair
of `(sender_id, receiver_id)`. We can normalize later if needed.

---

## SOLID Principles Applied

| Principle | How We Apply It |
|-----------|-----------------|
| **S** — Single Responsibility | Each service/use case does one thing (e.g. `LoginUser`, `SendMessage`) |
| **O** — Open/Closed | New AI modules added without changing existing code |
| **L** — Liskov Substitution | Any `UserRepository` implementation works interchangeably |
| **I** — Interface Segregation | Small, focused repository interfaces (not one giant `Repository`) |
| **D** — Dependency Inversion | Application depends on abstract interfaces, not SQLAlchemy directly |

---

## Security Considerations (POC Level)

- Passwords hashed with **bcrypt** (never stored plain)
- JWT tokens with expiration (60 min default)
- API keys for LLM stored in `.env` (backend only — never in Flutter)
- CORS configured to allow only the Flutter app's origin
- Input validation via Pydantic (backend) and form validators (Flutter)

---

## What We Are NOT Building (POC Scope)

- Voice / video calls
- Media / file sharing
- Group chats
- Push notifications
- End-to-end encryption
- Production deployment / CI/CD
- Fancy UI / animations
