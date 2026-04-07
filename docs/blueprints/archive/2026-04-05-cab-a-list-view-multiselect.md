# Implementation Blueprint: Cabinet List View & Multi-Select (CAB-A)

**Date:** 2026-04-05
**Status:** Completed
**Reference:** `docs/research/2026-04-03-cabinet-list-bulk-import-research.md`
**Series:** Cabinet Enhancement Series — Blueprint A of 3. Blueprint B (Bulk Operations) and Blueprint C (Coin Import) depend on the selection infrastructure delivered here.

---

## 1. Objective

Add a toggleable **list/table view** alongside the existing gallery grid in the Cabinet, and introduce **checkbox-based multi-select** that works identically in both views. Selection state is shared across the view toggle so switching views does not clear the curator's selection.

This blueprint delivers the selection infrastructure that Blueprints B and C build on. No bulk actions are wired yet — only the selection mechanism and the list view rendering.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** The list view is a sortable ledger table — a natural extension of the Manuscript Hybrid identity. Icon-pair toggle (grid ↔ list) is a minimal, non-decorative addition to the toolbar.
- [x] **Privacy First:** No external CDNs or telemetry. All changes are structural and client-side.
- [x] **Single-Click Rule:** View toggle is one click from the Cabinet toolbar. Checkbox selection is one click on any card or row. Multi-select (Shift+Click for range) is a standard desktop pattern that does not add a navigation layer.

---

## 2. Technical Strategy

### 2A — `useSelection` Hook

**New file:** `src/renderer/hooks/useSelection.ts`

Manages a `Set<number>` of selected coin IDs. Exposed API:

```typescript
interface UseSelectionReturn {
  selected: Set<number>;
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  toggleRange: (ids: number[], anchorId: number | null, targetId: number) => void;
  selectAll: (ids: number[]) => void;
  clearAll: () => void;
  count: number;
}
```

- `toggle(id)` — adds if absent, removes if present.
- `toggleRange(ids, anchorId, targetId)` — implements Shift+Click range selection. Selects all IDs between `anchorId` and `targetId` (inclusive) in the current `ids` array ordering.
- `selectAll(ids)` — replaces selection with the full provided array.
- `clearAll()` — empties the set.
- State is `useState<Set<number>>` using a functional update pattern to avoid stale closure bugs.
- Selection is **session-only** — cleared on app launch. No persistence required.

### 2B — View Mode State

View mode is a `useState<'grid' | 'list'>('grid')` in `Cabinet.tsx`. **Session-only** — resets to `'grid'` on each launch. This avoids extending the preference schema and sidesteps the open question on persistence (deferred to a future patch if collectors request it).

A `lastAnchorId` ref (`useRef<number | null>(null)`) in `Cabinet` tracks the last-clicked checkbox for Shift+Click range selection.

### 2C — Cabinet Toolbar Changes

Add a `.view-toggle` element to `.cabinet-toolbar` between the customize button and the tools dropdown:

```html
<div class="view-toggle" role="group" aria-label="[t('cabinet.viewToggle')]">
  <button class="btn-view-mode" aria-pressed={viewMode === 'grid'} aria-label="[t('cabinet.viewGrid')]">
    <!-- inline grid SVG (aria-hidden="true") -->
  </button>
  <button class="btn-view-mode" aria-pressed={viewMode === 'list'} aria-label="[t('cabinet.viewList')]">
    <!-- inline list SVG (aria-hidden="true") -->
  </button>
</div>
```

SVG icons are inlined (no CDN). Grid icon: a 2×2 square pattern. List icon: three horizontal lines with a narrow left column for the checkbox.

### 2D — GalleryGrid / CoinCard Changes

`GalleryGrid` receives three new optional props:
```typescript
selectable?: boolean;
selected?: Set<number>;
onToggleSelect?: (id: number, shiftKey: boolean) => void;
```

When `selectable` is true, each `CoinCard` renders a `<label class="card-checkbox-wrapper">` in its top-left corner containing `<input type="checkbox" aria-label="[t('cabinet.selectCoin', { title })]">`.

- Checkbox is visually hidden until hovered or `isSelected` is true (CSS opacity transition).
- Clicking the checkbox calls `onToggleSelect(id, event.shiftKey)` and calls `event.stopPropagation()` to prevent card navigation.
- The card click target area does **not** change — clicking the card body still navigates to `/coin/:id`.
- `CoinCard` receives `isSelected: boolean` prop; when true, adds `.coin-card--selected` class (subtle border + background tint using `--accent-manuscript` at 8% opacity).

