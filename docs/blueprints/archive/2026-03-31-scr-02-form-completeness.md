# Implementation Blueprint: SCR-02 · Form Completeness & Editing Integrity

**Date:** 2026-03-31
**Status:** Completed
**Reference:** `docs/audits/2026-03-31-scriptorium-audit.md` — items F-03, F-04, F-05, L-02, L-03, L-04, L-06, V-01
**Depends on:** SCR-01 (must be shipped first — establishes the required-indicator pattern)

---

## 1. Objective

Harden the Scriptorium's editing experience and improve field-level data quality. This sprint covers eight improvements across two categories, **plus three follow-up items carried over from SCR-01 Section 11**:

**Editing Integrity** — Prevent data loss when editing existing records and clarify draft-related UI state:
- F-03: "Draft Preserved" label misleads users in edit mode
- F-04: No unsaved-changes guard when navigating away during an edit
- F-05: `clearDraft` not exposed in UI for add mode

**Form Field Quality** — Improve the data model coherence and input correctness of the LedgerForm:
- L-02: `year_display` and `year_numeric` are split across unrelated form zones
- L-03: `provenance` constrained to a single-line input
- L-04: Metrics grid orphans its 8th item in a third row
- L-06: `purchase_date` accepts free text; no ISO format enforcement
- V-01: Visibility preferences are not reflected in the form — low-priority fields clutter the editing surface

**SCR-01 Backlog** — Cleanup and correctness items identified during SCR-01 Section 11 re-audits:
- C-01: Dead `sidebar.era.*` locale keys (`ancient`, `medieval`, `modern`) no longer referenced after ERAS constant removal
- C-02: Sidebar filter `aria-label` strings hardcoded in English — not routed through `t()`
- C-03: Delete confirmation button in `CoinDetail` uses `btn-solid`; `btn-delete` (error-red hover) is semantically appropriate for a final destructive action

| Audit ID | Severity | Description |
|----------|----------|-------------|
| F-03 | 🟡 Medium | "Draft Preserved" shown in edit mode (misleading) |
| F-04 | 🟠 High | No unsaved-changes guard on back-navigation (edit mode) |
| F-05 | 🟡 Medium | `clearDraft` not exposed in UI |
| L-02 | 🟡 Medium | `year_display`/`year_numeric` split across form zones |
| L-03 | 🟡 Medium | `provenance` is single-line; insufficient for chains |
| L-04 | 🟡 Medium | Metrics grid 8-item orphan layout |
| L-06 | 🟡 Medium | `purchase_date` accepts unvalidated free text |
| V-01 | 🟡 Medium | Visibility-hidden fields clutter the form |
| C-01 | 🟢 Low | Dead `sidebar.era.*` i18n keys — locale maintenance debt |
| C-02 | 🟡 Medium | Sidebar filter aria-labels hardcoded EN — a11y/i18n defect |
| C-03 | 🟡 Medium | `btn-solid` on delete confirmation — swap to `btn-delete` |

**Out of sprint scope (own blueprint):** Era vocabulary normalization — adding `era` to `ALLOWED_VOCAB_FIELDS` and the autocomplete system to prevent case-variant drift across entries. Identified in SCR-01 §11 numismatic re-audit; warrants a dedicated `SCR-03` blueprint before implementation.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** The unsaved-changes modal re-uses the existing `.modal-overlay` pattern from `CoinDetail`. No new modal chrome. The "Hidden Fields" accordion is a quiet disclosure — collapsed by default, consistent with the ledger's high-density but uncluttered aesthetic.
- [x] **Privacy First:** No external resources. Date validation is native browser (`type="date"`). Visibility preferences are read from `FieldVisibilityContext` — already local.
- [x] **Single-Click Rule:** The "Discard Draft" action is one click from the header. The "Hidden Fields" accordion is one click to expand. No new navigation routes.

---

## 2. Technical Strategy

### 2.1 F-03 — Conditional draft-status label

**File:** `src/renderer/components/Scriptorium.tsx`

The `isEditing` state is derivable from the presence of `id` param (or `!!coin`). Conditionally render draft status:

```tsx
{!id && (
  <span className="draft-status">
    {isSaving ? t('scriptorium.indexing') : t('scriptorium.draftPreserved')}
  </span>
)}
{id && !isSaving && (
  <span className="draft-status">{t('scriptorium.editingRecord')}</span>
)}
{id && isSaving && (
  <span className="draft-status">{t('scriptorium.indexing')}</span>
)}
```

**i18n addition** (`en.json` / `es.json` — `scriptorium` section):
```json
"editingRecord": "Editing Record"
```

---

### 2.2 F-04 — Unsaved-changes guard (edit mode)

#### 2.2.1 `useCoinForm` — `isDirty` flag

**File:** `src/renderer/hooks/useCoinForm.ts`

Add a derived `isDirty` boolean. Compare current `formData` (excluding `images`) to the `initialCoin` snapshot:

```typescript
const isDirty = useMemo(() => {
  if (!initialCoin) return false; // add mode uses draft auto-save
  const { id, created_at, ...initial } = initialCoin;
  const { images: _images, ...current } = formData;
  return JSON.stringify(current) !== JSON.stringify(initial);
}, [formData, initialCoin]);
```

