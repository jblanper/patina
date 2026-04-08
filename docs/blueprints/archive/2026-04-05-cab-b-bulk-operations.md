# Implementation Blueprint: Cabinet Bulk Operations (CAB-B)

**Date:** 2026-04-05
**Status:** Completed
**Reference:** `docs/research/2026-04-03-cabinet-list-bulk-import-research.md`
**Series:** Cabinet Enhancement Series — Blueprint B of 3. **Depends on CAB-A** (`2026-04-05-cab-a-list-view-multiselect.md`) being Completed first.
**Dependency:** The `useSelection` hook, `CoinListView`, and checkbox infrastructure from CAB-A are prerequisites.

---

## 1. Objective

Build on CAB-A's selection infrastructure to deliver four bulk operations reachable from a contextual **Selection Toolbar** that appears whenever one or more coins are selected:

1. **Bulk field edit** — change one vocabulary field across all selected coins via a field-at-a-time modal.
2. **Bulk delete** — remove all selected coins with a single confirmation.
3. **Scoped ZIP export** — archive only the selected coins.
4. **Scoped PDF export** — generate a catalog of only the selected coins.

Operations 3 and 4 require extending the existing `export:toZip` and `export:toPdf` IPC handlers to accept an optional `coinIds` filter.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** The Selection Toolbar follows the contextual action bar pattern — it appears only when meaningful and disappears when no selection exists. Bulk edits are modal and deliberate, never inline or accidental.
- [x] **Privacy First:** No new external calls. Scoped exports are a filter on the existing local export pipeline.
- [x] **Single-Click Rule:** All bulk actions are reachable in two steps: (1) select coins, (2) invoke action from the toolbar. No deep sub-menus.

---

## 2. Technical Strategy

### 2A — `SelectionToolbar` Component

**New file:** `src/renderer/components/SelectionToolbar.tsx`

Rendered in `Cabinet.tsx` immediately below the `SearchBar`, conditionally: `selection.count > 0`.

```tsx
<SelectionToolbar
  count={selection.count}
  onBulkEdit={() => setBulkEditOpen(true)}
  onBulkDelete={() => setBulkDeleteOpen(true)}
  onExportZip={() => exportSelectionToZip([...selection.selected])}
  onExportPdf={() => exportSelectionToPdf([...selection.selected])}
  onClearSelection={selection.clearAll}
/>
```

Layout:
- Left: `"N selected"` count label + `[✕ Clear]` ghost button.
- Centre: `[Edit Field]` and `[Delete]` action buttons.
- Right: `[Export ▾]` dropdown containing `Export Archive (ZIP)` and `Generate Catalog (PDF)`.

CSS class: `.selection-toolbar` — `position: sticky; top: 0; z-index: 10;` so it floats above the coin grid when scrolling. Uses `--color-sienna` accent for the Delete button to signal destructive intent.

Accessibility: `role="toolbar"`, `aria-label={t('cabinet.selectionToolbar')}`. Delete button has `aria-describedby` pointing to a visually-hidden count.

### 2B — `BulkEditModal` Component

**New file:** `src/renderer/components/BulkEditModal.tsx`

A two-step modal:
1. **Field selection:** A `<select>` listing the seven vocabulary fields eligible for bulk edit: `metal`, `grade`, `era`, `denomination`, `mint`, `die_axis`, `rarity`. Labels use existing `t('ledger.*')` keys.
2. **Value entry:** An `AutocompleteField` (reusing the existing component from Scriptorium) pre-seeded with vocab for the selected field and current locale.

Confirm button is disabled until both a field and a non-empty value are chosen.

On confirm: iterates over `selection.selected`, calling `window.electronAPI.updateCoin(id, { [field]: value })` sequentially. Uses a `Promise.all` with a local `results` array to collect failures without aborting the batch. On completion: calls `useCoins.refresh()`, calls `selection.clearAll()`, shows a summary toast (e.g. "Updated 12 coins. 0 errors.").

**Why sequential (not `Promise.all`) for the DB calls:** `better-sqlite3` is synchronous and Main-process writes are serialised by the IPC queue — sequential `await` avoids overwhelming the IPC channel and produces predictable error attribution.

Validation: each `updateCoin` call passes through the existing `NewCoinSchema.partial().strict()` Zod guard in `src/main/index.ts` — no new validation path needed.

Props:
```typescript
interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  onComplete: () => void;
}
```

### 2C — Bulk Delete

No new component required. Reuses the existing confirmation modal pattern (Cancel-first, per WCAG 3.2.4).

`Cabinet.tsx` additions:
- `bulkDeleteOpen` state.
- On confirm: iterates `selection.selected`, calling `window.electronAPI.deleteCoin(id)` for each, then `useCoins.refresh()` + `selection.clearAll()`.
- Uses `ExportToast` (already in Cabinet) to surface a `"Deleted N coins"` success message.

i18n keys:
| Key | English | Spanish |
|-----|---------|---------|
| `cabinet.confirmBulkDelete` | `"Delete {{count}} coins? This cannot be undone."` | `"¿Eliminar {{count}} monedas? Esta acción no se puede deshacer."` |

### 2D — Scoped Export: IPC Layer Changes

#### `src/common/validation.ts`

Extend both export schemas to accept an optional `coinIds` array:

```typescript
// ExportOptionsSchema — add:
coinIds: z.array(z.number().int().positive()).max(5000).optional(),

// PdfExportOptionsSchema — add:
coinIds: z.array(z.number().int().positive()).max(5000).optional(),
```

The `max(5000)` guard prevents an oversized array from being injected through the bridge.

#### `src/main/export/zip.ts`

`exportToZip(targetPath, includeImages, includeCsv, coinIds?)`:
- If `coinIds` provided, filter: `const coins = dbService.getCoins().filter(c => coinIds.includes(c.id));`
- Update the manifest `type` field: `coinIds ? 'selection-archive' : 'full-archive'`.
- No other changes — image lookup already uses `coin.id` as the key.

