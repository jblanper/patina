# Implementation Blueprint: Cabinet Sort Controls & Grade Filter

**Date:** 2026-03-20
**Status:** Completed
**Reference:** `docs/blueprints/` — Cabinet UX enhancement; no parent phase. UI design approved via `docs/curating-ui/proposal_sidebar_sort_2026-03-20.html` (Path B selected).

---

## 1. Objective

Expose the existing (but UI-less) `sortBy` / `sortAsc` fields from `FilterState` as a visible "Order By" control in `PatinaSidebar`, and add a new `grade` multi-select filter derived dynamically from collection data — matching the established Metal filter pattern.

Both additions are purely **client-side and additive**: no IPC handlers, no database schema changes, and no new Main-process Zod boundaries are required.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** "Order By" mirrors the existing Era/Metal filter-group rhythm exactly (radio rows + direction toggle). Grade uses identical checkbox anatomy. No new visual language introduced.
- [x] **Privacy First:** All data is derived from the local SQLite collection already in memory. No external calls.
- [x] **Single-Click Rule:** Sort and Grade filters are in the persistent sidebar — always reachable in zero navigation steps from the Cabinet view.

---

## 2. Technical Strategy

### Scope

| File | Change |
|---|---|
| `src/common/validation.ts` | Add `grade` field to `FilterStateSchema` |
| `src/renderer/hooks/useCoins.ts` | Add `grade` to DEFAULT_FILTERS; add grade filter logic; add `availableGrades` memo; export from hook |
| `src/renderer/components/PatinaSidebar.tsx` | Add "Order By" and "Grade" filter-groups; update Reset disabled condition |
| `src/renderer/components/Cabinet.tsx` | Destructure and pass `availableGrades` to `PatinaSidebar` |
| `src/renderer/styles/index.css` | Add `.filter-radio`, `.sort-dir-toggle`, `.dir-btn` CSS classes |

No changes to `src/main/`, `src/common/types.ts`, `src/common/schema.ts`, or `src/main/preload.ts`.

---

### Step 1 — `src/common/validation.ts`: Extend `FilterStateSchema`

Add `grade` as an array-of-strings alongside `era` and `metal`:

```typescript
export const FilterStateSchema = z.object({
  era: z.array(z.string()),
  metal: z.array(z.string()),
  grade: z.array(z.string()),        // ← ADD
  searchTerm: z.string(),
  sortBy: z.string().nullable(),
  sortAsc: z.boolean()
});
```

`grade` is `z.array(z.string())` — same shape as `era` and `metal`, consistent with the multi-select pattern.

---

### Step 2 — `src/renderer/hooks/useCoins.ts`: Grade filter + `availableGrades`

**2a. Extend `DEFAULT_FILTERS`:**
```typescript
const DEFAULT_FILTERS: FilterState = {
  era: [],
  metal: [],
  grade: [],           // ← ADD
  searchTerm: '',
  sortBy: 'year_numeric',
  sortAsc: true
};
```

**2b. Add grade filter branch in `filteredCoins` memo** (after the metal filter, before the search filter):
```typescript
// 3. Grade Filter
if (filters.grade.length > 0) {
  result = result.filter(coin => coin.grade && filters.grade.includes(coin.grade));
}
```
Renumber subsequent steps (Search → 4, Sorting → 5).

**2c. Add `availableGrades` memo** (directly below `availableMetals`):
```typescript
const availableGrades = useMemo(() => {
  const grades = new Set<string>();
  coins.forEach(c => c.grade && grades.add(c.grade));
  return Array.from(grades).sort();
}, [coins]);
```

**2d. Include `availableGrades` in the return object.**

---

### Step 3 — `src/renderer/components/PatinaSidebar.tsx`: UI additions

**3a. Extend props interface:**
```typescript
interface PatinaSidebarProps {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearFilters: () => void;
  availableMetals: string[];
  availableGrades: string[];          // ← ADD
}
```

