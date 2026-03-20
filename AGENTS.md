# Patina - Engineering Mandates & Standards

This document defines the absolute standards for the Patina project. All development must rigorously adhere to these rules to maintain the "Curator-First" experience and ensure system integrity.

**Version:** 1.2  
**Last Updated:** 2026-03-20

---

## 1. Core Philosophy: The Curator's Tool
- **Aesthetic Prestige:** Every UI element must feel like a museum label or a high-end archival ledger. Follow the **Archival Ledger** aesthetic: a silent frame that recedes to let historical objects take center stage. All visual design, typography, and styling must comply with `docs/style_guide.md`. Avoid "techy" dashboards.
- **Privacy First:** Data never leaves the user's computer. No external telemetry, no cloud sync, and no third-party CDNs. All assets (fonts, icons) must be local.
- **The Single-Click Rule:** Features must be accessible within two clicks. Keep the hierarchy flat and the navigation intuitive.

---

## 2. Technical Standards

### Electron Security
- **Security Architecture:** Refer to `docs/architecture/security_data_flow.md` for the authoritative guide on **"The Filter"** principle.
- **Strict Isolation:** `contextIsolation: true` and `sandbox: true` are non-negotiable for the Renderer process.
- **The Filter:** The Main process MUST rigorously validate all data from the Renderer using strict Zod schemas (`.strict()`).
- **Secure Bridge:** Only expose specific, validated functions through the `contextBridge`. Never expose raw IPC or Node.js modules.
- **Protocol Security:** Use the `patina-img://` custom protocol for image loading. All protocol handlers must implement strict path sanitization (blocking `..` traversal).

### TypeScript & Type Safety
- **Strict Typing:** `strict: true` is mandatory. Avoid the `any` type at all costs; use `unknown` with type guards if necessary.
- **Shared Types:** All domain models (Coins, Images) must be defined in `src/common/types.ts`.
- **Centralized Validation:** Use Zod for cross-process data integrity. All schemas must be centralized in `src/common/validation.ts` and shared between Main and Renderer.
- **Immutability:** Prefer `const` and `readonly` properties. Use functional patterns for data transformations.

### Dependency Management

- **Version Strategy:** Use caret (^) for semantic versioning to receive non-breaking updates automatically.
- **Security:** Run `npm audit` in CI. Address HIGH/CVE vulnerabilities within 48 hours.
- **Lockfile:** Always commit `package-lock.json`. Never use `--no-package-lock`.
- **Native Modules:** Native modules like `better-sqlite3` MUST be rebuilt for the Electron version's ABI using `@electron/rebuild`.
- **Upgrade Process:**
  1. Create branch: `deps/upgrade-<package>-<version>`
  2. Update version in `package.json`
  3. Run full test suite, lint, and build
  4. Ensure `npm audit` passes with no vulnerabilities
  5. Document in changelog
- **Critical Dependencies:** Electron, better-sqlite3, express, zod, and react-error-boundary require extended testing and manual review before upgrade.
- **Obsolete Packages:** Replace within 30 days of deprecation; use `npm depcheck` monthly.


### React & Frontend Architecture
- **Component Focused:** One file per component. Keep components small, focused, and documented with TS interfaces for props.
- **Custom Hooks:** All database interaction, filtering logic, or bridge state must be encapsulated in custom hooks (e.g., `useCoins()`, `useLens()`).
- **Centralized Layout:** All pages MUST be wrapped in the `.app-container` within `App.tsx`. This ensures a unified "top line" width and consistent horizontal padding (The Sanctuary) across the application. Avoid local page-level wrappers that override this.
- **Smart Ledger Grid:** Prefer container-aware CSS Grid (`auto-fit`) over rigid media query breakpoints for primary layouts. Use `grid-template-columns: repeat(auto-fit, minmax(min(100%, <breakpoint>), 1fr))` to ensure zero-overflow responsiveness.
- **Styling:** All CSS must be implemented using **Vanilla CSS** in the global `src/renderer/styles/index.css` file. Follow the standards in `docs/style_guide.md`. Do NOT use `styled-jsx`, `styled-components`, or utility-first frameworks like Tailwind unless specifically requested. This ensures a stable, type-safe, and archival-focused build.
- **Optimization:** Use `React.memo` and `useCallback` strategically in the Gallery grid to ensure smooth scrolling and interaction.

