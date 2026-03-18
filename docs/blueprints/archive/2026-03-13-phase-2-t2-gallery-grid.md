# Implementation Blueprint: Phase 2 - T2: Foundational Components (Gallery & Card)

**Date:** 2026-03-13  
**Status:** Completed  
**Reference:** `docs/blueprints/2026-03-12-phase-2-display-case.md` (T2)

## 1. Objective
Implement the visual foundation of the Patina gallery by creating the `CoinCard` and `GalleryGrid` components, adhering to the "Manuscript Hybrid" aesthetic. This task also includes enhancing the data layer to provide primary image paths for the gallery view.

## 2. Technical Tasks

### T2.1: Data Layer Enhancement (Primary Image) [DONE]
- [x] Update `src/common/types.ts` to include `CoinWithPrimaryImage` interface.
- [x] Update `src/main/db.ts` to modify `getCoins()` to perform a LEFT JOIN with the `images` table to retrieve the primary image path.
- [x] Update `src/renderer/hooks/useCoins.ts` to use the updated `getCoins` return type.

### T2.2: Foundational Components [DONE]
- [x] **`CoinCard` (`src/renderer/components/CoinCard.tsx`):**
    - Implement **Path 1: The Archival Pedestal** from `proposal_gallery_card_v2_2026-03-13.html`.
    - Visuals: Borderless on `--stone-pedestal` idle; Internal Burnt Sienna border + `#F4F1E9` background on hover.
    - Typography: **Cormorant Bold** for Title, **JetBrains Mono** for metrics.
    - Metrics to display: Weight (2-decimal), Diameter (1-decimal), Metal (e.g., AR, AU).
    - Data Visibility: 100% persistent (no hidden information).
    - Image handling: Display primary image if available, fallback to a circular silhouette placeholder.
- [x] **`GalleryGrid` (`src/renderer/components/GalleryGrid.tsx`):**
    - Responsive CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.
    - Spacing: `2rem` gap between cards.
    - Use `React.memo` for performance.

### T2.3: Integration [DONE]
- [x] Update `src/renderer/App.tsx` to display the `GalleryGrid` using the `filteredCoins` from `useCoins()`.

## 3. Audits

### Security Assessment (`securing-electron`) [PASSED]
- [x] **Image Path Isolation:** Image paths retrieved from the database MUST be relative to the `data/images/` directory.
- [x] **No Raw IPC:** Renderer must only access images via the `contextBridge` exposed in `preload.ts`.
- [x] **Action:** Implementation of `CoinCard` uses `patina-img://` placeholder for protocol-ready paths.

### Numismatic Assessment (`curating-coins`) [PASSED]
- [x] **The 2-Decimal Rule (Weight):** Weight MUST be formatted to exactly two decimal places (e.g., `17.20g`) using `Intl.NumberFormat`.
- [x] **The 1-Decimal Rule (Diameter):** Diameter MUST be formatted to exactly one decimal place (e.g., `19.5mm`).
- [x] **Metal Standardization:** Use standard symbols (AU, AR, AE) as defined in `technical_metrics.md`.

### UI Assessment (`curating-ui`) [PASSED]
- [x] **Aesthetic Selection:** Path 1 (Archival Pedestal) selected.
- [x] **Hover Logic:** Internal 1px sienna border + background shift to `#F4F1E9`.
- [x] **Stability:** Ensure `box-sizing: border-box` and `inset` borders are used to prevent grid shifting on hover.

## 4. Verification Strategy
- [x] **Component Tests:** Verified via manual build and code review of `Intl.NumberFormat` implementation.
- [x] **Visual Audit:** Adheres to **Manuscript Hybrid v3.3** via Path 1 proposal.
- [x] **Performance:** `React.memo` applied to `CoinCard` and `GalleryGrid`.
- [x] **Data Integrity:** `LEFT JOIN` logic verified in `db.ts`.

## 5. Post-Implementation Retrospective
The implementation successfully merged Archetype A and B as requested. The use of internal borders via the `::after` pseudo-element ensured that the grid remains perfectly stable on hover, preserving the "Archival Stability" mandate.

**Lessons Learned:**
- Native modules like `better-sqlite3` MUST be rebuilt for the Electron version being used. Added `@electron/rebuild` to dev dependencies.
- Serving images will require a custom protocol handler (`patina-img://`) in the Main process to maintain strict sandbox security while allowing local file access. This is slated for a future task.
- `Intl.NumberFormat` is the most robust way to enforce the numismatic precision rules.

## 6. Post-Mortem: Technical Obstacles & Resolutions

During the implementation of Task 2, several critical issues were encountered and resolved to ensure system integrity:

### 1. Build Pipeline: Import Mismatch
- **Issue:** `src/main/db.ts` failed to compile during `npm run build` due to a missing import for `CoinWithPrimaryImage`.
- **Resolution:** Updated `db.ts` imports to explicitly include the new shared type.

### 2. Runtime: Preload/Bridge Sync Failure
- **Issue:** The renderer reported `window.electronAPI.getCoins is not a function`.
- **Investigation:** Discovered a stale `preload.js` was being loaded. `tsc` was emitting the main process into `dist/main/main/` while `package.json` pointed to `dist/main/`.
- **Resolution:** Aligned `package.json`'s `"main"` entry point with the actual build output (`dist/main/main/index.js`). This ensured the correct `preload.js` was loaded by the `BrowserWindow`.

### 3. Native Module: ABI Version Mismatch
- **Issue:** `better-sqlite3` failed to load in the main process with a `NODE_MODULE_VERSION` error (137 vs 143).
- **Cause:** Native modules must be compiled specifically for the Electron version's ABI, which often differs from the system Node.js version.
- **Resolution:** Integrated `@electron/rebuild` and executed a forced rebuild for the `better-sqlite3` target.
