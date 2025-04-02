# Plugins

This folder integrates external plugins which enhance system capabilities. It aggregates plugins such as Brave and GitHub.

## Key Files
- **index.js**: Aggregates and initializes all plugins.
- **brave/**: Contains integration logic for the Brave search engine.
- **github/**: Manages GitHub repository interactions and API endpoints.

## Interconnections and Logic
- Plugins are loaded at startup and provide additional service layers.
- **Recommendation**: Review and consolidate shared utility functions between plugins.