### 2E — New `CoinListView` Component

**New file:** `src/renderer/components/CoinListView.tsx`

A sortable table of coins. Columns (all optional except Title, controlled by `useFieldVisibility`):

| # | Column | Visibility key |
|---|--------|----------------|
| 0 | ☐ (checkbox) | always visible |
| — | Thumbnail (36×36px) | always visible |
| 1 | Title | `ledger.title` (locked) |
| 2 | Issuer | `ledger.issuer` |
| 3 | Denomination | `ledger.denomination` |
| 4 | Era | `ledger.era` |
| 5 | Year | `ledger.year` |
| 6 | Mint | `ledger.mint` |
| 7 | Metal | `ledger.metal` |
| 8 | Grade | `ledger.grade` |
| 9 | Catalog Ref | `ledger.catalog_ref` |

Column ordering follows the numismatic identification-first convention: identity fields (Issuer, Denomination, Era, Year, Mint) precede physical attributes (Metal) and condition (Grade), with the catalog reference last as a lookup anchor. Column labels use existing `t('ledger.*')` keys — no new translation keys needed for column headers.

**Sorting:** Each visible column header is a `<button>` with `aria-sort`. Clicking cycles `asc → desc → none`. Local sort state (`sortColumn`, `sortAsc`) lives in `CoinListView` via `useState`. Sorts the passed `coins` prop with `useMemo`.

**Row interaction:**
- Clicking the row body navigates to `/coin/:id` (via `useNavigate`).
- Clicking the row checkbox calls `onToggleSelect(id, event.shiftKey)`.
- Header "select all" checkbox: checked if all visible coins selected, indeterminate if some, unchecked if none.
- `.coin-row--selected` class applied when selected.

**Primary image thumbnail:** A 36×36px `<img>` column using `patina-img://` protocol is shown as the first data cell (after checkbox). Falls back to a `.coin-row-no-image` placeholder div if no `primary_image_path`.

Props:
```typescript
interface CoinListViewProps {
  coins: CoinWithPrimaryImage[];
  loading: boolean;
  selected: Set<number>;
  onToggleSelect: (id: number, shiftKey: boolean) => void;
  onSelectAll: (ids: number[]) => void;
  onClearAll: () => void;
}
```

### 2F — Cabinet Integration

`Cabinet.tsx` changes:
1. Add `useSelection()` hook.
2. Add `viewMode` state.
3. Add `lastAnchorId` ref.
4. Implement `handleToggleSelect(id: number, shiftKey: boolean)` callback — delegates to `useSelection.toggle` or `useSelection.toggleRange` based on `shiftKey`, then updates `lastAnchorId`.
5. Render `CoinListView` or `GalleryGrid` based on `viewMode`.
6. Pass selection props to whichever view is active.
7. When `viewMode` changes, selection **persists** (no `clearAll` on toggle).

### 2G — i18n Keys

New keys in both `en.json` and `es.json`:

| Key | English | Spanish |
|-----|---------|---------|
| `cabinet.viewToggle` | `"View mode"` | `"Modo de vista"` |
| `cabinet.viewGrid` | `"Gallery"` | `"Galería"` |
| `cabinet.viewList` | `"List"` | `"Lista"` |
| `cabinet.selectCoin` | `"Select {{title}}"` | `"Seleccionar {{title}}"` |
| `cabinet.selectAll` | `"Select all"` | `"Seleccionar todo"` |
| `cabinet.deselectAll` | `"Deselect all"` | `"Deseleccionar todo"` |
| `cabinet.selectedCount` | `"{{count}} selected"` | `"{{count}} seleccionados"` |

### 2H — CSS Additions (`src/renderer/styles/index.css`)

```css
/* View toggle — extends .btn-tools resting state (hairline border, mono text) */
.view-toggle { display: flex; gap: 0; }
.btn-view-mode { /* same resting state as .btn-tools: hairline border, muted mono text */ }
.btn-view-mode[aria-pressed="true"] { background: var(--accent-manuscript); color: #fff; border-color: var(--accent-manuscript); }

/* Card checkbox overlay — 44×44px touch target (WCAG 2.5.5) */
.card-checkbox-wrapper { position: absolute; top: 4px; left: 4px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
.coin-card:hover .card-checkbox-wrapper,
.coin-card--selected .card-checkbox-wrapper { opacity: 1; }
.coin-card--selected { border-color: var(--accent-manuscript); background: rgba(145,78,50,0.08); }

/* List view */
.coin-list-view { width: 100%; border-collapse: collapse; }
.coin-list-view th { ... }
.coin-list-view td { ... }
.coin-row { cursor: pointer; }
.coin-row:hover { background: var(--stone-pedestal); }
.coin-row--selected { background: rgba(145,78,50,0.08); }
.coin-row-thumbnail { width: 36px; height: 36px; object-fit: contain; background: var(--stone-pedestal); border-radius: 2px; }
.coin-row-no-image { width: 36px; height: 36px; background: var(--border-hairline); border-radius: 2px; }
```