#### `src/main/export/pdf.ts`

`exportToPdf(locale, coinIds?)`:
- If `coinIds` provided, pass a filtered coin list to the PDF generator.
- Manifest/cover page label changes to `"Selection Catalog"` when scoped.

#### `src/main/index.ts`

IPC handler for `export:toPdf` currently: `ipcMain.handle('export:toPdf', async (_, options) => { ... })`.

Update to pass `coinIds` through after Zod validation:
```typescript
const { locale, coinIds } = validateIpc(PdfExportOptionsSchema, options);
return exportToPdf(targetPath, locale, coinIds);
```

#### `src/main/preload.ts`

```typescript
// Update signatures:
exportToZip: (options: { includeImages?: boolean; includeCsv?: boolean; coinIds?: number[] }) =>
  ipcRenderer.invoke('export:toZip', options),

exportToPdf: (locale: 'en' | 'es', coinIds?: number[]) =>
  ipcRenderer.invoke('export:toPdf', { locale, coinIds }),
```

#### `src/renderer/hooks/useExport.ts`

Extend `exportToPdf` and `exportToZip` to accept optional `coinIds?: number[]` and forward to `window.electronAPI`.

#### Cabinet wiring

```typescript
const exportSelectionToZip = useCallback((coinIds: number[]) => {
  exportToZip({ coinIds });
}, [exportToZip]);

const exportSelectionToPdf = useCallback((coinIds: number[]) => {
  exportToPdf(language, coinIds);
}, [exportToPdf, language]);
```

### 2E — i18n Keys

| Key | English | Spanish |
|-----|---------|---------|
| `cabinet.selectionToolbar` | `"Selection actions"` | `"Acciones de selección"` |
| `cabinet.clearSelection` | `"Clear selection"` | `"Limpiar selección"` |
| `cabinet.bulkEdit` | `"Edit field"` | `"Editar campo"` |
| `cabinet.bulkDelete` | `"Delete selection"` | `"Eliminar selección"` |
| `cabinet.exportSelection` | `"Export selection"` | `"Exportar selección"` |
| `cabinet.exportArchive` | (already exists) | (already exists) |
| `cabinet.generateCatalog` | (already exists) | (already exists) |
| `cabinet.bulkEditTitle` | `"Edit field for {{count}} coins"` | `"Editar campo en {{count}} monedas"` |
| `cabinet.bulkEditConfirm` | `"Apply to {{count}} coins"` | `"Aplicar a {{count}} monedas"` |
| `cabinet.bulkEditSuccess` | `"Updated {{count}} coins"` | `"{{count}} monedas actualizadas"` |
| `cabinet.bulkDeleteSuccess` | `"Deleted {{count}} coins"` | `"{{count}} monedas eliminadas"` |

---

## 3. Verification Strategy (Quality Oversight)

### Test Cases

**`SelectionToolbar.test.tsx`** — `src/renderer/components/__tests__/SelectionToolbar.test.tsx`
- TC-ST-01: Renders count label with correct number.
- TC-ST-02: `onClearSelection` called when ✕ button clicked.
- TC-ST-03: `onBulkEdit` called when "Edit field" clicked.
- TC-ST-04: `onBulkDelete` called when "Delete" clicked.
- TC-ST-05: Export dropdown opens on click; `onExportZip` and `onExportPdf` wired correctly.

**`BulkEditModal.test.tsx`** — `src/renderer/components/__tests__/BulkEditModal.test.tsx`
- TC-BEM-01: Confirm button disabled until field AND value are selected.
- TC-BEM-02: `updateCoin` called once per selected ID with correct field+value.
- TC-BEM-03: On complete, `onComplete` is called and modal closes.
- TC-BEM-04: If one `updateCoin` fails, remaining IDs are still processed; error count shown in toast.
- TC-BEM-05: `AutocompleteField` is rendered for the selected field (mocked `getVocab` returns test values).

**`useExport` additions:**
- TC-EXP-ZIP-SCOPE: `exportToZip` forwards `coinIds` through `window.electronAPI.exportToZip`.
- TC-EXP-PDF-SCOPE: `exportToPdf` forwards `coinIds` through `window.electronAPI.exportToPdf`.

**`zip.ts` unit test additions** (if unit-tested):
- TC-ZIP-SCOPE: When `coinIds = [1, 3]`, only coins with those ids appear in the generated CSV.

**`validation.ts` branch additions:**
- TC-VAL-ZIP-COINIDS: `ExportOptionsSchema` accepts valid `coinIds` array.
- TC-VAL-ZIP-COINIDS-MAX: Rejects array with more than 5000 elements.
- TC-VAL-PDF-COINIDS: `PdfExportOptionsSchema` accepts valid `coinIds` array.

- **Colocation:** All test files colocated with source.
- **Mocking:** `window.electronAPI.updateCoin`, `deleteCoin`, `exportToZip`, `exportToPdf` mocked per `setupTests.ts` pattern.
- **Async:** `waitFor` for all `updateCoin` / `deleteCoin` loop completions.
- **Coverage:** `validation.ts` branches for `coinIds` must reach 100% branch coverage.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Pending

### Audit Findings:
- **System Integrity:** The scoped export extension (`coinIds`) is additive — existing callers that pass no `coinIds` continue to work unchanged (optional field defaults to undefined → full collection exported). Backward-compatible.
- **Abstraction:** Bulk edit loops through `window.electronAPI.updateCoin` — correct. No raw DB access from the renderer. Each update is independently Zod-validated in the Main process. No new IPC handlers needed for bulk edit; the existing `db:updateCoin` is the primitive.
- **Dependency on CAB-A:** `SelectionToolbar` consumes `selection.count` and `selection.selected` from the `useSelection` hook delivered in CAB-A. This blueprint must not be implemented before CAB-A is Completed.

