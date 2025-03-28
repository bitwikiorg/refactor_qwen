# Current File Tree

```plaintext
config/
  .env
  .env.example
  .env.test
  default.js
  development.js
  production.js
  schema.json

current_file_tree.md
data/
  memory/
    episodic_memory.md
    long_term_memory.md
    procedural_memory.md
    semantic_memory.md
    short_term_memory.md
    working_memory.json

  prompts/
    prompt (copy).js
    prompt copy.js
    prompt.js

  research/
    research-your-query-2025-03-06T15-54-37-154Z.md
    research-your-query-is-crazy-2025-03-06T15-33-11-569Z.md

  tasks/
    README.md
    example-mission.md
    mission-research-your-query-depth-2-br-1741268644814.md
    quick-test-mission.md
    research-your-query-depth-2-breadth-2-2025-03-06T15-26-58-803Z.md
    research-your-query-depth-2-breadth-2-2025-03-06T15-53-27-174Z.md
    research-your-query-is-crazy-depth-2-breadth-2-2025-03-06T15-30-06-542Z.md
    research-your-query-is-crazy-depth-2-breadth-2-2025-03-06T15-32-23-329Z.md
    research-your-query-is-crazy-depth-2-breadth-2-2025-03-06T15-32-23-330Z.md


features/
  auth/
    bin/
      create-account.js

    index.js
    repo.js
    routes.js
    service.js
    socket.js

  brave/
    index.js
    routes.js
    service.js
    socket.js

  chat/
    index.js
    repo.js
    routes.js
    service.js
    socket.js

  github/
    __tests__/
      githubIntegration.test.js

    index.js
    repo.js
    routes.js
    service.js
    utils.js

  memory/
    index.js
    repo.js
    routes.js
    service.js
    socket.js

  plugins/
    index.js

  prompt/
    index.js
    repo.mjs
    routes.ts
    service.mjs

  research/
    index.js
    repo.js
    routes.js
    service.js
    socket.js

  scheduler/
    index.cjs
    repo.js
    routes.js
    service.js
    socket.js

  terminal/
    index.js
    repo.js
    routes.js
    service.js
    socket.js
    terminalAI.js


filetree.js
infrastructure/
  config-loader.ts
  database.js
  error-handler.js
  express.js
  file-system.js
  github-api.js
  health-check.js
  memcache.ts
  search/
    interfaces.js

  socket.js
  venice-api.js

public/
  css/
    admin.css
    github.css
    help-popup.css
    research.css
    self.css
    status-indicators.css
    styles.css
    terminal.css

  favicon.ico
  js/
    admin-mission.js
    admin.js
    github.js
    global.js
    main.js
    memory.js
    research.js
    self.js
    socket-client.js
    system-status.js
    terminal.js


readme.md
routes.js
services/
  config.js
  di-container.js
  env-validator.js
  logger.js
  performance-monitor.js

tests/
  api-validation.js
  integration.js
  run-validation.js
  system-verification.js
  unit/
    storage.spec.ts


utils/
  systemStats.js

views/
  admin.ejs
  github.ejs
  layouts/
    main.hbs

  memory.ejs
  partials/
    footer.ejs
    header.ejs
    navbar.ejs
    page-header.ejs
    socket-io.ejs

  research.ejs
  self.ejs
  terminal.ejs


```

# Changelog
- Fixed duplicate initialization in terminal module (app/public/js/terminal.js) to avoid multiple client connections.
- Added ESLint setup for debugging syntax errors (run "npm run lint" and "npm run lint:fix").