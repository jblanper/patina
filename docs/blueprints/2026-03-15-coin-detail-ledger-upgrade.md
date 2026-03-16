# Implementation Blueprint: The Coin Detail "Ledger Folio" Upgrade

**Date:** 2026-03-15  
**Objective:** Transform the `CoinDetail` view into an "Archival Ledger Folio" (Path B v2) and expand the data schema to support professional numismatic cataloging.  
**Philosophy:** "The Curator's Tool" - The digital interface must mimic the permanence and structure of a physical museum ledger.

---

## 1. Architectural Strategy

This is a full-stack refactor involving:
1.  **Database (SQLite):** Expanding the schema to include missing numismatic fields (`fineness`, `die_axis`, `acquisition_data`, etc.).
2.  **The Filter (Main Process):** Updating Zod schemas in `src/common/validation.ts` to validate the new fields.
3.  **Renderer (React):** Rebuilding `CoinDetail.tsx` to match the "Path B v2" mockup using strict Vanilla CSS and the `curating-ui` style guide.

---

## 2. Technical Specifications

### A. Database Schema Updates (`src/common/schema.ts`)

We need to add the following columns to the `coins` table. *Note: Since we are in development, we will update the schema definition and re-seed, rather than writing a complex migration script.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `fineness` | `TEXT` | e.g., ".999", "Sterling", "24k" |
| `die_axis` | `TEXT` | e.g., "6h", "12h" |
| `edge_desc` | `TEXT` | Description of the coin's edge |
| `purchase_price` | `REAL` | Acquisition cost (nullable) |
| `purchase_date` | `TEXT` | ISO Date string (YYYY-MM-DD) |
| `purchase_source` | `TEXT` | Auction house or dealer name |

### B. Validation & Types (`src/common/types.ts` & `validation.ts`)

1.  **Update `Coin` interface:** Add the new optional fields.
2.  **Update Zod Schema:** Ensure `CoinSchema` permits these new fields (mostly optional strings/numbers).

### C. Backend Logic (`src/main/db.ts`)

1.  **Read:** Ensure `getCoin(id)` selects these new fields.
2.  **Write:** Update `createCoin` and `updateCoin` to accept and store these fields.

### D. Frontend Implementation (`src/renderer/components/CoinDetail.tsx`)

Refactor the component to match `docs/curating-ui/proposal_coin_detail_path_b_v2.html` exactly.

-   **Layout:** CSS Grid (45% | 55%).
-   **Scroll:** Single page scroll (remove inner overflow).
-   **Typography:** Strict adherence to `Cormorant` (Headings) and `Montserrat` (UI).
-   **Components:**
    -   `LeftFolio`: Image plate + Thumbnails.
    -   `RightFolio`: Header, Metrics Grid, Numismatic Data, Footer.

---

## 3. Execution Plan

### Phase 1: Data Layer (Schema & Validation)
1.  **Modify `src/common/types.ts`:** Add new fields to `Coin` interface.
2.  **Modify `src/common/schema.ts`:** Add new columns to `createTable` query.
3.  **Modify `src/common/validation.ts`:** Update Zod schemas.
4.  **Update `src/main/db.ts`:** Ensure read/write queries include new columns.
5.  **Re-seed Database:** Update `scripts/seed_data.ts` to include sample data for these new fields and run it to rebuild `patina.db`.

### Phase 2: UI Implementation
6.  **Update CSS:** Add new classes from the mockup to `src/renderer/styles/index.css`.
7.  **Refactor `CoinDetail.tsx`:** Rewrite the component structure to match Path B v2.
8.  **Verify:** Check responsiveness and single-scroll behavior.

### Phase 3: Validation
9.  **Type Check:** Run `npx tsc --noEmit`.
10. **Lint:** Run `npm run lint`.
11. **Test:** Update `src/renderer/components/__tests__/CoinDetail.test.tsx`:
    -   Update the `mockCoin` object to include test values for `fineness`, `die_axis`, `edge_desc`, and acquisition fields.
    -   Verify that `window.electronAPI.coins.getCoin` returns this enriched object.
    -   Add assertions to check that these new fields are rendered in the document (e.g., `expect(screen.getByText('9h')).toBeInTheDocument()`).

---

## 4. Verification Checklist
- [ ] Database schema includes `die_axis`, `fineness`, `purchase_...` fields.
- [ ] `CoinDetail` matches the "Path B v2" mockup visually.
- [ ] The page has a **single scrollbar** (no nested scrolling).
- [ ] TypeScript compilation passes with strict mode.
