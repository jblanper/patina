# Implementation Blueprint: Phase 2 - T3 & T4: Sidebar & SearchBar

**Date:** 2026-03-13  
**Status:** Draft  
**Reference:** `docs/technical_plan_2026-03-10.md` (T3, T4)

## 1. Objective
Finalize the browsing interface of the Patina archive by implementing the `PatinaSidebar` and `SearchBar` components. This will transition the UI from a single-column stack to a professional two-column "Manuscript Hybrid" layout, providing collectors with powerful archival navigation and search tools.

## 2. Technical Tasks

### T3: PatinaSidebar (`src/renderer/components/PatinaSidebar.tsx`)
- **Location:** `src/renderer/components/PatinaSidebar.tsx`
- **Logic:**
    - Fixed `280px` width.
    - **Era Filter:** Multi-select for Ancient, Medieval, Modern.
    - **Metal Filter:** Multi-select using `availableMetals` from `useCoins`.
    - **Styling:**
        - Labels: `type-meta` class (Montserrat, 0.7rem, 2px letter-spacing).
        - Filter Items: List-based selection with a subtle underline or background shift for active states.
        - Spacing: `2.5rem` between filter categories.
    - **Reset Action:** A "Clear All" button (`btn-minimal`) to reset filters.

### T4: SearchBar (`src/renderer/components/SearchBar.tsx`)
- **Location:** `src/renderer/components/SearchBar.tsx`
- **Logic:**
    - A full-width input field with a bottom-only border (`--border-hairline`).
    - Integration with `filters.searchTerm` and `updateFilters` from `useCoins`.
    - **Typography:** Montserrat (Sans-serif) for high legibility during active entry.
    - **Aesthetic:** Minimalist, no icon (or a very subtle one), focusing on the "Archival Ledger" feel.

### T5: Layout Integration
- **Location:** `src/renderer/App.tsx` and `src/renderer/styles/index.css`
- **Logic:**
    - Update `App.tsx` to wrap the `PatinaSidebar` and the main gallery content in a flex container.
    - Define `.app-layout` with `display: flex; gap: var(--spacing-large);`.
    - Ensure the sidebar is persistent and the content area scrolls independently if needed.
    - Update the `SearchBar` to sit at the top of the content area.

## 3. Verification Strategy
- **Functionality:** Verify that selecting filters correctly updates the `filteredCoins` in the `GalleryGrid`.
- **Debounce Check:** Confirm the 300ms delay in `useCoins` is properly respected by the `SearchBar` without causing input lag.
- **Visual Audit:** Adheres to **Manuscript Hybrid v3.3** (Persistent 280px sidebar, Underlined inputs).
- **Responsive Check:** Ensure the layout degrades gracefully (e.g., sidebar moves to top or becomes toggleable) on narrower windows.

---

## 4. Security Assessment (`securing-electron`)
**Status:** Verified // Defensive Posture Maintained
### Audit Findings:
- **Renderer-side Filtering:** Search and filter logic currently resides in the Renderer process (`useCoins.ts`). This isolates potential malformed search strings from the Main process and database.
- **No New IPC:** The components utilize existing, secured IPC wrappers (`getCoins`). No expansion of the `contextBridge` is required for this task.
- **Validation:** All inputs (search term, filter arrays) are handled as controlled React state, preventing unvalidated data from being processed.

### Recommendations:
- **Main-side Sanitization (Future):** If filtering is moved to the Main process (for performance), the `searchTerm` MUST be validated using a strict Zod schema in `src/common/validation.ts` before being used in any `LIKE` or `MATCH` SQL clauses.
- **Input Limits:** Implement a maximum length for the `SearchBar` input (e.g., 100 characters) to prevent potential memory issues or denial-of-service attempts via extremely long strings.

---

## 5. Numismatic Assessment (`curating-coins`)
**Status:** Verified // Scholarly Standards Met
### Audit Findings:
- **Filtering Scope:** The selection of `Era` and `Metal` as primary sidebar filters aligns with professional cataloging workflows.
- **Search Depth:** The inclusion of `catalog_ref` and `provenance` in the global search scope ensures that scholars can navigate the collection by both technical and archival citations.
- **Chronological Integrity:** The default `year_numeric` sort is correctly prioritized, ensuring the gallery maintains a historical narrative.

### Recommendations:
- **Standardized Metal Labels:** Ensure that the `availableMetals` list in the sidebar is presented in uppercase (e.g., `AU` for Gold, `AR` for Silver) to match PCGS/NGC and museum standards.
- **Catalog Citations:** When the search results update, ensure the `SearchBar` placeholder explicitly mentions "catalog reference" to encourage collectors to search by RIC/RPC numbers.

---

## 6. UI Assessment (`curating-ui`)
**Status:** Verified // Archival Aesthetic Preserved
### Audit Findings:
- **Structural Stability:** The `280px` fixed sidebar fulfills the "Archive Explorer" mandate, providing a persistent frame for the collection.
- **Typography:** The use of Montserrat for UI functional elements correctly balances the Cormorant serifs used for historical titles.
- **Breathability:** The planned `2rem` gap between the sidebar and gallery maintains the project's "Expansive Rule."

### Recommendations:
- **Filter Interaction:** Use a `1px` sienna underline or a shift to `--stone-pedestal` background for selected filter states to provide tactile feedback without clutter.
- **Search Presence:** Ensure the `SearchBar` utilizes a slightly thicker `2px` underline when focused to emphasize the active "ledger entry" state.
- **Empty Result State:** Implement a "Silent Archive" view for search results that return zero coins (e.g., *"No historical entries match your current search parameters."*).

---

## 7. Post-Implementation Retrospective
**Date:** [YYYY-MM-DD]  
**Outcome:** [Summary of success or failure]

### Summary of Work
- [Key achievement 1]

### Pain Points
- [Challenge 1]

### Things to Consider
- [Future improvement 1]
- **Core Doc Revision:** [Confirm if GEMINI.md, style_guide.md, or style_guide.html were updated.]