### Review Notes & Suggestions:
- The `max(5000)` guard on `coinIds` in the Zod schema is a pragmatic upper bound. A collection of 5000 coins would be very large for Patina; this prevents an array-overflow injection while permitting any realistic collection size.
- Sequential `updateCoin` calls (not `Promise.all`) are correct here — the SQLite WAL journal serialises writes anyway, and sequential calls give cleaner error attribution per coin.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Completed — Re-Verified 2026-04-07

### Audit Findings:

**contextIsolation / sandbox — No regression.**
`src/main/index.ts` sets `contextIsolation: true` and `sandbox: true` on the single `BrowserWindow`. CAB-B adds no new window, no new `webPreferences` block, and no change to the permission request handler. These guarantees are fully preserved.

**IPC surface — Minimal and correct.**
CAB-B adds zero new IPC channel names. Bulk edit reuses `db:updateCoin`; bulk delete reuses `db:deleteCoin`; scoped export reuses `export:toZip` and `export:toPdf`. The preload bridge receives two signature changes (adding an optional `coinIds?: number[]` parameter) but exposes no new channel. IPC surface growth is nil.

**The Filter for bulk edit — Verified solid.**
Each `window.electronAPI.updateCoin(id, { [field]: value })` call enters the Main process through the existing `db:updateCoin` handler. `db.ts` runs two independent guards: `validate(idSchema, id)` — `z.number().int().positive()` — rejects non-integer, zero, or negative IDs; then `validate(NewCoinSchema.partial(), coin)` — which inherits `.strict()` from `NewCoinSchema`, so unknown keys are rejected at parse time. A renderer that injects an unexpected key (e.g. `{ id: 999, title: "..." }`) will receive a validation error before any SQL runs. No new validation path is needed and none is bypassed.

**The Filter for bulk delete — Verified solid.**
`db:deleteCoin` calls `validate(idSchema, id)` in `db.ts` before executing SQL. The renderer can only pass what it received from `db:getCoins`; IDs are positive integers. The `deleteCoin` DB method cleans up image files from disk within the same operation, so orphaned files are not a concern for bulk delete.

**`coinIds` array injection risk — Mitigated.**
The blueprint proposes `z.array(z.number().int().positive()).max(5000)` on both `ExportOptionsSchema` and `PdfExportOptionsSchema`. Each element is validated as a positive integer — no string coercion, no float, no negative value can pass. Both schemas keep `.strict()`, so injecting extra fields alongside `coinIds` is rejected. The `max(5000)` cap prevents a denial-of-service via an oversized array deserialized in the Main process. One nuance worth noting: the export handlers in `src/main/index.ts` pass `coinIds` to `exportToZip` / `exportToPdf` after Zod validation, and the implementation in `zip.ts` and `pdf.ts` filters coins using `coinIds.includes(c.id)` on the result of `dbService.getCoins()`. This means the renderer cannot cause a DB read of arbitrary rows — it can only narrow down what is already fetched from the DB for the authenticated user's own collection. There is no path by which a crafted `coinIds` value could access data outside the user's local SQLite.

**Path traversal — Not applicable.**
`coinIds` carries integer IDs, not filesystem paths. Image lookups in `zip.ts` and `pdf.ts` use `coin.id` to retrieve records from the DB, then resolve paths through the existing `imageRoot`-scoped joins. No new `path.join` call is introduced by CAB-B. The `patina-img://` protocol handler's `startsWith(imageRoot)` boundary check is unaffected.

**No new file protocol usage — Confirmed.**
CAB-B introduces no `file://` references, no new custom protocol handler, and no direct `fs` access from the renderer.

**`NewCoinSchema.partial()` strictness — Pre-existing gap to document.**
`db.ts` calls `NewCoinSchema.partial()` (not `.partial().strict()`). `NewCoinSchema` itself is defined with `.strict()`, but calling `.partial()` on a strict Zod object creates a new schema that may lose the `.strict()` modifier depending on the Zod minor version. In practice, Zod v3 propagates the unknown-keys policy through `.partial()`, so extra keys are still rejected. This is a pre-existing condition — not introduced by CAB-B — but implementors should add a targeted unit test (TC-VAL-PARTIAL-STRICT) during the CAB-B verification pass to confirm this does not regress if the Zod dependency is bumped.

### Review Notes & Suggestions:
1. **Verified: No new attack surface.** CAB-B's security posture is sound. The bulk operations are correct reuses of existing validated IPC channels. The `coinIds` Zod guard adequately prevents array-injection and oversized-payload attacks.
2. **Recommendation — `coinIds` server-side existence cross-check (nice-to-have, not blocking):** The export handlers could verify that each `coinIds` element maps to an existing coin before passing to the export functions. This would give a cleaner user-facing error if stale IDs are submitted (e.g. coins deleted between selection and export trigger). Not a security requirement — SQLite will silently return an empty filtered set for missing IDs — but it improves predictability and avoids silently generating an empty export archive.
3. **Recommendation — sequential bulk edit is correct for security as well as correctness:** Beyond the WAL serialisation argument in Section 2B, sequential calls also make it easier to attribute and surface per-ID validation rejections. `Promise.all` would obscure which ID caused a validation failure. The sequential pattern is endorsed from a security standpoint.
4. **Pre-existing item to track:** Add a branch coverage test confirming `NewCoinSchema.partial()` retains unknown-key rejection under the project's locked Zod version. Suggested test ID: `TC-VAL-PARTIAL-STRICT`. Include in the CAB-B verification pass.

### Verification Re-Audit (2026-04-07):
All 7 items verified against implemented code. Both export handlers call `validateIpc`/`validateExportOptions` with Zod schemas before passing `coinIds` downstream. `coinIds` filtering uses `.includes()` on the DB result set (never raw SQL WHERE on renderer input). No new IPC channel names introduced. Bulk edit calls `window.electronAPI.updateCoin` via the existing hook; bulk delete calls `deleteCoin` through `useCoins`. `TC-VAL-PARTIAL-STRICT` confirmed: `NewCoinSchema.partial()` retains unknown-key rejection under Zod v3. **Result: VERIFIED — no regressions.**

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Completed — Re-Verified 2026-04-07

### Audit Findings:

**IPC Mock Coverage**

All new IPC calls introduced by this blueprint (`updateCoin`, `deleteCoin`, `exportToZip`, `exportToPdf`) are already present in the global `window.electronAPI` mock in `src/renderer/setupTests.ts` (lines 47, 48, 55, 56). No additions to `setupTests.ts` are required for these calls. The Section 3 mocking note is correct and consistent with the established pattern.

One gap: `getVocab` is mocked with a default `mockResolvedValue([])` in `setupTests.ts` (line 57). TC-BEM-05 requires it to return test vocabulary values for the selected field. The test must explicitly override this default in a `beforeEach` or within the test body (e.g. `vi.mocked(window.electronAPI.getVocab).mockResolvedValue([...testValues])`). This per-test override pattern is consistent with the project standard of clearing mocks in `beforeEach` and setting per-test return values.

**TC-BEM-04: Partial Failure Branch Coverage**

TC-BEM-04 as written ("one `updateCoin` fails, remaining IDs still processed; error count shown in toast") is necessary but not sufficient for 100% branch coverage on the error path. The following sub-branches must each be exercised:

1. All calls succeed (zero errors) — covered by TC-BEM-02/TC-BEM-03.
2. One call rejects, others succeed — TC-BEM-04 covers this.
3. All calls reject — this branch (error count equals total count, e.g. "Updated 0 coins. 3 errors.") is not listed and must be added as **TC-BEM-04b**.

Without TC-BEM-04b, the "all-fail" toast message path and any conditional rendering keyed on `errorCount === selectedIds.length` will be uncovered, leaving the error-reporting branch below 100%.

**Async `waitFor` Requirements**

The blueprint correctly calls out `waitFor` for all `updateCoin`/`deleteCoin` loop completions. Three specific requirements to enforce in implementation:

- In `BulkEditModal.test.tsx`, after clicking "Apply to N coins", all assertions on mock call counts and toast text must be inside `await waitFor(...)` — not synchronous `expect` calls placed immediately after `fireEvent.click`.
- In `Cabinet.test.tsx` (bulk delete path), the `deleteCoin` calls are dispatched inside a loop; use `await waitFor(() => expect(window.electronAPI.deleteCoin).toHaveBeenCalledTimes(N))` before asserting `useCoins.refresh` was called.
- TC-BEM-05's `AutocompleteField` renders after an async `getVocab` call resolves. Use `await screen.findByRole(...)` (not `getByRole`) to locate the rendered field after vocab loads.

**i18n Parity — Section 2E Keys**

Cross-checking the ten new keys in Section 2E against the current locale files (`en.json` and `es.json`):

| Key | Present in `en.json` | Present in `es.json` |
|-----|----------------------|----------------------|
| `cabinet.selectionToolbar` | No | No |
| `cabinet.clearSelection` | No | No |
| `cabinet.bulkEdit` | No | No |
| `cabinet.bulkDelete` | No | No |
| `cabinet.exportSelection` | No | No |
| `cabinet.exportArchive` | Yes | Yes |
| `cabinet.generateCatalog` | Yes | Yes |
| `cabinet.bulkEditTitle` | No | No |
| `cabinet.bulkEditConfirm` | No | No |
| `cabinet.bulkEditSuccess` | No | No |
| `cabinet.bulkDeleteSuccess` | No | No |

The key `cabinet.confirmBulkDelete` (from Section 2C) is also missing from both locale files despite being listed in that section's i18n table. All eight absent keys (plus `cabinet.confirmBulkDelete`) must be added to both `en.json` and `es.json` before implementation ships. The project's `src/renderer/i18n/__tests__/translations.test.ts` enforces key parity between locales at test time — missing keys in either locale will cause that test suite to fail, providing a built-in gate.

**Export ▾ Dropdown — Keyboard Accessibility Gap**

TC-ST-05 verifies that the Export dropdown opens on click and that `onExportZip` / `onExportPdf` are wired correctly, but it does not cover keyboard accessibility for the dropdown. The `Export ▾` trigger must be reachable and operable via keyboard (Tab to focus, Enter/Space to open, ArrowDown to move to items, Enter to activate). Two additional test cases are required:

- **TC-ST-05a:** Export dropdown opens on `Enter` keydown when the trigger button is focused.
- **TC-ST-05b:** Each dropdown item (`Export Archive (ZIP)`, `Generate Catalog (PDF)`) is reachable via keyboard and fires the correct callback on `Enter`.

Without these, the `role="toolbar"` ARIA contract and the 44 px touch-target mandate are tested visually by the UI assessor but not by the test suite. Keyboard accessibility gaps in dropdowns are a frequent regression source.

**Coverage Targets Summary**

| File | Target | Adequacy |
|------|--------|----------|
| `SelectionToolbar.tsx` | 80% statement | Met by TC-ST-01 to TC-ST-05 plus TC-ST-05a/05b |
| `BulkEditModal.tsx` | 80% statement, 100% branch on error path | Requires TC-BEM-04b to close the all-fail branch |
| `useExport.ts` additions | 90% function | TC-EXP-ZIP-SCOPE and TC-EXP-PDF-SCOPE are sufficient |
| `validation.ts` coinIds branches | 100% branch | TC-VAL-ZIP-COINIDS, TC-VAL-ZIP-COINIDS-MAX, TC-VAL-PDF-COINIDS are sufficient; also cover `coinIds: undefined` (the omit path) explicitly |

### Review Notes & Suggestions:

