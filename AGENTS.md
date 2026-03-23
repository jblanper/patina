# Patina - Engineering Mandates & Standards

This document defines the absolute standards for the Patina project. All development must rigorously adhere to these rules to maintain the "Curator-First" experience and ensure system integrity.

**Version:** 1.3
**Last Updated:** 2026-03-22

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
- **IPC Listener Ownership:** A hook that registers an IPC event listener (e.g. `lens:image-received`) must also remove it on cleanup. Register in `useEffect`, return a cleanup function that calls `removeListener`. Never register the same IPC listener in multiple places — duplicate listeners cause double-fires on re-render.
- **Derived Arrays:** Use `useMemo` (not `useState`) for arrays derived from props or other state (e.g. `existingImagePaths`). `useState` for derived data goes stale between renders.
- **Centralized Layout:** All pages MUST be wrapped in the `.app-container` within `App.tsx`. This ensures a unified "top line" width and consistent horizontal padding (The Sanctuary) across the application. Avoid local page-level wrappers that override this.
- **Smart Ledger Grid:** Prefer container-aware CSS Grid (`auto-fit`) over rigid media query breakpoints for primary layouts. Use `grid-template-columns: repeat(auto-fit, minmax(min(100%, <breakpoint>), 1fr))` to ensure zero-overflow responsiveness.
- **Grid Overflow Prevention:** Always set `min-width: 0` on direct grid children — without it, text content forces cells wider than the column definition. Pair with `overflow-wrap: anywhere` on long text nodes and `object-fit: contain` on images to prevent content from breaking the layout.
- **Styling:** All CSS must be implemented using **Vanilla CSS** in the global `src/renderer/styles/index.css` file. Follow the standards in `docs/style_guide.md`. Do NOT use `styled-jsx`, `styled-components`, or utility-first frameworks like Tailwind. Inline `<style jsx>` blocks have caused build failures in this project (missing peer dependency) and were removed — do not reintroduce them.
- **Touch Targets:** Interactive elements must meet a 44px minimum touch target. Use at least `0.75rem` padding on action buttons. Checked during code review — do not regress.
- **Accessibility — Modal Tab Order:** In confirmation dialogs, the Cancel action must come before the destructive action (Delete/Confirm) in both DOM order and tab sequence. This is required by WCAG 3.2.4 and was corrected in a post-implementation audit.
- **Accessibility — Interactive Controls:** Use native `<button>` elements for clickable list items — not `<li onClick>`. Native elements get keyboard focus and Enter/Space activation for free.
- **Optimization:** Use `React.memo` and `useCallback` strategically in the Gallery grid to ensure smooth scrolling and interaction.

### Vocabulary System (Phase 6a)
> See `docs/reference/vocabulary-system.md` for the full reference (schema, IPC API, seed procedure, component pattern).
- **Managed Fields:** Six coin fields use the vocabulary system: `metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`. Valid field names are the single source of truth in `ALLOWED_VOCAB_FIELDS` in `src/common/validation.ts`.
- **Defence-in-Depth:** Vocabulary IPC handlers validate input with `.strict()` Zod schemas at the IPC boundary. DB service methods perform a redundant `ALLOWED_VOCAB_FIELDS` allowlist check before any field string is used in SQL. Never interpolate a `field` parameter directly into SQL — use only parameterized queries.
- **Seed Versioning:** `seedVocabularies()` is called from `app.whenReady()` — never via IPC. Bump `CURRENT_SEED_VERSION` (e.g. `'6a.1'` → `'6b.1'`) to trigger a re-seed on next launch. The `INSERT OR IGNORE` pattern preserves user-modified `usage_count` values and user-added entries across re-seeds.
- **Schema Extension:** Add new tables to the `SCHEMA` array in `src/common/schema.ts` — never as raw SQL in `db.ts`. The `generateSQL()` / `CREATE TABLE IF NOT EXISTS` pattern handles migration automatically on next startup.
- **AutocompleteField Pattern:** Vocab-backed form fields use the `AutocompleteField` component + `useVocabularies(field)` hook. The hook holds a module-level cache keyed as `"${field}:${locale}"` — always include locale in the cache key to prevent cross-locale stale hits. Call `clearVocabCache()` (exported for tests only) in `beforeEach` to prevent cross-test contamination. Usage increment (`incrementUsage`) is fire-and-forget — never block the UI on it.

### Internationalization (Phase 6b)
> See `docs/guides/internationalization.md` for a step-by-step how-to guide (adding keys, using `useLanguage`, locale-aware vocab calls, test setup).
- **Library:** `react-i18next` with static JSON resources — no external CDN, no runtime network calls. Translation files live in `src/renderer/i18n/locales/en.json` and `es.json`.
- **Default Language:** Spanish (`'es'`). Never add hardcoded English strings to UI components — always use `t('namespace.key')`. Namespaces: `common`, `ledger`, `cabinet`, `plateEditor`, `autocomplete`.
- **Language Preference Bridge:** User language selection is persisted to SQLite via `pref:get`/`pref:set` IPC handlers. Schemas `PreferenceGetSchema` and `PreferenceSetSchema` use a strict key allowlist — never accept arbitrary preference keys.
- **`useLanguage` Hook:** Wraps `i18n.changeLanguage` + preference persistence. Components use this hook; they never call `i18n.changeLanguage` directly.
- **Vocabulary Locale:** `getVocab(field, locale?)` filters vocabulary by locale. The `useVocabularies` hook always passes the active locale. Cache key is always `"${field}:${locale}"` — a bare `field` key causes cross-locale pollution.
- **Lens Server Locale:** Read the language preference in the `lens:start` handler and pass it to `createLensServer()`. Embed translated strings into the mobile HTML as a JSON `data-strings='...'` attribute on `<body>` — this is CSP-compliant (no inline scripts).
- **Meta-line Fallbacks:** Use the literal string `'—'` for empty header fields. Never use a translation key as a fallback value — it creates the false impression that a field has been set.
- **Test Global Mock:** `react-i18next` is mocked in `src/renderer/setupTests.ts`; the mock resolves all keys to their English equivalents so existing test assertions remain stable. Do not override this mock per-test unless specifically testing translation behaviour.
- **Composition Check:** `src/renderer/i18n/__tests__/translations.test.ts` verifies key completeness between `en.json` and `es.json`. When adding new keys to one locale, always add them to both.

