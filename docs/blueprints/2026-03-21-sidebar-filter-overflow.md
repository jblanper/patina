# Implementation Blueprint: Sidebar Filter Overflow — The Soft Reveal

**Date:** 2026-03-21
**Status:** Proposed
**Reference:** UI proposal approved via `docs/curating-ui/proposal_filter_overflow_2026-03-21.html` (Path A selected). Design rationale documented in conversation of 2026-03-21; research report consulted Baymard Institute, Omeka S, CollectiveAccess, and Algolia InstantSearch benchmarks.

---

## 1. Objective

When a dynamic filter group in `PatinaSidebar` contains more than 8 values, truncate the rendered list to 8 entries, apply a fade gradient over the last visible item to signal continuation, and expose an inline "Show N more" link with an explicit hidden count. A "Show less" link collapses the list back. Active selections are always sorted to the top of the list before truncation is applied, so a selected value is never hidden.

This feature applies exclusively to the **Metals** and **Grade** filter groups — both are dynamically sourced from collection data and can grow to 15+ values in a diverse ancient coin collection. The **Order By** (3 fixed values) and **Eras** (3 fixed values) groups are never truncated.

The scope is **renderer-only** (one component + CSS). No IPC handlers, no schema changes, no Main-process boundary is touched.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** The "Show N more" link reads as an archival footnote cross-reference — typographically subordinate, contextually precise. The gradient fade echoes a page turning, not a UI affordance. No new visual language is introduced beyond what the existing design system already defines.
- [x] **Privacy First:** No external CDNs or telemetry. All data is already in local memory from the existing `getCoins()` call.
- [x] **Single-Click Rule:** Filter values are revealed with a single click on "Show N more". The filter panel itself is always visible in the Cabinet sidebar — zero navigation steps required.

---

## 2. Technical Strategy

### Scope

| File | Change |
|---|---|
| `src/renderer/components/PatinaSidebar.tsx` | Add truncation logic, active-selection pinning, expand/collapse state |
| `src/renderer/styles/index.css` | Add `.filter-overflow-wrap`, `.filter-overflow-wrap.truncated::after`, `.filter-show-more` |

No changes to `src/common/`, `src/main/`, `src/renderer/components/Cabinet.tsx`, or `src/renderer/hooks/useCoins.ts`.

---

### Step 1 — `src/renderer/styles/index.css`: New CSS classes

Insert after the existing `.dir-btn:not(.active):hover` block (the last `.dir-btn` rule):

```css
/* ── Filter Overflow: The Soft Reveal ─────────────────────── */

/* Wrapper that clips the list and hosts the fade overlay */
.filter-overflow-wrap {
  position: relative;
}

/* Gradient fade — only active when truncated */
.filter-overflow-wrap.truncated::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2rem;
  background: linear-gradient(to bottom, transparent, var(--bg-manuscript));
  pointer-events: none;
}

/* "Show N more" / "Show less" inline link */
.filter-show-more {
  display: inline-block;
  margin-top: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--accent-manuscript);
  text-decoration: underline;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  line-height: 1.4;
}

.filter-show-more:hover {
  opacity: 0.7;
}
```

---

### Step 2 — `src/renderer/components/PatinaSidebar.tsx`: Truncation logic

#### 2a. Add `useState` import and expand state

```typescript
import React, { useState } from 'react';
```

Add two state variables at the top of the component body:

```typescript
const [metalsExpanded, setMetalsExpanded] = useState(false);
const [gradeExpanded,  setGradeExpanded]  = useState(false);
```

#### 2b. Add `TRUNCATION_THRESHOLD` constant

Define outside the component (alongside the existing `ERAS` and `SORT_OPTIONS` constants):

```typescript
const TRUNCATION_THRESHOLD = 8;
```

#### 2c. Add `renderOverflowGroup` helper

Define as a named inner function inside the component, before the `return` statement:

```typescript
const renderOverflowGroup = (
  key: 'metal' | 'grade',
  values: string[],
  expanded: boolean,
  setExpanded: (v: boolean) => void,
  ariaLabel: (v: string) => string
) => {
  // Pin active selections to the top so they are never hidden by truncation
  const active   = values.filter(v => isSelected(key, v));
  const inactive = values.filter(v => !isSelected(key, v));
  const ordered  = [...active, ...inactive];

  const shouldTruncate = ordered.length > TRUNCATION_THRESHOLD;
  const visible        = shouldTruncate && !expanded
    ? ordered.slice(0, TRUNCATION_THRESHOLD)
    : ordered;
  const hiddenCount    = ordered.length - TRUNCATION_THRESHOLD;

  return (
    <>
      <div className={`filter-overflow-wrap${shouldTruncate && !expanded ? ' truncated' : ''}`}>
        <ul className="filter-list">
          {visible.map(value => (
            <li key={value}>
              <label className={`filter-item-label ${isSelected(key, value) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-input"
                  checked={isSelected(key, value)}
                  onChange={() => toggleFilter(key, value)}
                  aria-label={ariaLabel(value)}
                />
                <span className="filter-checkbox" aria-hidden="true"></span>
                <span className="filter-text">{value}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      {shouldTruncate && (
        <button
          className="filter-show-more"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </>
  );
};
```

#### 2d. Replace the Metals filter-group list with `renderOverflowGroup`

Replace the existing `<ul className="filter-list">` block inside the Metals `<div className="filter-group">` with:

```tsx
<div className="filter-group">
  <span className="type-meta filter-label">Metals</span>
  {availableMetals.length > 0 ? (
    renderOverflowGroup(
      'metal',
      availableMetals,
      metalsExpanded,
      setMetalsExpanded,
      v => `Filter by ${v} metal`
    )
  ) : (
    <ul className="filter-list">
      <li className="filter-item disabled">No metals indexed</li>
    </ul>
  )}
</div>
```

#### 2e. Replace the Grade filter-group list with `renderOverflowGroup`

```tsx
<div className="filter-group">
  <span className="type-meta filter-label">Grade</span>
  {availableGrades.length > 0 ? (
    renderOverflowGroup(
      'grade',
      availableGrades,
      gradeExpanded,
      setGradeExpanded,
      v => `Filter by grade ${v}`
    )
  ) : (
    <ul className="filter-list">
      <li className="filter-item disabled">No grades recorded</li>
    </ul>
  )}
</div>
```

---

### Behaviour contract

| Condition | Result |
|---|---|
| `values.length ≤ 8` | All values shown; no truncation; no "Show more" link rendered |
| `values.length > 8`, `expanded = false` | First 8 shown (active selections pinned first); gradient overlay active; "Show N more" link visible |
| `values.length > 8`, `expanded = true` | All values shown; no gradient; "Show less" link visible |
| A selection is made while collapsed | The newly selected value moves to the pinned-top zone; if it was in the hidden segment, it becomes visible immediately |
| Reset button clicked | `metalsExpanded` and `gradeExpanded` are **not** reset — expand state is a display preference, not a filter state. Collapsed groups remain collapsed after reset. |

> **Note on expand state:** `metalsExpanded` and `gradeExpanded` are local component state. They do not participate in `FilterState`, are not passed to `useCoins`, and are not cleared by `clearFilters`. This is intentional — the expanded/collapsed state is a UI display preference, not a filter predicate.

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan

**File: `src/renderer/components/__tests__/PatinaSidebar.test.tsx`** — extend existing suite:

- `renders full metals list when ≤ 8 values (no truncation)` — pass 6 metals, assert all 6 `<label>` elements rendered, no "Show more" button.
- `truncates metals list to 8 when > 8 values` — pass 12 metals, assert exactly 8 `<label>` elements rendered and a "Show 4 more" button is present.
- `"Show N more" button text includes correct hidden count` — pass 13 grades; assert button text is "Show 5 more".
- `clicking "Show N more" reveals all values` — pass 12 metals, click "Show 4 more", assert all 12 rendered.
- `clicking "Show less" collapses list back to 8` — expand then collapse, assert 8 items and "Show 4 more" button.
- `active selections are pinned to top before truncation` — pass 12 metals with `filters.metal = ['Iron (Fe)']` (the 11th in alphabetical order), assert "Iron (Fe)" is one of the first 8 rendered items.
- `a hidden selection becomes visible after being selected` — start with 12 metals, no selection, collapse; simulate selecting the 10th value via `onChange`; assert `updateFilters` called correctly (selection logic is in the hook — this test verifies the `onChange` wiring only).
- `renders "Show less" when expanded` — pass 12 metals, expand, assert button text is "Show less".
- `does not render "Show more" for fixed groups (Eras, Order By)` — assert no `.filter-show-more` element exists in the Eras or Order By groups.
- `renders empty state when availableMetals is empty` — assert "No metals indexed" text, no overflow wrapper.

### Colocation Check
- `PatinaSidebar.test.tsx` → `src/renderer/components/__tests__/PatinaSidebar.test.tsx` ✓

### Mocking Strategy
- `PatinaSidebar` is a pure presentational component. Mock `updateFilters` and `clearFilters` with `vi.fn()`.
- No IPC calls in this component — no `window.electronAPI` mock needed for these tests.
- Pass fixture arrays of varying length to exercise the truncation threshold boundary conditions (exactly 8, exactly 9, 12, 13 values).

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** All changes are strictly renderer-side. No cross-process boundary is touched. `FilterState` in `src/common/validation.ts` is unchanged — expand/collapse state is local component state that does not belong in shared validation schemas.
- **Abstraction:** The `renderOverflowGroup` helper is defined inside `PatinaSidebar` — the correct layer. It takes only props-derived data and local state; no side effects, no IPC calls. The active-selection pinning logic (`filter + sort`) belongs here, not in `useCoins`, because it is a display concern, not a data concern.
- **No regression to existing filter logic:** The `toggleFilter` and `isSelected` helpers are called identically to how they were called before. The helper does not change their signatures or introduce new state paths.

### Review Notes & Suggestions:
- `TRUNCATION_THRESHOLD` is defined as a module-level constant (not a prop) — this is intentional. The threshold is a design constant, not a configuration value. If it ever needs to change, it changes in one place.
- The `renderOverflowGroup` helper should **not** be extracted to a separate component file at this stage — it is single-use, tightly coupled to `PatinaSidebar`'s local state, and its complexity does not justify a new abstraction.
- The expand state is deliberately **not** persisted to `localStorage` — a collector opening the app should see the sidebar in its default, compact state. This is consistent with the "clean slate" aesthetic of the Manuscript Hybrid.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** No new IPC handler introduced. No new data crosses the process boundary. `availableMetals` and `availableGrades` are derived from `coins[]` — data already validated by `CoinSchema` in the Main process on the way in from SQLite.
- **Protocols:** No changes to `patina-img://` or any file-system access.
- **Input Surface:** The "Show N more" button performs a `setState` call — no user-supplied string is evaluated, interpolated into SQL, or sent to the bridge. The `hiddenCount` displayed in the button label is a computed integer derived from `values.length - TRUNCATION_THRESHOLD`. It cannot be injected.
- **XSS:** Metal and grade values rendered in `<span className="filter-text">{value}</span>` are React-escaped by default. No `dangerouslySetInnerHTML`.

### Review Notes & Suggestions:
- Verified: No new attack surface introduced. This is a display-layer-only change with zero security implications.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Coverage Check:**
  - `src/renderer/components/PatinaSidebar.tsx` — the new `renderOverflowGroup` function adds multiple branches: `shouldTruncate` true/false, `expanded` true/false, empty-state path. The 10 new tests listed in §3 cover all branches. 80% statement coverage mandate will be met.
  - No changes to `src/common/validation.ts` or `src/renderer/hooks/` — existing coverage is unaffected.
- **Async Safety:** `PatinaSidebar` is fully synchronous — no `waitFor` or `findBy*` needed. Button clicks use `fireEvent.click` or `userEvent.click` directly.
- **Boundary testing:** The `exactly 8` and `exactly 9` boundary cases must be explicitly tested to confirm the `> TRUNCATION_THRESHOLD` condition (not `>=`) is correctly implemented.

### Review Notes & Suggestions:
- The `exactly 8 values` test (no truncation, no button rendered) is the most important boundary test. Add an assertion that `queryByRole('button', { name: /show/i })` returns `null` at count = 8.
- The `exactly 9 values` test should assert the button reads "Show 1 more" — this validates the edge case where only 1 item is hidden (which the Baymard rule says should be surfaced, not hidden; but since we show 8 and hide 1, the "Show 1 more" link makes the single hidden item discoverable, which is compliant).

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:
- **Aesthetic Compliance:** Design formally approved via `docs/curating-ui/proposal_filter_overflow_2026-03-21.html` (Path A: The Soft Reveal). All CSS variables align with Manuscript Hybrid v3.3. The `.filter-show-more` link uses `--accent-manuscript`, `--font-mono`, uppercase, letter-spacing — consistent with the `type-meta` treatment used throughout the sidebar for labels and category markers.
- **Gradient token:** `var(--bg-manuscript)` is the correct endpoint for the fade — it matches the sidebar background exactly. Using a hardcoded `#FCF9F2` would be a maintenance hazard.
- **Accessibility:**
  - The "Show more" / "Show less" trigger is a `<button>` element with `aria-expanded` — correct ARIA pattern for a disclosure widget.
  - Screen readers will announce "Show 4 more, button, collapsed" / "Show less, button, expanded" — the `aria-expanded` state change is the disclosure signal, consistent with WCAG 4.1.2.
  - Active filter labels retain `aria-label` on the `<input type="checkbox">` — unchanged from the existing implementation.
- **Focus management:** After clicking "Show more", keyboard focus remains on the button (now reading "Show less"). This is correct — no focus jump needed.

### Review Notes & Suggestions:
- The `.filter-overflow-wrap.truncated::after` pseudo-element uses `pointer-events: none` — critical to preserve. Without it, the gradient overlay would intercept click events on the last visible filter item.
- Do not add a `transition` to `max-height` on the list — animated expand/collapse would introduce layout reflow that shifts the sidebar position while the user is interacting with it. A discrete state change (items appear/disappear) is preferable here.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings:
- **Historical Accuracy:** This is a display-layer feature with no impact on the underlying data model. No catalog references, field names, or metadata semantics are changed.
- **Collector UX:** The active-selection pinning is the most significant UX decision in this blueprint — and it is the correct one. A numismatist filtering by "Orichalcum" and "Electrum" should not need to expand the list again to see or deselect their active filters. Pinning selections to the top mirrors the behaviour of professional cataloguing tools (CollectiveAccess, Omeka S) where selected facets are surfaced as a priority group.
- **Grade ordering:** `availableGrades` is currently sorted alphabetically (from the `useCoins` memo). Alphabetical order for grades is not numismatically meaningful — "About Good" sorts before "Fine" which sorts before "Mint State", but only by accident. However, fixing grade sort order is out of scope for this blueprint and is a known limitation of the Phase 6a free-text grade approach (flagged in the 2026-03-20 retrospective). Do not attempt to fix it here.

### Review Notes & Suggestions:
- Verified: No historical accuracy concerns. The feature improves collector ergonomics without distorting the data model.
- Future note: When Phase 6a's vocabulary system is connected to Grade, the `availableGrades` list will be sortable by Sheldon scale order. At that point, the "top 8" will naturally show the most-used grades — Baymard's recommended ordering strategy for truncated facet lists.

---

## 9. User Consultation & Decisions

### Open Questions:
1. *(None — design direction was fully resolved in the pre-blueprint discussion. Path A was selected explicitly over Path B and Path C.)*

### Final Decisions:
- **Decision 1 — Path A: The Soft Reveal selected.** Lowest implementation cost; no new interaction patterns; directly validated by Baymard Institute research. Paths B and C are documented in the proposal for future reference.
- **Decision 2 — Threshold is 8.** Baymard recommends 8–10. 8 was chosen as the lower bound to keep the sidebar compact on collections with many unique metals.
- **Decision 3 — Expand state is local, not persisted.** The sidebar opens in its compact default state on every session. This is a display preference, not a filter state.
- **Decision 4 — Active selections pinned to top.** A selected value must never be invisible. Pinning before truncation is the architectural guarantee of this invariant.
- **Decision 5 — Sort and Eras are never truncated.** Both groups have a fixed, small value set. Applying truncation logic to them would be unnecessary complexity.

---

## 10. Post-Implementation Retrospective
**Date:** —
**Outcome:** —

### Summary of Work
- (To be completed after implementation)

### Pain Points
- (To be completed after implementation)

### Things to Consider
- Path B (search-within-filter) should be revisited if/when a Denomination or Country filter is added — those groups may reach 30–50 values where search becomes essential.
- Path C (group-level collapse) should be revisited if the sidebar grows to 6+ filter dimensions (e.g., after Phase 6a adds Mint and Die Axis filters).
- **Core Doc Revision:** Update `docs/style_guide.md §5` ("Archival Filters") to document the `.filter-overflow-wrap` + `.filter-show-more` pattern after Verification passes.
