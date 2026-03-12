# Patina: Gemini CLI Extensions & Workflows

This document provides a technical reference for the specialized skills, sub-agents, and automation hooks that extend the Gemini CLI for the Patina project. These extensions ensure that all development adheres to our core philosophy of museum-grade aesthetics and technical integrity.

---

## 1. Management & Installation

Custom skills are stored in the project's `.gemini/skills/` directory. They are automatically available to the agent, but may require a manual refresh if changes are made to the skill definitions.

### Commands
- **List Skills:** Use `/skills list` to view all active skills in your environment.
- **Reload Skills:** Use `/skills reload` to refresh the agent's knowledge of the skills in `.gemini/skills/`.

---

## 2. Core Skill Reference

The following specialized skills provide expert guidance and validation for specific domains of the Patina project.

### `curating-ui` (Aesthetics & Design)
Ensures every interface element adheres to the "White Cube" Gallery aesthetic.
- **Scope:** Enforces padding/margin ratios, typography standards (Inter), and the project's muted color palette.
- **Primary Use:** Invoke when creating or refactoring React components in `src/renderer/`.
- **References:** See `docs/style_guide.md` for the underlying design principles.

### `numismatic-researcher` (Domain Accuracy)
Maintains historical and technical integrity for all coin-related data.
- **Scope:** Standardizes cataloging (RIC, RPC, Crawford), technical metrics (weight, diameter, die axis), and historical chronology (BC/AD).
- **Primary Use:** Invoke when modifying `src/main/db.ts`, adding data entry fields, or auditing catalog records.

### `securing-electron` (System Integrity)
Performs automated and manual security audits of the Electron environment.
- **Scope:** 
    - **Isolation:** Enforces `contextIsolation`, `nodeIntegration: false`, and `sandbox: true`.
    - **IPC Safety:** Validates all data traversing the `contextBridge`.
    - **Navigation:** Implements strict controls on `will-navigate` and window creation.
- **Primary Use:** Invoke when modifying `src/main/index.ts`, `src/main/preload.ts`, or any IPC handlers.

---

## 3. Automated Quality Hooks

Patina utilizes background scripts to provide the agent with real-time feedback and technical context after every turn. These are configured in `.gemini/settings.json`.

- **Schema Context (`scripts/extract_schema.cjs`):** Parses `src/common/schema.ts` to provide the current database table definitions as live context.
- **Build Verification (`scripts/check_build.cjs`):** Executes `tsc --noEmit` to identify TypeScript errors across the workspace.
- **Style Audit (`scripts/check_lint.cjs`):** Runs ESLint to ensure code adheres to the project's linting rules.

---

## 4. Sub-Agent Orchestration

For complex tasks, use specialized sub-agents to maintain context efficiency:

- **`codebase_investigator`:** Recommended for architectural mapping, dependency tracing, or large-scale refactors of the Ledger or Lens systems.
- **`generalist`:** Efficient for high-volume, low-complexity tasks such as localized string generation or batch asset processing.

---

## 5. Development Pipeline (Future Extensions)

New extensions are prioritized based on their impact on the curator experience. Currently proposed extensions include:

- **`patina-release`:** A specialized skill for managing production builds, code signing, and SQLite distribution verification.