### Field Visibility System (Phase 6c)
> See `docs/blueprints/archive/2026-03-19-phase-6c-field-visibility.md` for full design rationale.
- **Scope:** Global (applies to all collections). Preferences stored in the `field_visibility` SQLite table. No `localStorage`, no per-session state.
- **Keys:** All controllable keys are in `ALLOWED_VISIBILITY_KEYS` in `src/common/validation.ts`. Every key follows the `surface.field_name` convention (`ledger.*` or `card.*`). New controllable fields must be added here first.
- **Locked fields:** `LOCKED_VISIBILITY_KEYS` (also in `validation.ts`) lists fields the user can never hide (`ledger.title`, `ledger.weight`, `ledger.diameter`, `card.metal`, `card.year`). The IPC handler silently ignores locked keys; the drawer disables their toggles.
- **Context Pattern:** `FieldVisibilityProvider` (provided at root in `App.tsx`) loads preferences once on mount via a single `prefsGetVisibility` IPC call and caches them for the session. Components call `useFieldVisibility()` — never `window.electronAPI` directly. This is the canonical pattern for any future global renderer preference.
- **Optimistic updates:** `setVisibility(key, value)` applies `setVisibilityState` before `await ipcRenderer.invoke(...)`. The UI reacts in the same frame as the toggle — no loading state required for local SQLite writes.
- **IPC surface:** Three handlers — `prefs:getVisibility`, `prefs:setVisibility` (Filter-validated via `SetVisibilitySchema.strict()`), `prefs:resetVisibility`. All return or accept `FieldVisibilityMap` (`Record<VisibilityKey, boolean>`).
- **`DEFAULT_FIELD_VISIBILITY`** lives in `src/common/validation.ts` (not `db.ts`) so the renderer can import it without creating a renderer→main dependency. Expert fields (`die_axis`, `fineness`, `edge_desc`) and privacy-sensitive fields (`provenance`, `acquisition`) default to `false`.
- **`keyToI18n()` helper:** Converts a dot-namespaced visibility key to its i18n sub-key (`ledger.die_axis` → `dieAxis`, `card.grade` → `cardGrade`). Reuse this function if building future preference drawers with dot-namespaced keys.
- **Testing:** Wrap components under test in `FieldVisibilityContext.Provider` with a mock value. The `renderWithVisibility(ui, overrides)` helper in `CoinDetail.test.tsx` is the established model — it merges `DEFAULT_FIELD_VISIBILITY` with selective `false` overrides to test hidden-field branches without real IPC.

### Glossary System (Phase 1a/1b)
- **Content Source:** `src/renderer/data/glossaryFields.ts` is the single source of truth for all bilingual glossary content — a typed TS constant bundled at build time. No runtime fetch, no Markdown parsing. `description` and `vocabulary` tables stay as bilingual TS objects; only short UI strings (`nameKey`, `typeKey`, section `labelKey`) reference i18n keys.
- **Full-Page Route:** `/glossary` → `Glossary.tsx` — a scrollable manuscript with a sticky section rail and `#anchor` deep-links.
- **Contextual Drawer:** `GlossaryDrawer.tsx` overlays the current view and targets a specific field. Triggered by `?` icons on field labels in Scriptorium (`LedgerForm`) and CoinDetail. The drawer reuses the same scroll layout as the full-page route.
- **Context Pattern:** `GlossaryContext` + `useGlossaryDrawer` hook manage drawer state (open/closed, target field). `App.tsx` provides the context and renders `GlossaryDrawer` at the root so it can overlay any route without re-mounting. Components call `useGlossaryDrawer().open(fieldId)` — never manage drawer state locally.
- **i18n Keys:** Field human-readable names use existing `ledger.*` keys where available; new `glossary.fields.*` keys for fields without a ledger equivalent. Type annotations use `glossary.types.*` keys.

### Database & File System
- **Script Execution:** Any script that imports `better-sqlite3` (or any native Electron module) MUST be executed via the `electron` binary, not `node`. The ABI versions differ; running with `node` causes a module load failure. Use `npm run db:seed` — never `node scripts/seed_data.ts` directly.
- **SQLite Integrity:** Use `better-sqlite3` with WAL mode and `foreign_keys = ON`. Foreign key constraints must be enabled to ensure cascade deletes work correctly. All writes must be atomic and follow the structured schema defined in `src/common/schema.ts`.
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

