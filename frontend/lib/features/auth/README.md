# features/auth/ — Authentication Feature (Phase 2)

## Screens (presentation/)

| Screen | Purpose |
|--------|---------|
| `LoginScreen` | Email + password form → calls login API |
| `RegisterScreen` | Name + email + password → calls register API |

## Domain Entities

- `User` — id, email, name (no password in the entity)

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| POST | `/auth/logout` | Invalidate token (optional for POC) |

## JWT Flow

1. Login succeeds → backend returns `{ "access_token": "eyJ..." }`
2. Flutter stores token in `flutter_secure_storage`
3. `api_client.dart` interceptor attaches token to all future requests
4. Logout → delete token from secure storage