1. **Add TC-BEM-04b** (all `updateCoin` calls reject) to `BulkEditModal.test.tsx` to close the all-fail toast branch. Without it, the `errorCount === selectedIds.length` conditional is dark.
2. **Add TC-ST-05a and TC-ST-05b** (keyboard navigation of the Export ▾ dropdown) to `SelectionToolbar.test.tsx`. These are load-bearing for the `role="toolbar"` + WCAG accessibility contract and cover the same keyboard paths flagged in Section 2A.
3. **TC-BEM-05 `getVocab` override is mandatory.** The global default of `mockResolvedValue([])` returns an empty vocabulary list; the test must override it explicitly per-test (e.g. `vi.mocked(window.electronAPI.getVocab).mockResolvedValue(['Gold', 'Silver'])`). Without this the `AutocompleteField` renders with no options and the assertion on value selection is vacuous.
4. **`validation.ts` coinIds tests must include the `undefined` path.** Each of TC-VAL-ZIP-COINIDS and TC-VAL-PDF-COINIDS should include a sub-case where `coinIds` is omitted, confirming the optional field parses without error. This is the backward-compatibility guarantee for existing callers and belongs in the 100%-branch sweep.
5. **`cabinet.confirmBulkDelete` is a missing locale key.** It is defined in Section 2C's i18n table but absent from both `en.json` and `es.json`. Add it alongside the Section 2E keys at implementation time; the translations parity test will enforce this gate.
6. **Call `clearVocabCache()` in `beforeEach`** within `BulkEditModal.test.tsx`. The `AutocompleteField` is a vocab-backed component; the vocab cache keyed on `"${field}:${locale}"` can produce stale cross-test hits if not cleared between tests. This is the mandatory pattern documented in `CLAUDE.md` for vocab-backed components.

### Verification Re-Audit (2026-04-07):
All 6 items verified. TC-ST-01–05 + TC-ST-05a/05b + aria tests present in `SelectionToolbar.test.tsx`. TC-BEM-01–05 + TC-BEM-04b present in `BulkEditModal.test.tsx`; `clearVocabCache()` in `beforeEach`; `getVocab` overridden per-test; `aria-disabled` used on Confirm button. TC-EXP-ZIP/PDF-SCOPE present in `useExport.test.ts`. TC-VAL-ZIP/PDF-COINIDS + undefined paths + TC-VAL-PARTIAL-STRICT present in `validation.test.ts`. All 11 i18n keys verified in both `en.json` and `es.json`. Test suite: 491 tests, 0 failures. **Result: VERIFIED — no gaps.**

---

## 7. UI Assessment (`curating-ui`)
**Status:** Completed — Re-Verified 2026-04-07

### Audit Findings:

#### 7.1 Sticky Positioning — z-index Conflict Risk
The blueprint specifies `position: sticky; top: 0; z-index: 10` for `.selection-toolbar`. The `z-index: 10` value is **insufficient**. The existing z-index landscape in `index.css` reveals:
- `z-index: 10` is already claimed by the `.btn-plate-icon-action--compact::after` tooltip (Scriptorium plate editor).
- `.tools-dropdown` and `.autocomplete-dropdown` both sit at `z-index: 200`.

A sticky toolbar at `z-index: 10` would render *beneath* the open `[Tools ▾]` dropdown, because that dropdown is an absolutely-positioned child of `.tools-menu` inside `.cabinet-toolbar` — the very element directly above the proposed toolbar insertion point. This creates a stacking bug: the open Tools panel would visually overlap the toolbar's right-side `[Export ▾]` trigger.

**Required fix:** Set `z-index: 20` on `.selection-toolbar` — above in-content decoration layers, below the `z-index: 200` floating dropdowns and `z-index: 900+` drawers/modals.

The sticky `top: 0` offset is otherwise architecturally sound. The scroll root is `.app-container` (natural document scroll; no inner vertical scroll container in the Cabinet layout). The `.cabinet-header` and `SearchBar` are not sticky themselves — they scroll away before the toolbar pins to the top edge, which is the intended behaviour. No existing vertical sticky element in the Cabinet layout uses `top: 0`, so there is no collision with established sticky peers. ✓

#### 7.2 Export Dropdown — Pattern Consistency
The blueprint proposes `[Export ▾]` as a right-side dropdown within `SelectionToolbar`. The established precedent is the `[Tools ▾]` dropdown in `.cabinet-toolbar`, implemented as `.btn-tools` + `.tools-dropdown` with `role="menu"` / `role="menuitem"` and a `mousedown`-outside dismiss handler via `useRef`.

**Required:** The `[Export ▾]` dropdown must replicate this pattern exactly:
- Trigger button: `.btn-tools` class (hairline border, `var(--font-mono)`, uppercase, `--accent-manuscript` on hover and `aria-expanded="true"`).
- Dropdown panel: `.tools-dropdown` class, `position: absolute; top: calc(100% + 4px)`, `z-index: 200`, `background: var(--bg-manuscript)`, `border: 1px solid var(--border-hairline)`.
- Items: `.tools-dropdown-item` class, `role="menuitem"`, hairline top border between items via `.tools-dropdown-item + .tools-dropdown-item`.
- Trigger attributes: `aria-expanded` and `aria-haspopup="menu"`.
- Dismiss: `mousedown`-outside listener on `document`, same pattern as `toolsOpen` in `Cabinet.tsx`.

One addition over the existing Tools dropdown: the panel should be **right-anchored** (`right: 0` instead of `left: 0`), because the trigger sits at the far right edge of the toolbar. A left-anchored dropdown from a right-edge element would overflow the content pane on narrower windows. No new CSS class is required — `.tools-dropdown` covers the panel; only the anchor direction differs.

#### 7.3 Delete Button Treatment — Wrong Colour, Wrong Class
The blueprint specifies using `--color-sienna` (`--accent-manuscript`, Burnt Sienna `#914E32`) as the accent on the Delete button in the toolbar.

**This is a style guide violation.** Per Manuscript Hybrid v3.3 § "Action Elements — Destructive Actions":
- `--accent-manuscript` is the *positive* action accent (CTA hover, active filter states, confirmed interactions). Placing it on a destructive control inverts its semantic signal and erodes design system coherence.
- The canonical class for permanent data removal is **`.btn-delete`**: the button rests in `var(--text-muted)` with a muted bottom border ("deferred disclosure"), transitioning to `var(--error-red)` only on hover. This prevents the destructive option from drawing the eye at rest, while making it immediately visible on deliberate approach.
- The rule is absolute: never use `--error-red` at rest state, and never use `--accent-manuscript` on a destructive action.

