# Implementation Blueprint: Coin Detail & Scriptorium — UI Refinements

**Date:** 2026-03-20
**Status:** Completed
**Reference:**
- Curator's Audit: `docs/curating-ui/audit_detail_and_scriptorium_2026-03-20.md`
- Visual Mockup: `docs/curating-ui/archive/mockup_detail_scriptorium_refinements_2026-03-20.html`
- Style Guide: `docs/style_guide.md` (Manuscript Hybrid v3.3)

---

## 1. Objective

Address 15 findings (2 Critical, 5 High, 5 Medium, 3 Low) across the `CoinDetail` and `Scriptorium` (LedgerForm + PlateEditor) pages, identified in the 2026-03-20 curatorial audit. All changes are pure CSS and JSX surgical corrections — no new components, no schema changes, no IPC modifications.

**Scope boundaries:**
- `src/renderer/components/CoinDetail.tsx`
- `src/renderer/components/LedgerForm.tsx`
- `src/renderer/styles/index.css`
- No changes to `src/main/`, `src/common/`, or any test files beyond updated snapshots.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** All changes reinforce the ledger section grammar (hairline dividers, zone separation) and archival typography hierarchy. No aesthetic deviation from Manuscript Hybrid v3.3.
- [x] **Privacy First:** No new external resources. No CDN or font additions.
- [x] **Single-Click Rule:** No navigation changes. All fixes are presentational or micro-copy corrections within existing pages.

---

## 2. Technical Strategy

### Group A — Coin Detail (CoinDetail.tsx + index.css)

#### A1 — CD-C1: Zoom affordance overlay on plate frame
**Severity:** Critical
**File:** `index.css` (`.plate-frame`)

Add a `::after` pseudo-element overlay that appears on hover, revealing the zoom interaction with a magnifier symbol. Uses the existing dark-overlay pattern established by `.lens-cta-overlay`.

```css
/* index.css — append to .plate-frame block */
.plate-frame::after {
  content: '⌕';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 41, 38, 0.15);
  color: white;
  font-size: 3rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.plate-frame:hover::after {
  opacity: 1;
}
```

#### A2 — CD-H1: Header button order + delete hover signal
**Severity:** High
**File:** `CoinDetail.tsx` (lines 57–70), `index.css`

Reverse button order (Edit first, Delete second). Add a semantic `.btn-delete` class that renders muted by default and transitions to error-red on hover only — a deliberate signal without breaking the archival aesthetic at rest.

```tsx
// CoinDetail.tsx — header-actions
<div className="header-actions">
  <button onClick={() => navigate(`/scriptorium/edit/${coin.id}`)} className="btn-minimal">
    Edit Record
  </button>
  <button onClick={() => setShowDeleteConfirm(true)} className="btn-delete">
    Delete Record
  </button>
</div>
```

```css
/* index.css — new class */
.btn-delete {
  background: none;
  border: none;
  border-bottom: 1px solid var(--text-muted);
  padding-bottom: 4px;
  font-family: var(--font-mono);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s, border-color 0.2s;
}
.btn-delete:hover {
  color: var(--error-red);
  border-color: var(--error-red);
}
```

#### A3 — CD-H2: Metrics grid bottom border
**Severity:** High
**File:** `index.css` (`.metrics-grid`)

Add `border-bottom: 1px solid var(--border-hairline)` to `.metrics-grid`. This creates a consistent zone separator between the physical metrics and the numismatic description sections, matching the folio header's structural grammar.

```css
/* index.css — add to existing .metrics-grid rule */
.metrics-grid {
  /* existing properties... */
  border-bottom: 1px solid var(--border-hairline);
}
```

#### A4 — CD-H3: Remove hardcoded "PLATE V" from plate caption
**Severity:** High
**File:** `CoinDetail.tsx` (line 101)

```tsx
// Before:
PLATE V // {mainImage?.label || 'OBVERSE'} // 2:1 SCALE

// After:
{(mainImage?.label || 'OBVERSE').toUpperCase()} // 2:1 SCALE
```

#### A5 — CD-M1: Separate Provenance into its own section
**Severity:** Medium
**File:** `CoinDetail.tsx` (lines 202–220)