### Database & File System
- **SQLite Integrity:** Use `better-sqlite3` with WAL mode and `foreign_keys = ON`. Foreign key constraints must be enabled to ensure cascade deletes work correctly. All writes must be atomic and follow the structured schema defined in `src/common/schema.ts`.
- **Data Defaults:** New coins default to `era: 'Ancient'` as most collections focus on ancient coinage. This default is enforced in both `schema.ts` (database level) and `useCoinForm.ts` (form level).
- **Portable Paths:** Store image paths as relative to the `data/images/` directory. Never use absolute system paths in the database.
- **File Cleanup:** When deleting records, associated files must be removed from the filesystem. The `deleteCoin()` function cleans up orphaned image files from `data/images/`.
- **Secure Image Loading:** Use a custom protocol (e.g., `patina-img://`) in the Main process to serve local images to the Renderer. This preserves the sandbox and CSP integrity by avoiding `file://` protocols or direct filesystem access. Async file reads are mandatory to avoid blocking the main process.
- **Atomic File Operations:**
 When moving or saving images from the "Lens" bridge, use atomic move/write operations to prevent data loss.
- **Preservation & Export (Phase 5):** The export system (`src/main/export/`) generates PDF catalogs and ZIP archives for collection backup. PDF uses Garamond font with aligned tables; ZIP includes CSV data and database snapshot. All export operations are atomic and preserve data integrity.

---

## 3. The "Lens" Bridge (Express.js)
- **Local Network Only:** The server must bind only to local network interfaces.
- **Input Sanitization:** Use `zod` to validate all incoming multipart/form-data. Define strict schemas with clear error messages.
- **Stateless Design:** The Express server is a passthrough. It should receive the image, hand it to the Main process for indexing, and return a simple status code.
- **Security:** Apply `helmet` middleware and restrict CORS to localhost only.
- **File Handling:** MIME type allowlist is strictly enforced: only `image/jpeg`, `image/png`, and `image/webp` are accepted. SVG (`image/svg+xml`) is explicitly blocked to prevent script injection. Maximum file size is 10MB.

---

### Development Workflow
- **Research First:** Before implementing any new numismatic feature, research historical standards (Numista, PCGS, Museum cataloging).
- **Architectural Oversight:** Utilize `curating-blueprints` to ensure every change aligns with the "Curator-First" philosophy and the "Single-Click Rule".
- **Validation Mandate:** Every feature must be verified with its corresponding automated test.
  - **Type-Check Policy:** You MUST execute a full project type-check (`npx tsc --noEmit`) and verify the build status before finalizing any "Execution" phase. Runtime success is not a substitute for static analysis.
  - **Testing Standards:** Refer to `docs/guides/testing_standards.md` for guidelines on the **Colocation Rule** and mocking patterns.
  - **Coverage:** Maintain 100% branch coverage for `src/common/validation.ts`, 90% for hooks, and 80% for components.
  - **Framework:** Use Vitest with React Testing Library.
  - **QA Oversight:** Utilize the `assuring-quality` skill to audit testing plans and verify coverage metrics.
---

## 4. Error Handling

All async operations must use try/catch with descriptive error messages.

**UI Resilience:** Wrap critical component trees in an `ErrorBoundary` to ensure that unexpected errors are handled gracefully with a somber, technical fallback UI, preventing total application crashes.

```typescript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  throw new Error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

Never use empty catch blocks. Log errors with context for debugging, ensuring no sensitive data is exposed.


---

## 5. Skill Synergy (Specialized Agents)
To maintain the high standards of the Patina project, utilize the specialized skills and sub-agents defined in [docs/workflows_and_skills.md](docs/workflows_and_skills.md). These extensions provide expert guidance and validation for specific domains of the project.

