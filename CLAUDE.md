# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Patina

Patina is a **privacy-first Electron desktop application** for historical coin collectors. It uses React + TypeScript for the renderer, better-sqlite3 for local-only SQLite storage, and an Express.js server ("The Lens") for Wi-Fi photo uploads from mobile devices. No data ever leaves the user's machine — no telemetry, no cloud sync, all assets local.

## Commands

```bash
# Development
npm run dev              # Start all processes concurrently (Vite renderer, tsc watch, Electron)
npm run dev:renderer     # Vite dev server only (port 3000)

# Build
npm run build            # Build renderer + main process
npm run type-check       # Full TypeScript check (run before finalizing any feature)

# Testing
npm test                 # Run all tests with Vitest
npm run test -- --coverage  # Run tests with coverage report
npm run test -- path/to/file.test.ts  # Run a single test file

# Lint & Quality
npm run lint             # ESLint check
npx tsc --noEmit         # Zero-Error Rule: must pass before any commit

# Dependencies
npm install --legacy-peer-deps   # Required — React 19 peer-dep friction with some packages

# Database
npm run db:seed          # Seed database with test data (runs via electron binary — do NOT run seed scripts with node directly; ABI mismatch with better-sqlite3)
node scripts/extract_schema.cjs  # Print current DB schema to stdout
```

**Critical:** You MUST run `npx tsc --noEmit` before finalizing any implementation. A working HMR dev server is not a substitute for a clean type-check.

## Architecture

### Process Separation (Electron)

```
src/main/        ← Node.js / Electron Main process
src/renderer/    ← React / Browser renderer process
src/common/      ← Shared types and validation (used by both)
```

**The Filter:** The Main process must validate ALL data from the Renderer using strict Zod schemas (`.strict()`). Never trust the Renderer. Schemas live in `src/common/validation.ts`. See `docs/architecture/security_data_flow.md`.

**The Bridge:** `src/main/preload.ts` exposes `window.electronAPI` via `contextBridge`. The Renderer may ONLY communicate with Main through this typed API — never through raw IPC or Node.js.

**Image Protocol:** Images are served via the custom `patina-img://` protocol, not `file://`. This preserves the sandbox and CSP. Store image paths as relative paths from `data/images/coins/` — never as absolute paths. Protocol handlers must use async file reads (`fs.promises.readFile`) — never block the main process with sync reads.

### Key Files

| File | Role |
|------|------|
| `src/main/index.ts` | Electron lifecycle, BrowserWindow, IPC handlers, security setup |
| `src/main/db.ts` | SQLite service (better-sqlite3, WAL mode) — all DB operations |
| `src/main/preload.ts` | Context bridge API surface exposed to renderer |
| `src/main/server.ts` | Express server for Lens mobile bridge (token-based auth) |
| `src/common/types.ts` | Domain models: `Coin`, `CoinImage` — single source of truth |
| `src/common/validation.ts` | Zod schemas — 100% branch coverage required |
| `src/common/schema.ts` | SQLite table/column definitions |
| `src/renderer/App.tsx` | HashRouter with 5 routes: `/`, `/coin/:id`, `/scriptorium/add`, `/scriptorium/edit/:id`, `/glossary` |
| `src/renderer/styles/index.css` | All CSS lives here — vanilla CSS only, no CSS-in-JS |
| `src/renderer/components/Glossary.tsx` | Full-page `/glossary` route — bilingual coin field reference scroll |
| `src/renderer/components/GlossaryDrawer.tsx` | Contextual slide-in drawer triggered by `?` icons on field labels in Scriptorium and CoinDetail |
| `src/renderer/data/glossaryFields.ts` | Static bilingual glossary content (TS constant, bundled at build time — no runtime fetch) |
| `src/renderer/i18n/locales/en.json` | English translations (namespaces: `common`, `ledger`, `cabinet`, `plateEditor`, `autocomplete`) |
| `src/renderer/i18n/locales/es.json` | Spanish translations — default language |

### Routing

- `/` → `Cabinet` — gallery grid with filters
- `/coin/:id` → `CoinDetail` — single coin record
- `/scriptorium/add` — `Scriptorium` — new coin form
- `/scriptorium/edit/:id` — `Scriptorium` — edit coin form
- `/glossary` → `Glossary` — bilingual coin field reference (EN/ES)