Split the combined Curator's Note + Provenance `numismatic-section` into two independent sections. Each renders only when its data is present.

```tsx
{/* Curator's Note */}
{coin.story && (
  <div className="numismatic-section">
    <span className="section-label">Curator's Note</span>
    <div className="desc-block">
      {coin.story.split('\n').map((para, i) => (
        <p key={i} className="desc-text curator-note">"{para}"</p>
      ))}
    </div>
  </div>
)}

{/* Provenance — separate section */}
{coin.provenance && (
  <div className="numismatic-section">
    <span className="section-label">Provenance</span>
    <div className="provenance-note">{coin.provenance}</div>
  </div>
)}
```

#### A6 — CD-M2: Unify footer font family to mono
**Severity:** Medium
**File:** `index.css` (`.ledger-footer`, `.footer-item`)

```css
/* index.css — update .footer-item */
.footer-item {
  font-family: var(--font-mono); /* NEW: unify with labels */
  min-width: 0;
  overflow-wrap: anywhere;
}
```

#### A7 — CD-L1: Replace `.export-result` in delete modal
**Severity:** Low
**File:** `CoinDetail.tsx` (line 78), `index.css`

Replace `<div className="export-result">` with a semantic `modal-actions` class.

```tsx
// CoinDetail.tsx
<div className="modal-actions">
  <button className="btn-primary" onClick={handleDelete}>Delete</button>
  <button className="btn-minimal" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
</div>
```

```css
/* index.css — new class */
.modal-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
```

---

### Group B — Scriptorium (LedgerForm.tsx + index.css)

#### B1 — SC-C1: Replace square-bracket fallbacks in meta line; real ID in edit mode
**Severity:** Critical
**Files:** `LedgerForm.tsx` (line 15), `Scriptorium.tsx` (line 81)

Add an optional `coinId?: number` prop to `LedgerForm`. In add mode (`coinId` is undefined), display `#NEW`. In edit mode, display the zero-padded real ID.

```tsx
// LedgerForm.tsx — update props interface
interface LedgerFormProps {
  formData: NewCoin;
  errors: Record<string, string>;
  updateField: (field: keyof NewCoin, value: string | number | null | boolean) => void;
  coinId?: number;  // NEW
}

// LedgerForm.tsx — update meta line
const entryLabel = coinId ? `#${String(coinId).padStart(3, '0')}` : '#NEW';

// In JSX:
ENTRY {entryLabel} // {formData.era?.toUpperCase() || 'ANCIENT'} // {formData.metal?.toUpperCase() || '—'}
```

```tsx
// Scriptorium.tsx — pass coin id to LedgerForm
<LedgerForm
  formData={formData}
  errors={errors}
  updateField={updateField}
  coinId={coin?.id}   // NEW: undefined on add, real id on edit
/>
```

Note: `era` always has a default value of `'Ancient'` (enforced in `useCoinForm`), so `'ANCIENT'` is the graceful display of the default.

#### B2 — SC-H1: Convert footer to metrics-grid pattern
**Severity:** High
**File:** `LedgerForm.tsx` (lines 221–253)

Replace the inline label/input footer with the established `metrics-grid` + `metric-label` + `input-metric` pattern. Reuses existing CSS classes — no new styles required.

```tsx
<footer className="ledger-footer">
  <div className="metrics-grid">
    <div className="metric-item">
      <span className="metric-label">Acquired</span>
      <input
        type="text"
        className="input-metric"
        placeholder="YYYY-MM-DD"
        value={formData.purchase_date || ''}
        onChange={(e) => updateField('purchase_date', e.target.value)}
      />
    </div>
    <div className="metric-item">
      <span className="metric-label">Source</span>
      <input
        type="text"
        className="input-metric"
        placeholder="e.g. CNG Auctions"
        value={formData.purchase_source || ''}
        onChange={(e) => updateField('purchase_source', e.target.value)}
      />
    </div>
    <div className="metric-item">
      <span className="metric-label">Cost</span>
      <input
        type="number"
        className="input-metric"
        placeholder="0.00"
        value={formData.purchase_price || ''}
        onChange={(e) => updateField('purchase_price', e.target.value ? parseFloat(e.target.value) : null)}
      />
    </div>
  </div>