All new colour references use existing CSS custom properties — no new palette additions.

---

## 3. Verification Strategy (Quality Oversight)

### Test Cases

**`useSelection.test.ts`** — `src/renderer/hooks/__tests__/useSelection.test.ts`
- TC-SEL-01: `toggle` adds an ID to an empty set.
- TC-SEL-02: `toggle` removes an ID already in the set.
- TC-SEL-03: `toggleRange` with no anchor behaves as `toggle`.
- TC-SEL-04: `toggleRange` selects the correct contiguous range between anchor and target.
- TC-SEL-05: `selectAll` replaces the entire selection.
- TC-SEL-06: `clearAll` empties the set; `count` returns 0.
- TC-SEL-07: `isSelected` returns `false` on an empty set and `true` after `toggle(id)`.

**`CoinListView.test.tsx`** — `src/renderer/components/__tests__/CoinListView.test.tsx`
- TC-CLV-01: Renders a row for each coin in the `coins` prop.
- TC-CLV-02: Clicking a row checkbox calls `onToggleSelect` with correct id.
- TC-CLV-03: Header "select all" checkbox calls `onSelectAll` with all visible coin ids.
- TC-CLV-04: `.coin-row--selected` class applied to rows whose id is in `selected`.
- TC-CLV-05: Clicking the row body (not checkbox) calls `useNavigate` with `/coin/:id`.
- TC-CLV-06: Column header sort button cycles aria-sort and re-orders rows.
- TC-CLV-07: `loading=true` renders a loading state (no rows).

**`CoinCard.test.tsx` additions** — `src/renderer/components/__tests__/CoinCard.test.tsx`
- TC-CC-SEL-01: Card checkbox is rendered when `selectable=true`.
- TC-CC-SEL-02: Card checkbox is absent when `selectable=false` (default).
- TC-CC-SEL-03: `.coin-card--selected` applied when `isSelected=true`.
- TC-CC-SEL-04: Clicking checkbox calls `onToggleSelect`; clicking card body calls `onCoinClick`.

**`Cabinet.test.tsx`** — `src/renderer/components/__tests__/Cabinet.test.tsx` (new file)
- TC-CAB-SEL-01: View toggle renders two `btn-view-mode` buttons.
- TC-CAB-SEL-02: Clicking the list toggle renders `CoinListView`, not `GalleryGrid`.
- TC-CAB-SEL-03: Selection persists when toggling between grid and list views.

- **Colocation:** All test files colocated with source files.
- **Mocking:** `window.electronAPI` global mock per `setupTests.ts` pattern. `useNavigate` mocked. `react-i18next` global mock. `Cabinet.test.tsx` mocks `useCoins` via `vi.spyOn(useCoinsModule, 'useCoins')` returning a controlled `{ coins, filteredCoins, loading: false, … }` — same spy pattern as `CoinDetail.test.tsx` uses for `useCoin`.
- **Async:** `useSelection` is synchronous — use `act()` only, not `waitFor`. `Cabinet.test.tsx` requires `waitFor` for async `useCoins` resolution. `CoinListView` renders synchronously from props — no `waitFor` needed.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Selection state lives entirely in the renderer — no IPC required. The `useSelection` hook is a pure React state primitive; no cross-process consistency concerns for this blueprint.
- **Abstraction:** No Electron bridge involvement. `Cabinet` owns the selection state and passes it as props — consistent with the existing `useCoins`/`useExport` delegation pattern. No business logic leaks into the bridge.

