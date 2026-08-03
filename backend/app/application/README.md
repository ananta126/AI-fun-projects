# app/application/ — Use Cases (Application Layer)

## Purpose

This folder contains **use cases** — the orchestration logic that implements
what the app *does*, without knowing about HTTP or databases.

## What is a Use Case?

A use case answers: "What happens when a user does X?"

Examples (Phase 2–4):

| Use Case | Input | Output |
|----------|-------|--------|
| `RegisterUser` | email, password, name | User entity |
| `LoginUser` | email, password | JWT token |
| `SendMessage` | sender_id, receiver_id, text | Message entity |
| `SummarizeConversation` | list of messages | bullet summary |
| `ExtractTasks` | message text | tasks + events JSON |
| `DetectPriority` | message text | category JSON |

## Why a separate layer?

- **Testable:** You can unit-test `LoginUser` without starting a web server.
- **Reusable:** The same use case can be called from an HTTP route, a CLI, or a background job.
- **SOLID (Single Responsibility):** Each service file does one thing.

## Dependency Direction

```
api/  →  application/  →  domain/ (interfaces)
                ↑
         infrastructure/ (implements interfaces)
```

Application services depend on **interfaces** defined in `domain/`, not on
concrete database classes.
