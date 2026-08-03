# lib/core/ — Shared Frontend Utilities

## Purpose

Code used across **all features** — not specific to auth, chat, or AI.

## What lives here (Phase 2+)

```
core/
  constants/
    api_constants.dart    # Base URL: http://localhost:8000
    app_constants.dart    # App name, timeouts
  network/
    api_client.dart       # Dio instance with JWT interceptor
    api_exception.dart    # Maps HTTP errors to user-friendly messages
  theme/
    app_theme.dart        # Minimal Material theme (no fancy design)
  utils/
    validators.dart       # Email/password validation helpers
```

## Why a separate `core/` folder?

Without it, every feature would duplicate the HTTP client setup, theme, and constants.
`core/` is the **single source of truth** for cross-cutting frontend concerns.

## The API Client (important for you)

`api_client.dart` is the bridge between Flutter and FastAPI:

```dart
// Simplified example (Phase 2)
final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));

// Interceptor automatically adds JWT to every request
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    final token = await secureStorage.read(key: 'jwt');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  },
));
```

Every feature's repository uses this shared client — they never build URLs manually.