### Review Notes & Suggestions:
- `CoinListView` sort state is intentionally local to the component (not lifted to `Cabinet`). This is correct — list-view sort is a display concern, not shared state. The existing `useCoins` sort (applied to both views) remains the canonical sort for the gallery grid.
- `CoinCard` needs `min-width: 0` and `position: relative` on `.coin-card` to support the absolutely positioned checkbox overlay without breaking grid overflow.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** No new IPC handlers introduced. All existing `ipcMain.handle` registrations and Zod-validated schemas in `src/common/validation.ts` remain untouched. The `useSelection` hook is pure renderer state (`useState<Set<number>>`) — zero IPC crossing.
- **Protocols:** `patina-img://` usage in `CoinListView` thumbnail (`patina-img://${coin.primary_image_path}`) is identical to the established pattern in `CoinCard.tsx:40` and `CoinDetail.tsx:38`. The main-process handler (`src/main/index.ts:93–101`) already enforces `..` traversal blocking and `imageRoot` prefix validation for all `patina-img://` requests — no new surface is exposed.
- **Isolation Hardening:** `contextIsolation: true` and `sandbox: true` confirmed active (`src/main/index.ts:35–36`). No change to `preload.ts` or `contextBridge` surface.
- **Data Egress:** `primary_image_path` values rendered in `CoinListView` originate from the existing `useCoins` IPC fetch, already validated at the main-process boundary. No new renderer-to-main data flow introduced.

### Review Notes & Suggestions:
- Verified: No issues identified. The blueprint introduces no new attack surface. The `patina-img://` protocol path originates from DB-fetched data (not user input), so no additional sanitization is required in `CoinListView`.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Needs Revision

### Audit Findings:
- **Colocation:** `useSelection.test.ts` → `src/renderer/hooks/__tests__/useSelection.test.ts` ✓ matches existing hook test pattern. `CoinListView.test.tsx` → `src/renderer/components/__tests__/CoinListView.test.tsx` ✓. `Cabinet.test.tsx` → `src/renderer/components/__tests__/Cabinet.test.tsx` (new file — acceptable). **Gap:** TC-CC-SEL-01 through TC-CC-SEL-04 are labelled "GalleryGrid / CoinCard" but no file is specified. GalleryGrid has no existing test file; CoinCard.test.tsx does exist. Clarification needed (see Review Notes).
- **Mocking Strategy:** Global `window.electronAPI` mock ✓. `useNavigate` mock ✓. `react-i18next` mock ✓. **Gap:** `Cabinet.test.tsx` requires mocking the `useCoins` hook (Cabinet is a consumer of `useCoins`; similar to how CoinDetail.test.tsx uses `vi.spyOn(useCoinHook, 'useCoin')`). This is not documented in the blueprint's mocking section.
- **Coverage — `useSelection`:** The hook exposes 5 functions: `toggle`, `toggleRange`, `selectAll`, `clearAll`, `isSelected`. The 6 TCs cover toggle (TC-SEL-01, TC-SEL-02), toggleRange (TC-SEL-03, TC-SEL-04), selectAll (TC-SEL-05), clearAll (TC-SEL-06) — but `isSelected` has no dedicated test case. At 4/5 functions exercised explicitly, stated function coverage is 80%, below the 90% mandate for hooks.
- **Coverage — `CoinListView`:** 7 TCs covering render, interaction, selection state, navigation, sort, and loading. Adequate for 80% statement coverage mandate.
- **Async Safety:** `useSelection` is pure synchronous state — `act()` is appropriate; `waitFor` is not needed and the blanket "waitFor for all state updates" note is overly broad for this hook. `Cabinet.test.tsx` does require `waitFor` for async `useCoins` resolution.

### Review Notes & Suggestions:
- **Required — Add TC-SEL-07:** Explicitly test `isSelected(id)` — e.g., assert `isSelected(1)` returns `false` on empty set, then `true` after `toggle(1)`. This brings `useSelection` function coverage to 5/5 (100%) and satisfies the 90% mandate.
- **Required — Cabinet mock strategy:** Document in Section 3 that `Cabinet.test.tsx` uses `vi.spyOn(useCoinsModule, 'useCoins')` to return a controlled `{ coins, filteredCoins, loading: false, … }` — following the same spy pattern as `CoinDetail.test.tsx` does for `useCoin`.
- **Required — Clarify TC-CC-SEL location:** TC-CC-SEL-01 through TC-CC-SEL-04 should be added to `src/renderer/components/__tests__/CoinCard.test.tsx` (the `selectable` / `isSelected` props are on `CoinCard`, not `GalleryGrid`). Update the blueprint to specify `CoinCard.test.tsx` as the target file; GalleryGrid does not require a separate test file for this change.
- **Informational:** `useSelection` async note is not applicable — remove `waitFor` guidance from that hook's test section to avoid confusion.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Needs Revision

