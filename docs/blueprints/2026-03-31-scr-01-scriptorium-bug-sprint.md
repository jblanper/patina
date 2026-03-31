# Implementation Blueprint: SCR-01 · Scriptorium Bug Sprint

**Date:** 2026-03-31
**Status:** Draft
**Reference:** `docs/audits/2026-03-31-scriptorium-audit.md` — items F-01, F-02, L-01, L-05, A-02

---

## 1. Objective

Resolve five discrete correctness and accessibility defects in the Scriptorium identified during the 2026-03-31 audit. All changes are surgical and self-contained; no new UI patterns, no schema changes, no new IPC handlers.

| Audit ID | Severity | Description |
|----------|----------|-------------|
| F-01 | 🔴 Critical | `era` validation error never surfaces in the UI |
| F-02 | 🟠 High | `submitError` from `useCoinForm` is never rendered |
| L-01 | 🟠 High | No visual indicator for required fields (`title`, `era`) |
| L-05 | 🟡 Medium | `purchase_price` placeholder is hardcoded, bypassing i18n |
| A-02 | 🟡 Medium | Required inputs lack `aria-required="true"` |

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** Required-field indicators use a single Burnt Sienna dot — minimal, unobtrusive, consistent with the manuscript palette. No form-wizard chrome is introduced.
- [x] **Privacy First:** No external resources. All changes are renderer-only (except the i18n JSON files).
- [x] **Single-Click Rule:** No new navigation or interaction surfaces are added.

---

## 2. Technical Strategy

### 2.1 F-01 — `era` error propagation

**File:** `src/renderer/components/AutocompleteField.tsx`

`AutocompleteField` already accepts a `required?: boolean` prop (declared but unused in the interface). Add an `error?: string` prop to the interface and apply `autocomplete-input--error` CSS class on the input when `error` is truthy. Do not use the existing `autocomplete-input` class for error state — keep class separation clean.

```typescript
// AutocompleteFieldProps addition
error?: string;
```

Apply to the inner `<input>`:
```tsx
className={`autocomplete-input${error ? ' autocomplete-input--error' : ''}`}
```

**File:** `src/renderer/components/LedgerForm.tsx`

After the `era` `AutocompleteField`, add an error-hint span matching the existing pattern:
```tsx
<AutocompleteField
  field="era"
  error={errors.era}
  ...
/>
{errors.era && <span className="error-hint">{errors.era}</span>}
```

**Audit all other `AutocompleteField` usages** in `LedgerForm.tsx` (mint, denomination, die_axis, metal, grade, rarity) and confirm none are required by `NewCoinSchema`. Currently only `era` and `title` are required — no further propagation needed for this sprint. Document this in the retrospective.

**CSS addition** (`src/renderer/styles/index.css`):
```css
.autocomplete-input--error {
  border-bottom-color: var(--error-red);
}
```

---

### 2.2 F-02 — Submit error banner

**File:** `src/renderer/components/Scriptorium.tsx`

Destructure `submitError` and `clearError` from `useCoinForm`. Render a dismissible banner between the header and the ledger layout:

```tsx
{submitError && (
  <div className="submission-error" role="alert">
    <span>{submitError}</span>
    <button className="submission-error-dismiss" onClick={clearError} aria-label={t('scriptorium.dismissError')}>×</button>
  </div>
)}
```

**CSS addition** (`src/renderer/styles/index.css`):
```css
.submission-error {
  background: rgba(180, 50, 30, 0.08);
  border-left: 3px solid var(--error-red);
  padding: 0.75rem 1.25rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--error-red);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.submission-error-dismiss {
  background: none;
  border: none;
  color: var(--error-red);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
```

**i18n addition** (`en.json` and `es.json` — `scriptorium` section):
```json
"dismissError": "Dismiss error"
```

---

### 2.3 L-01 — Required field indicators

**File:** `src/renderer/components/LedgerForm.tsx`

