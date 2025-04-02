# Server-Side Views

This folder holds templates for rendering the user interface using EJS and Handlebars. Views are constructed from main template files and a set of shared partials.

## Structure and Key Files
- **admin.ejs**: Template for the admin UI.
- **github.ejs**: Template for the GitHub integration view.
- **memory.ejs**: Template for the memory interface.
- **research.ejs**: Template for the research module.
- **self.ejs**: Template for self-management.
- **terminal.ejs**: Template for the terminal interface.

## Interconnections and Logic
- Views interact with controller and service layers to render dynamic content.
- **Recommendation**: Maintain consistency across view templates and update shared components as UI requirements evolve.