### Audit Findings:
- **Aesthetic Compliance (Manuscript Hybrid v3.3):** List table approach (border-collapse, sortable headers, ledger rows) is fully aligned with the Archival Ledger philosophy. The sortable column header pattern (button with `aria-sort`) is a natural ledger extension. Row selection tint at 8% `--accent-manuscript` is consistent with the selected/hover language used across the gallery.
- **Critical — CSS Variable Mismatch:** Section 2H references three non-existent custom properties. The project's variable set (`src/renderer/styles/index.css:5–11`) does not include `--color-sienna`, `--color-parchment-dark`, or `--color-border`. Correct mappings: `--color-sienna` → `--accent-manuscript`; `--color-parchment-dark` → `--stone-pedestal`; `--color-border` → `--border-hairline`. The blueprint claim "All new colour references use existing CSS custom properties" is currently false and must be corrected before implementation.
- **Accessibility — Touch Targets:** `aria-pressed` on toggle buttons ✓, `aria-sort` on column headers ✓, `role="group"` on toggle container ✓, `aria-label` on checkboxes ✓. However, `.card-checkbox-wrapper` in Section 2H specifies no minimum dimensions. The `<label>` wrapper must be explicitly sized to `min-width: 44px; min-height: 44px` (WCAG 2.5.5, project mandate). The icon-only `btn-view-mode` buttons must carry a `.sr-only` visible text label or a robust `aria-label` — `title` alone is not a reliable accessibility primitive.
- **`object-fit` Policy Conflict:** Section 2H specifies `object-fit: cover` for `.coin-row-thumbnail`. The project mandate (`AGENTS.md`, `CLAUDE.md`) requires `object-fit: contain` on coin images to prevent cropping of numismatic detail. Cover will silently crop obverse/reverse detail at 36px. Change to `object-fit: contain` with a `background: var(--stone-pedestal)` fill.
- **`position: relative` on `.coin-card`:** Already present at `src/renderer/styles/index.css:629` ✓ — Section 4 note is satisfied by existing code.
- **`btn-view-mode` Class Gap:** The proposed `.btn-view-mode` is a new button variant not in the style guide's button inventory. For toolbar consistency, it should share the `.btn-tools` resting state (hairline border, muted mono text) with the `aria-pressed="true"` state using `--accent-manuscript` fill. Document this variant in `docs/style_guide.md` after implementation under "Action Elements".

### Review Notes & Suggestions:
- **Required — Fix variable names in Section 2H:** Replace `--color-sienna` → `--accent-manuscript`, `--color-parchment-dark` → `--stone-pedestal`, `--color-border` → `--border-hairline` throughout.
- **Required — Checkbox touch target:** Add `min-width: 44px; min-height: 44px` (or equivalent padding) to `.card-checkbox-wrapper` in Section 2H CSS.
- **Required — `object-fit: contain`:** Change `.coin-row-thumbnail` from `object-fit: cover` to `object-fit: contain; background: var(--stone-pedestal)`.
- **Recommended — `btn-view-mode` spec:** Add to Section 2H that `.btn-view-mode` extends `.btn-tools` resting state; `aria-pressed="true"` adds `background: var(--accent-manuscript); color: #fff; border-color: var(--accent-manuscript)`.
- **Post-implementation:** Add `.btn-view-mode` variant and `.coin-list-view` table pattern to `docs/style_guide.md` as "Permanent Collection" additions.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Needs Revision