Export `isDirty` from the hook return value.

**Note:** `JSON.stringify` comparison is acceptable here because form values are scalar primitives (strings, numbers, null). No deep object nesting in `NewCoin`.

#### 2.2.2 `Scriptorium.tsx` — Guard on back-navigation

Destructure `isDirty` from `useCoinForm`. Add local state `showLeaveConfirm`. Replace `navigate(-1)` on the back button:

```tsx
const handleClose = () => {
  if (isDirty) {
    setShowLeaveConfirm(true);
  } else {
    navigate(-1);
  }
};
```

Render the confirmation modal (re-using `.modal-overlay` / `.modal-content` / `.modal-actions` from `CoinDetail`):

```tsx
{showLeaveConfirm && (
  <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h2>{t('scriptorium.leaveConfirm.title')}</h2>
      <p>{t('scriptorium.leaveConfirm.message')}</p>
      <div className="modal-actions">
        <button className="btn-minimal" onClick={() => setShowLeaveConfirm(false)}>
          {t('scriptorium.leaveConfirm.cancel')}
        </button>
        <button className="btn-delete" onClick={() => navigate(-1)}>
          {t('scriptorium.leaveConfirm.discard')}
        </button>
      </div>
    </div>
  </div>
)}
```

**i18n addition** (`en.json` / `es.json`):
```json
"leaveConfirm": {
  "title": "Unsaved Changes",
  "message": "Your changes to this record have not been saved. Leave without indexing?",
  "cancel": "Continue Editing",
  "discard": "Discard Changes"
}
```

---

### 2.3 F-05 — "Discard Draft" action

**File:** `src/renderer/components/Scriptorium.tsx`

Destructure `clearDraft` from `useCoinForm`. Add a `showDiscardConfirm` local state. In add mode, when `formData` differs from the empty default (any field is populated), show a "Discard Draft" secondary button in the header-actions:

```tsx
const isFormPopulated = Object.entries(formData).some(([k, v]) =>
  k !== 'images' && v !== '' && v !== null && v !== undefined
);

{!id && isFormPopulated && (
  <button className="btn-ghost" onClick={() => setShowDiscardConfirm(true)}>
    {t('scriptorium.discardDraft')}
  </button>
)}
```

The confirmation modal follows the same pattern as F-04 (re-use `.modal-overlay`):
```json
"discardDraft": "Discard Draft",
"discardConfirm": {
  "title": "Discard Draft",
  "message": "This will permanently clear the current draft. This cannot be undone.",
  "cancel": "Keep Draft",
  "confirm": "Discard"
}
```

On confirm: call `clearDraft()`.

**CSS addition** (`src/renderer/styles/index.css`):
```css
.btn-ghost {
  background: none;
  border: 1px solid var(--border-hairline);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-ghost:hover {
  border-color: var(--text-ink);
  color: var(--text-ink);
}
```

---

### 2.4 L-02 — Pair `year_display` and `year_numeric` in the subtitle-stack

**File:** `src/renderer/components/LedgerForm.tsx`

Remove `year_numeric` from the `.metrics-grid` entirely. In the `.subtitle-stack`, replace the current single `year_display` row with a paired two-column inline group within the existing label/value grid:

```
[DATE label]  [year_display input]
[YEAR CE label] [year_numeric input]
```

These two rows sit adjacent in the subtitle-stack, making the display ↔ sortable relationship visually obvious. The `year_numeric` input uses `input-sub` styling (matching other subtitle-stack inputs) and `type="number"`. The two rows share a subtle visual connector — a thin left-border accent on the `year_numeric` label (`border-left: 2px solid var(--border-hairline); padding-left: 0.5rem`).

This removes `year_numeric` from the metrics grid, reducing it to 7 items — see L-04.

---

### 2.5 L-03 — Convert `provenance` to textarea

**File:** `src/renderer/components/LedgerForm.tsx`

Replace the `<input type="text" className="input-metric provenance-input">` with:

```tsx
<textarea
  className="input-block"
  placeholder={t('ledger.placeholders.provenance')}
  value={formData.provenance || ''}
  onChange={(e) => updateField('provenance', e.target.value)}
/>
```

Remove the `provenance-input` CSS class from the file (it added no documented styles — confirm via grep). The `input-block` style already includes `resize: vertical` and appropriate padding for multi-line provenance chains.

---

### 2.6 L-04 — Metrics grid layout after `year_numeric` removal

With `year_numeric` removed (moved to subtitle-stack per L-02), the metrics grid has 7 items:
Weight · Diameter · Die Axis · Material · Fineness · Grade · Rarity

**On desktop (3-col `repeat(3,1fr)`):** 3/3/1 layout — Rarity sits alone in row 3.

Recommended fix: Change grid on desktop to `repeat(2, 1fr)` for the `.metrics-grid`. This produces a 4-row 2-col layout:

```
Weight       | Diameter
Die Axis     | Material
Fineness     | Grade
Rarity       | (empty)
```

Rarity in the bottom-left of a 2-col layout is less awkward than a lone item in 3-col. Alternatively, re-sequence so Rarity pairs with Grade (the most related field) at row 3:

