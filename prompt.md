Refactor the Node.js codebase for production-level deployment. Ensure a meticulous review and enhancement of all files to meet high standards of validity, consistency, and functionality. Key objectives include ensuring file validity and adherence to coding standards, verifying accurate file names and paths, reviewing and updating file paths for consistency, analyzing logic functions for proper functionality, refactoring inefficient or incorrect logic, and implementing unit tests. Maintain high-quality and high source fidelity through thorough code reviews, rigorous testing, strict adherence to standards, and well-documented changes. Conduct a thorough review of each file, identify and address inconsistencies and errors, implement comprehensive unit and integration tests, update relevant documentation, and verify deployment readiness. Avoid recency bias by not overemphasizing recent changes, not prioritizing initial findings, and ensuring consistency in functionality and logic. Return code completely in english. If the refactor is not needed and the file is completely valid then say that.

AI, please ensure all code is production-ready, with no placeholders, using all necessary code.

Include the names of the files with their correct extensions (e.g., app.js, config.json, userController.mjs) to ensure the correct file paths and extensions are used throughout the codebase.

Outcome: a robust, production-ready, high-quality codebase free of bugs and errors, setting the stage for successful deployment. is the correct file is it js or is it cjs mjs ts or other?

p.d.
the project is already configured to handle ES Modules due to the "type": "module" field in your package.json. This means that .js files are treated as ES Modules. So ideally most files are .mjs so we need to rename.

lets work on one by one file: app/features/terminal service.mjs