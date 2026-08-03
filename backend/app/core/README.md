# app/core/ — Shared Configuration & Utilities

## Purpose

Cross-cutting concerns used by every layer: settings, security helpers,
database session factory, and shared constants.

## What lives here (Phase 2+)

| File | Responsibility |
|------|----------------|
| `config.py` | Loads settings from `.env` (DB URL, JWT secret, LLM keys) |
| `security.py` | Password hashing, JWT create/decode helpers |
| `database.py` | SQLAlchemy async engine and session factory |
| `exceptions.py` | Custom HTTP-friendly exceptions |

## Why not put this in `api/`?

Configuration and security are **shared** — both `api/` and `infrastructure/`
need them. Putting them in `core/` avoids circular imports.

## Example: How config flows

```
.env file
   ↓
core/config.py  (reads DATABASE_URL, JWT_SECRET_KEY)
   ↓
core/database.py  (creates SQLAlchemy engine)
   ↓
api/deps.py  (injects DB session into routes)
```
