# Implementation Blueprint: List View UX Polish (CAB-A1)

**Date:** 2026-04-05
**Status:** Completed
**Series:** Cabinet Enhancement Series — follow-up to CAB-A (List View & Multi-Select). Independent of CAB-B and CAB-C.

---

## 1. Objective

Two focused UX improvements to the list view introduced in CAB-A:

1. **Sticky identity columns** — checkbox and thumbnail columns remain fixed while the user scrolls data columns horizontally, preserving row identity at all times.
2. **Sidebar collapse toggle** — a one-click toggle to hide the filter sidebar, recovering horizontal space for the list (and grid) view. Session-only; resets to expanded on each launch.

No new IPC, no schema changes, no new vocabulary. Pure renderer-side state and CSS.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Sticky columns follow the physical ledger convention where the row label (folio number, coin designation) stays visible. The sidebar collapse is a minimal rail gesture — the sidebar does not disappear, it folds.
- [x] **Privacy First:** No external CDNs introduced. All changes are structural and client-side.
- [x] **Single-Click Rule:** Sidebar collapse is one click from a persistent toggle button on the sidebar rail. Sticky columns require no user action — they are always on.

---

## 2. Technical Strategy

### 2A — Sticky Identity Columns

**File:** `src/renderer/components/CoinListView.tsx` — no logic changes.

**File:** `src/renderer/styles/index.css` — CSS only.

The checkbox and thumbnail columns (`td.coin-list-col-checkbox`, `td.coin-list-col-thumbnail`, and their `th` counterparts) receive `position: sticky` with cumulative `left` offsets so they stack correctly when the table scrolls horizontally.

Column widths (from CAB-A):
- Checkbox column: 40px
- Thumbnail column: 52px

```css
.coin-list-view th.coin-list-col-checkbox,
.coin-list-view td.coin-list-col-checkbox {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--bg-manuscript);
}

.coin-list-view th.coin-list-col-thumbnail,
.coin-list-view td.coin-list-col-thumbnail {
  position: sticky;
  left: 40px;
  z-index: 2;
  background: var(--bg-manuscript);
  box-shadow: 1px 0 0 var(--border-hairline);
}

/* Selected rows: sticky cells must carry the selection tint */
.coin-row--selected td.coin-list-col-checkbox,
.coin-row--selected td.coin-list-col-thumbnail {
  background: rgba(145, 78, 50, 0.08);
}

/* Hover state */
.coin-row:hover td.coin-list-col-checkbox,
.coin-row:hover td.coin-list-col-thumbnail {
  background: var(--stone-pedestal);
}
```

`z-index: 2` ensures sticky cells render above scrolling data cells (which have implicit z-index: auto/0). The `thead` row uses `z-index: 3` so the header always sits on top. These values are intentionally low — sticky table cells only need to layer above their sibling cells; they correctly sit below all UI chrome (dropdowns at z-index 200+, modals at z-index 1000+). A hairline `box-shadow: 1px 0 0 var(--border-hairline)` on the thumbnail column provides a visual separator between fixed and scrolling regions.

### 2B — Sidebar Collapse Toggle

**State:** A `useState<boolean>(true)` named `sidebarOpen` in `Cabinet.tsx`. Session-only — resets to `true` (expanded) on each launch. No persistence required; the sidebar is primarily a filter tool, not a layout preference.

**Cabinet.tsx changes:**
1. Add `sidebarOpen` state.
2. Pass `sidebarOpen` and `onToggle` callback to `PatinaSidebar`.
3. Conditionally apply `.app-layout--sidebar-collapsed` class to `.app-layout` when `!sidebarOpen`.

**PatinaSidebar changes:**
1. Accept `isOpen: boolean` and `onToggle: () => void` props.
2. Render a `<button class="btn-sidebar-toggle">` on the sidebar rail (always visible, regardless of `isOpen`).
3. When `!isOpen`, use **conditional rendering** to suppress filter content (not CSS hiding). The toggle button itself is always rendered.

```html
<!-- Toggle button — always visible on the rail -->
<button
  class="btn-sidebar-toggle"
  aria-label="[t('sidebar.collapse')]"   <!-- when open -->
  aria-label="[t('sidebar.expand')]"    <!-- when closed -->
  aria-expanded={isOpen}
  onClick={onToggle}
>
  <!-- inline chevron SVG, rotates 180° when collapsed -->
</button>
```

**CSS approach:**

```css
.patina-sidebar {
  /* existing: width: 280px; flex-shrink: 0; */
  transition: width 0.3s ease;  /* aligns with existing drawer transition timing */
  overflow: hidden;
}

.app-layout--sidebar-collapsed .patina-sidebar {
  width: 44px;  /* 44px satisfies the 44px touch-target mandate for the toggle button */
}

.btn-sidebar-toggle {
  /* same resting state as .btn-tools */
  min-height: 44px;
  min-width: 44px;
}

/* Chevron flips when collapsed */
.app-layout--sidebar-collapsed .btn-sidebar-toggle svg {
  transform: rotate(180deg);
}
```