Add a `<span className="required-dot" aria-hidden="true">*</span>` immediately after the `.input-h1` input group and the `era` `.subtitle-label` span. Add a single footnote below the `.input-group`:

```tsx
<p className="required-note">{t('ledger.requiredNote')}</p>
```

**CSS addition** (`src/renderer/styles/index.css`):
```css
.required-dot {
  color: var(--accent-sienna);
  font-size: 0.7rem;
  margin-left: 0.2rem;
  vertical-align: super;
}
.required-note {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: -1rem;
  margin-bottom: 1.5rem;
}
```

**i18n addition** (`en.json` / `es.json` — `ledger` section):
```json
"requiredNote": "* Required to index"
```

---

### 2.4 L-05 — `purchase_price` placeholder i18n

**File:** `src/renderer/i18n/locales/en.json`

Add to `ledger.placeholders`:
```json
"cost": "0.00"
```

**File:** `src/renderer/i18n/locales/es.json`

Add to `ledger.placeholders`:
```json
"cost": "0.00"
```

**File:** `src/renderer/components/LedgerForm.tsx`

Replace hardcoded `placeholder="0.00"` on the `purchase_price` input with:
```tsx
placeholder={t('ledger.placeholders.cost')}
```

---

### 2.5 A-02 — `aria-required` on mandatory inputs

**File:** `src/renderer/components/AutocompleteField.tsx`

The existing `required?: boolean` prop is declared but not forwarded to the inner `<input>`. Forward it:
```tsx
<input
  ...
  aria-required={required ?? false}
/>
```

**File:** `src/renderer/components/LedgerForm.tsx`

1. Add `aria-required="true"` to the `title` `<input>` element.
2. Pass `required={true}` to the `era` `AutocompleteField` (which will then set `aria-required="true"` on its inner input via the fix above).

---

## 3. Verification Strategy

### Test Cases

**`LedgerForm.test.tsx`** — extend existing test suite:

1. **F-01:** Submit form with empty `era`, verify `error-hint` span with class `error-hint` appears beneath the era `AutocompleteField`.
2. **F-01:** Confirm no other `AutocompleteField` in the form shows an error-hint when only `era` is empty.
3. **F-02:** Mock `window.electronAPI.addCoin` to reject. Submit valid form. Verify element with `role="alert"` containing the error message is rendered. Click dismiss button. Verify alert is removed.
4. **L-01:** Render form. Query for `.required-dot` elements — expect exactly 2 (title, era). Query for `.required-note` — expect 1.
5. **L-05:** Render form. Query the `purchase_price` input. Verify `placeholder` attribute equals `t('ledger.placeholders.cost')`.
6. **A-02:** Render form. Query `title` input — assert `aria-required="true"`. Query era's inner autocomplete input — assert `aria-required="true"`.

**`AutocompleteField.test.tsx`** (collocated — create if absent):

7. Render with `error="some error"` — confirm inner `<input>` has class `autocomplete-input--error`.
8. Render with `required={true}` — confirm inner `<input>` has `aria-required="true"`.

### Colocation Check
- Tests live in `src/renderer/components/__tests__/` alongside components. ✓
- No new test infrastructure needed.

### Mocking Strategy
- `window.electronAPI` global mock in `setupTests.ts`, cleared in `beforeEach`. ✓
- For F-02 test: `window.electronAPI.addCoin = vi.fn().mockRejectedValue(new Error('DB write failed'))`.
- `react-i18next` global mock resolves keys to English. ✓

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Pending

### Audit Findings:
- **System Integrity:** All changes are renderer-only. No new IPC handlers, no schema changes, no new shared types. Cross-process boundary is not touched.
- **Abstraction:** `submitError` is already produced by `useCoinForm` at the hook layer. Surfacing it in `Scriptorium.tsx` is correct — business logic stays in the hook, presentation in the component.

### Review Notes & Suggestions:
- The `AutocompleteField` `required` prop was declared but ignored since the component was authored. This sprint should close that gap cleanly. Confirm the prop is forwarded to `aria-required` (not `required` native attribute) to avoid unintended browser-native validation behaviour conflicting with the custom Zod path.
- Verify `clearError` is called in `handleSubmit` before each new submission attempt to prevent a stale error from a previous attempt persisting on screen.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Pending

