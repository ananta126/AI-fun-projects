# AI-First Communication — Proof of Concept

> Conversations that automatically become actionable.

## What Is This?

A proof of concept demonstrating that chat messages can be intelligently processed to extract:

- **Summaries** — 3–5 bullet points from a conversation
- **Tasks** — actionable items ("Bring the laptop", "Book the hotel")
- **Events** — dates and times ("Tomorrow at 6 PM")
- **Priorities** — categorization (Personal, Work, Reminder, Promotion)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Flutter (Dart) |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Auth | JWT |
| AI | OpenAI-compatible APIs |

## Project Structure

```
.
├── backend/                 # FastAPI Python backend
│   └── app/
│       ├── api/             # HTTP routes (thin controllers)
│       ├── application/     # Use cases / services
│       ├── core/            # Config, security, database setup
│       ├── domain/          # Entities & repository interfaces
│       └── infrastructure/  # DB models, JWT, LLM client
├── frontend/                # Flutter mobile app
│   └── lib/
│       ├── core/            # Shared utilities, API client, theme
│       └── features/        # Feature modules (auth, chat, ai)
├── docs/                    # Architecture, dependencies, roadmap
└── docker-compose.yml       # Local PostgreSQL
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, diagrams, data flows |
| [Dependencies](docs/dependencies.md) | Every package explained |
| [Roadmap](docs/roadmap.md) | Phase-by-phase development plan |

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Architecture | ✅ Current | Folder structure, docs, no logic |
| 2 — Authentication | ⏳ Pending approval | Login, register, JWT, logout |
| 3 — One-to-One Chat | ⏳ Pending | Send, receive, store, read messages |
| 4 — AI Features | ⏳ Pending | Summary, tasks, priority detection |

## Getting Started (Phase 2+)

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Edit with your values
uvicorn app.main:app --reload

# 3. Frontend
cd frontend
flutter pub get
flutter run
```

## Architecture Principles

- **Clean Architecture** — dependencies point inward
- **SOLID** — single responsibility, dependency inversion
- **Feature-by-feature** — each phase delivers working functionality
- **AI on backend** — API keys never exposed to the mobile client
