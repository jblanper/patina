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

# Database
npm run db:seed          # Seed database with test data
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

**Image Protocol:** Images are served via the custom `patina-img://` protocol, not `file://`. This preserves the sandbox and CSP. Store image paths as relative paths from `data/images/coins/` — never as absolute paths.

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
| `src/renderer/App.tsx` | HashRouter with 4 routes: `/`, `/coin/:id`, `/scriptorium/add`, `/scriptorium/edit/:id` |
| `src/renderer/styles/index.css` | All CSS lives here — vanilla CSS only, no CSS-in-JS |

### Routing

- `/` → `Cabinet` — gallery grid with filters
- `/coin/:id` → `CoinDetail` — single coin record
- `/scriptorium/add` — `Scriptorium` — new coin form
- `/scriptorium/edit/:id` — `Scriptorium` — edit coin form

All pages are wrapped in `.app-container` from `App.tsx` (the "Sanctuary" layout) — do not add local page-level wrappers that override this horizontal padding.

### State & Data Flow

All database interaction and bridge state must be encapsulated in custom hooks (`useCoins`, `useCoin`, `useCoinForm`, `useExport`, `useLens`). Components should not call `window.electronAPI` directly.

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

## Styling Rules

- **Vanilla CSS only** in `src/renderer/styles/index.css`. No Tailwind, styled-components, or CSS modules.
- Follow `docs/style_guide.md` (v3.3, "Manuscript Hybrid") for all visual decisions.
- Core palette: Parchment `#FCF9F2`, Iron Gall Ink `#2D2926`, Burnt Sienna `#914E32`.
- Typography: Cormorant Garamond (serif/headings), Montserrat (sans/UI), JetBrains Mono (metrics).
- Use `grid-template-columns: repeat(auto-fit, minmax(min(100%, <breakpoint>), 1fr))` for responsive grids — not media query breakpoints.
- Use `React.memo` and `useCallback` strategically in the Gallery grid for scroll performance.

## Core Mandates

- `contextIsolation: true` and `sandbox: true` are non-negotiable.
- `strict: true` in TypeScript. No `any` — use `unknown` with type guards.
- All domain models in `src/common/types.ts`; all Zod schemas in `src/common/validation.ts`.
- Native module `better-sqlite3` must be rebuilt for Electron ABI using `@electron/rebuild` after version changes.
- The Lens Express server: binds to local network only, UUID session token auth, validates MIME types (jpeg/png/webp), enforces 10 MB limit.
- Nomisma.org vocabulary is fetched **once at seed time** and stored locally — no external network calls during runtime.
- **Single-Click Rule:** Every feature must be reachable within two clicks.

## Development Workflow

New features require a blueprint in `docs/blueprints/` following the 7-stage lifecycle (`Draft → Proposed → Approved → In-Progress → Verification → Completed → Archived`). Blueprints undergo multi-disciplinary audits at **Proposed** (design) and **Verification** (post-implementation) stages. See `docs/workflows_and_skills.md` for the full workflow and `docs/reference/cli_extensions.md` for the specialized skills available to assist with each domain.

## Relevant Documentation

- `AGENTS.md` — Engineering mandates (authoritative)
- `docs/technical_plan.md` — Implementation roadmap and current phase status
- `docs/style_guide.md` — Design system reference
- `docs/architecture/security_data_flow.md` — "The Filter" security pattern
- `docs/guides/testing_standards.md` — Testing colocation and mocking patterns
- `docs/workflows_and_skills.md` — Blueprint lifecycle and the Digital Curator automation layer
- `docs/reference/cli_extensions.md` — Specialized skills reference (triggers, responsibilities)
- `docs/blueprints/` — Phase implementation blueprints (check status before starting work)
