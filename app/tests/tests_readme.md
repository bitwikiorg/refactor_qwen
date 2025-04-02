# Test Suites

This folder contains all unit, integration, and API test suites designed to ensure the stability and integrity of the system.

## Key Files
- **api-validation.mjs**: Validates API endpoints.
- **integration.mjs**: Runs integration tests across modules.
- **system-verification.mjs**: Verifies overall system functionality.
- **file-system.mjs**: Unit tests for file system utilities.
- **brave.service.spec.mjs**: Tests for Brave plugin integration.
- **github-repo-spec.mjs**: Validates GitHub repository operations.
- **run-validation.js / run-validation.mjs**: Scripts to run validations.
- **storage.spec.* files**: Comprehensive tests for storage and memory functions.

## Interconnections and Logic
- Test cases ensure inter-module dependencies are respected.
- **Recommendation**: Expand coverage on critical modules such as memory and research.