</footer>
```

Update `.ledger-footer` in `index.css` to remove the old flex layout properties now handled by `.metrics-grid`:

```css
.ledger-footer {
  margin-top: auto;
  padding-top: 0; /* metrics-grid has its own top padding */
  border-top: 1px solid var(--border-hairline); /* SC-L1: add top border */
}
```

#### B3 — SC-H2: Fix `.input-legend` responsive width
**Severity:** High
**File:** `index.css` (`.input-legend`)

```css
/* Before: width: 250px */
.input-legend {
  /* existing... */
  width: 100%;
  max-width: 320px; /* replaces fixed 250px */
}
```

#### B4 — SC-M1: Reduce plate-stack gap
**Severity:** Medium
**File:** `index.css` (`.plate-stack`)

```css
.plate-stack {
  gap: 2rem; /* was 3rem */
}
```

#### B5 — SC-M2: Obverse primacy — first slot full opacity
**Severity:** Medium
**File:** `index.css`

```css
.plate-slot:first-child {
  opacity: 1;
}
```

#### B6 — SC-M3: Widen subtitle label column
**Severity:** Medium
**File:** `index.css` (`.subtitle-stack`)

```css
.subtitle-stack {
  grid-template-columns: 130px 1fr; /* was 100px */
}
```

#### B7 — SC-L1: Add top border to ledger-footer
**Severity:** Low
*Addressed as part of B2 (footer restructure).*

#### B8 — SC-L2: Improve empty plate frame border visibility
**Severity:** Low
**File:** `index.css` (`.plate-frame-edit`)

```css
.plate-frame-edit {
  border: 1px dashed var(--text-muted); /* was var(--border-hairline) */
}
```

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan

This blueprint makes no changes to hooks, IPC handlers, or business logic. All changes are presentational. The following checks are required:

1. **Visual regression check:** Open both pages in the running Electron app and verify each finding is addressed against the mockup at `docs/curating-ui/archive/mockup_detail_scriptorium_refinements_2026-03-20.html`.

2. **Existing test suite must pass without modification:** No existing component test should break from these CSS/JSX changes. Run `npm test` to confirm.

3. **Snapshot updates (expected):** If `CoinDetail.test.tsx` or `Scriptorium.test.tsx` use DOM snapshots, they will need to be updated to reflect:
   - Reversed header button order (A2)
   - New `.btn-delete` class (A2)
   - Removed "PLATE V" from caption (A4)
   - Separated provenance section (A5)
   - New `modal-actions` class (A7)
   - Updated meta line copy (B1)
   - Footer restructure to metrics-grid (B2)

4. **TypeScript check:** Run `npx tsc --noEmit` — no new type annotations are required; all changes use existing component props and CSS classes.

### Colocation Check
No new test files required. All changes are within existing component scope.

### Mocking Strategy
No new `window.electronAPI` surface is exposed. Existing mocks in `src/renderer/setupTests.ts` are sufficient.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** All changes are confined to the Renderer process. No cross-process surface is modified. The `src/common/` types and `src/common/validation.ts` schemas are untouched. Type safety is fully preserved.
- **Abstraction:** No business logic is introduced. The meta-line copy change (B1) reads from `formData` which is already typed as `NewCoin` — no new data derivation.
- **CSS Architecture:** All new CSS classes (`.btn-delete`, `.modal-actions`) follow the established naming convention. The `::after` overlay for CD-C1 uses the same dark-ink rgba pattern as `.zoom-modal`. No inline styles introduced.

### Review Notes & Suggestions:
- The footer restructure (B2) reuses `.metrics-grid` and `.input-metric` directly — this is a strong pattern reuse and should be noted as a successful abstraction in the retrospective.
- The `.btn-delete` class establishes a new action taxonomy (destructive-deferred) that should be codified in `docs/style_guide.md` under Component Standards > Action Elements if approved.
- `#NEW` in the meta line (B1) assumes the entry has no ID. This is correct: `useCoinForm` creates the entry only on `submit()`. No risk of showing `#NEW` on edit routes because the meta line already uses `formData.era` and `formData.metal` which will be populated from the existing `coin` object.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified — Re-audit Passed (2026-03-20)