```
Weight       | Diameter
Die Axis     | Material
Grade        | Rarity
Fineness     | (empty)
```

**Decision required:** Choose re-sequence option. See Section 9.

**CSS change** (`src/renderer/styles/index.css`):
```css
/* Remove or override the .metrics-grid repeat(3,1fr) default to repeat(2,1fr) */
.metrics-grid {
  grid-template-columns: repeat(2, 1fr);
}
```

This aligns with the existing `@media (max-width: 1200px)` breakpoint rule that already sets 2-col. The desktop and 1200–1000px ranges can now share the same layout.

---

### 2.7 L-06 — `purchase_date` ISO enforcement

**File:** `src/renderer/components/LedgerForm.tsx`

Change the `purchase_date` input:
```tsx
<input
  type="date"
  className="input-metric"
  value={formData.purchase_date || ''}
  onChange={(e) => updateField('purchase_date', e.target.value || null)}
/>
```

Remove the now-redundant `placeholder` (native date pickers show their own format hint). The stored value will always be `""` or `"YYYY-MM-DD"`.

**CSS addition** (`src/renderer/styles/index.css`):
```css
input[type="date"].input-metric {
  -webkit-appearance: none;
  color-scheme: light;
}
input[type="date"].input-metric::-webkit-calendar-picker-indicator {
  opacity: 0.4;
  cursor: pointer;
}
```

This ensures the native date picker icon inherits the manuscript aesthetic rather than the browser default.

---

### 2.8 V-01 — "Hidden Fields" accordion for visibility-off fields

**File:** `src/renderer/components/LedgerForm.tsx`

Import `useFieldVisibility` from `FieldVisibilityContext`. Determine which metric fields are visibility-off. Group them into a collapsible `<details>` element beneath the main metrics-grid:

```tsx
const { isVisible } = useFieldVisibility();

const hiddenMetrics = [
  { key: 'die_axis', visKey: 'ledger.die_axis', ... },
  { key: 'fineness', visKey: 'ledger.fineness', ... },
].filter(f => !isVisible(f.visKey));

{hiddenMetrics.length > 0 && (
  <details className="hidden-fields-accordion">
    <summary className="hidden-fields-toggle">
      {t('ledger.hiddenFields', { count: hiddenMetrics.length })}
    </summary>
    <div className="metrics-grid hidden-fields-grid">
      {/* render metric-item rows for each hidden field */}
    </div>
  </details>
)}
```

Apply same treatment to visibility-off numismatic sections (`edge_desc`, `provenance`, `acquisition` footer).

**Key constraint:** Fields in the accordion are fully editable — this is a cosmetic grouping only. No field is suppressed from the form entirely. The accordion state is **not** persisted; it defaults to closed on every page load.

**CSS additions:**
```css
.hidden-fields-accordion {
  margin-top: -1rem;
  margin-bottom: 2.5rem;
}
.hidden-fields-toggle {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  cursor: pointer;
  list-style: none;
  padding: 0.5rem 0;
  border-top: 1px dashed var(--border-hairline);
}
.hidden-fields-toggle::marker,
.hidden-fields-toggle::-webkit-details-marker { display: none; }
.hidden-fields-toggle::before {
  content: '▸ ';
  font-size: 0.6rem;
}
details[open] .hidden-fields-toggle::before {
  content: '▾ ';
}
```

**i18n addition** (`en.json` / `es.json`):
```json
"hiddenFields": "{{count}} hidden field(s) — click to expand"
```

### 2.9 C-01 — Remove dead `sidebar.era.*` locale keys

**Files:** `src/renderer/i18n/locales/en.json`, `src/renderer/i18n/locales/es.json`

The keys `sidebar.era.ancient`, `sidebar.era.medieval`, and `sidebar.era.modern` were rendered by the static `ERAS` constant in `PatinaSidebar.tsx`, which was removed in SCR-01 B-04. No remaining code references these keys. Remove the entire `sidebar.era` sub-object from both locale files.

```json
// Remove from both en.json and es.json — sidebar section:
"era": {
  "ancient": "...",
  "medieval": "...",
  "modern": "..."
}
```

**Verification:** Run `npm test` — the `translations.test.ts` i18n parity test will enforce that both locales remain in sync after removal.

---

### 2.10 C-02 — Translate sidebar filter aria-labels

**File:** `src/renderer/components/PatinaSidebar.tsx`

Three `renderOverflowGroup` call-sites use hardcoded English template literals for `ariaLabel`:
- Era: `` `Filter by ${v} era` ``
- Metal: `` `Filter by ${v} metal` ``
- Grade: `` `Filter by grade ${v}` ``

Replace with `t()` calls using new parameterised keys:

```tsx
// era call-site:
v => t('sidebar.ariaFilter.era', { value: v })

// metal call-site:
v => t('sidebar.ariaFilter.metal', { value: v })

// grade call-site:
v => t('sidebar.ariaFilter.grade', { value: v })
```

**i18n addition** (`en.json` / `es.json` — `sidebar` section):
```json
// en.json
"ariaFilter": {
  "era":   "Filter by {{value}} era",
  "metal": "Filter by {{value}} metal",
  "grade": "Filter by grade {{value}}"
}

// es.json
"ariaFilter": {
  "era":   "Filtrar por época {{value}}",
  "metal": "Filtrar por metal {{value}}",
  "grade": "Filtrar por grado {{value}}"
}
```

