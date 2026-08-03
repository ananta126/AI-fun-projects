# Backend — FastAPI

## Purpose

This folder contains the **Python FastAPI** backend for the AI-first communication POC.

The backend is responsible for:

- User authentication (JWT)
- Storing and retrieving chat messages (PostgreSQL)
- Calling AI services (OpenAI-compatible APIs) for summaries, tasks, and priorities

## Architecture Style

We use **Clean Architecture** (also called Hexagonal / Ports & Adapters):

```
HTTP Request
    ↓
api/          ← Routers (thin controllers; no business logic)
    ↓
application/  ← Use cases / services (orchestration)
    ↓
domain/       ← Entities + abstract interfaces (no framework imports)
    ↑
infrastructure/ ← Concrete implementations (DB, JWT, LLM client)
```

**Why this matters:** Business rules live in `domain/` and `application/`. If you swap PostgreSQL for another DB, or change the LLM provider, you only touch `infrastructure/`.

## Folder Map

| Folder | Responsibility |
|--------|----------------|
| `app/api/` | HTTP routes, request/response schemas |
| `app/application/` | Use cases (login, send message, summarize, etc.) |
| `app/core/` | Config, security helpers, shared dependencies |
| `app/domain/` | Entities and repository interfaces (abstract) |
| `app/infrastructure/` | SQLAlchemy models, JWT, OpenAI client |

## Running (Phase 2+)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
