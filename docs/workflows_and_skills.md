# Patina - Gemini CLI Workflows & Extensions

This document outlines the specialized sub-agents, skills, and external hooks used to maintain the high standards of the Patina project.

---

## 0. Quick Start & Maintenance (Developer Guide)

Custom skills are stored in `.gemini/skills/` and must be installed in your local Gemini CLI environment to be active.

### Installation & Reloading
If you have just cloned the repository or added a new skill:
1.  **List Skills:** See what is currently active with `/skills list`.
2.  **Install/Update:** Skills in `.gemini/skills/` are automatically available to the agent, but if you need to manually refresh the system, run `/skills reload`.
3.  **Audit:** Use the `curator-ui` skill for UI changes and `electron-security` for any IPC or Main-process modifications.

---

## 1. Custom Skills (Specialized Expertise)

To ensure consistency and quality, the following custom skills are proposed for development:

### A. [DONE] `curator-ui` (Design & Aesthetics)
- **Status:** **Implemented** (v2.0 Gallery Aesthetic).
- **Role:** Enforces the "Museum Label" aesthetic.
- **Scope:** Guidance on padding/margin ratios, serif/sans-serif usage, and color palette adherence as defined in `docs/style_guide.md`.
- **Primary Use:** During the creation or refactoring of any React components.

### B. [DONE] `numismatic-researcher` (Domain Accuracy)
- **Status:** **Implemented** (Professional Cataloging Standards).
- **Role:** Ensures technical accuracy for coin records and historical context.
- **Scope:**
    - **Catalog Standards:** RIC (Roman Imperial), RPC (Roman Provincial), Crawford, etc.
    - **Technical Metrics:** Die Axis (clock-face), Weight (grams), Diameter (mm).
    - **Chronology:** Handling of non-Gregorian calendars and Era designations (BC/AD, BCE/CE).
    - **Physical Description:** Standardized vocabulary for obverse/reverse legends and motifs.
- **Primary Use:** When implementing database features, new data entry fields, or auditing catalog records.
- **Workflow:**
    1. **Research:** Identify specific cataloging standards for the coin's era.
    2. **Validate:** Cross-reference user input against numismatic conventions.
    3. **Enrich:** Propose standard descriptions for legends and physical characteristics.

### C. [DONE] `electron-security` (System Integrity)
- **Status:** **Implemented** (Secure IPC & Isolation Standards).
- **Role:** Security audit for the Electron main process and IPC bridge.
- **Scope:** 
    - **WebPreferences:** Mandating `contextIsolation`, `nodeIntegration`, and `sandbox`.
    - **IPC Validation:** Defensive coding on the Main process side.
    - **Preload Bridge:** Narrow, secure contextBridge patterns.
- **Primary Use:** When modifying `src/main/`, `preload.ts`, or IPC handlers.

### D. [PROPOSED NEXT] `patina-release` (Packaging & Distribution)
- **Role:** Manages the complexity of production builds.
- **Scope:** Code signing procedures, "Export to USB" bundling, and SQLite dependency verification.

---

## 2. External Workflow Hooks

External shell scripts can be used to feed real-time context into the Gemini CLI environment:

- **Schema Context Hook:** 
    - **Status:** **Implemented** (`scripts/extract_schema.cjs`).
    - **Function:** Parses `src/main/db.ts` to provide a live summary of database tables.
    - **Activation:** Automatically configured in `.gemini/settings.json`. Run `/skills reload` or restart the CLI session to enable.
- **Build Status Hook:** 
    - **Status:** **Implemented** (`scripts/check_build.cjs`).
    - **Function:** Runs `tsc --noEmit` to provide context on type errors after each turn.
    - **Activation:** Automatically configured in `.gemini/settings.json`.

---

## 3. Sub-Agent Strategy

- **`codebase_investigator`:** Used for mapping architectural dependencies, especially when refactoring the "Ledger" or "Lens" bridge.
- **`generalist`:** Utilized for high-volume tasks like generating localized strings, batch-processing SVG assets, or cleaning up boilerplate.