**3b. Extend `toggleFilter` key union** to include `'grade'`:
```typescript
const toggleFilter = (key: 'era' | 'metal' | 'grade', value: string) => { ... }
const isSelected   = (key: 'era' | 'metal' | 'grade', value: string) => { ... }
```

**3c. Add "Order By" filter-group** (insert as the **first** group in the sidebar, above Era):

Sort field options and their `sortBy` key mappings:

| Label | `sortBy` value |
|---|---|
| Year | `year_numeric` |
| Title | `title` |
| Acquired | `purchase_date` |

```tsx
{/* Sort Controls — Path B "The Ledger" */}
<div className="filter-group">
  <span className="type-meta filter-label">Order By</span>
  <ul className="filter-list">
    {SORT_OPTIONS.map(({ label, value }) => (
      <li key={value}>
        <label
          className={`filter-item-label ${filters.sortBy === value ? 'active' : ''}`}
          onClick={() => updateFilters({ sortBy: value })}
        >
          <span className="filter-radio" aria-hidden="true"></span>
          <span className="filter-text">{label}</span>
        </label>
      </li>
    ))}
  </ul>
  <div className="sort-dir-toggle">
    <button
      className={`dir-btn ${filters.sortAsc ? 'active' : ''}`}
      onClick={() => updateFilters({ sortAsc: true })}
      aria-pressed={filters.sortAsc}
    >
      ↑ Asc
    </button>
    <button
      className={`dir-btn ${!filters.sortAsc ? 'active' : ''}`}
      onClick={() => updateFilters({ sortAsc: false })}
      aria-pressed={!filters.sortAsc}
    >
      ↓ Desc
    </button>
  </div>
</div>
```

Define sort options as a constant above the component:
```typescript
const SORT_OPTIONS = [
  { label: 'Year',     value: 'year_numeric'  },
  { label: 'Title',    value: 'title'         },
  { label: 'Acquired', value: 'purchase_date' },
] as const;
```

**3d. Add "Grade" filter-group** (last group, after Metals, before sidebar-footer):

```tsx
<div className="filter-group">
  <span className="type-meta filter-label">Grade</span>
  <ul className="filter-list">
    {availableGrades.length > 0 ? (
      availableGrades.map(grade => (
        <li key={grade}>
          <label className={`filter-item-label ${isSelected('grade', grade) ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="filter-input"
              checked={isSelected('grade', grade)}
              onChange={() => toggleFilter('grade', grade)}
              aria-label={`Filter by grade ${grade}`}
            />
            <span className="filter-checkbox" aria-hidden="true"></span>
            <span className="filter-text">{grade}</span>
          </label>
        </li>
      ))
    ) : (
      <li className="filter-item disabled">No grades recorded</li>
    )}
  </ul>
</div>
```

**3e. Update Reset button disabled condition** to include `grade`:
```tsx
disabled={
  filters.era.length === 0 &&
  filters.metal.length === 0 &&
  filters.grade.length === 0 &&
  !filters.searchTerm
}
```
> **Note:** Sort state is intentionally excluded from the Reset *disabled* condition — sort always has an active value, so it can never drive the "nothing is filtered" state. However, `clearFilters` **does** restore sort to its default (`sortBy: 'year_numeric'`, `sortAsc: true`) per the approved decision in §9.

---

### Step 4 — `src/renderer/components/Cabinet.tsx`: Pass `availableGrades`

```tsx
const {
  coins, filteredCoins, loading, error,
  filters, updateFilters, clearFilters,
  availableMetals,
  availableGrades      // ← ADD
} = useCoins();

// In JSX:
<PatinaSidebar
  filters={filters}
  updateFilters={updateFilters}
  clearFilters={clearFilters}
  availableMetals={availableMetals}
  availableGrades={availableGrades}    // ← ADD
