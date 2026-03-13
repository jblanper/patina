# Reference: Gemini CLI Extensions

This reference provides technical details for the specialized skills, sub-agents, and background hooks that extend the Gemini CLI for the Patina project.

## Core Skills

| Skill | Primary Goal | Triggers / Usage |
| :--- | :--- | :--- |
| **`assuring-quality`** | Testing Standards | When creating components, hooks, or core logic. |
| **`curating-blueprints`** | Senior Architect | When initiating features or architectural reviews. |
| **`curating-coins`** | Numismatic Integrity | When modifying `src/main/db.ts` or cataloging coins. |
| **`curating-ui`** | Archival Ledger Design | When creating or refactoring React components. |
| **`evaluating-skills`** | Agent Standards | When creating or reviewing skills in `.gemini/skills/`. |
| **`saving-context`** | Session Integrity | Before clearing a session or documenting a milestone. |
| **`securing-electron`** | "The Filter" Principle | When modifying IPC, preload, or Main process logic. |
| **`tracking-progress`** | Project Audit | To sync code state with blueprints and changelogs. |
| **`writing-tech-docs`** | Diátaxis Compliance | When drafting or refactoring guides in `docs/`. |

### `assuring-quality`
Enforces the **Colocation Rule** and **Coverage Mandates** (100% validation, 90% hooks).
- **Strategy:** Mandatory review of testing plans in blueprints.
- **Verification:** Automated execution of specific tests and coverage analysis.

### `curating-blueprints`
Provides **Senior Architect** oversight for system-wide consistency.
- **Philosophy:** Enforces "Curator-First", "Privacy First", and the "Single-Click Rule".
- **Integrity:** Prevents architectural drift and ensures cross-process consistency.

### `securing-electron`
Protects user data through **"The Filter"** (strict Zod validation).
- **Boundary:** Mandates `.strict()` schemas for all IPC handlers.
- **Protocols:** Audits the `patina-img://` custom protocol for path traversal.

---

## Automated Quality Hooks

Background scripts that provide the agent with real-time feedback after every turn.

| Hook | Command | Description |
| :--- | :--- | :--- |
| **Schema Context** | `scripts/extract_schema.cjs` | Injects current database schema into active context. |
| **Build Check** | `scripts/check_build.cjs` | Runs `tsc --noEmit` to identify TypeScript errors. |
| **Style Audit** | `scripts/check_lint.cjs` | Runs ESLint to verify design and code standards. |

---

## Sub-Agent Orchestration

Specialized experts for high-volume or cross-cutting tasks.

- **`codebase_investigator`**: Used for architectural mapping and large-scale refactors of the Ledger or Lens systems.
- **`generalist`**: Efficient for repetitive, low-complexity tasks like batch processing or localized text generation.

## Related resources
- [How-to: Manage CLI Extensions](../how-to/manage_cli_extensions.md)
- [Explanation: The Curator's Automation](../workflows_and_skills.md)
