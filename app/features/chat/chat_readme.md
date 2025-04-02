# Chat Module

This module provides real-time chat functionalities and stores messages.

## Key Files
- **chat.socket.mjs**: Handles real-time chat events.
- **chat_prompt.mjs**: Provides a shared prompt template for chat interactions.
- **index.mjs**: Chat module entry point.
- **repo.mjs**: Manages chat message storage.
- **repositories/message-db-repo.mjs**: Implements database operations for chat.
- **routes/index.coffee**: Legacy CoffeeScript routes (candidate for migration).
- **routes.mjs**: Updated JavaScript chat routes.
- **security/auth-guard.mjs**: Middleware enforcing authentication for chat access.
- **service.mjs**: Processes chat messages.
- **socket.mjs**: Implements additional real-time event handlers.

## Interconnections and Logic
- Chat relies on authentication from `features/auth/`.
- Real-time events are emitted via Socket.IO.
- **Recommendation**: Migrate legacy CoffeeScript routes to modern JavaScript.