/>
```

---

### Step 5 — `src/renderer/styles/index.css`: New CSS classes

Insert after the existing `.filter-item.disabled:hover` block (line ~285):

```css
/* Sort radio indicator — single-select ring */
.filter-radio {
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-hairline);
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.2s ease;
}

.filter-item-label.active .filter-radio {
  border-color: var(--accent-manuscript);
}

.filter-radio::after {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--accent-manuscript);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.filter-item-label.active .filter-radio::after {
  opacity: 1;
}

/* Sort direction toggle — two-segment Asc/Desc */
.sort-dir-toggle {
  display: flex;
  border: 1px solid var(--border-hairline);
  overflow: hidden;
  margin-top: 0.25rem;
}

.dir-btn {
  flex: 1;
  background: none;
  border: none;
  border-right: 1px solid var(--border-hairline);
  padding: 0.4rem 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.15s ease, color 0.15s ease;
}

.dir-btn:last-child {
  border-right: none;
}

.dir-btn.active {
  background: var(--accent-manuscript);
  color: white;
}

.dir-btn:not(.active):hover {
  background: var(--stone-pedestal);
  color: var(--text-ink);
}
```

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan

**File: `src/common/validation.ts`** — 100% branch coverage mandate applies.
- Test `FilterStateSchema` parses a valid object that includes a `grade` array.
- Test that `FilterStateSchema` rejects an object missing `grade` (ensures the new field is not accidentally optional at parse time).

**File: `src/renderer/hooks/__tests__/useCoins.test.ts`** — extend existing suite:
- `should filter by grade` — set `grade: ['XF']`, assert only matching coins returned.
- `should not filter when grade array is empty` — confirm default passes all coins.
- `should derive availableGrades from collection data` — assert `availableGrades` contains distinct, sorted grade values.
- `should sort by title (ascending and descending)` — cover `sortBy: 'title'` + both `sortAsc` states.
- `should sort by purchase_date` — cover `sortBy: 'purchase_date'` with mixed null values (null should sort to end).

**File: `src/renderer/components/__tests__/PatinaSidebar.test.tsx`** — NEW file (none exists):
- `renders "Order By" group with Year, Title, Acquired options`
- `clicking a sort option calls updateFilters with correct sortBy value`
- `clicking "Asc" sets sortAsc: true; "Desc" sets sortAsc: false`
- `renders Grade group with provided grade values`
- `toggling a grade checkbox calls updateFilters`
- `renders empty state when availableGrades is empty`
- `Reset button is disabled when no filters active (grade empty)`
- `Reset button is enabled when a grade filter is active`

### Colocation Check
- `PatinaSidebar.test.tsx` → `src/renderer/components/__tests__/PatinaSidebar.test.tsx` ✓
- `useCoins.test.ts` → `src/renderer/hooks/__tests__/useCoins.test.ts` ✓ (already colocated)

### Mocking Strategy
- All tests use the global `window.electronAPI` mock from `src/renderer/setupTests.ts`.
- `PatinaSidebar` is a pure presentational component — no IPC calls; mock `updateFilters` and `clearFilters` with `vi.fn()`.
- `useCoins` tests call `(window.electronAPI.getCoins as any).mockResolvedValue(MOCK_COINS)` in `beforeEach`, extending `MOCK_COINS` to include `grade` values.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** All changes are renderer-side. `FilterState` is used only within the renderer hook/component tree — no cross-process boundary is touched. `src/common/validation.ts` change is additive and safe.
- **Abstraction:** Grade filter logic lives in `useCoins` (the correct hook layer). `PatinaSidebar` remains a pure presentational component receiving only props.
- **No IPC surface expansion:** `getCoins()` already returns `grade` on every `Coin` record. No new bridge method required.

### Review Notes & Suggestions:
- The `SORT_OPTIONS` constant should be defined outside the component to avoid re-allocation on render.
- The `toggleFilter` key union (`'era' | 'metal' | 'grade'`) is a deliberate, narrow type. Do not widen to `keyof FilterState` — that would allow toggling `searchTerm` or `sortBy` through the same path.
- The `clearFilters` reset intentionally resets `grade: []` but preserves sort direction at `year_numeric / true` (the archival default). This is correct behaviour — sort is a presentation preference, not a filter.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** No new IPC handler is introduced. `FilterState` is processed entirely in the renderer. The existing `getCoins()` handler (already validated by Zod in Main) is unchanged.
- **Protocols:** No changes to `patina-img://` or any file-system access.
- **Input Surface:** Grade values displayed in the sidebar are derived from `coins[].grade` — data that was already validated by `CoinSchema` on the way in from the database. No additional sanitization layer is needed for display.

