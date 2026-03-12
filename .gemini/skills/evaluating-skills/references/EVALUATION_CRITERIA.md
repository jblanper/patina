# Evaluation Criteria

Use these rules to rigorously evaluate the target skill against the open standard. 

## 1. Metadata & Naming Rules
- **Name**: Max 64 characters, lowercase, numbers, and hyphens only. No XML tags. Cannot contain reserved words ("anthropic", "claude", "gemini", "google").
- **Naming Convention**: Prefer the gerund form (e.g., `processing-pdfs`) or clear noun phrases. Avoid vague words like `helper`, `utils`, `tools`.
- **Description Tone**: Must be written in the **third person** (e.g., "Extracts text...", NOT "I extract..." or "You can use this to...").
- **Description Triggers**: Must clearly state what the skill does AND provide specific triggers for when the CLI should autonomously activate it.

## 2. Conciseness & Context
- **Length**: The `SKILL.md` body should be kept under 500 lines.
- **Assumptions**: The skill should assume the underlying model (Claude 3.5+, Gemini 2.5+, etc.) is smart. It must not waste tokens explaining basic concepts.
- **Degrees of Freedom**: Instructions should match the task's fragility (strict scripts for fragile migrations, high freedom heuristics for code reviews).

## 3. Progressive Disclosure Architecture
- **Structure**: Complex instructions, API references, or examples must be pushed to separate reference files.
- **Nesting limit**: References must be exactly **one level deep** from `SKILL.md` to prevent incomplete partial-reads.
- **Navigation**: Any reference file longer than 100 lines must include a Table of Contents.

## 4. Workflows & Feedback Loops
- **Checklists**: Multi-step workflows should provide a copyable markdown checklist that the agent can use to track progress.
- **Validation**: Operations should implement clear feedback loops (e.g., Edit -> Validate -> Fix -> Repack).