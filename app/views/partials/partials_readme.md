# Shared Partials

This folder contains partial templates that are reused across multiple view files. These include header, footer, navigation bar, and page-specific components.

## Key Files
- **footer.ejs**: Shared footer fragment.
- **header.ejs**: Shared header section.
- **navbar.ejs**: Global navigation bar.
- **page-header.ejs**: Page-specific header.
- **socket-io.ejs**: Embeds the Socket.IO client setup.

## Interconnections and Logic
- Partials are included in main views to reduce code duplication.
- **Recommendation**: Modularize partials to simplify updates and ensure consistent theming.