**Required fix:** Remove `--color-sienna` / `--accent-manuscript` from the Delete button spec. Apply `.btn-delete`. The `aria-describedby` pointing to a visually-hidden selection count is correct and must be retained — it satisfies the "not colour alone" accessibility requirement by pairing the hover-state colour signal with a textual description.

#### 7.4 `aria-live` on Count Label — Missing from Section 2A Spec
The original stub in this section correctly flagged the `aria-live` gap, but the technical spec in **Section 2A** never codifies the requirement. Without it, keyboard and screen reader users receive no feedback when their selection actions take effect.

**Required addition to Section 2A:** The count label element must carry `aria-live="polite"` and `aria-atomic="true"`:

```tsx
<span aria-live="polite" aria-atomic="true" className="selection-count">
  {t('cabinet.selectedCount', { count })}
</span>
```

`aria-live="polite"` queues the announcement without interrupting ongoing speech. `aria-atomic="true"` ensures the full string (e.g. "3 selected") is read as a unit rather than just the changed characters. Without `aria-atomic`, a change from "12 selected" to "3 selected" may be announced as only "3" — losing context.

A corresponding i18n key `cabinet.selectedCount` must be added to **Section 2E** and to both `en.json` and `es.json`. It is currently absent from the key table:

| Key | English | Spanish |
|-----|---------|---------|
| `cabinet.selectedCount` | `"{{count}} selected"` | `"{{count}} seleccionadas"` |

#### 7.5 BulkEditModal Two-Step Flow — Focus Management Gap
The field-select → value-entry pattern is well-established and the `AutocompleteField` reuse is sound. However, the blueprint does not specify focus management when the modal transitions between steps.

If the `AutocompleteField` replaces the `<select>` via conditional rendering, focus remains at the now-unmounted element's DOM position. Keyboard users are left stranded and must Tab through the full modal to reach the new input — a significant usability regression.

**Required:** When `selectedField` transitions from `null` to a value, focus must be programmatically moved to the `AutocompleteField` input:
```tsx
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (selectedField) inputRef.current?.focus();
}, [selectedField]);
```

Additionally: the Confirm button is correctly disabled until both field and value are provided. However, the button should use `aria-disabled="true"` in addition to (or instead of) the HTML `disabled` attribute. The HTML `disabled` attribute removes the element from the tab order entirely, preventing screen reader users from discovering the button and understanding why it is unavailable. `aria-disabled="true"` keeps the button focusable while communicating its unavailability; pair it with an `onClick` guard (`if (!selectedField || !value) return;`) to prevent activation.

### Review Notes & Suggestions:
1. **z-index:** Change `.selection-toolbar` from `z-index: 10` to `z-index: 20` in both the CSS specification and implementation.
2. **Delete button:** Replace `--color-sienna` / `--accent-manuscript` treatment with `.btn-delete`. No warm accent at rest on any destructive control — this is non-negotiable per Manuscript Hybrid v3.3.
3. **`aria-live`:** Add `aria-live="polite" aria-atomic="true"` to the count label in Section 2A. Add `cabinet.selectedCount` to the Section 2E i18n key table and to both locale files.
4. **Export dropdown:** Right-anchor the panel (`right: 0`); otherwise mirror `.btn-tools` / `.tools-dropdown` exactly. No new CSS class needed.
5. **BulkEditModal focus:** On step transition, move focus to the `AutocompleteField` via `useEffect` + `ref`. Use `aria-disabled` on the Confirm button to keep it focusable and describable in its inactive state.

### Verification Re-Audit (2026-04-07):
All 5 UI compliance points verified. `.selection-toolbar` is `z-index: 20` ✓. Delete button uses `.btn-delete` with `aria-describedby` ✓. Count label has `aria-live="polite" aria-atomic="true"` ✓. Export dropdown uses `.btn-tools` trigger with `aria-expanded`/`aria-haspopup="menu"`, `role="menu"` panel, `role="menuitem"` items, right-anchored via `style={{ right: 0, left: 'auto' }}` ✓. Confirm button uses `aria-disabled` (button remains focusable) ✓. Focus management corrected: `FieldValuePicker`'s fragile mount-time `document.querySelector` replaced with parent-coordinated `useEffect` in `BulkEditModal` watching `selectedField`, scoped via `modalRef`. **Result: VERIFIED — all issues resolved.**

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Completed — Re-Verified 2026-04-07

### Audit Findings:

#### Vocabulary field selection for bulk edit

The blueprint restricts bulk edit to six vocabulary fields: `metal`, `grade`, `era`, `denomination`, `mint`, `die_axis`. The choice is well-founded numismatically — these are the fields collectors standardise across groups of coins after a vocabulary normalisation event (e.g. correcting "BR" → "Bronze" across 40 coins, or reassigning an era after a re-attribution).

However, **`rarity` is a vocabulary field in `ALLOWED_VOCAB_FIELDS` and is currently excluded without justification.** The `rarity` field uses the established CNR/Reka scale (C, S, R, RR, RRR, RRRR) and is a legitimate candidate for bulk correction — for instance, after a cataloger applies a new population report and wants to downgrade a batch from R to RR. Its omission from the bulk-edit list appears to be an oversight rather than a deliberate decision. **Recommendation: add `rarity` to the `BulkEditModal` field selector.**

The exclusion of `title`, `story`, `catalog_ref`, and `purchase_price` is correct. `title` is a free-text curator label — bulk-overwriting it would silently destroy individual coin identifiers with no recovery path. `story` is provenance narrative, inherently per-specimen. `catalog_ref` is the standard reference number (RIC, RPC, Crawford, etc.) — assigning the same reference to multiple coins is numismatically invalid except in extremely narrow cases (striking varieties from identical dies) that do not justify the risk of a bulk operation. `purchase_price` and `purchase_date` are acquisition records; bulk-setting a price would corrupt financial documentation.

#### Die axis terminology

