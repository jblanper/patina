# Implementation Blueprint: SCR-02 · Form Completeness & Editing Integrity

**Date:** 2026-03-31
**Status:** Draft
**Reference:** `docs/audits/2026-03-31-scriptorium-audit.md` — items F-03, F-04, F-05, L-02, L-03, L-04, L-06, V-01
**Depends on:** SCR-01 (must be shipped first — establishes the required-indicator pattern)

---

## 1. Objective

Harden the Scriptorium's editing experience and improve field-level data quality. This sprint covers eight improvements across two categories:

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
        <button className="btn-primary" onClick={() => navigate(-1)}>
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

**Status:** Pending

### Audit Findings:
- **System Integrity:** No new IPC handlers. No schema changes. The `isDirty` flag is derived entirely from renderer state. `FieldVisibilityContext` is already provided at root — consuming it in `LedgerForm` adds no new provider.
- **Abstraction:** The `isDirty` computation belongs in `useCoinForm` not `Scriptorium.tsx` — it uses form state that the hook owns. This is the correct placement.

### Review Notes & Suggestions:
- The `JSON.stringify` diff for `isDirty` is adequate for scalar fields but will produce false-positives if field order changes during object spread. Confirm the `initial` and `current` objects are constructed from the same key-ordering. The recommended approach (direct destructure from `initialCoin` + `formData`) preserves insertion order.
- V-01: The `<details>` native element is used for the accordion — verify it renders correctly in the Electron Chromium version bundled with the app. `<details>` has been stable since Chrome 12; no concern expected.
- The `btn-ghost` CSS class is new. Add it to the style guide's component tokens section (see Section 10).

---

## 5. Security Assessment (`securing-electron`)

**Status:** Pending

### Audit Findings:
- **The Filter:** No new IPC handlers. No new Zod schemas required.
- **Protocols:** No changes to `patina-img://`.

### Review Notes & Suggestions:
- The `isDirty` comparison uses `JSON.stringify` on `formData` values. These values come from user input and should never be executed — confirm no `eval()` or `innerHTML` is involved downstream. The current `updateField` path writes scalars only. No security concern.
- The `type="date"` input change (L-06) means `purchase_date` values are now guaranteed `YYYY-MM-DD` or empty string from the browser side. The backend Zod schema (`z.string().optional().nullable()`) already accepts this — no change needed. If a date regex were desired in future (`/^\d{4}-\d{2}-\d{2}$/`), it could be added to `CoinSchema.purchase_date` without breaking existing records.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Pending

### Audit Findings:
- **Coverage Check:** `useCoinForm.ts` currently lacks an `isDirty` path — new tests will add hook coverage. `Scriptorium.tsx` is largely untested; creating `Scriptorium.test.tsx` establishes the baseline for this and future sprints.
- **Async Safety:** F-04 modal interaction tests must use `findBy*` for the modal after click, not `getBy*`, since the modal renders conditionally.

### Review Notes & Suggestions:
- The `Scriptorium.test.tsx` must mock `useCoin` and `useCoinForm` at the module level to avoid real IPC calls. Use `vi.mock('../hooks/useCoin')` pattern.
- The accordion (V-01) uses native `<details>` — testing open/close state should use `userEvent.click(summaryElement)` and assert presence/absence of child content.
- Ensure `LedgerForm.test.tsx` uses `renderWithVisibility` helper for V-01 tests.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** The `.btn-ghost` style follows the established button hierarchy (`.btn-solid` → `.btn-minimal` → `.btn-ghost`). The "Discard Draft" ghost button in the header is visually subordinate to "Index to Ledger" (`.btn-solid`), which is correct.
- **Accessibility:** The `<details>` / `<summary>` accordion is keyboard-accessible natively. The custom `::before` arrow indicator is presentational only.

### Review Notes & Suggestions:
- The `year_numeric` two-column pairing in the subtitle-stack (L-02) adds a second `type="number"` input to that zone. Confirm the `.subtitle-stack .input-sub` CSS rule applies correctly to `input[type="number"]` — it may need an explicit override to remove browser spin-buttons: `input[type="number"].input-sub { -moz-appearance: textfield; } input[type="number"].input-sub::-webkit-inner-spin-button { display: none; }`.
- The `purchase_date` `type="date"` picker (L-06): the native browser picker is functional but visually inconsistent with the ledger aesthetic. The CSS addition in §2.7 mitigates this. Review the result at 100% zoom on the Electron build before shipping.
- The hidden-fields accordion summary text should use the `†` footnote symbol motif or a minimal `▸/▾` triangle — the current spec uses `▸/▾` which is appropriate.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Pending

### Audit Findings:
- **Historical Accuracy:** No coin data model changes. Field labels unchanged.
- **Collector UX:** The grouping of `year_display` + `year_numeric` (L-02) reflects standard numismatic practice. A coin's date inscription (e.g., "ANNO IIII" on a Byzantine solidus) is distinct from its computed CE equivalent — presenting them as a paired duo communicates that the collector should fill both for maximum catalogue utility.
- **Provenance as textarea (L-03):** Consistent with professional auction records (e.g., CNG, NAC). Multi-line provenance chains of 4–5 entries are common for ancient coins with exhibition history.

### Review Notes & Suggestions:
- The date input change (L-06) to `type="date"` is correct for acquisition dates (always a modern calendar date). It should NOT be applied to `year_display` — that field represents the coin's own inscribed date, which is not a modern ISO date.
- The hidden-fields accordion for visibility-off fields (V-01): confirm that `die_axis` and `fineness` are the primary candidates for the hidden group (both default to `false` in `DEFAULT_FIELD_VISIBILITY`). `edge_desc`, `provenance`, and `acquisition` also default to hidden — these cover the three numismatic data sections. The accordion should group fields by their section (metrics / numismatic / acquisition), not as a flat undifferentiated list.

---

## 9. User Consultation & Decisions

### Open Questions:
1. **L-04 field sequence:** Two options for the 2-col metrics grid after removing `year_numeric`:
   - **Option A:** Weight · Diameter / Die Axis · Material / Grade · Rarity / Fineness (alone)
   - **Option B:** Weight · Diameter / Die Axis · Material / Fineness · Grade / Rarity (alone)
   - **Option C:** Weight · Diameter / Material · Fineness / Grade · Rarity / Die Axis (alone — least important physically last)
   Which sequence best reflects collection workflow priority?

2. **V-01 accordion grouping:** Should the accordion be a single "Hidden Fields (N)" disclosure, or three separate per-section disclosures (one for metrics, one for numismatic, one for acquisition)?

3. **F-04 dirty-check scope:** Should image slot changes (adding/replacing a photo before saving) also trigger the unsaved-changes guard? Currently the `isDirty` check excludes images.

### Final Decisions:
- *(Awaiting user input.)*

---

## 10. Post-Implementation Retrospective

**Date:** *(To be completed after implementation)*
**Outcome:** *(Pending)*

### Summary of Work
- *(To be filled in.)*

### Pain Points
- *(To be filled in.)*

### Things to Consider
- After shipping L-06, consider adding a `purchase_date` regex to `CoinSchema` (`/^\d{4}-\d{2}-\d{2}$/`) for a future hardening sprint.
- The `btn-ghost` class introduced in F-05 should be documented in `docs/style_guide.md` under Button Variants.
- **Core Doc Revision:** Update `docs/style_guide.md` §Button Variants to include `.btn-ghost`. Update `docs/reference/ipc_api.md` if any IPC surface changes (none in this sprint).
