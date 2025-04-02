# Feature Modules

This folder implements the core functionalities of the COREAI Research System, including authentication, chat, memory management, and more.

## Subfolders
- **auth/**: User authentication.
- **chat/**: Real-time chat functionality.
- **memory/**: Memory storage and retrieval.
- **plugins/**: External integrations (Brave, GitHub).
- **prompt/**: Custom prompt generation.
- **research/**: Orchestrates research tasks.
- **scheduler/**: Task scheduling and automation.
- **terminal/**: Interactive terminal interface.
- **token_classifier/**: Token classification logic.

## Interconnections and Logic
- Authentication is required for secure chat and access to system modules.
- Scheduler interacts with research outputs and tasks.
- **Recommendation**: Migrate legacy CoffeeScript routes and consolidate overlapping plugin functions.