All pages are wrapped in `.app-container` from `App.tsx` (the "Sanctuary" layout) — do not add local page-level wrappers that override this horizontal padding.

### State & Data Flow

All database interaction and bridge state must be encapsulated in custom hooks (`useCoins`, `useCoin`, `useCoinForm`, `useExport`, `useLens`, `useLanguage`). Components should not call `window.electronAPI` directly.

- **IPC listener ownership:** A hook that registers an IPC event listener must also remove it on cleanup (`useEffect` return). Never register the same listener in multiple places — duplicate listeners cause double-fires.
- **Derived arrays:** Use `useMemo`, not `useState`, for arrays derived from props or other state. `useState` for derived data goes stale between renders.
- **Vocabulary cache keys** must always be `"${field}:${locale}"` — a bare `field` key causes cross-locale stale hits.
- **Glossary drawer state** is managed by `GlossaryContext` + `useGlossaryDrawer`. `App.tsx` provides the context and renders `GlossaryDrawer` at the root. Components call `useGlossaryDrawer().open(fieldId)` — never manage drawer state locally.

## Testing Standards

**Colocation Rule:** Test files live next to the source they test.
- Components: `CoinCard.test.tsx` alongside `CoinCard.tsx`
- Hooks: `hooks/__tests__/useCoins.test.ts`
- Integration: `src/__tests__/integration/`

**Coverage mandates:**
- `src/common/validation.ts`: 100% branch coverage
- `src/renderer/hooks/`: 90% function coverage
- `src/renderer/components/`: 80% statement coverage

**Electron API mocking:** `window.electronAPI` does not exist in jsdom. The global mock is set up in `src/renderer/setupTests.ts`. Clear mocks in `beforeEach` and set return values per-test.

**Async assertions:** Always use `waitFor` or `findBy*` queries — never query for async state synchronously.

**Express server testing:** Use `supertest` against the exported `createApp()` factory from `src/main/server.ts` to test the Lens in isolation without starting Electron.

**Vocabulary tests:** Call `clearVocabCache()` (exported for tests only) in `beforeEach` when testing any component that uses `useVocabularies` — the hook uses a module-level cache that persists across tests.

**i18n composition:** `src/renderer/i18n/__tests__/translations.test.ts` enforces key parity between `en.json` and `es.json`. When adding keys to one locale, always add them to both.

## Styling Rules

- **Vanilla CSS only** in `src/renderer/styles/index.css`. No Tailwind, styled-components, or CSS modules.
- Follow `docs/style_guide.md` (v3.3, "Manuscript Hybrid") for all visual decisions.
- Core palette: Parchment `#FCF9F2`, Iron Gall Ink `#2D2926`, Burnt Sienna `#914E32`.
- Typography: Cormorant Garamond (serif/headings), Montserrat (sans/UI), JetBrains Mono (metrics).
- Use `grid-template-columns: repeat(auto-fit, minmax(min(100%, <breakpoint>), 1fr))` for responsive grids — not media query breakpoints.
- **Grid overflow:** Always set `min-width: 0` on direct grid children. Pair with `overflow-wrap: anywhere` on text and `object-fit: contain` on images to prevent content from breaking layout.
- **Touch targets:** Minimum 44px — use at least `0.75rem` padding on action buttons.
- **No inline styles.** `<style jsx>` blocks caused a build failure in this project (missing peer dependency). All styles go in `index.css`.
- Use `React.memo` and `useCallback` strategically in the Gallery grid for scroll performance.

## Core Mandates

### Security
- `contextIsolation: true` and `sandbox: true` are non-negotiable.
- Only expose specific, validated functions through `contextBridge`. Never expose raw IPC or Node.js modules.
- Protocol handlers must implement strict path sanitization (block `..` traversal).
- The Lens Express server: binds to local network only, UUID session token auth, `helmet` middleware, CORS restricted to localhost. MIME allowlist: `image/jpeg`, `image/png`, `image/webp` only — SVG is explicitly blocked (script injection risk). 10 MB file size limit. All multipart data validated with Zod.

