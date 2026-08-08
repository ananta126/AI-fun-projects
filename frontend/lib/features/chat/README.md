# features/chat/ — One-to-One Chat Feature (Phase 3)

## Screens (presentation/)

| Screen | Purpose |
|--------|---------|
| `ChatListScreen` | Shows conversations with other users |
| `ChatScreen` | Message thread — send and receive text messages |

## Domain Entities

- `Message` — id, senderId, receiverId, content, sentAt, isRead
- `Conversation` — id, otherUser, lastMessage, unreadCount

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/chats` | List user's conversations |
| GET | `/chats/{id}/messages` | Fetch messages for a chat |
| POST | `/chats/{id}/messages` | Send a new message |
| PATCH | `/messages/{id}/read` | Mark message as read |

## Real-time Strategy (POC)

For the POC we use **polling** (Flutter asks the server every few seconds for new messages).
WebSockets can be added later for true real-time — keeping the POC simple.