### Review Notes & Suggestions:
- Verified: No new attack surface introduced. The grade filter is read-only; it does not write to the bridge or database.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Coverage Check:**
  - `src/common/validation.ts` — adding one new field to `FilterStateSchema` requires two new branches (valid parse, reject-on-missing). These must be covered to maintain the 100% branch coverage mandate.
  - `src/renderer/hooks/useCoins.ts` — three new logic branches: grade filter active, grade filter empty (passthrough), `availableGrades` derivation. All three must be tested at 90% function coverage.
  - `src/renderer/components/PatinaSidebar.tsx` — new component renders. New `PatinaSidebar.test.tsx` file required (none exists). Must reach 80% statement coverage.
- **Async Safety:** `PatinaSidebar` is synchronous (pure props). `useCoins` tests already use `waitFor`/`act` correctly. Grade and sort additions follow the same async pattern.

### Review Notes & Suggestions:
- Mock `MOCK_COINS` in `useCoins.test.ts` must be extended with `grade` values to exercise the new filter and `availableGrades` branches. Suggested fixture additions:
  ```typescript
  { ...coinBase, id: 3, title: 'Sestertius of Hadrian', grade: 'XF',     metal: 'Bronze' },
  { ...coinBase, id: 4, title: 'Denarius of Caracalla', grade: 'Choice VF', metal: 'Silver' },
  ```
- The `should sort by purchase_date with nulls` test is important: the `useCoins` sort logic pushes `null` values to the end — this branch must be explicitly covered.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:
- **Aesthetic Compliance:** Path B design was formally approved via `docs/curating-ui/proposal_sidebar_sort_2026-03-20.html`. The radio ring (`.filter-radio`) uses `--accent-manuscript` fill, consistent with the checkbox dot. The `.dir-btn.active` uses `--accent-manuscript` background — matching the existing checkbox active state exactly.
- **Accessibility:** Sort labels use `aria-pressed` on the direction buttons. Grade checkboxes carry `aria-label`. All interactive elements are keyboard-focusable through native `<button>` and `<label>/<input>` elements.
- **Empty state:** "No grades recorded" message mirrors the existing "No metals indexed" pattern.

### Review Notes & Suggestions:
- The `.filter-radio::after` dot is 6×6px on a 14×14px ring — a 43% fill ratio that produces a clear "selected" signal without appearing as a solid disc. Do not change these dimensions.
- The `dir-btn` `aria-pressed` attribute is the correct ARIA pattern for a two-state toggle button (not `role="radio"`), since the two options are not mutually exclusive within the same `radiogroup` semantics.
- Ensure `.filter-group:last-child { border-bottom: none }` still resolves correctly as new filter-groups are added. Because the Grade group will become the last child, no CSS change is required — the existing rule handles it automatically.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings:
- **Grade Data:** The `grade` field in `CoinSchema` is a free-text string (`z.string().optional().nullable()`). The Grade filter displays whatever values are present in the collection — it does not enforce a controlled vocabulary. This is correct for Phase 7a: the vocabulary constraint (PCGS/Sheldon scale) is the remit of the `vocabularies` table introduced in Phase 6a and should not be duplicated here.
- **Collector UX:** Grade is the third most-queried filter dimension in numismatic cataloging (after era/period and metal). Its inclusion at this stage is appropriate. The dynamic derivation from collection data means small, specialist collections (e.g., all-ancients) will not see spurious "EF-40" entries.
- **Sort order:** "Year" mapping to `year_numeric` is correct — `year_numeric` stores BC dates as negative integers, producing accurate chronological ordering (–440 BCE sorts before 27 BCE sorts before 1284 CE). "Acquired" mapping to `purchase_date` (YYYY-MM-DD text) sorts correctly via lexicographic comparison.

