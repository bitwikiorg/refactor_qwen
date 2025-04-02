# Configuration Documentation

## Overview
All configuration settings are now consolidated into a single file: `config.json`. This file serves as the canonical source for all application configurations.

## Environment Variables
Secrets and environment-specific overrides are managed using the `.env` file. Placeholders in `config.json` (e.g., `${ENV_VAR}`) are replaced with values from `.env` at runtime.

## Usage
Use the `ConfigProvider` class to access configuration values in the application. Example:
```javascript
import ConfigProvider from './provider.mjs';

const dbHost = await ConfigProvider.getString('database.host');
```

