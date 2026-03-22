# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Patina

Patina is a **privacy-first Electron desktop application** for historical coin collectors. React + TypeScript renderer, better-sqlite3 local SQLite, Express.js ("The Lens") for Wi-Fi photo uploads. No data ever leaves the user's machine.

## Commands

```bash
npm run dev              # Start all processes (Vite renderer, tsc watch, Electron)
npm run build            # Build renderer + main process
npm run type-check       # Full TypeScript check — run before finalizing any feature
npm test                 # Run all tests with Vitest
npm run test -- --coverage
npm run lint
npx tsc --noEmit         # Zero-Error Rule: must pass before any commit
npm install --legacy-peer-deps   # Required — React 19 peer-dep friction
npm run db:seed          # Seed DB (electron binary — never run seed scripts with node)
node scripts/extract_schema.cjs  # Print current DB schema
```

**Critical:** `npx tsc --noEmit` must pass before finalizing. A working dev server is not a substitute.

## Architecture

### Process Separation

```
src/main/        ← Node.js / Electron Main process
src/renderer/    ← React / Browser renderer process
src/common/      ← Shared types and validation (used by both)
```

**The Filter:** Main process validates ALL renderer data with strict Zod schemas (`.strict()`). Schemas in `src/common/validation.ts`. See `docs/architecture/security_data_flow.md`.

**The Bridge:** `src/main/preload.ts` exposes `window.electronAPI` via `contextBridge` only. Never raw IPC or Node.js from the renderer.

**Image Protocol:** `patina-img://` custom protocol, not `file://`. Relative paths from `data/images/coins/`. Protocol handlers use async reads (`fs.promises.readFile`) and block `..` traversal.

### Key Files

| File | Role |
|------|------|
| `src/main/index.ts` | Electron lifecycle, BrowserWindow, IPC handlers, security |
| `src/main/db.ts` | SQLite service — all DB operations |
| `src/main/preload.ts` | Context bridge API surface |
| `src/main/server.ts` | Lens Express server (token-based auth) |
| `src/common/types.ts` | Domain models: `Coin`, `CoinImage` |
| `src/common/validation.ts` | Zod schemas — 100% branch coverage required |
| `src/common/schema.ts` | SQLite table/column definitions |
| `src/renderer/App.tsx` | HashRouter — 5 routes (see Routing) |
| `src/renderer/styles/index.css` | All CSS — vanilla only |
| `src/renderer/components/Glossary.tsx` | Full-page `/glossary` bilingual reference |
| `src/renderer/components/GlossaryDrawer.tsx` | Contextual drawer triggered by `?` icons on field labels |
| `src/renderer/data/glossaryFields.ts` | Static bilingual glossary content (TS constant, no runtime fetch) |

### Routing

- `/` → `Cabinet` — gallery grid with filters
- `/coin/:id` → `CoinDetail` — single coin record
- `/scriptorium/add` / `/scriptorium/edit/:id` → `Scriptorium` — coin form
- `/glossary` → `Glossary` — bilingual field reference (EN/ES)

All pages wrap in `.app-container` from `App.tsx`. Never add local page-level wrappers.

### State & Data Flow

All IPC/DB state in custom hooks: `useCoins`, `useCoin`, `useCoinForm`, `useExport`, `useLens`, `useLanguage`. Components never call `window.electronAPI` directly.

- **IPC listeners:** Register and remove in the same `useEffect`. Never register the same listener in multiple places — causes double-fires.
- **Derived arrays:** `useMemo` not `useState` — `useState` goes stale between renders.
- **Vocabulary cache:** Always key as `"${field}:${locale}"` — bare `field` causes cross-locale stale hits.
- **Glossary drawer:** Use `useGlossaryDrawer().open(fieldId)` — `GlossaryContext` is provided at root in `App.tsx`. Never manage drawer state locally.

## Testing Standards

**Colocation:** Tests live next to source (`CoinCard.test.tsx` beside `CoinCard.tsx`, hooks in `hooks/__tests__/`).

**Coverage:** 100% branch (`validation.ts`), 90% function (hooks), 80% statement (components).

**Mocking:** `window.electronAPI` global mock in `setupTests.ts` — clear in `beforeEach`, set per-test. `react-i18next` global mock resolves keys to English. Call `clearVocabCache()` in `beforeEach` when testing vocab-backed components.