`die_axis` as a field name (snake_case identifier) is correct. The human-readable label used in the UI should render as **"Die axis"** (two words, no underscore, sentence case) in English, or **"Eje de cuño"** in Spanish. This matches the terminology used by the British Museum, Numista, and PCGS. Some American grading services use "coin alignment" (↑↑, 12h) and "medal alignment" (↑↓, 6h) as shorthand, but the clock-position notation already seeded in the vocabulary (`6h`, `12h`, etc.) is the numismatic industry standard and is the correct representation for a historically-focused app covering ancient through modern issues.

The seed values in `db.ts` — clock positions `1h` through `12h` — are appropriate for ancient and medieval material where die axis varies freely. For a future enhancement: consider adding the special values `coin alignment` (↑↑) and `medal alignment` (↑↓) as canonical options alongside the clock notation, since post-1700 material is typically described with these two categories. This is not a blocker for CAB-B.

#### Field-at-a-time modal pattern

The modal pattern is correct for this application. Professional numismatic catalogers using tools such as CoinManage and US Coin use exactly this approach — select coins, pick one field, set one value, confirm. The research in `2026-04-03-cabinet-list-bulk-import-research.md` (Q2) corroborates this across three tools. Inline spreadsheet editing would require a fundamentally different validation pipeline and introduces accidental-edit risk that is inappropriate for archival records.

The two-step flow (field selection → value entry) is the right sequencing: it forces the cataloger to commit to a field before seeing the autocomplete, preventing the common error of entering a value before noticing the wrong field was selected.

#### Open Question #1 — Should `title` be included in bulk edit?

**No, and the exclusion should be made permanent, not provisional.** `title` in Patina is the curator's per-coin label — the primary identifier the collector uses to locate and distinguish specimens. Bulk-overwriting titles would collapse distinct coins into identical records, breaking findability and the archival uniqueness principle. Unlike vocabulary fields, `title` has no shared controlled vocabulary to normalise against. The research shows collectors use the gallery to browse by title; a bulk-title operation would only ever be used to mass-rename, a destructive act with no numismatic use case. Recommendation: document the exclusion as a design decision in the blueprint, not as a "revisit later" item.

### Verification Re-Audit (2026-04-07):
`BULK_EDIT_FIELDS` contains exactly `['metal', 'grade', 'era', 'denomination', 'mint', 'die_axis', 'rarity']` — all seven approved fields, no per-specimen fields included ✓. Field labels use `t('ledger.X')` with `die_axis` correctly mapped to `dieAxis` ✓. **Fix applied:** `ledger.metal` and `ledger.mint` keys were absent from both locale files (the auditor identified the gap correctly — `en.json` had `"material"` not `"metal"`, and `"mintedAt"` not `"mint"`). Keys `"metal": "Metal"` and `"mint": "Mint"` / `"Ceca"` added to both locale files. The BulkEditModal option template simplified to `t('ledger.${f === 'die_axis' ? 'dieAxis' : f}')` now that direct keys exist. **Result: VERIFIED — i18n gap resolved.**

---

## 9. User Consultation & Decisions

### Open Questions:
1. **Bulk edit field scope:** This blueprint restricts bulk edit to the six vocabulary fields. Should `title` be included? Including it risks mass-renaming errors. Recommendation: exclude for now; revisit in a future patch.
2. **Partial failure UX:** If 3 of 12 bulk edit calls fail, should Patina show which coins failed? Current proposal: summary toast with error count. More detailed error reporting (list of failed coin titles) is desirable but adds complexity.
3. **Scoped PDF locale:** The scoped PDF uses `language` from `useLanguage()`. Confirm this is the correct source (same as the full-collection PDF).

### Final Decisions:
1. **`rarity` added to bulk edit fields.** The field list is extended from six to seven: `metal`, `grade`, `era`, `denomination`, `mint`, `die_axis`, `rarity`. Rationale: `rarity` is a full vocabulary field in `ALLOWED_VOCAB_FIELDS` (CNR scale) and batch-correcting rarity after a population report is a legitimate cataloger use case. Section 2B updated accordingly.
2. **`title` exclusion is a permanent design decision.** Bulk-overwriting titles destroys per-coin identity with no valid numismatic use case. This is not provisional; it will not be revisited in a future patch.
3. **Partial failure UX: summary toast only.** "Updated N coins. E errors." is the v1 behaviour. Per-coin error reporting is deferred as a follow-on; the added complexity is not justified for the initial release.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-04-07
**Outcome:** Completed. All post-ship UX rounds resolved; 491 tests pass; `tsc --noEmit` clean.

### Summary of Work
- `SelectionToolbar` component — sticky contextual action bar with export dropdown, keyboard-accessible, `aria-live` count label, `.btn-delete` for destructive action.
- `BulkEditModal` component — two-step field-at-a-time modal using existing `AutocompleteField`; sequential `updateCoin` loop with per-call error tracking; `aria-disabled` on Confirm preserves focus.
- Bulk delete wired directly in `Cabinet.tsx` with existing confirmation modal pattern.
- `ExportOptionsSchema` and `PdfExportOptionsSchema` extended with `coinIds?: number[]` (max 5000 guard).
- `exportToZip` and `exportToPdf` in `src/main/export/` filter by `coinIds` when provided.
- `preload.ts` and `electron.d.ts` signatures updated; `useExport` hook extended.
- All i18n keys (including `cabinet.selectedCount` from UI audit) added to `en.json` and `es.json`.
- CSS: `z-index: 20` on `.selection-toolbar`; export dropdown right-anchored; `.btn-delete` on Delete button.
- Tests: 11 new cases covering TC-BEM-01–05 + TC-BEM-04b, TC-ST-01–05 + TC-ST-05a/05b, TC-EXP-ZIP/PDF-SCOPE, TC-VAL-ZIP/PDF-COINIDS, TC-VAL-PARTIAL-STRICT.

