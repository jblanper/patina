# Reference: Gemini CLI Extensions

This reference provides technical details for the specialized skills, sub-agents, and background hooks that extend the Gemini CLI for the Patina project.

For the rationale and philosophy behind these tools, see [Explanation: The Curator's Automation](../workflows_and_skills.md).

## Core Skills

| Skill | Purpose | When to Trigger |
| :--- | :--- | :--- |
| **`assuring-quality`** | Enforces Colocation Rule and coverage mandates (100% validation, 90% hooks) | When creating or modifying components, hooks, or core logic |
| **`curating-blueprints`** | Senior Architect oversight for lifecycle management and multi-disciplinary audits | When initiating features, architectural reviews, or audits |
| **`curating-coins`** | Ensures numismatic accuracy (weights to 2 decimals, proper catalog refs like RIC/RPC) | When modifying `src/main/db.ts` or cataloging coins |
| **`curating-ui`** | Manages archival ledger aesthetic via Three-Path Protocol and interactive mockups | When creating or refactoring React components |
| **`evaluating-skills`** | Audits extensions against AgentSkills.io Open Standard | When creating or reviewing skills in `.claude/skills/` or `.opencode/skills/` |
| **`saving-context`** | Preserves session state and creates milestone snapshots | Before clearing a session or documenting changes |
| **`scouting-ideas`** | Research scout for ideas in Ideas Under Discussion; searches competitive landscape, coin community, and numismatic standards to produce a structured report | When validating a feature idea before committing to a blueprint |
| **`securing-electron`** | Enforces "The Filter" principle with strict Zod validation for IPC | When modifying IPC handlers, preload scripts, or Main process logic |
| **`tracking-progress`** | Syncs code state with blueprints and changelogs | To verify implementation status against documentation |
| **`writing-tech-docs`** | Enforces Diátaxis framework for all project documentation | When drafting or refactoring guides in `docs/` |

### `curating-blueprints` — Blueprint Lifecycle

The 7-stage lifecycle enforces architectural integrity through Design and Implementation phase audits.

| State | Description |
|:------|:------------|
| **Draft** | Initial research and design |
| **Proposed** | Ready for Design-phase audits |
| **Approved** | Audits passed, user approved |
| **In-Progress** | Implementation underway |
| **Verification** | Ready for Implementation-phase audits |
| **Completed** | Final audits passed, feature merged |
| **Archived** | Superseded or abandoned |

For lifecycle philosophy, see [Explanation: The Curator's Automation](../workflows_and_skills.md#blueprint-lifecycle).

---

## Automated Quality Hooks

Background scripts that provide real-time feedback after every tool call.

| Hook | Command | Description |
| :--- | :--- | :--- |
| **Schema Context** | `scripts/extract_schema.cjs` | Injects current database schema into active context |
| **Build Check** | `scripts/gemini_hook.js type-check` | Runs `tsc --noEmit` to identify TypeScript errors |
| **Style Audit** | `scripts/gemini_hook.js lint` | Runs ESLint to verify design and code standards |

---

## Sub-Agent Orchestration

Specialized experts for high-volume or cross-cutting tasks.

- **`codebase_investigator`**: Architectural mapping and large-scale refactors of the Ledger or Lens systems
- **`generalist`**: Repetitive, low-complexity tasks like batch processing or localized text generation

## Related resources
- [How-to: Manage CLI Extensions](../how-to/manage_cli_extensions.md)
- [Explanation: The Curator's Automation](../workflows_and_skills.md)
