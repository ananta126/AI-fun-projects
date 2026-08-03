# app/infrastructure/ — External World Implementations

## Purpose

Concrete implementations of everything that talks to the **outside world**:

- PostgreSQL (via SQLAlchemy)
- JWT token storage/validation
- OpenAI-compatible LLM APIs

## What lives here (Phase 2+)

```
infrastructure/
  database/
    models/           # SQLAlchemy ORM models (DB table definitions)
    repositories/     # Concrete repo implementations (implements domain interfaces)
  auth/
    jwt_handler.py    # Creates and validates JWT tokens
  ai/
    llm_client.py     # OpenAI-compatible HTTP client (abstracted)
    prompts/          # Prompt templates for summary, tasks, priority
```

## SQLAlchemy Models vs Domain Entities

| Layer | Example | Knows about DB? |
|-------|---------|-----------------|
| `domain/entities/user.py` | `User(email, name)` | No |
| `infrastructure/database/models/user.py` | `UserModel(__tablename__="users")` | Yes |

We keep them separate so domain logic never leaks SQL into business rules.
Mappers convert between the two.

## LLM Client Design (Phase 4)

`llm_client.py` will expose a simple interface:

```python
async def complete(prompt: str, system: str) -> str:
    ...
```

The implementation calls any OpenAI-compatible API (`LLM_API_BASE_URL` + `LLM_API_KEY`).
Swapping providers (OpenAI → Ollama → Azure) means changing config, not business logic.
