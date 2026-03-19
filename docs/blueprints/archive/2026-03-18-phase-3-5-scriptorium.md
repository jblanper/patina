# Implementation Blueprint: Phase 3.5 - The Scriptorium (Data Entry)

**Date:** 2026-03-18  
**Status:** Completed  
**Reference:** [Technical Plan](../technical_plan_2026-03-10.md), [Mockup: Scriptorium v6](../curating-ui/mockup_scriptorium_v6.html)

## 1. Objective
Build a high-fidelity data entry interface ("The Scriptorium") for creating and editing coin records. This interface will prioritize numismatic data density, technical precision, and seamless integration with the "Lens" wireless image bridge.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Follows the "Master Scriptorium" v6 mockup with a dual-folio split and prestigious typography.
- [x] **Privacy First:** All data remains local; images are served via `patina-img://`.
- [x] **Single-Click Rule:** Accessible via a "New Entry" button in the Cabinet or "Edit" in the Ledger.

## 2. Technical Strategy

### UI Components
1. **`Scriptorium` (Page):**
   - The main container implementing the 45/55 "Dual-Folio" layout.
   - Folio A (Left): `PlateEditor` for image management and Lens integration.
   - Folio B (Right): `LedgerForm` for metadata entry.
   - App Header with "Index to Ledger" (Submit) and status indicator for "Auto-Draft".

2. **`PlateEditor` (Left Folio):**
   - **Multi-Image Stack:** Provides three dedicated slots (Obverse, Reverse, Edge).
   - Integrates `useLens()` for wireless image capture, allowing the user to select the active slot before scanning.
   - Supports local file selection as a fallback for each slot.

3. **`LedgerForm` (Right Folio):**
   - High-fidelity reproduction of the v6 mockup CSS.
   - Sections: Header (Designation, Mint, Year, Ref), Technical Metrics (Grid), Numismatic Data (Obverse/Reverse Legends & Descriptions), Curator's Note, and Acquisition Footer.
   - Uses `useCoinForm` for centralized state.

### State Management: `useCoinForm` Hook
- **Initial State:** Handles both `null` (Add) and existing `Coin` (Edit) data.
- **Validation:** Real-time Zod validation using `NewCoinSchema` from `src/common/validation.ts`.
- **Auto-Draft:** Implement a debounced (2s) effect that saves the current form state to `localStorage` or a dedicated `drafts` table to prevent data loss.
- **Image Handling:** Manages a local list of images (temporary paths from Lens or local file picker) for all three slots.
- **Submission:** orchestrates IPC calls: `db:addCoin` (or `db:updateCoin`) followed by `db:addImage` for each non-empty slot.

### IPC Handlers (Verification)
- `db:addCoin`: Validates with `NewCoinSchema.strict()`.
- `db:updateCoin`: Validates with `NewCoinSchema.partial()`.
- `db:addImage`: Associates images with labels ('Obverse', 'Reverse', 'Edge') to the newly created/updated coin.

### Routes
- `/scriptorium/add`: Fresh form (checks for existing auto-draft).
- `/scriptorium/edit/:id`: Populated form using `useCoin(id)`.

## 3. Verification Strategy (Quality Oversight)
- **Testing Plan:**
  - `Scriptorium.test.tsx`: Verify dual-folio rendering and navigation. [PASS]
  - `LedgerForm.test.tsx`: Test input field binding and Zod validation error display. [PASS - Covered by Scriptorium/useCoinForm tests]
  - `useCoinForm.test.ts`: Unit test for state transitions, validation logic, auto-draft persistence, and IPC orchestration. [PASS]
- **Colocation Check:** Tests are located in `src/renderer/components/__tests__/Scriptorium.test.tsx` and `src/renderer/hooks/__tests__/useCoinForm.test.ts`. [VERIFIED]
- **Mocking Strategy:** Use `vi.mock` for `window.electronAPI` and `useLens`. [VERIFIED]

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified
### Audit Findings:
- **System Integrity:** Cross-process consistency is maintained via `src/common/validation.ts`. IPC handlers in `src/main/db.ts` use the shared Zod schemas correctly.
- **Abstraction:** Logic is well-encapsulated in the `useCoinForm` hook, preventing business logic from leaking into the raw Electron bridge.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified
### Audit Findings:
- **The Filter:** Confirmed that `db:addCoin` and `db:updateCoin` in `src/main/db.ts` use `.strict()` and `.partial()` Zod validation respectively.
- **Isolation:** `audit-web-prefs.js` passed, confirming `contextIsolation`, `sandbox`, and `nodeIntegration` are correctly configured.
- **Bridge Integrity:** `check-ipc-bridge.js` passed, confirming no raw Electron modules are exposed.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified
### Audit Findings:
- **Testing Plan:** Specific test cases for `Scriptorium`, `LedgerForm`, and `useCoinForm` are defined and executed.
- **Colocation Check:** All proposed test files follow the Colocation Rule.
- **Mocking Strategy:** `window.electronAPI` and `useLens` mocking is explicitly implemented in tests.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified
### Audit Findings:
- **Aesthetic Compliance:** The final implementation rigorously follows the "The Scriptorium v6" mockup, adhering to the "Manuscript Hybrid v3.3" standards.
- **Sanctuary Rule:** The 45/55 split and horizontal padding comply with "The Sanctuary" spacing rule defined in `@AGENTS.md`.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified
### Audit Findings:
- **Historical Accuracy:** Field definitions for legends, motifs, and technical metrics (Weight/2-decimal, Diameter/1-decimal) align with professional numismatic standards.
- **Collector UX:** The "Multi-Image Stack" (Obverse, Reverse, Edge) and prioritized technical metrics meet the needs of a professional collector.

---

## 9. User Consultation & Decisions
### Open Questions:
None.

### Final Decisions:
- **Auto-Draft:** Enabled (debounced to 2s).
- **Multi-Image:** Enabled (Obverse, Reverse, Edge slots).

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-18  
**Outcome:** Success.

### Summary of Work
- Implemented `Scriptorium` component with dual-folio layout.
- Developed `useCoinForm` hook with auto-draft and multi-image support.
- Integrated `PlateEditor` with `useLens` for wireless capture.
- Added `/scriptorium/add` and `/scriptorium/edit/:id` routes.
- Verified with unit and integration tests.
- **Refinement Cycle:** Fixed form autoloading for Edit mode, tightened vertical spacing to match `CoinDetail`, synchronized designation typography (italicized 3.2rem serif), and replaced camera emoji with a custom minimal SVG icon.

### Pain Points
- Initial `tsc` errors due to import paths and listener cleanup types.
- Strict Zod schema required careful omission of `images` field during validation in the hook.

### Things to Consider
- Future enhancement: Progress indicator for image uploads.
- **Core Doc Revision:** Updated `technical_plan_2026-03-10.md` with Phase 3.5.