**Async:** Always `waitFor` / `findBy*` — never sync queries for async state.

**Lens testing:** `supertest` against `createApp()` factory from `src/main/server.ts`.

**i18n parity:** `src/renderer/i18n/__tests__/translations.test.ts` enforces key parity between locales. Add new keys to both `en.json` and `es.json`.

## Styling Rules

- **Vanilla CSS only** in `src/renderer/styles/index.css`. No Tailwind, styled-components, CSS modules, or `<style jsx>` (`<style jsx>` caused a build failure — missing peer dep).
- Style guide: `docs/style_guide.md` v3.3 "Manuscript Hybrid". Palette: Parchment `#FCF9F2`, Iron Gall `#2D2926`, Burnt Sienna `#914E32`. Fonts: Cormorant Garamond (headings), Montserrat (UI), JetBrains Mono (metrics).
- Responsive grids: `repeat(auto-fit, minmax(min(100%, <bp>), 1fr))` — not media queries.
- **Grid overflow:** `min-width: 0` on grid children + `overflow-wrap: anywhere` on text + `object-fit: contain` on images.
- **Touch targets:** 44px minimum — `≥0.75rem` padding on action buttons.
- `React.memo` + `useCallback` in Gallery grid for scroll performance.

## Core Mandates

- `contextIsolation: true`, `sandbox: true` — non-negotiable.
- `strict: true`. No `any` — use `unknown` with type guards. Prefer `const` and `readonly`.
- Lens server: local network only, `helmet`, CORS localhost, MIME allowlist (jpeg/png/webp — SVG **explicitly blocked**), 10 MB limit, Zod validation on all multipart data.
- Always commit `package-lock.json`. Use caret (`^`) versioning. Run `npm audit`; fix HIGH/CVE within 48 hrs. `better-sqlite3` requires `@electron/rebuild` after version changes.
- SQLite: WAL mode, `foreign_keys = ON`. New tables go in `SCHEMA` array in `schema.ts` — never raw SQL in `db.ts`.
- Image paths stored relative to `data/images/`. Deleting a coin must clean up its files from disk.
- Vocabulary fields (`metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`) validated against `ALLOWED_VOCAB_FIELDS`. Bump `CURRENT_SEED_VERSION` to trigger re-seed. Vocab fields use `AutocompleteField` + `useVocabularies`. `incrementUsage` is fire-and-forget.
- **i18n:** Default language Spanish (`'es'`). No hardcoded English strings — use `t('key')`. Use `useLanguage` hook (never `i18n.changeLanguage` directly). Empty header fields use `'—'`, never a translation key. Lens locale injected via `data-strings` JSON attribute on `<body>`.
- **Accessibility:** `<button>` not `<li onClick>`. Confirmation modals: Cancel before destructive action (WCAG 3.2.4).
- **Single-Click Rule:** Every feature reachable within two clicks.

## Error Handling

All async operations use try/catch with descriptive messages — never empty catch blocks. Wrap critical trees in `ErrorBoundary` (react-error-boundary); use `resetErrorBoundary()` for recovery, never `window.location.reload()`.

## Development Workflow

New features require a blueprint in `docs/blueprints/` (lifecycle: `Draft → Proposed → Approved → In-Progress → Verification → Completed → Archived`). Research numismatic standards before implementing coin-related features (Numista, PCGS, museum cataloging). See `docs/workflows_and_skills.md` and `docs/reference/cli_extensions.md`.

## Relevant Documentation

- `AGENTS.md` — Engineering mandates (full detail, authoritative)
- `docs/technical_plan.md` — Roadmap and phase status
- `docs/style_guide.md` — Design system
- `docs/architecture/security_data_flow.md` — The Filter
- `docs/guides/testing_standards.md` — Testing patterns
- `docs/guides/internationalization.md` — How to add/modify translations (i18n)
- `docs/reference/ipc_api.md` — Full IPC handler reference (DB, Lens, Export, Vocab, Preferences)
- `docs/reference/vocabulary-system.md` — Vocabulary system (fields, schema, cache key, fire-and-forget)
- `docs/workflows_and_skills.md` — Blueprint lifecycle
- `docs/blueprints/` — Check status before starting work