---

### 2.11 C-03 — `btn-delete` for delete confirmation

**File:** `src/renderer/components/CoinDetail.tsx`

The final destructive action in the delete confirmation modal currently uses `btn-solid` (dark ink fill). The `.btn-delete` class exists in `index.css` (lines 125–142) and provides a link-style button that transitions to `var(--error-red)` on hover — semantically appropriate for the final step of a destructive workflow.

```tsx
// before:
<button className="btn-solid" onClick={handleDelete}>
// after:
<button className="btn-delete" onClick={handleDelete}>
```

**Visual note:** Both Cancel (`btn-minimal`) and Delete (`btn-delete`) will be link-style in their resting state. The `.btn-delete` hover state (error-red text and underline) provides the destructive signal. The modal heading `{t('detail.confirm.title')}` ("Confirm Deletion") and body text establish sufficient context. Verify visually before merging.

---

## 3. Verification Strategy

### Test Cases

**`Scriptorium.test.tsx`** (create if absent):

1. **F-03:** Render in edit mode (`id` param set, coin loaded). Assert `.draft-status` text equals `t('scriptorium.editingRecord')`, not `t('scriptorium.draftPreserved')`.
2. **F-03:** Render in add mode. Assert `.draft-status` text equals `t('scriptorium.draftPreserved')`.
3. **F-04:** Render in edit mode. Modify a field via `updateField`. Click `← Close Ledger Entry`. Assert confirmation modal appears. Click "Continue Editing" — modal closes, navigation not called. Click back-button again, then "Discard Changes" — assert `navigate(-1)` called.
4. **F-04:** Render in edit mode. Do not modify any field. Click `← Close Ledger Entry`. Assert confirmation modal does NOT appear.
5. **F-05:** Render in add mode with empty `formData`. Assert "Discard Draft" button is not rendered. Set any field to a non-empty value. Assert button appears. Click → confirm modal appears. Click "Discard" → assert `clearDraft` called and form resets.

**`LedgerForm.test.tsx`** — extend existing:

6. **L-02:** Render form. Assert `year_numeric` input is present within `.subtitle-stack`, not within `.metrics-grid`.
7. **L-03:** Render form. Assert `provenance` field renders as a `<textarea>`, not `<input>`.
8. **L-04:** Render form. Query `.metrics-grid` children. Assert count is 7 (not 8).
9. **L-06:** Render form. Assert `purchase_date` input has `type="date"`.
10. **V-01:** Render with `isVisible('ledger.die_axis') = false`. Assert `die_axis` field is inside `.hidden-fields-accordion`. Assert accordion is closed by default. Click toggle — assert `die_axis` field becomes visible.
11. **V-01:** Render with all fields visible. Assert `.hidden-fields-accordion` is not rendered.

**`useCoinForm.test.ts`** — extend existing:

12. **F-04:** Initialize hook with an `initialCoin`. Modify a field with `updateField`. Assert `isDirty === true`. Reset the field to its original value. Assert `isDirty === false`.
13. **F-04:** Initialize hook without `initialCoin`. Assert `isDirty === false` (add mode always returns false).

**`PatinaSidebar.test.tsx`** — extend existing:

12. **C-02:** Render sidebar with `availableEras={['Roman Imperial']}`. Assert the era checkbox `aria-label` equals `t('sidebar.ariaFilter.era', { value: 'Roman Imperial' })` — i.e. not the hardcoded `"Filter by Roman Imperial era"` English string.

**`CoinDetail.test.tsx`** — extend existing:

13. **C-03:** Render in delete-confirm state. Assert the delete button has class `btn-delete`, not `btn-solid`.

**`translations.test.ts`** — automatic:

14. **C-01:** The existing i18n parity test enforces that `en.json` and `es.json` share the same key structure. Removing `sidebar.era.*` from both locales simultaneously will not trigger a failure. A grep check after removal confirms zero remaining references to `sidebar.era.ancient/medieval/modern`.

### Colocation Check
- `Scriptorium.test.tsx` → `src/renderer/components/__tests__/Scriptorium.test.tsx`
- `useCoinForm.test.ts` → `src/renderer/hooks/__tests__/useCoinForm.test.ts`
- `LedgerForm.test.tsx` → `src/renderer/components/__tests__/LedgerForm.test.tsx` (extends existing)

### Mocking Strategy
- `window.electronAPI` global mock, cleared in `beforeEach`. ✓
- For F-04 tests: mock `useCoin` to return a synthetic `coin` object. Spy on `navigate` from `react-router-dom`.
- For V-01 tests: wrap component with `FieldVisibilityProvider` with specific `false` overrides, following the `renderWithVisibility` helper pattern from `CoinDetail.test.tsx`.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Complete

