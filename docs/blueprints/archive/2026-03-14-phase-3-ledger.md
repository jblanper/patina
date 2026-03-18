# Implementation Blueprint: Phase 3 - The Ledger (Coin Record View)

**Date:** 2026-03-14
**Status:** Approved
**Reference:** docs/technical_plan_2026-03-10.md

## 1. Objective
Implement the "Ledger" view (Coin Detail page) to display the full historical and physical record of a single coin. This includes a high-fidelity image inspection tool, a rich "Story" section, and a layout that strictly adheres to the "Archival Ledger" aesthetic.

### Philosophical Alignment
- [x] **Curator-First:** The UI mimics a physical museum ledger or auction catalog entry.
- [x] **Privacy First:** All data and images remain local; no external calls.
- [x] **Single-Click Rule:** Navigation from Gallery to Ledger is one click; return is one click.

## 2. Technical Architecture

### 2.1 Dependencies
- **Action:** Install `react-router-dom` to manage navigation between the Gallery and the Ledger.
- **Rationale:** Standardizes routing for a multi-view application.

### 2.2 Routing Structure
- **File:** `src/renderer/App.tsx`
- **Change:** Wrap the application in `HashRouter`.
- **Routes:**
  - `/` -> `GalleryGrid` (Home)
  - `/coin/:id` -> `CoinDetail` (New Component)

### 2.3 New Component: `CoinDetail.tsx`
- **Location:** `src/renderer/components/CoinDetail.tsx`
- **Layout Strategy:** "The Open Book" layout.
  - **Header:** Back Navigation (Icon), Title (Cormorant Garamond), Year/Issuer (Montserrat).
  - **Left Column (The Plate):**
    - Large primary image display.
    - Thumbnail strip for Obverse, Reverse, Edge.
    - **Interaction:** Click to open "Zoom Modal" (full-screen inspection).
  - **Right Column (The Record):**
    - **Physical Data:** Weight, Diameter, Metal, Fineness (JetBrains Mono for metrics).
    - **Historical Data:** Mint, Era, Grade, Rarity, Catalog Ref.
  - **Bottom Section (The Story):**
    - Full-width prose section for `story` and `provenance`.
    - Styled with `max-width: 65ch` for optimal readability.

### 2.4 New Hook: `useCoin(id)`
- **Location:** `src/renderer/hooks/useCoin.ts`
- **Purpose:** Encapsulate `window.electronAPI.getCoinById(id)` logic.
- **State:** `{ coin, images, isLoading, error }`
- **Logic:**
  - Fetch data on mount.
  - Handle `404` (Coin not found) gracefully.

### 2.5 Image Zoom Modal
- **Feature:** A modal overlay that displays the image at its native resolution.
- **Controls:** Pan/Zoom (optional for MVP, start with "Fit" vs "Actual Size" toggle).
- **Close:** Click-outside or 'X' button.

## 3. Verification Strategy (Quality Oversight)
- **Testing Plan:**
  - `useCoin.test.ts`: Verify data fetching and error states using mocked Electron API.
  - `CoinDetail.test.tsx`: Verify rendering of all fields, image switching, and back button navigation.
- **Colocation Check:** Tests must be in `__tests__` adjacent to source.
- **Mocking Strategy:** Use `vi.mock` for `react-router-dom` hooks (`useParams`, `useNavigate`).

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Pending
### Audit Findings:
- **System Integrity:** The backend `db:getCoinById` already exists and returns `{ coin, images }`. This aligns perfectly.
- **Abstraction:** Logic is confined to `useCoin` hook; component is pure presentation.

### Recommendations:
- Ensure `HashRouter` is used to prevent issues with Electron's file protocol.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Pending
### Audit Findings:
- **The Filter:** `id` param from URL must be validated (parse to Int) before sending to IPC.
- **Protocols:** Images must load via `patina-img://`.

### Recommendations:
- Use `Number(params.id)` and check for `NaN` before calling the API.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending
### Audit Findings:
- **Coverage Check:** `useCoin` needs 90% coverage. `CoinDetail` needs 80%.
- **Async Safety:** Tests must wait for data load (`waitFor`).

### Recommendations:
- Test the "Loading" state and "Error" state explicitely.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending
### Audit Findings:
- **Aesthetic Compliance:** Must use `var(--bg-manuscript)` and `var(--text-ink)`.
- **Accessibility:** Images must have `alt` text (use `label` or `title`).

### Recommendations:
- Ensure the "Story" section has appropriate line-height (`1.6`) and font size for reading.

---

## 8. Numismatic Assessment (`curating-coins`)
**Status:** Pending
### Audit Findings:
- **Metrics:** Ensure Weight is displayed with 2 decimals (e.g., `17.20 g`) and Diameter with 1 decimal (`19.5 mm`).

### Recommendations:
- Use `toFixed(2)` and `toFixed(1)` strictly for display.

---

## 9. Post-Implementation Retrospective
**Date:** 2026-03-14
**Outcome:** Success

### Summary
Phase 3 has been successfully implemented. The "Ledger" view (`CoinDetail.tsx`) is now active, providing a high-fidelity archival record for each coin. The application routing has been restructured using `HashRouter` to support deep linking within the Electron environment.

### Key Achievements
- **Visual Fidelity:** The "Open Book" layout faithfully recreates the physical ledger aesthetic.
- **Security:** The `patina-img://` protocol is active, ensuring all image loading is local, sanitized, and performant.
- **Reliability:** The `useCoin` hook and component tests provide robust coverage for the new features.

### Next Steps
- Begin planning Phase 4.