### Review Notes & Suggestions:
- Verified: No historical accuracy issues. The free-text grade display approach is appropriate for Phase 7a.
- Future consideration (not in scope): Once a collection accumulates mixed grade notation (e.g., "XF" and "EF-40" for the same grade), a normalisation pass via the vocabularies system would be beneficial. Flag for a future Phase 7b.

---

## 9. User Consultation & Decisions

### Open Questions:
1. **Sort field default:** Should the Reset action return sort to `year_numeric / ascending` (current default), or should sort state persist across filter resets?
2. **Sort placement:** Should "Order By" sit at the top of the sidebar (above all filter groups), or between Metals and the footer?

### Final Decisions:
- **Decision 1 — Reset restores sort defaults.** `clearFilters` will restore `sortBy: 'year_numeric'` and `sortAsc: true` alongside clearing era, metal, grade, and searchTerm. Sort is treated as part of the full archive view state, not a persistent preference.
- **Decision 2 — "Order By" is the first group in the sidebar.** Sidebar order: Order By → Era → Metals → Grade. Rationale: sort is a global ordering preference that governs what the filters produce; placing it first reinforces the mental model of "order the archive, then narrow it."

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-20
**Outcome:** Completed — all 5 implementation steps executed as designed, all 126 tests passing, no new TypeScript errors.

### Summary of Work
- Added `grade` to `FilterStateSchema` in `validation.ts` (additive, safe).
- Extended `useCoins.ts` with grade filter branch, `availableGrades` memo, and updated `DEFAULT_FILTERS`.
- Built `PatinaSidebar.tsx` Order By and Grade filter groups exactly per Path B "The Ledger" design.
- Passed `availableGrades` through `Cabinet.tsx` to `PatinaSidebar`.
- Added `.filter-radio`, `.sort-dir-toggle`, `.dir-btn` CSS classes to `index.css`.
- Created `PatinaSidebar.test.tsx` (8 tests) and extended `useCoins.test.ts` (5 new tests).
- Moved validation tests to `src/common/__tests__/validation.test.ts` (colocated under `__tests__`).
- Updated `docs/style_guide.md §5` with Order By and Grade filter patterns.

### Pain Points
- `validation.test.ts` was initially placed at `src/common/validation.test.ts` (flat) and was moved to the proper colocated `src/common/__tests__/validation.test.ts` during Phase 6a — this created a misleading `D` entry in git status at the start of verification.
- `MOCK_COINS` fixture used `purchase_date: null` for the missing-date coin, which conflicted with `Coin.purchase_date?: string` (optional but not nullable). The fix was to omit the field entirely (`undefined`), which correctly exercises the same sorting branch.
- Pre-existing TypeScript error in `CoinDetail.test.tsx` (`deleteCoin` mock type mismatch) surfaced during type-check — confirmed as out-of-scope for this blueprint.

### Things to Consider
- Phase 7b: Grade vocabulary normalisation (free-text → controlled PCGS/Sheldon values via vocabularies table).
- Phase 7b: `availableGrades` could surface a "(none recorded)" count for collections with inconsistent grade entry.
- **Core Doc Revision:** `docs/style_guide.md` §5 "Archival Filters" to be updated with the new Sort and single-select radio pattern after Verification passes.