### Pain Points
- `AutocompleteField` calls `onChange` only on option *selection* (mousedown), not on input change. This was not obvious from reading the component API. Test authors must use `findByRole('option')` + `fireEvent.mouseDown` rather than `fireEvent.change` + `fireEvent.click`.
- **Modal class mismatch (post-ship bug):** Both `BulkEditModal` and the bulk-delete confirmation in `Cabinet.tsx` were implemented using `.modal-backdrop` / `.modal` CSS classes that do not exist in the stylesheet. The established project pattern is `.modal-overlay` (full-screen fixed backdrop) wrapping `.modal-content` (with `e.stopPropagation()`), as used in `CoinDetail` and `Scriptorium`. This caused both modals to render unstyled — no overlay, no centering — making the operations appear broken at runtime. Fixed post-verification by refactoring both to the correct class structure. **For all future modals: always use `.modal-overlay` > `.modal-content`; never introduce new modal class names without a corresponding CSS definition.**
- **Missing `refresh()` in bulk edit completion (post-ship bug):** `BulkEditModal` calls `window.electronAPI.updateCoin` directly rather than through `useCoins.updateCoin`, so the internal `fetchCoins()` call never fired. The `onComplete` callback in `Cabinet` did not call `refresh()`, leaving the coin list stale after a successful bulk edit. Fixed by adding `refresh()` to the `onComplete` handler. **For any future component that calls `window.electronAPI` write methods directly (bypassing a hook): the caller is responsible for triggering a refresh.**

### Post-Ship UX Fixes — Round 1 (applied 2026-04-07)
Three post-ship issues were resolved. 488 tests passed, `tsc --noEmit` clean.

1. **SelectionToolbar → single `[Actions ▾]` dropdown.** Removed the three-zone layout. Left zone now holds only count label + Clear button. Right zone holds a single `[Actions ▾]` dropdown (`.btn-tools` trigger, right-anchored `.tools-dropdown` panel, `role="menu"`) containing: Edit Field, Delete (`.tools-dropdown-item--danger`), Export Archive, Generate Catalog. `.selection-toolbar` CSS gains `justify-content: space-between`; `.toolbar-actions-center` block removed; `.tools-dropdown-item--danger` class added (muted at rest, `var(--error-red)` on hover). `cabinet.actions` i18n key added to both locale files. SelectionToolbar tests updated (TC-ST-03, TC-ST-04, TC-ST-05, TC-ST-05a, TC-ST-05b) to open the Actions dropdown before asserting on items.

2. **Sort column `⇅` hint.** `renderSortableHeader` in `CoinListView.tsx` now renders a `<span class="coin-list-sort-inactive" aria-hidden="true"> ⇅</span>` for every sortable column that is not the active sort column. `.coin-list-sort-inactive { color: var(--text-muted); opacity: 0.45; }` added to CSS. Existing CoinListView tests unaffected (glyph is `aria-hidden`).

3. **Sidebar toggle moved to cabinet toolbar** *(reverted in Round 2 — see below).*

### Post-Ship UX Fixes — Round 2 (applied 2026-04-07)
Three further issues were identified and resolved. 491 tests pass, `tsc --noEmit` clean.

1. **BulkEditModal field `<select>` styling.** The `className="form-input"` used on the `<select>` had no CSS definition, causing the browser's default amber focus outline. Replaced with a new `.modal-select` class: `appearance: none`, bottom-border only (dashed, solidifies on focus), custom chevron SVG, `font-family: var(--font-mono)`, `outline: none`. Matches the project's input aesthetic.

2. **SelectionToolbar always visible in list view.** Added `disabled?: boolean` prop to `SelectionToolbar`. When `disabled`, the Actions trigger is `disabled`/`aria-disabled`, the dropdown cannot open, and the count/clear left zone is hidden. In `Cabinet.tsx`, the render condition changed to `(viewMode === 'list' || selectionCount > 0)` — the toolbar always renders in list view (with `disabled={selectionCount === 0}`), and only renders in grid view when something is selected (existing behaviour).

3. **Sidebar toggle change reverted.** Moving the toggle button to the cabinet toolbar produced a layout that looked wrong. The change was fully reverted: toggle button restored to `PatinaSidebar`, `onToggle` prop restored to `PatinaSidebarProps`, Cabinet toolbar restored to its previous state, and TC-PSB-COL-01/02/03 restored in PatinaSidebar tests. The sidebar toggle affordance will be revisited in a dedicated future blueprint.

### Post-Ship UX Fixes — Round 3 (applied 2026-04-07)
Two further issues identified and resolved. 491 tests pass, `tsc --noEmit` clean.

1. **BulkEditModal field label corrected.** The `<select>` label was using `t('ledger.designation')` — the coin title field label — which rendered as "Designación" / "Designation". This was semantically wrong: the label is asking the user to choose a *field to edit*, not a coin designation. Replaced with a new i18n key `cabinet.bulkEditFieldLabel` → "Field name" / "Nombre del campo". Added to both `en.json` and `es.json`.

2. **SelectionToolbar disabled state affordance.** When no coins are selected in list view (`disabled=true`), the count label and Clear button were hidden entirely (`!disabled && (...)`). This was confusing — users expect to see "0 seleccionadas" as confirmation of the empty state, and the "Limpiar selección" button should be visible but obviously inactive. Fixed: count label and Clear button are now always rendered; when `disabled`, the Clear button receives `disabled` + `aria-disabled="true"` attributes. Added explicit disabled styles to CSS: `.btn-ghost:disabled` and `.btn-tools:disabled` both set `opacity: 0.35; cursor: default; pointer-events: none`, giving a clear visual hint that the controls are inactive without removing them from the layout.

### Open Issues (under discussion with user)
- Sidebar filter toggle UX still needs a proper solution — to be addressed in a future blueprint.

### Things to Consider
- **Core Doc Revision:** `docs/reference/ipc_api.md` updated with `coinIds` parameter on `export:toZip` and `export:toPdf` ✓. `AGENTS.md` updated with Bulk Write Pattern and Scoped Export Pattern notes ✓.