### Audit Findings:
- **System Integrity:** No new IPC handlers. No schema changes. The `isDirty` flag is derived entirely from renderer state. `FieldVisibilityContext` is already provided at root — consuming it in `LedgerForm` adds no new provider.
- **Abstraction:** The `isDirty` computation belongs in `useCoinForm` not `Scriptorium.tsx` — it uses form state that the hook owns. This is the correct placement.
- **Blueprint Correction Applied:** §2.2.2 originally specified `btn-primary` for the F-04 "Discard Changes" button. This class does not exist as a standalone in `index.css` (only as `btn-action.btn-primary` in a toolbar scope). Corrected to `btn-delete` throughout the blueprint — semantically appropriate for a destructive navigation action and consistent with the `CoinDetail` delete modal pattern.

### Review Notes & Suggestions:
- The `JSON.stringify` diff for `isDirty` is adequate for scalar fields but will produce false-positives if field order changes during object spread. Confirm the `initial` and `current` objects are constructed from the same key-ordering. The recommended approach (direct destructure from `initialCoin` + `formData`) preserves insertion order.
- V-01: The `<details>` native element is used for the accordion — verify it renders correctly in the Electron Chromium version bundled with the app. `<details>` has been stable since Chrome 12; no concern expected.
- The `btn-ghost` CSS class is new. Add it to the style guide's component tokens section (see Section 10).
- **F-05 / `btn-ghost` vs `btn-tools` near-duplicate:** `.btn-tools` (index.css) already uses `border: 1px solid var(--border-hairline)` with the same mono/uppercase/letter-spacing resting state. If `.btn-ghost` is retained as a separate class, add a distinguishing comment in `index.css` clarifying use-case (header destructive-secondary vs. toolbar dropdown trigger). Evaluate at implementation time whether `.btn-tools` can be aliased.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Complete

### Audit Findings:
- **IPC surface:** No new handlers introduced. F-04 (`isDirty`), F-05 (`clearDraft` UI), L-02/L-03/L-04/V-01 are renderer-state or layout-only changes. No new `window.electronAPI` calls. `NewCoinSchema.strict()` requires no changes. **Verdict: No issue.**
- **Zod schema gap — `purchase_date`:** `CoinSchema.purchase_date` is `z.string().optional().nullable()` with no format regex. The `type="date"` browser input constrains renderer-side entry to `YYYY-MM-DD`, but a crafted IPC payload can still deliver an arbitrary string. With `contextIsolation: true` + `sandbox: true`, the risk is low for this sprint. A follow-up hardening regex is documented in Section 10. **Verdict: Low — no blocking action for SCR-02.**
- **Renderer-side data handling:** No `innerHTML`, `dangerouslySetInnerHTML`, or `eval()` calls exist anywhere in `src/renderer` (grep confirmed). The C-02 `t('sidebar.ariaFilter.era', { value: v })` interpolation passes vocabulary values through i18next (escapes by default); values are pre-constrained by `VocabAddSchema`'s character-class regex. **Verdict: No issue — XSS vector surface nil.**
- **`patina-img://` protocol:** SCR-02 makes no changes to image upload, image storage, protocol registration, or `PlateEditor` image path handling. **Verdict: No issue — protocol unaffected.**
- **Free-text input changes:** `purchase_date` moves from `type="text"` to `type="date"` (enforced `YYYY-MM-DD`). `provenance` moves from `<input>` to `<textarea>` — both controlled React components feeding `updateField()` with scalar strings. Neither introduces an injection vector. **Verdict: No issue — `year_display` correctly remains `type="text"` (historical inscriptions are not ISO dates).**

### Review Notes & Suggestions:
- Verified: No blocking security concerns. One low-severity follow-up item (Zod `purchase_date` regex) already documented in Section 10 — does not block SCR-02 shipping.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Complete

### Blocking Gaps (must be resolved before implementation begins):

- **C-02 will break ~15 existing `PatinaSidebar.test.tsx` assertions.** Tests at lines 66, 88, 94, 142, 157–159 assert hardcoded English aria-label strings (e.g., `'Filter by Zinc metal'`). After C-02 routes these through `t()`, the global `react-i18next` mock returns the key string, not English. **Required:** Update all existing aria-label selectors in `PatinaSidebar.test.tsx` to match `t()` key-resolution output in the same PR as the C-02 implementation.

- **L-06 will break the existing acquisition footer test.** `LedgerForm.test.tsx` line 152 asserts `getByPlaceholderText('YYYY-MM-DD')`. The blueprint removes the placeholder when switching to `type="date"`. **Required:** Replace the placeholder assertion with `expect(input).toHaveAttribute('type', 'date')`.

- **V-01 will break all existing `LedgerForm.test.tsx` tests.** After V-01, `LedgerForm` consumes `useFieldVisibility()` from `FieldVisibilityContext`. The current `renderForm` helper (lines 16–21) does not provide this context. **Required:** Refactor `renderForm` to wrap with `FieldVisibilityContext.Provider` defaulting all fields to visible before writing any V-01 tests.

- **`isDirty` missing from `useCoinForm` mock default in `Scriptorium.test.tsx`.** The module-level mock (lines 22–33) does not return `isDirty`. All existing tests receive `undefined`, silently disabling the guard. **Required:** Add `isDirty: false` to the default mock return value; individual F-04 tests override with `isDirty: true`.

### Missing Test Cases:

- **F-03 isSaving branches uncovered.** Four branches exist: `(!id && !isSaving)`, `(!id && isSaving)`, `(id && !isSaving)`, `(id && isSaving)`. Proposed tests cover only the non-saving states. **Required:** Add tests for both `isSaving: true` variants.