### Audit Findings:
- **The Filter:** No new IPC handlers. No new data crosses the process boundary. No Zod schema changes required.
- **Protocols:** No changes to `patina-img://` or any file system access.

### Review Notes & Suggestions:
- The `submission-error` banner renders `submitError` string from the hook. Confirm the error message is never user-supplied or DB-derived in a way that could include HTML. The current `catch` block in `useCoinForm.submit` uses `err instanceof Error ? err.message : 'Submission failed'` — this is internal, not attacker-controlled. No XSS risk.
- No additional security concerns for this sprint.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Pending

### Audit Findings:
- **Coverage Check:** `LedgerForm.tsx` requires ~80% statement coverage. Adding 6 new test cases for this sprint will strengthen coverage materially. `AutocompleteField.tsx` is a shared component — its new `error` and `required` paths must be covered.
- **Async Safety:** F-02 test uses `mockRejectedValue` — the test must `await` the submit action and use `findByRole('alert')` rather than a sync query.

### Review Notes & Suggestions:
- Create `src/renderer/components/__tests__/AutocompleteField.test.tsx` if it does not exist. The component has grown beyond what is safe to leave untested.
- The `dismissError` handler clears state synchronously — use `waitFor(() => expect(queryByRole('alert')).not.toBeInTheDocument())` to confirm removal after click.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** The `required-dot` (`*`) in Burnt Sienna (`var(--accent-sienna)`) is consistent with the manuscript palette. The `required-note` in muted mono uppercase aligns with the `.meta-line` and `.plate-caption` typographic voice.
- **Accessibility:** `role="alert"` on the submission error banner ensures screen readers announce it immediately on injection. The `aria-hidden="true"` on `.required-dot` prevents screen readers from reading the asterisk out of context (the `aria-required` attribute handles semantics).

### Review Notes & Suggestions:
- Confirm `var(--accent-sienna)` exists in the CSS custom properties, or substitute `var(--accent-manuscript)` (Burnt Sienna `#914E32`) if the variable is named differently in `index.css`.
- The `.submission-error` banner should sit below the `.app-header` and above `.ledger-layout` — ensure it does not push the layout header scroll position. Test at narrow viewport widths.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Pending

### Audit Findings:
- **Historical Accuracy:** No coin data model changes. Not applicable.
- **Collector UX:** The silent failure on `era` omission (F-01) is the most damaging UX defect in this sprint. Era is the primary classification axis of any numismatic catalogue — Roman Imperial, Greek, Byzantine, Medieval etc. A collector who submits without it and receives no feedback will be confused. The fix correctly treats it with the same visual urgency as `title`.

### Review Notes & Suggestions:
- The `required-note` copy `"* Required to index"` is appropriate. "To index" is consistent with the Scriptorium's archival metaphor (the action button reads "Index to Ledger").
- Confirm the Spanish translation uses appropriate archival language: `"* Necesario para catalogar"` or `"* Obligatorio para indexar"`.

---

## 9. User Consultation & Decisions

### Open Questions:
1. Should `var(--accent-sienna)` be used for the required-dot, or `var(--accent-manuscript)`? The audit uses Burnt Sienna (`#914E32`) — confirm the CSS variable name in the current palette.
2. Should `clearError` be called automatically at the start of `handleSubmit` in `Scriptorium.tsx`, or only via the dismiss button? (Recommendation: both — auto-clear on new submission attempt, manual dismiss also available.)

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
- Confirm no other required fields have been added to `NewCoinSchema` since this audit. If the schema gains new required fields in future, the pattern established here (required-dot + aria-required + error-hint) must be applied consistently.
- **Core Doc Revision:** Update `docs/guides/testing_standards.md` to note that `AutocompleteField` now has a test suite and that `error` / `required` props must be covered in any future extensions.
