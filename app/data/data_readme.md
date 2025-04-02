# Persistent Data

This folder stores all persistent data used by the system including memory logs, AI prompt templates, research outputs, and task definitions.

## Subfolders
- **memory/**: Contains various memory logs.
- **prompts/**: Holds AI prompt templates.
- **research/**: Stores output markdown files from research queries.
- **tasks/**: Includes task definitions, examples, and detailed mission specifications.

## Interconnections and Logic
- The **prompts/** are used by the `features/prompt/` module to guide AI behavior.
- The **memory/** files serve as data stores for modules handling memory and context management.
- **Recommendation**: Remove redundant prompt templates (such as `research_prompt2.mjs`) and consider consolidating memory data into a structured database.