- **F-05 images-only edge case.** `isFormPopulated` excludes `images`. A form with only `formData.images.obverse` set (all text fields empty) must not show "Discard Draft". No proposed test covers this. **Required:** Add: render add mode with `formData = { title: '', images: { obverse: 'path/to/img.jpg' } }`, assert button absent.

- **`navigate` mock absent from `Scriptorium.test.tsx`.** The F-04 navigate-spy requires `vi.mock('react-router-dom', ...)` with `useNavigate: () => mockNavigate`. This mock is not currently in the file. **Required:** Add before writing F-04 tests.

- **Test numbering collision.** Items 12 and 13 appear twice in Section 3. Renumber sequentially: `useCoinForm` tests as 12–13, `PatinaSidebar` as 14, `CoinDetail` as 15.

- **`beforeunload` / window-close guard is out of scope.** Closing the Electron window while the form is dirty would still silently discard changes. Explicitly noted as out-of-scope for SCR-02; a follow-up item should be logged during §9 user consultation.

### Verified Adequate:
- Async safety: `findBy*` / `waitFor` guidance is correct. Verified.
- Colocation rule: All proposed test files extend existing on-disk paths. No new files needed. Verified.
- Hook mocking strategy: `useCoin` and `useCoinForm` already mocked at module level in `Scriptorium.test.tsx`. `renderWithVisibility` is the correct model for V-01 `LedgerForm` tests. Verified.
- `isDirty` hook tests (proposed 12–13): Modifying-then-resetting and add-mode branches are covered. Use the same field spread pattern as the hook to avoid false-positive `JSON.stringify` diffs. Verified.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Complete

### Required Changes Before Implementation:

1. **F-04 modal — `btn-primary` does not exist as standalone.** The F-04 "Discard Changes" button was specified as `btn-primary`. This class only exists as `btn-action.btn-primary` scoped to the Cabinet toolbar. An unstyled button would result. **Fixed in §2.2.2:** changed to `btn-delete` — consistent with the `CoinDetail` Cancel/Delete pair and WCAG 3.2.4 (Cancel before destructive action).

2. **L-02 — Spin-button suppression CSS required.** `input[type="number"].input-sub` will show browser spin buttons in the subtitle-stack. Add: `input[type="number"].input-sub { -moz-appearance: textfield; } input[type="number"].input-sub::-webkit-inner-spin-button, input[type="number"].input-sub::-webkit-outer-spin-button { display: none; }`.

3. **L-02 — Use BEM modifier for left-border accent.** The `year_numeric` label left-border accent must use a class (e.g., `.subtitle-label--linked`) rather than inline style — inline styles resist theming and cannot be overridden by media queries.

4. **L-04 — Remove redundant `@media (max-width: 1200px)` `.metrics-grid` block.** After changing the default to `repeat(2, 1fr)`, the 1200px breakpoint rule becomes a no-op. Remove it to prevent maintenance debt.

5. **F-05 / style guide — Document `.btn-ghost` in `docs/style_guide.md` §Button Variants** before merging. Add a comment in `index.css` distinguishing it from `.btn-tools` (same resting state, different use-case).

### Audit Findings:
- **F-03 "Editing Record" label:** `.draft-status` class in `index.css` (mono/muted/uppercase 0.7rem) renders the new label identically to "Draft Preserved". No new CSS required. **Verdict: Approved.**
- **F-04/F-05 `.modal-overlay` re-use:** `.modal-overlay`, `.modal-content`, `.modal-actions` fully defined in `index.css`; `CoinDetail.tsx` uses this exact three-class pattern. Blueprint markup replicates it verbatim. **Verdict: Approved.**
- **F-05 `.btn-ghost`:** Hierarchy slot (below `btn-minimal`) is correct for a header destructive-secondary action. Resting weight is subordinate to `btn-solid`. **Verdict: Approved with note** — a hover that nudges toward `var(--error-red)` would better signal irreversibility, but current spec is acceptable given header placement.
- **L-02 subtitle-stack pairing:** `.subtitle-stack` uses `display: grid; grid-template-columns: 130px 1fr`. Adding `year_numeric` as a second row via `.subtitle-item { display: contents }` is structurally clean — both rows share the label column. **Verdict: Approved with Required Change #3.**
- **L-04 2-col metrics grid:** Unifies the 1200px+ and 1200–1000px breakpoints. With 7 items, 4-row 2-col is less awkward than the 3/3/1 orphan. **Verdict: Approved with Required Change #4.**
- **L-06 `type="date"` CSS:** `-webkit-appearance: none; color-scheme: light` + `opacity: 0.4` on picker icon is adequate. `color-scheme: light` prevents OS dark-mode chrome. Date value renders in JetBrains Mono from `.input-metric`. **Verdict: Approved** — verify at 100% zoom in Electron build before shipping.
- **V-01 `<details>` accordion:** `list-style: none` (Firefox) + `::webkit-details-marker { display: none }` (Chromium/Electron) both present and required. `▸/▾` Unicode glyphs render in JetBrains Mono. Keyboard-accessible natively. **Verdict: Approved with note** — verify `margin-top: -1rem` does not collapse against flex parent's `margin-bottom`.
- **C-03 `btn-delete` swap:** `.btn-delete` confirmed in `index.css` lines 125–142. After swap, both Cancel (`btn-minimal`) and Delete (`btn-delete`) have identical resting states — semantic separation relies on hover state and modal copy. **Verdict: Approved** — verify visually that at-rest distinction is sufficient.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Complete

