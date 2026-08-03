# lib/features/ — Feature Modules

## Purpose

Each subfolder is a **self-contained feature** following Clean Architecture.
Features do not import from each other's internal layers — only from public interfaces.

## Planned Features

| Feature | Phase | Description |
|---------|-------|-------------|
| `auth/` | 2 | Login, register, logout, JWT storage |
| `chat/` | 3 | One-to-one messaging (send, receive, read) |
| `ai/` | 4 | Summary, task extraction, priority detection |

## Internal Structure (same for every feature)

```
features/auth/
  presentation/
    screens/          # Full-page UI (LoginScreen, RegisterScreen)
    widgets/          # Reusable UI pieces (AuthTextField)
    providers/        # Riverpod providers (state management)
  domain/
    entities/         # User entity (plain Dart class)
    repositories/     # Abstract AuthRepository interface
    usecases/         # LoginUseCase, RegisterUseCase
  data/
    models/           # DTOs — JSON ↔ Dart (UserModel.fromJson)
    datasources/      # AuthRemoteDataSource (calls FastAPI)
    repositories/     # AuthRepositoryImpl (implements domain interface)
```

## Why three layers per feature?

This mirrors your backend and follows **Separation of Concerns**:

| Layer | Knows about HTTP? | Knows about UI? |
|-------|-------------------|-----------------|
| `presentation/` | No (calls use cases) | Yes |
| `domain/` | No | No |
| `data/` | Yes (API calls) | No |

If you change the API response format, you only update `data/models/`.
If you redesign the login screen, you only touch `presentation/`.
Business rules in `domain/` stay untouched.

## Data Flow Example (Login — Phase 2)

```
LoginScreen (presentation)
    → calls LoginUseCase (domain)
        → calls AuthRepository interface (domain)
            → AuthRepositoryImpl (data)
                → AuthRemoteDataSource (data)
                    → POST /auth/login (FastAPI)
```
