# Implementation Blueprint: T1 - useCoins Hook

**Date:** 2026-03-12  
**Status:** Approved  
**Reference:** `docs/blueprints/2026-03-12-phase-2-display-case.md` & `docs/blueprints/2026-02-11-phase-2-usecoin-hook-first-proposal.md`

## 1. Objective
Implement a robust, secure, and performant React hook for managing the coin collection state. This hook will centralize fetching, filtering, and mutation logic, serving as the data engine for the Phase 2 UI.

## 2. Technical Tasks

### T1.1: Environment Setup
- Install dependencies: `npm install zod react-error-boundary`.
- Ensure `src/renderer/hooks` directory exists.

### T1.2: Validation Schemas (`src/common/validation.ts`)
- Define Zod schemas for `Coin`, `NewCoin`, and `FilterState`.
- **Security:** Use `.strict()` on the `NewCoin` schema to prevent mass-assignment of unauthorized fields.
- **Metrics:** Enforce decimal precision: `weight` (min 0, max 2 decimals) and `diameter` (min 0, max 1 decimal).
- Centralize these in `common/` as they will be used by both Main (IPC validation) and Renderer.

### T1.3: Hook Core Implementation (`src/renderer/hooks/useCoins.ts`)
- **State:** `coins`, `loading`, `error`, and `filters`.
- **Fetching:** Use `window.electronAPI.getCoins()` on mount and after mutations.
- **Filtering (Memoized):**
    - **Search:** Case-insensitive search on `title`, `issuer`, `denomination`, `year_display`, `provenance`, and `catalog_ref`.
    - **Filters:** Multi-select for `era` (Ancient/Medieval/Modern) and `metal`.
    - **Chronology:** Ensure the default sort uses `year_numeric` to maintain archival accuracy.
- **Mutations:** Wrap `addCoin`, `updateCoin`, and `deleteCoin` with error handling and automatic state refreshes.
- **Optimization:** Use `useMemo` for the `filteredCoins` result and `useCallback` for setter functions.

### T1.4: Main-side Validation (`src/main/db.ts`)
- Implement a `validateInput` helper to check incoming IPC data against the strict Zod schemas.
- Ensure all `dbService` methods (add/update/delete) verify IDs (positive integers) and object structures before executing SQL.


### T1.5: Error Boundary (`src/renderer/components/ErrorBoundary.tsx`)
- Implement a graceful fallback for UI crashes using `react-error-boundary`.

## 3. Verification Strategy
- **Unit Tests:** `src/renderer/hooks/__tests__/useCoins.test.ts`. Focus on the pure filtering function logic.
- **IPC Audit:** Verify that invalid data sent via the console/IPC results in a rejected promise from the Main process, not a database error or application crash.
- **Visual Check:** Log the `filteredCoins` count to the console during manual testing of the Sidebar filters.

---

## 4. Security Assessment (`securing-electron`)

**Status:** Verified // Defensive Posture Confirmed

### Audit Findings:
- **T1.4 (Main-side Validation):** The inclusion of Zod validation for all incoming IPC data (IDs, `NewCoin` objects) is the most critical security measure. It effectively creates "The Filter" mandate from our security standards, treating all Renderer input as untrusted.
- **T1.2 (Centralized Schemas):** Sharing schemas between Main and Renderer ensures type-safety and structural integrity across the context bridge, reducing the risk of malformed data causing database corruption or memory issues.
- **T1.5 (Error Boundaries):** Implementing error boundaries at the component level prevents a single hook failure from crashing the entire Electron process, maintaining application availability.

### Recommendations:
- Ensure that `validateInput` in `src/main/db.ts` rejects any unknown keys in the `NewCoin` object to prevent potential "mass assignment" vulnerabilities.
- Verify that the `electronAPI` in `preload.ts` remains a collection of simple wrappers; do not allow the hook to pass raw SQL fragments or complex query objects to the Main process.

---

## 5. Numismatic Assessment (`curating-coins`)

**Status:** Verified // Scholarly Integrity Maintained

### Audit Findings:
- **T1.3 (Filtering Logic):** The multi-select for `era` and `metal` correctly implements the high-level categories required for archival navigation.
- **Search Scope:** Including `denomination`, `issuer`, `provenance`, and `catalog_ref` in the global search ensures that collectors can quickly find coins based on both their physical characteristics and their scholarly citations (e.g., RIC/RPC numbers).
- **Reference to First Proposal:** The inclusion of `rarity` and `grade` (adjective scale) in the underlying plan aligns with PCGS/NGC standards and ensures the hook is ready for professional-grade cataloging.

### Recommendations:
- **Chronology:** Ensure the `filteredCoins` logic explicitly uses `year_numeric` for sorting to maintain chronological accuracy (especially for BC/AD transitions).
- **Metrics:** When implementing `updateCoin`, the validation must enforce the "2-Decimal Rule" for `weight` (grams) and the "1-Decimal Rule" for `diameter` (mm) as defined in `technical_metrics.md`.
- **Legend Support:** Consider adding `obverse_legend` and `reverse_legend` to the search scope in a future iteration to support advanced research tasks.

---

## 6. Post-Implementation Retrospective

**Date:** 2026-03-12  
**Outcome:** Successfully deployed the data engine for Phase 2.

### Summary of Work
- **Centralized Validation:** Created `src/common/validation.ts` to share strict Zod schemas between Main and Renderer processes.
- **Robust Hook:** Implemented `useCoins` with memoized filtering, debounced search (300ms), and archival sorting.
- **Defensive IPC:** Hardened `src/main/db.ts` with mandatory Zod validation for all data-writing operations.
- **Archival Aesthetic:** Refactored `index.css` and `App.tsx` to align with the **Manuscript Hybrid (v3.3)** style guide.
- **Verification:** Established a testing suite using **Vitest** and **jsdom**, achieving 100% pass rate on core hook logic.

### Pain Points
- **Dependency Conflicts:** React 19 introduced peer-dependency friction with older testing libraries. Resolved by using `renderHook` from `@testing-library/react` (v16+) and the `--legacy-peer-deps` flag.
- **Zod API Changes:** Encountered a minor break where `result.error.issues` must be used instead of `result.error.errors` in the latest Zod versions.
- **Test Environment:** Required manual installation of `@testing-library/dom` and `jsdom` to satisfy Vitest's browser-like environment requirements.

### Things to Consider
- **Performance at Scale:** Currently, `availableMetals` and other filter options are derived in-memory from the full `coins` array. If the collection exceeds ~1,000 items, we should move these to `SELECT DISTINCT` queries in the Main process.
- **BC/AD Logic:** While `year_numeric` handles sorting correctly, the display logic for BC dates in search/filtering requires careful coordination between the `year_display` string and the numeric value.
- **Global Types:** As we move forward, consider if some Zod-inferred types should replace the manual interfaces in `src/common/types.ts` to reduce duplication.


