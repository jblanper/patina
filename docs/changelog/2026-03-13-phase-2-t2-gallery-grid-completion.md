# Context Snapshot: Phase 2 - T2: Gallery & Card Implementation
**Date:** 2026-03-13

## High-Level Summary
Successfully implemented the foundational Gallery and Coin Card components for Phase 2. The UI follows the "Archival Pedestal" aesthetic (Path 1) with 100% persistent data visibility and stable, non-shifting hover states. The data layer was enhanced to support primary image retrieval through SQL joins, and several critical build/runtime issues were resolved.

## Key Code Changes
* `src/renderer/components/CoinCard.tsx`: New component implementing the Archival Pedestal design with numismatic metric formatting (Intl.NumberFormat).
* `src/renderer/components/GalleryGrid.tsx`: New responsive grid component using React.memo for performance.
* `src/main/db.ts`: Enhanced `getCoins` to perform a LEFT JOIN for primary image paths.
* `src/common/types.ts`: Added `CoinWithPrimaryImage` interface.
* `src/renderer/App.tsx`: Integrated the new GalleryGrid and cleaned up the old list view.
* `package.json`: Updated `"main"` entry point to `dist/main/main/index.js` to align with the TSC output.
* `docs/blueprints/2026-03-13-phase-2-t2-gallery-grid.md`: Created detailed blueprint and post-mortem of the implementation.

## Architectural Decisions & Context
* **Archival Stability:** Used internal borders (`::after`) on cards to prevent layout shifts during hover interactions, preserving the "Sanctuary" feel of the archive.
* **Numismatic Precision:** Enforced the "2-decimal rule" for weight and "1-decimal rule" for diameter using `Intl.NumberFormat` within the component layer.
* **Electron Security:** Decided on a custom protocol (`patina-img://`) for future local image loading to maintain strict sandboxing.
* **Native Module Management:** Integrated `@electron/rebuild` to handle `better-sqlite3` ABI version mismatches between Node.js and Electron.

## Next Steps / Unresolved Issues
* [ ] **T3: The Sidebar & Filtering:** Implement the `PatinaSidebar` with multi-select filters for Era and Metal.
* [ ] **Custom Protocol:** Implement the `patina-img://` protocol handler in `src/main/index.ts` to enable local image rendering in the gallery.
* [ ] **T4: Global Search:** Implement the `SearchBar` for real-time filtering.
* [ ] **Privacy Audit:** Ensure all fonts and assets are served locally (found some external Google Font links in `index.html` and `style_guide.html`).
