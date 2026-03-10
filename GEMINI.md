# Patina - Engineering Mandates & Standards

This document defines the absolute standards for the Patina project. All development must rigorously adhere to these rules to maintain the "Curator-First" experience and ensure system integrity.

---

## 1. Core Philosophy: The Curator's Tool
- **Aesthetic Prestige:** Every UI element must feel like a museum label or a high-end archival ledger. Follow the "White Cube" Gallery aesthetic: a silent frame that recedes to let historical objects take center stage. Use **Inter (Sans-Serif)** for all typography as defined in `docs/style_guide.md`. Avoid "techy" dashboards.
- **Privacy First:** Data never leaves the user's computer. No external telemetry, no cloud sync, and no third-party CDNs. All assets (fonts, icons) must be local.
- **The Single-Click Rule:** Features must be accessible within two clicks. Keep the hierarchy flat and the navigation intuitive.

---

## 2. Technical Standards

### Electron Security
- **Strict Isolation:** `contextIsolation: true` and `sandbox: true` are non-negotiable for the Renderer process.
- **Secure Bridge:** Only expose specific, validated functions through the `contextBridge` in `preload.ts`. Never expose raw IPC or Node.js modules.
- **IPC Validation:** The Main process MUST validate all data received from the Renderer. Verify IDs against the database and restrict file paths to the application's `data/` directory.

### TypeScript & Type Safety
- **Strict Typing:** `strict: true` is mandatory. Avoid the `any` type at all costs; use `unknown` with type guards if necessary.
- **Shared Types:** All domain models (Coins, Images) must be defined in `src/common/types.ts` and shared between Main and Renderer.
- **Immutability:** Prefer `const` and `readonly` properties. Use functional patterns for data transformations.

### React & Frontend Architecture
- **Component Focused:** One file per component. Keep components small, focused, and documented with TS interfaces for props.
- **Custom Hooks:** All database interaction, filtering logic, or bridge state must be encapsulated in custom hooks (e.g., `useCoins()`, `useLens()`).
- **Vanilla CSS:** Use CSS variables for the color palette (`--bg-gallery`, `--text-ink`, `--accent-patina`, etc.) as defined in `docs/style_guide.md`. Follow a simple, consistent naming convention like BEM-lite.
- **Optimization:** Use `React.memo` and `useCallback` strategically in the Gallery grid to ensure smooth scrolling and interaction.

### Database & File System
- **SQLite Integrity:** Use `better-sqlite3` with WAL mode. Ensure all writes are atomic and follow the approved schema in `docs/schema_proposal_2026-03-10.md`.
- **Portable Paths:** Store image paths as relative to the `data/images/` directory. Never use absolute system paths in the database.
- **Atomic File Operations:** When moving or saving images from the "Lens" bridge, use atomic move/write operations to prevent data loss.

---

## 3. The "Lens" Bridge (Express.js)
- **Local Network Only:** The server must bind only to local network interfaces.
- **Input Sanitization:** Use `zod` or equivalent to validate all incoming multipart/form-data.
- **Stateless Design:** The Express server is a passthrough. It should receive the image, hand it to the Main process for indexing, and return a simple status code.

---

## 4. Development Workflow
- **Research First:** Before implementing any new numismatic feature, research historical standards (Numista, PCGS, Museum cataloging).
- **Validation Mandate:** Every feature must be verified with its corresponding automated test or a documented manual validation step.
---

## 5. Skill Synergy (Specialized Agents)
To maintain the high standards of the Patina project, utilize these specialized skills for their respective domains:

- **`curator-ui`:** Use for ALL UI/UX tasks. It enforces the "White Cube" aesthetic and maintains `docs/style_guide.md`. Invoke when creating or refactoring React components.
- **`numismatic-researcher`:** Use for ALL cataloging and database tasks. It ensures technical accuracy for weights, measurements, and historical chronology. Invoke when modifying `src/main/db.ts` or implementing new data fields.
- **`electron-security`:** Use for ALL IPC and Main-process tasks. It enforces secure bridge patterns and Main-side validation. Invoke when modifying `src/main/` or `preload.ts`.

Before starting a major feature, check `docs/workflows_and_skills.md` for the full list of active and proposed extensions.