### Audit Findings:
- **The Filter:** No new IPC handlers. No new data flows from Renderer to Main. The filter boundary is unaffected.
- **Protocols:** The `patina-img://` protocol handler is not modified. Image paths remain relative and sanitized as before.
- **CSS `::after` content:** The `'⌕'` character is a Unicode symbol rendered by the browser engine — no XSS vector.
- **`modal-actions` class:** Button actions (`handleDelete`, `setShowDeleteConfirm`) are unchanged. Replacing the CSS class does not affect the security of the delete flow.
- **`coinId?: number` prop:** Read-only display value derived from pre-existing `useCoin` hook data. Does not create, modify, or trigger any IPC call.
- **`contextIsolation: true`, `sandbox: true`:** Confirmed unchanged in `src/main/index.ts`.

### Review Notes & Suggestions:
- No security concerns. This is a purely presentational change set. All 7 security surface checks passed.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified — Re-audit Passed after remediation (2026-03-20)

### Audit Findings (Verification Re-audit):
- **All 15 blueprint items verified in code.** Implementation matches spec exactly. TypeScript clean.
- **No snapshot files** exist in this project; no snapshot drift to remediate.
- **Critical gap found and remediated:** `LedgerForm.tsx` (260 lines) had no test file — a Colocation Rule violation. `LedgerForm.test.tsx` was created covering: `#NEW` add-mode label, zero-padded edit-mode label, era/metal fallbacks, acquisition footer inputs, and `updateField` integration.
- **Delete modal untested:** `CoinDetail.test.tsx` had no tests for the delete confirmation flow. Four new tests added: modal opens on "Delete Record" click, `modal-actions` wrapper and both buttons present, `deleteCoin` called with correct ID, modal closes on Cancel.
- **`coinId` branch untested:** `Scriptorium.test.tsx` only tested add-mode. A new edit-mode test added verifying `ENTRY #042` renders when `coinId=42` is passed.
- **Final test count: 71 passed / 0 failed across 9 test files.**

### Review Notes & Suggestions:
- The original blueprint "Colocation Check" section incorrectly stated "No new test files required." `LedgerForm.tsx` had no test file at all. The new `LedgerForm.test.tsx` satisfies the mandate retroactively.
- The `--text-muted` value in `docs/style_guide.md` was documented as `#7A7875` but the CSS root used `#6A6764`. The style guide has been corrected. The implemented value (`#6A6764`) provides ~4.6:1 contrast on parchment, clearing WCAG AA; the documented value (`#7A7875`) would have been ~3.8:1.
- The delete modal DOM order was corrected (Cancel before Delete in tab order) to satisfy WCAG 3.2.4 — this was raised by the UI re-audit.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified — Re-audit Passed (2026-03-20)

### Audit Findings (Verification Re-audit):
- **All 11 targeted CSS properties verified.** Every item from A1–A7 and B2–B8 is correctly implemented in `index.css` and the relevant TSX files.
- **`.btn-delete` pattern codified.** `docs/style_guide.md` Section 4 (Action Elements) already contained the full `.btn-delete` destructive-deferred pattern — Q1 decision correctly applied.
- **`--text-muted` palette mismatch resolved.** Style guide table corrected from `#7A7875` to `#6A6764` (matches CSS root and improves WCAG AA compliance).
- **Delete modal tab order corrected.** DOM order swapped to Cancel → Delete, satisfying WCAG 3.2.4 "safe action first" convention. Visual order unaffected (`flex-end` layout).

### Follow-on Items (logged, not blocking):
- **`.plate-frame` keyboard focus gap** (pre-existing): The `<div>` with `cursor: zoom-in` is not keyboard-focusable. The blueprint's Section 7 claim that "keyboard users who tab to the plate frame will activate zoom via Enter" was incorrect. Should be refactored to `<button>` or receive `role="button" tabIndex={0}` in a future accessibility pass.
- **`.btn-delete` color-blindness signal** (enhancement): The destructive hover relies solely on color change. A secondary signal (e.g., `text-decoration-style: wavy`) would benefit protanopia users. Logged for the next accessibility audit cycle.

### Review Notes & Suggestions:
- Full original audit documented in `docs/curating-ui/audit_detail_and_scriptorium_2026-03-20.md`.
- Style guide updated. Both follow-on items above are pre-existing or enhancement-level concerns; they do not block Completed status.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified — Re-audit Passed (2026-03-20)

