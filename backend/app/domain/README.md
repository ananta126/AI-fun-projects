# app/domain/ — Business Entities & Contracts

## Purpose

The **heart** of Clean Architecture. This folder defines:

1. **Entities** — plain Python classes representing business objects
2. **Repository interfaces** — abstract contracts for data access

## What lives here (Phase 2+)

```
domain/
  entities/
    user.py       # User(id, email, hashed_password, created_at)
    message.py    # Message(id, sender_id, receiver_id, content, sent_at)
    chat.py       # Chat(id, participant_ids)
  repositories/
    user_repository.py      # abstract: get_by_email(), create()
    message_repository.py   # abstract: save(), get_by_chat()
```

## Critical Rule: No Framework Imports

Files in `domain/` must **not** import:

- FastAPI
- SQLAlchemy
- httpx
- Any infrastructure code

They are pure Python. This keeps business rules independent of technology choices.

## Why interfaces (abstract repositories)?

This follows the **Dependency Inversion Principle** (the "D" in SOLID):

> High-level modules should not depend on low-level modules.
> Both should depend on abstractions.

`application/` depends on `UserRepository` (interface).
`infrastructure/` provides `SqlAlchemyUserRepository` (implementation).

If you switch from PostgreSQL to MongoDB, you write a new implementation —
`application/` code stays unchanged.