### TypeScript
- `strict: true` is mandatory. No `any` — use `unknown` with type guards.
- Prefer `const` and `readonly`. Use functional patterns for data transformations.
- All domain models in `src/common/types.ts`; all Zod schemas in `src/common/validation.ts`.

### Dependencies
- Always commit `package-lock.json`. Never use `--no-package-lock`.
- Use caret (`^`) versioning. Run `npm audit` regularly; address HIGH/CVE issues within 48 hours.
- Native module `better-sqlite3` must be rebuilt for Electron ABI using `@electron/rebuild` after version changes.
- Electron, better-sqlite3, express, zod, and react-error-boundary require extended testing before upgrade.

### Database & Files
- SQLite: WAL mode, `foreign_keys = ON` (required for cascade deletes).
- Add new tables to the `SCHEMA` array in `src/common/schema.ts` — never as raw SQL in `db.ts`.
- New coins default to `era: 'Ancient'` — enforced in both `schema.ts` and `useCoinForm.ts`.
- Store image paths as relative to `data/images/`. Never use absolute paths in the database.
- When deleting a coin, clean up associated image files from the filesystem (`deleteCoin()` handles this).
- Lens file saves must use atomic move/write operations to prevent data loss.

### Vocabulary System
- Six fields use the vocabulary system: `metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`. `ALLOWED_VOCAB_FIELDS` in `src/common/validation.ts` is the single source of truth — never interpolate a `field` string directly into SQL.
- Bump `CURRENT_SEED_VERSION` to trigger a re-seed on next launch. `INSERT OR IGNORE` preserves user-modified values across re-seeds.
- Vocab-backed form fields use `AutocompleteField` + `useVocabularies(field)`. `incrementUsage` is fire-and-forget — never block the UI on it.

### Internationalization
- Default language is Spanish (`'es'`). Never add hardcoded English UI strings — use `t('namespace.key')`.
- Use `useLanguage` hook to change language. Never call `i18n.changeLanguage` directly from components.
- Use `'—'` for empty header/meta-line fields. Never use a translation key as a fallback — it falsely implies a value is set.
- Lens server locale: read preference in `lens:start`, pass to `createLensServer()`, embed client strings as JSON in `data-strings` on `<body>` (CSP-compliant).
- Nomisma.org vocabulary is fetched **once at seed time** and stored locally — no external network calls during runtime.

### Accessibility
- Use native `<button>` for clickable items (not `<li onClick>`).
- In confirmation modals, Cancel must precede the destructive action in DOM order and tab sequence (WCAG 3.2.4).

### Single-Click Rule
Every feature must be reachable within two clicks.

## Error Handling

All async operations must use try/catch with descriptive messages. Never use empty catch blocks.

```typescript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  throw new Error(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

Wrap critical component trees in `ErrorBoundary` (from `react-error-boundary`). Use `resetErrorBoundary()` for scoped recovery — never `window.location.reload()`.

## Development Workflow

New features require a blueprint in `docs/blueprints/` following the 7-stage lifecycle (`Draft → Proposed → Approved → In-Progress → Verification → Completed → Archived`). Blueprints undergo multi-disciplinary audits at **Proposed** (design) and **Verification** (post-implementation) stages. Before implementing any numismatic feature, research historical standards (Numista, PCGS, museum cataloging). See `docs/workflows_and_skills.md` for the full workflow and `docs/reference/cli_extensions.md` for the specialized skills available to assist with each domain.

## Relevant Documentation

- `AGENTS.md` — Engineering mandates (authoritative, full detail)
- `docs/technical_plan.md` — Implementation roadmap and current phase status
- `docs/style_guide.md` — Design system reference
- `docs/architecture/security_data_flow.md` — "The Filter" security pattern
- `docs/guides/testing_standards.md` — Testing colocation and mocking patterns
- `docs/workflows_and_skills.md` — Blueprint lifecycle and the Digital Curator automation layer
- `docs/reference/cli_extensions.md` — Specialized skills reference (triggers, responsibilities)
- `docs/blueprints/` — Phase implementation blueprints (check status before starting work)
