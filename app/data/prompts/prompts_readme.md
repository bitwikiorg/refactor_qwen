# AI Prompts

This folder contains template files that guide AI interactions in the system. These templates are imported by the prompt module for generating dynamic responses.

## Key Files
- **chat_prompt.mjs**: Default chat prompt template.
- **memory_prompt.mjs**: Template used for memory-related prompting.
- **research_prompt.mjs**: Primary research prompt.
- **research_prompt2.mjs**: Secondary research prompt; review for redundancy.

## Interconnections and Logic
- Prompts are directly utilized by the `features/prompt/` module during runtime.
- **Recommendation**: Consider removing or merging duplicates for clarity.