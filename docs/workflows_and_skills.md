# Patina - Gemini CLI Workflows & Extensions

This document outlines the specialized sub-agents, skills, and external hooks used to maintain the high standards of the Patina project.

---

## 1. Custom Skills (Specialized Expertise)

To ensure consistency and quality, the following custom skills are proposed for development:

### A. `curator-ui` (Design & Aesthetics)
- **Role:** Enforces the "Museum Label" aesthetic.
- **Scope:** Guidance on padding/margin ratios, serif/sans-serif usage, and color palette adherence as defined in `GEMINI.md`.
- **Primary Use:** During the creation or refactoring of any React components.

### B. `numismatic-researcher` (Domain Accuracy)
- **Role:** Ensures technical accuracy for coin records.
- **Scope:** Workflows for researching historical fields (e.g., Die Axis), handling non-Gregorian dates, and catalog reference standards.
- **Primary Use:** When implementing database features or new data entry fields.

### C. `electron-security` (System Integrity)
- **Role:** Security audit for the Electron main process and IPC bridge.
- **Scope:** Checklist for `preload.ts` changes, ensuring `contextIsolation` integrity, and input sanitization.
- **Primary Use:** When modifying `src/main/` or IPC handlers.

### D. `patina-release` (Packaging & Distribution)
- **Role:** Manages the complexity of production builds.
- **Scope:** Code signing procedures, "Export to USB" bundling, and SQLite dependency verification.

---

## 2. External Workflow Hooks

External shell scripts can be used to feed real-time context into the Gemini CLI environment:

- **Schema Context Hook:** Triggers on changes to `src/main/db.ts` to provide an updated summary of the database tables.
- **Build Status Hook:** Passes the results of `npm run build` or `tsc` directly into the agent's context to catch errors immediately.

---

## 3. Sub-Agent Strategy

- **`codebase_investigator`:** Used for mapping architectural dependencies, especially when refactoring the "Ledger" or "Lens" bridge.
- **`generalist`:** Utilized for high-volume tasks like generating localized strings, batch-processing SVG assets, or cleaning up boilerplate.