### Audit Findings:
- **L-02 — `year_display` + `year_numeric` pairing:** Standard professional cataloguing (PCGS, NGC, CNG, NAC, ANS) always presents the inscribed date and the CE equivalent as a pair — e.g. "Date: ANNO IIII (CE 293)". Separating them across form zones implies they are unrelated measurements, which misleads the collector. The subtitle-stack pairing is numismatically correct. **Verdict: Approved.** *Future sprint note:* The `ledger.yearCe` ("YEAR CE") label is misleading for BCE Republican denarii and Greek bronzes — "SORT YEAR (CE/BCE)" would be more accurate, but not blocking for SCR-02.

- **L-03 — Provenance as textarea:** The UNESCO 1970 convention on cultural property has made full provenance chains a legal/ethical requirement in many jurisdictions. A typical ancient coin with exhibition history carries 4–5 structured entries. A single-line input is professionally inadequate and legally imprudent. **Verdict: Approved.** Multi-line textarea is the correct control.

- **L-04 — Field sequence recommendation → Option C:** Option A splits Material from Fineness (a natural composition pair). Option B also separates Grade from Rarity. The correct cataloguing workflow reads: physical dimensions → composition → condition/evaluation → specialist technical data. **Verdict: Recommend Option C** — Weight · Diameter / Material · Fineness / Grade · Rarity / Die Axis (alone). Die Axis alone in the final row is appropriate — it is the most specialist field, already off by default in `DEFAULT_FIELD_VISIBILITY`. This sequence mirrors Sear, RIC, RPC, and Crawford ordering conventions.

- **L-06 — `purchase_date` as `type="date"`:** Acquisition dates are categorically different from the coin's own dates — always a modern Gregorian calendar date, never historical. Free-form text entries ("Summer 2019", "circa 2015") cannot be sorted or filtered consistently. **Verdict: Approved.** Must NOT be applied to `year_display` (free text is correct there — may contain Greek letters, Hijri years, regnal year notation, or "undated"). The blueprint already correctly notes this.

- **V-01 — Hidden fields defaults are numismatically well-calibrated:** `die_axis` (specialist die-link studies — irrelevant for most collectors), `fineness` (relevant only when assay data available or bullion-grade), `edge_desc` (meaningful only for hammered vs. milled distinction or specific series), `provenance` (significant for ancient/medieval, less so for modern), `acquisition` (private financial data — appropriate to collapse by default). **Verdict: Approved.**

### Review Notes & Suggestions:
- **Section 9 Open Q #1 (L-04):** Option C is the numismatically correct sequence. See finding above.
- **Section 9 Open Q #2 (V-01 accordion grouping):** Recommend a **single accordion**. With at most five hidden fields, three per-section disclosures create more chrome than content. The individual field labels provide sufficient context. If the hidden field count grows significantly in a future sprint, grouped approach can be revisited.
- **Section 9 Open Q #3 (F-04 image dirty-check):** Recommend **yes — include image changes.** Adding or removing a photograph is a meaningful editorial act; silent loss is a real risk. Implementation: a separate `imagesChanged` boolean flag (true whenever image array length changes from its initial snapshot), OR'd with the existing `isDirty` scalar check. Deep-comparing image objects is unnecessary.

---

## 9. User Consultation & Decisions

### Open Questions (specialist recommendations noted):

1. **L-04 field sequence:** `curating-coins` recommends **Option C** (Weight · Diameter / Material · Fineness / Grade · Rarity / Die Axis alone) — mirrors Sear/RIC/RPC/Crawford ordering; keeps composition pair together, keeps condition pair together, places specialist-only Die Axis last.
   - **Option A:** Weight · Diameter / Die Axis · Material / Grade · Rarity / Fineness (alone)
   - **Option B:** Weight · Diameter / Die Axis · Material / Fineness · Grade / Rarity (alone)
   - **Option C** *(recommended)*: Weight · Diameter / Material · Fineness / Grade · Rarity / Die Axis (alone)

2. **V-01 accordion grouping:** `curating-coins` recommends a **single accordion** ("N hidden field(s) — click to expand"). With at most five hidden fields, three per-section disclosures create more chrome than content. Per-section grouping can be revisited if the hidden field count grows in a future sprint.

3. **F-04 dirty-check scope:** `curating-coins` recommends **yes — include image changes** via a separate `imagesChanged` boolean flag OR'd with the scalar `isDirty` check. Adding/replacing a photograph is a meaningful editorial act; silent loss on back-navigation is a real risk.

### Final Decisions:
1. **L-04 field sequence → Option C confirmed:** Weight · Diameter / Material · Fineness / Grade · Rarity / Die Axis (alone).
2. **V-01 accordion → Single disclosure confirmed:** One `<details>` element containing all hidden fields as a flat list. Per-section grouping deferred until hidden field count grows.
3. **F-04 dirty-check → Include image changes confirmed:** Export `imagesChanged` (`Object.keys(formData.images).length > 0`) from `useCoinForm` alongside `isDirty`. Guard in `Scriptorium.tsx` triggers on `isDirty || imagesChanged`.