**Collapsed rail width: 44px** (not 32px) — required to satisfy the project's 44px minimum touch-target mandate for the always-visible toggle button.

The `.app-main` expands naturally as the sidebar shrinks via the existing `flex: 1` rule on `.app-main`. No explicit `main` width changes needed.

### 2C — i18n Keys

New keys in `en.json` and `es.json`:

| Key | English | Spanish |
|-----|---------|---------|
| `sidebar.collapse` | `"Hide filters"` | `"Ocultar filtros"` |
| `sidebar.expand` | `"Show filters"` | `"Mostrar filtros"` |

---

## 3. Verification Strategy

### Test Cases

**`CoinListView.test.tsx` additions:**
- TC-CLV-08: Sticky columns — checkbox and thumbnail `<th>` have class `coin-list-col-checkbox` / `coin-list-col-thumbnail`. *(CSS-only change; unit test verifies class presence rather than computed style since jsdom does not compute CSS.)*

**`PatinaSidebar.test.tsx` additions:**
- TC-PSB-COL-01: Renders `.btn-sidebar-toggle` button.
- TC-PSB-COL-02: `aria-expanded` is `true` when `isOpen=true`, `false` when `isOpen=false`.
- TC-PSB-COL-03: Clicking the toggle button calls `onToggle`.
- TC-PSB-COL-04: Filter controls (era, metal, grade groups) are **not present in the DOM** when `isOpen=false`. *(Uses conditional rendering — `queryBy*` returns null, not a hidden element.)*

**`Cabinet.test.tsx` additions:**
- TC-CAB-COL-01: `.app-layout--sidebar-collapsed` is absent when `sidebarOpen=true` (default).
- TC-CAB-COL-02: Clicking the sidebar toggle adds `.app-layout--sidebar-collapsed` to `.app-layout`.
- TC-CAB-COL-03: Clicking the toggle again removes `.app-layout--sidebar-collapsed`.

- **Mocking:** Same patterns as CAB-A (`useCoins` spy, `useExport` spy, `useLanguage` spy).
- **CSS computation:** jsdom does not evaluate CSS, so sticky positioning is verified by class presence (`coin-list-col-checkbox`, `coin-list-col-thumbnail`), not `getComputedStyle`.

---

## 4. Architectural Oversight
**Status:** Verified

No architectural concerns. All changes are pure renderer-side (CSS + local React state). The `isOpen`/`onToggle` props follow the established Cabinet → PatinaSidebar prop-passing pattern already used for `filters`, `updateFilters`, and `clearFilters`. The `sidebarOpen` boolean follows the same local state pattern as `viewMode`, `drawerOpen`, and `toolsOpen` already in `Cabinet.tsx`. No stacking context concerns: z-index 2/3 for sticky cells is intentionally scoped to the table layer; all UI chrome (dropdowns 200+, modals 1000+) remains above.

---

## 5. Security Assessment
**Status:** Verified — No issues identified.

All changes are purely UI-side (CSS + local React state) with zero security surface expansion. No new IPC handlers, no schema changes, no new data flows to or from the Main process. The `isOpen`/`onToggle` props are pure React component interface — no trust boundaries crossed. i18n keys (`sidebar.collapse`, `sidebar.expand`) are rendered via React JSX text interpolation with no `dangerouslySetInnerHTML`, so no XSS vector. No external CDNs or network calls introduced. The existing security posture (`contextIsolation: true`, `sandbox: true`, The Filter) remains unchanged.

---

## 6. Quality Assessment
**Status:** Verified with two implementation notes.

The test strategy is well-aligned with project standards. TC-CLV-08 is correct — class presence is the right assertion for CSS-only sticky columns in jsdom. The existing `translations.test.ts` key-parity suite will automatically enforce i18n coverage for the two new sidebar keys; no additional translation tests are needed.

**Implementation notes:**
1. **TC-PSB-COL-04** must use **conditional rendering** (not CSS hiding) so that `queryBy*` returns `null` for filter controls when `isOpen=false`. Do not use `display: none` / `visibility: hidden` for the filter content — JSX branch (`{isOpen && <filter content />}`) is the required implementation pattern.
2. **TC-CAB-COL-01/02/03** are new additions to `Cabinet.test.tsx`. The current Cabinet test suite (CAB-A) only covers view-mode toggling; these three tests cover the `.app-layout--sidebar-collapsed` class lifecycle and do not yet exist.

---

## 7. UI Assessment
**Status:** Verified with two spec corrections applied.

CSS variables `--bg-manuscript`, `--stone-pedestal`, and `--border-hairline` are confirmed present and correctly referenced. Inline SVG chevron rotation matches existing icon patterns (`.btn-plate-icon-action svg`). The collapsed sidebar "silent frame" is visually coherent.

