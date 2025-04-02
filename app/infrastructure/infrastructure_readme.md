# Infrastructure

This folder provides low-level utilities that support configuration loading, database abstraction, error handling, caching, and network communications.

## Key Files
- **config-loader.js / config-loader.ts**: Loads and validates configuration files.
- **database.mjs**: Abstracts database operations.
- **error-handler.mjs**: Centralized error handling.
- **express.mjs**: Sets up and configures the Express server.
- **file-system.mjs**: Utility functions for file operations.
- **github-api.mjs**: Handles direct interactions with the GitHub API.
- **health-check.mjs**: Implements system health-check endpoints.
- **memcache.* files**: Provide caching functionality.
- **memory-layer.mjs**: Additional abstraction for memory.
- **network.mjs**: Network utility functions.
- **search/interfaces.mjs**: Defines search operation interfaces.
- **socket.mjs**: Configures Socket.IO for real-time communications.
- **venice-api.mjs & venice-api.test.mjs**: Integrate and test the external Venice AI API.

## Interconnections and Logic
- These utilities form the backbone for higher-level modules.
- **Recommendation**: Streamline caching and memory layers to reduce redundancy.