---

## 10. Post-Implementation Retrospective

**Date:** 2026-04-01
**Outcome:** Completed — 417/417 tests passing, `npx tsc --noEmit` zero errors.

### Summary of Work
- **F-03:** `useCoinForm` + `Scriptorium.tsx` — conditional draft-status label (add vs edit vs saving states). 4 test cases.
- **F-04:** `isDirty` / `imagesChanged` flags in `useCoinForm`; leave-confirmation modal in `Scriptorium.tsx`. Guard fires on `isDirty || imagesChanged` (image changes included per §9 decision). 9 test cases across hook and component.
- **F-05:** `clearDraft` exposed via "Discard Draft" btn-ghost header button with confirm modal. Button hidden when only images are populated (text-fields-only gate). 7 test cases.
- **L-02:** `year_numeric` moved from `.metrics-grid` to `.subtitle-stack` as paired row below `year_display`, with `.subtitle-item--linked` BEM left-border accent and spin-button suppression CSS.
- **L-03:** `provenance` changed from `<input>` to `<textarea class="input-block">`.
- **L-04:** Metrics grid changed to `repeat(2, 1fr)` (from 3-col). Field order follows Option C (curating-coins recommendation): Weight·Diameter / Material·Fineness / Grade·Rarity / Die Axis alone.
- **L-06:** `purchase_date` changed to `type="date"`, enforcing ISO `YYYY-MM-DD`. Manuscript-aesthetic CSS added for picker icon.
- **V-01:** `LedgerForm` consumes `useFieldVisibility()`. Single `<details>` accordion groups all hidden fields (die_axis, fineness, edge_desc, provenance, acquisition). Accordion closed by default.
- **C-01:** Dead `sidebar.era.{ancient,medieval,modern}` keys removed from both locale files.
- **C-02:** Sidebar filter `aria-label` strings routed through `t('sidebar.ariaFilter.*', { value })`. i18n keys added to both locales.
- **C-03:** Delete confirmation button swapped from `btn-solid` to `btn-delete` in `CoinDetail.tsx`.

### Pain Points
- `Scriptorium.test.tsx` had to be fully rewritten from `MemoryRouter`-based rendering to a module-level `react-router-dom` mock (same pattern as `CoinDetail.test.tsx`). This was required because `LedgerForm` now calls `useFieldVisibility()` which throws without a provider, and the `MemoryRouter` approach made it impossible to spy on `navigate`.
- `useCoinForm.test.ts` test objects for `CoinImage` were missing `created_at`, caught by `tsc --noEmit`.

### Things to Consider
- After shipping L-06, consider adding a `purchase_date` regex to `CoinSchema` (`/^\d{4}-\d{2}-\d{2}$/`) for a future hardening sprint.
- The `btn-ghost` class introduced in F-05 should be documented in `docs/style_guide.md` under Button Variants.
- **Core Doc Revision:** Update `docs/style_guide.md` §Button Variants to include `.btn-ghost`. Update `docs/reference/ipc_api.md` if any IPC surface changes (none in this sprint).

---

## 11. Post-Ship Visual Fixes (2026-04-01)

Three presentation issues discovered after completion and fixed in the same session:

### Fix 1 — Subtitle line overloaded (`CoinDetail.tsx` + `index.css`)
**Problem:** The `.subtitle` div packed mint, denomination, year_display, year_numeric annotation, and catalog_ref into a single italic serif line. The `year-numeric-annotation` span used `font-mono`, causing a jarring font switch mid-sentence. With all fields populated the line became unreadably dense.

**Fix:** Split into two rows:
- Row 1 (`.subtitle`, italic serif): mint attribution + denomination — typological identity.
- Row 2 (`.subtitle-ref`, mono 0.8 rem, muted): year_display · year_numeric CE // catalog_ref — reference data where mono font is semantically appropriate.

Removed `.year-numeric-annotation` CSS entirely. Updated TC-FLD-03 / TC-FLD-04 to match new `· -44 CE` format.

### Fix 2 — Excess vertical spacing in narrative sections (`index.css`)
**Problem:** `.numismatic-section { margin-bottom: 2.5rem }` combined with `.desc-block { margin-bottom: 2rem }` produced ~4.5 rem of space after short sections (Canto, Nota del Curador, Procedencia), far exceeding the rhythm of Anverso/Reverso.

**Fix:**
- `.numismatic-section margin-bottom`: 2.5 rem → 1.5 rem
- `.desc-block margin-bottom`: 2 rem → 1 rem

### Fix 3 — Acquisition fields wrapping to second row (`LedgerForm.tsx` + `index.css`)
**Problem:** The acquisition footer used `.metrics-grid` (`repeat(2, 1fr)`). With three fields (Adquirida, Fuente, Coste), Coste wrapped to a second row.

**Fix:** Added `.metrics-grid--3col { grid-template-columns: repeat(3, 1fr) }` CSS modifier and applied it to both acquisition footer grids (hidden-accordion path and main path).