### Audit Findings (Verification Re-audit):
- **A4/CD-H3 — Plate caption:** `"PLATE V"` fully removed. Caption now renders `{(mainImage?.label || 'OBVERSE').toUpperCase()} // 2:1 SCALE`. Correct per professional cataloguing convention (BMC, SNG, Sear).
- **A5/CD-M1 — Provenance separation:** Two fully independent conditional `numismatic-section` blocks confirmed in `CoinDetail.tsx`. Compliant with ICOM Object Cataloguing Standards Section 3.5 (Provenance) and Section 3.7 (Interpretive Notes).
- **B1/SC-C1 — Meta line mode discrimination:** `#NEW` in add mode, zero-padded real ID in edit mode. Era fallback `'ANCIENT'` and metal fallback `'—'` both confirmed correct.
- **Curator's Note paragraph wrapping:** `coin.story.split('\n')` with quoted `<p>` elements renders correctly. Consistent with annotated sales catalogue conventions (CNG, Nomos AG).

### Review Notes & Suggestions:
- No historical accuracy or cataloguing compliance concerns. All items verified against implemented code.
- Minor pre-existing observation: a trailing newline in `coin.story` would produce an empty quoted `<p>`. Not introduced by this blueprint; noted for future data-layer validation.

---

## 9. User Consultation & Decisions

### Open Questions:
1. Should `.btn-delete` hover color (`--error-red`) be used across all future destructive actions in the application, or remain scoped to this one instance? If universal, it should be codified in `style_guide.md` now.
2. The `#NEW` entry label in the Scriptorium meta line (B1) is a copy change. The current `#001` is also incorrect (it will always show `001` even for the 100th coin). Should the edit-mode label show the real entry ID (e.g., `#042`)?

### Final Decisions:
- **Q1 — `.btn-delete` scope:** Project-wide standard. The pattern is now documented in `docs/style_guide.md` (Section 4, Action Elements) as the canonical "Destructive Action" treatment. Apply `.btn-delete` to any action that permanently removes data.
- **Q2 — Scriptorium meta line ID:** Show `#NEW` in add mode; show the real zero-padded coin ID (e.g., `#042`) in edit mode. Implemented by adding a `coinId?: number` prop to `LedgerForm`, passed from `Scriptorium` via `coin?.id`.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-20
**Outcome:** Completed — all 15 findings resolved, 71/71 tests passing, TypeScript clean.

### Summary of Work
- 15 UI findings across `CoinDetail.tsx`, `LedgerForm.tsx`, `Scriptorium.tsx`, and `index.css` resolved.
- New `LedgerForm.test.tsx` created (9 tests) — satisfied Colocation Rule retroactively.
- Delete modal tests, edit-mode nav test, and `coinId` branch tests added to existing suites (13 net new tests across 3 files).
- `docs/style_guide.md` `--text-muted` palette value corrected (`#7A7875` → `#6A6764`).
- Delete modal DOM order corrected for WCAG 3.2.4 compliance (Cancel before Delete in tab order).

### Pain Points
- The original blueprint "Colocation Check" section stated "No new test files required," which was incorrect — `LedgerForm.tsx` had no test file at all. Future blueprints should explicitly audit for missing test files on components in scope.
- The blueprint's Section 7 accessibility note ("keyboard users who tab to the plate frame will activate zoom via Enter") was inaccurate — the `.plate-frame` `<div>` is not keyboard-focusable. Accessibility claims in blueprints must be verified against the DOM, not assumed.

### Things to Consider
- **`.plate-frame` keyboard focus:** Should be refactored to a `<button>` or receive `role="button" tabIndex={0} onKeyDown` in a future dedicated accessibility pass.
- **`.btn-delete` color-blindness signal:** A secondary non-color hover signal (e.g., wavy underline) should be considered in the next accessibility audit cycle.
- **Core Doc Revision:** `docs/style_guide.md` Section 4 (Action Elements) already contained `.btn-delete` documentation — Q1 decision was pre-applied correctly. The `--text-muted` correction was the only outstanding style guide update, and it has been applied.
