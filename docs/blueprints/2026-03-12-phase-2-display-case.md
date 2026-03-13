# Implementation Blueprint: Phase 2 - The Display Case

**Date:** 2026-03-12  
**Status:** Approved  
**Reference:** `docs/technical_plan_2026-03-10.md` (Phase 2)

## 1. Objective
Establish the core browsing experience for the Patina archive, ensuring the data management layer is robust and the UI adheres strictly to the **Manuscript Hybrid (v3.3)** aesthetic.

## 2. Technical Tasks

### T1: Data Management Layer (`useCoins`)
- **Location:** `src/renderer/hooks/useCoins.ts`
- **Logic:**
    - Initialize state for `coins` (full list) and `filteredCoins`.
    - Implement fetching logic using `window.electronAPI.getCoins()`.
    - Provide filtering methods for `era`, `metal`, and a text-based `searchQuery`.
    - Sync state with the IPC bridge (loading, error, success).

### T2: Foundational Components (Gallery & Card)
- **`CoinCard` (`src/renderer/components/CoinCard.tsx`):**
    - Implement the "Pedestal" design: `--stone-pedestal` background.
    - Typography: **Cormorant Bold** for Title, **JetBrains Mono** for metrics (Weight, Metal).
    - Handle image paths relative to the `data/images` directory.
- **`GalleryGrid` (`src/renderer/components/GalleryGrid.tsx`):**
    - A responsive CSS Grid (minimum 280px per card).
    - Use `React.memo` for performance with large collections.

### T3: The Sidebar & Filtering (`PatinaSidebar`)
- **Location:** `src/renderer/components/PatinaSidebar.tsx`
- **Fields:**
    - **Era:** Ancient, Medieval, Modern (Multi-select).
    - **Metal:** Gold, Silver, Bronze (Multi-select).
- **Styling:** Minimalist labels, underlined selection states, Montserrat for functional text.

### T4: Global Search (`SearchBar`)
- **Location:** `src/renderer/components/SearchBar.tsx`
- **UI:** A prominent, full-width input field with a bottom-only border (`--border-hairline`).
- **Functionality:** Real-time filtering by `title`, `issuer`, or `catalog_ref`.

### T5: Empty State (`EmptyCabinet`)
- **Location:** `src/renderer/components/EmptyCabinet.tsx`
- **Aesthetic:** "The Silent Archive" rule. Centered italicized Cormorant text: *"The ledger awaits its first historical entry."*

## 3. Verification Strategy
- **Hook Validation:** Create `src/renderer/hooks/__tests__/useCoins.test.ts` to verify filtering logic.
- **Visual Audit:** Manual check against `docs/style_guide.html` to ensure `clamp()` spacing and color variables are applied correctly.
- **Performance:** Test with a mock set of 100+ coins to ensure smooth scrolling in the grid.
