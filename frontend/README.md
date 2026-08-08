# Frontend — Flutter Mobile App

## Purpose

This folder contains the **Flutter** client for the AI-first communication POC.

Flutter is Google's UI toolkit for building apps from a single codebase.
For this POC we target **mobile** (Android/iOS), but the same code can run on web/desktop.

## Why Flutter for this POC?

- **Single codebase** for Android and iOS
- **Hot reload** — see UI changes instantly while developing
- Strong ecosystem for HTTP (`dio`), state management (`riverpod` or `bloc`), and secure storage

## Architecture Style

We mirror the backend's Clean Architecture inside each **feature**:

```
features/auth/
  presentation/   ← Screens, widgets, state (what the user sees)
  domain/         ← Entities, use case interfaces
  data/           ← API client, DTOs, repository implementations
```

Plus a shared `core/` folder for things used everywhere (theme, constants, DI).

## Key Flutter Concepts (for you)

| Concept | What it is |
|---------|------------|
| **Widget** | Everything in Flutter is a widget — buttons, text, screens |
| **StatefulWidget** | A widget that can change (e.g. a login form) |
| **StatelessWidget** | A widget that never changes (e.g. a label) |
| **pubspec.yaml** | Like `requirements.txt` — lists dependencies |
| **lib/main.dart** | Entry point (like `app/main.py` on the backend) |

## Setup (Phase 2+)

```bash
# One-time: create Flutter project scaffold inside this folder
cd frontend
flutter create . --org com.aicomm --project-name ai_comm_app
flutter pub get
flutter run
```

## How Flutter talks to FastAPI

```
┌─────────────┐   HTTPS/JSON    ┌─────────────┐
│   Flutter   │ ────────────► │   FastAPI   │
│  (mobile)   │ ◄──────────── │  (backend)  │
└─────────────┘   JWT in header └─────────────┘
```

1. User taps "Login" → Flutter sends `POST /auth/login`
2. Backend returns JWT → Flutter stores it in secure storage
3. Every subsequent request includes header: `Authorization: Bearer <token>`