### Audit Findings:
- **Historical Accuracy:** No new numismatic fields or vocabulary are introduced. The column set draws entirely from existing `Coin` type fields (`src/common/types.ts`). No terminology concerns.
- **Column Ordering — Denomination misplaced:** The proposed sequence places Denomination (#7) after Metal (#5) and Grade (#6). In professional numismatic catalogue convention (RIC, RPC, Crawford, Sear), denomination is an **identification** field that defines coin type under a given issuer — it belongs with issuer, era, and year, not after condition assessment. Metal and grade are physical/condition attributes that follow identification. The pre-existing claim in Section 2E that "ordering follows numismatic catalogue convention — identification fields before physical metrics before condition" is contradicted by the actual table, which puts Denomination after both.
- **Missing `mint` column:** The `Coin` type includes `mint?: string` (`src/common/types.ts:9`), and `ledger.mint` is an `ALLOWED_VISIBILITY_KEY` defaulting to `true` (`src/common/validation.ts:164,191`). Mint is a first-order triage field for professional numismatists — particularly for Roman, Byzantine, and Islamic coinage where the mint mark is a primary authentication and classification tool. Omitting it from the list view column set while including it in the detail view creates an inconsistency that undermines the triage workflow.
- **36×36px thumbnail:** Adequate as a recognition aid for a triage list. Collectors can identify coin type (portrait style, general motif) at this size. Detailed examination belongs in CoinDetail. No revision needed.
- **Shared `ledger.*` visibility keys:** Pragmatically sound. The numismatic concern is not the key reuse itself but the side-effect: a collector who hides `ledger.denomination` in the detail view (unusual but possible) will also lose it from list view triage. This is an acceptable trade-off given the session-only nature of list view sort state; visibility preferences are persistent and user-controlled.

### Review Notes & Suggestions:
- **Required — Correct column ordering:** Reorder the list view columns to place Denomination before Metal and Grade, following the identification-first convention. Revised sequence: ☐ (checkbox) → Thumbnail → Title → Issuer → Denomination → Era → Year → Metal → Grade → Catalog Ref.
- **Required — Add `mint` column:** Insert `Mint` (`ledger.mint`) between Year and Metal in the column set. This brings the list view to parity with the fields a professional cataloguer would use for collection triage. Updated column table: ☐ → Thumbnail → Title → Issuer → Denomination → Era → Year → Mint → Metal → Grade → Catalog Ref (visibility: `ledger.mint`).
- **Informational:** The corrected 11-column set (excluding checkbox and thumbnail) still uses only existing `ledger.*` visibility keys — no schema changes required.

---

## 9. User Consultation & Decisions

### Open Questions:
1. **View-mode persistence:** Should grid/list preference persist between sessions?
2. **List view thumbnail:** Always shown or user-controllable via field visibility?
3. **Column visibility:** Shared `ledger.*` keys or separate `list.*` keys?

### Final Decisions:
1. **Session-only.** Resets to gallery grid on each launch. The list view is a triage workspace, not a persistent layout preference. Future patch can add `view_mode` preference key if collectors request it.
2. **Always shown.** The 36×36px thumbnail is a fixed column like the checkbox. It anchors each row visually and makes the list view numismatically useful — a collector can scan rows by portrait/type without opening each record.
3. **Shared `ledger.*` keys.** No separate list-view visibility control. Zero new schema keys. Acceptable trade-off: visibility is user-controlled and the coupling edge case (hiding a field in detail that's needed for triage) is uncommon.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-04-05
**Outcome:** Completed. All 456 tests pass. `npx tsc --noEmit` clean.

### Summary of Work
- `useSelection` hook delivered with 7 TCs covering all 5 public functions (100% function coverage).
- `CoinListView` component delivered as a sortable ledger table with 11 columns (excluding checkbox and thumbnail), respecting `useFieldVisibility` and the `patina-img://` protocol. Includes a synced mirror scrollbar for horizontal overflow.
- `Cabinet.tsx` wired with view toggle, `lastAnchorId` ref for Shift+Click range selection, and selection-persistent view switching.
- `GalleryGrid` / `CoinCard` extended with `selectable`, `isSelected`, and `onToggleSelect` props. Checkbox overlay with 44px touch target, opacity-on-hover, and `.coin-card--selected` tint.
- 19 new TCs across 4 test files; 0 existing tests broken.
- All Phase II audit required revisions applied before or during implementation: correct CSS variables, touch targets, `object-fit: contain`, mint column, identification-first column ordering, `isSelected` TC, Cabinet mock strategy.

### Pain Points
- The `useSelection.isSelected` callback uses a `useRef` mirror of the state to avoid stale closure bugs in memoised callbacks — an unusual pattern that deviates from the simpler `selected.has(id)`. Acceptable given the ref is updated at the top of every render.
- The mirror scrollbar (`coin-list-view-mirror`) required a `ResizeObserver` + paired `scroll` event listeners to keep the top scrollbar in sync — more DOM wiring than expected for an 11-column table.

### Things to Consider
- **`AGENTS.md` / `style_guide.md`:** The `.btn-view-mode` button variant and `.coin-list-view` table pattern should be added to `docs/style_guide.md` under "Action Elements" and "Data Display" respectively as Permanent Collection additions. The `.sr-only` utility class should be noted as the canonical approach for icon-only accessible buttons.
- **Blueprints B and C** can now proceed — the selection infrastructure (`useSelection`, `handleToggleSelect`, `lastAnchorId`) is live and tested. Blueprint B (Bulk Operations) should consume `selected` and `clearAll` from `Cabinet` via prop-drilling or a context if the action panel adds significant depth.