**Two spec corrections incorporated above:**
1. **Transition timing** updated from `0.2s` to `0.3s ease` — aligns with the established drawer transition timing (e.g., `.glossary-drawer`) throughout the codebase.
2. **Collapsed rail width** updated from `32px` to `44px` — the project mandates a 44px minimum touch target on all action buttons. A 32px rail would violate this for the always-visible toggle button; 44px satisfies the mandate cleanly.

z-index 2/3 for sticky cells is correct and intentional — not a conflict. These values layer sticky cells above scrolling cells while remaining well below all UI chrome (dropdowns 200+, modals 1000+).

---

## 8. Numismatic & UX Assessment
**Status:** Verified — Both features approved.

Sticky columns faithfully mirror the physical ledger convention (folio identifier anchored at left margin). For professional catalogers scrolling large collections, preserving the 40px checkbox + 52px thumbnail context while reviewing metadata columns directly supports identification-first cataloging workflow. The hairline separator between fixed and scrolling regions is essential for cognitive clarity. The sidebar collapse toggle correctly implements the "minimal rail gesture" — the sidebar folds rather than disappears, preserving the Archive Explorer framing. The 44px collapsed rail and persistent toggle button satisfy the single-click rule. Session-only state is acceptable for the current scope; if post-release user feedback indicates that collectors frequently re-expand immediately on session start, a `layout.sidebarCollapsed` preference key would be a low-cost follow-up.

---

## 9. User Consultation & Decisions

### Open Questions
1. **Sidebar default state:** Should the sidebar default to collapsed when the user switches to list view, then restore when switching back to grid? Or is the collapse always manual?
2. **Sidebar collapse persistence:** Should the collapsed/expanded state persist across sessions (like a layout preference)?
3. **Sticky column background on dark themes:** Currently hardcoded to `--bg-manuscript`. If a dark theme is ever introduced, this needs revisiting.

### Final Decisions
1. **Manual only.** The sidebar collapse is always an explicit user action. Switching view mode does not affect sidebar state. Rationale: filtering is part of list-view triage; auto-collapsing assumes intent and introduces state edge cases (per-view memory) for a feature already reachable in one click.
2. **Session-only.** Resets to expanded on each launch. No new preference key required.
3. **Acknowledged — no action now.** Sticky cell backgrounds are hardcoded to `--bg-manuscript`. This is a known limitation to revisit if a dark theme is introduced.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-04-05
**Outcome:** Completed — both features shipped as designed, with two post-implementation visual corrections.

### Summary of Work
- **Sticky identity columns:** CSS-only. `position: sticky` with cumulative `left` offsets on checkbox/thumbnail `th`/`td`. Header cells promoted to `z-index: 3`. Selection tint and hover background carried through explicitly.
- **Sidebar collapse toggle:** `sidebarOpen` state in `Cabinet.tsx`, `.app-layout--sidebar-collapsed` class on `.app-layout`, conditional rendering in `PatinaSidebar` (JSX branch, not CSS). Toggle button always rendered; chevron flips 180° when collapsed.
- **i18n:** `sidebar.collapse` / `sidebar.expand` keys added to both locales.
- **Tests:** 7 new tests (TC-CLV-08, TC-PSB-COL-01–04, TC-CAB-COL-01–03). All 464 tests pass; `tsc --noEmit` clean.

### Pain Points
1. **Toggle button spacing:** The sidebar's `gap: 2rem` applied between all flex children created excessive whitespace between the toggle and the first filter group. Fixed with `margin-bottom: -1.25rem` on `.btn-sidebar-toggle`. The blueprint should have specified that the toggle sits outside the sidebar's gap rhythm, or used a wrapper element.
2. **Toggle button legibility:** The initial implementation rendered a plain icon-only button that was not self-evident. Fixed by adding the visible text label (`t('sidebar.collapse')`) beside the chevron. The blueprint's HTML spec showed the label only in the `aria-label` attribute — the visible text requirement was implicit and should have been explicit.
3. **Sticky column gap (Chromium rendering artifact):** `border-collapse: collapse` + `position: sticky` on adjacent cells produces a sub-pixel rendering gap in Chromium/Electron. The blueprint specified `left: 40px` for the thumbnail column (mathematically correct) but did not anticipate this browser quirk. Fixed empirically at `left: 37px`. Future sticky-column work in this table should note this offset baseline.

### Things to Consider
- The `left: 37px` offset for the thumbnail sticky cell is empirical, not derivable from the CSS spec. If the checkbox column width ever changes, this value must be updated manually. Consider a CSS custom property (`--sticky-thumbnail-left: 37px`) to make the dependency explicit.
- The sidebar collapse is session-only per spec. If post-release data shows users frequently re-expanding on launch, a `layout.sidebarCollapsed` preference key is a low-cost follow-up (no IPC or schema work required beyond the existing `prefsSet`/`prefsGet` pattern).
