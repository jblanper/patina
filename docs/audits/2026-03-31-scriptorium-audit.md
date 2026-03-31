# Curator's Audit: Scriptorium

**Date:** 2026-03-31 | **Mode:** Case B (Review — Existing UI Refinement)
**Scope:** `/scriptorium/add` and `/scriptorium/edit/:id` routes
**Files reviewed:** `Scriptorium.tsx`, `LedgerForm.tsx`, `PlateEditor.tsx`, `useCoinForm.ts`, `index.css` (lines 772–1543), `en.json`, `validation.ts`, `types.ts`

---

## Theme 1 — Form Logic & Hook Gaps

### F-01 · Bug: `era` validation error never surfaces 🔴 Critical

**Finding:** `era` is the only required field besides `title` in `NewCoinSchema` (`z.string().min(1)`). Yet `LedgerForm.tsx` never renders an error hint for it. `title`, `weight`, and `diameter` all have `{errors.X && <span className="error-hint">}` blocks. The `AutocompleteField` for `era` receives no `error` prop and nothing is displayed if `era` fails validation. Users who attempt to submit without an era will be silently rejected — form highlights nothing, no message appears.

**Recommendation:** Propagate `errors.era` to the `era` `AutocompleteField` and add an adjacent `error-hint` span, matching the pattern on `title` and `weight`. Audit all `AutocompleteField` usages for the same gap.

---

### F-02 · `submitError` is never rendered 🟠 High

**Finding:** `useCoinForm` exposes `submitError` and `clearError`. `Scriptorium.tsx` destructures neither. If the `addCoin` or `updateCoin` IPC call fails (network error, DB error, Zod rejection), the form silently returns without any visible message.

**Recommendation:** Destructure `submitError` / `clearError` in `Scriptorium.tsx` and render a dismissible error banner above the submit button — using an existing `error-hint` or a new `submission-error` class with `role="alert"`.

---

### F-03 · "Draft Preserved" label is misleading in edit mode 🟡 Medium

**Finding:** The draft auto-save is explicitly disabled for edits (`if (initialCoin) return;`), but the header `.draft-status` still shows `t('scriptorium.draftPreserved')` when `!isSaving` in edit mode. Users editing an existing record see "Draft Preserved" when no draft is being saved at all.

**Recommendation:** Conditionally render the draft status text. In add mode: show "Draft Preserved" / "Indexing…". In edit mode: show nothing, or a neutral "Editing Record" indicator.

---

### F-04 · No unsaved-changes warning on navigation away (edit mode) 🟠 High

**Finding:** In edit mode, the `← Close Ledger Entry` button calls `navigate(-1)` with no guard. Edits are not auto-saved, so a misclick loses all work. This violates the archival precision the product promises.

**Recommendation:** Track a `isDirty` flag (compare `formData` to `initialCoin`). On navigate-away when dirty, show a confirmation modal ("Unsaved changes will be lost. Continue?") using the existing modal pattern from `CoinDetail`. This applies only in edit mode — add mode already has draft auto-save as a safety net.

---

### F-05 · `clearDraft` not exposed in the UI 🟡 Medium

**Finding:** `useCoinForm` exports `clearDraft()` but no button or affordance in `Scriptorium.tsx` calls it. A user filling out a new coin form who wants to discard everything and start over has no mechanism to do so — the draft persists in `localStorage` across sessions.

**Recommendation:** Add a "Discard Draft" ghost/secondary action in the header, visible only in add mode when `formData` has any populated fields. Confirm before clearing.

---

## Theme 2 — LedgerForm: Field Hierarchy & UX

### L-01 · No visual indicator for required fields 🟠 High

**Finding:** `title` and `era` are required by the schema, but no visual cue differentiates them from the 20+ optional fields. The collector cannot anticipate which fields will block submission.

**Recommendation:** Add a subtle mandatory indicator — a thin Burnt Sienna dot or `*` beside the `title` `input-h1` and the `era` subtitle label. Accompany with a single line below the form title: `* Required to index.` Keep it minimal — this is an archival ledger, not a form wizard.

---

### L-02 · `year_display` and `year_numeric` placement causes confusion 🟡 Medium

**Finding:** `year_display` (free text date like "440 BC") is in the subtitle-stack with Era/Mint/Issuer, while `year_numeric` (a sortable integer CE year) is buried at position 8 in the metrics grid. These two fields are conceptually paired — one is the display representation, the other is a machine-sortable anchor. Their separation across two zones implies they are unrelated concepts.

**Recommendation:** Group them adjacently, either both in the subtitle-stack or both in the metrics grid. A labeling pattern like: `Date` (free text) / `Year CE` (numeric) side-by-side with a brief visual connector would communicate the relationship.

---

### L-03 · `provenance` is a single-line `input-metric` 🟡 Medium

**Finding:** Provenance in numismatics often spans multiple auction houses, previous owners, and exhibition records (e.g., *"Ex. BCD Collection, CNG 2019, Lot 412; Ex. Künker 2017"*). The current `input-metric provenance-input` is a single-line text input — insufficient for real-world provenance chains.

**Recommendation:** Convert `provenance` to an `input-block` textarea, matching the `edge_desc` and `story` patterns. Keep `resize: vertical` to let users expand as needed.

---

### L-04 · Metrics grid 8th item sits alone in third row 🟡 Medium

**Finding:** `.metrics-grid` is `repeat(3, 1fr)` on desktop (3 columns). With 8 items, the layout produces rows of 3/3/2, leaving `year_numeric` isolated in the bottom-left cell of row 3, right-side cells empty.

**Recommendation:** Either (a) re-sequence fields so natural row breaks align with logical groups, or (b) restructure to `repeat(2, 1fr)` for the metrics grid. Alternatively, if L-02 is addressed and `year_numeric` moves to the subtitle-stack, this resolves to 7 items — still awkward. Consider a dedicated 2-column "Dates" row in the subtitle-stack instead.

---

### L-05 · `purchase_price` placeholder not localized 🟡 Medium

**Finding:** `placeholder="0.00"` is hardcoded in JSX (`LedgerForm.tsx:384`), not via `t()`. All other placeholders use the i18n system.

**Recommendation:** Add `"cost": "0.00"` to the `ledger.placeholders` section in both `en.json` and `es.json` and reference it via `t('ledger.placeholders.cost')`.

---

### L-06 · `purchase_date` uses unvalidated free text 🟡 Medium

**Finding:** `purchase_date` is `type="text"` with placeholder "YYYY-MM-DD". The schema accepts any string. Users can enter "last Tuesday" — making future date-based sorting or filtering unreliable.

**Recommendation:** Change to `type="date"` for native ISO `YYYY-MM-DD` enforcement. Apply CSS to `input[type=date]` to match `.input-metric` aesthetics.

---

## Theme 3 — PlateEditor: Image Management

### P-01 · No image removal capability per slot 🟠 High

**Finding:** Once an image is assigned to a slot, it can only be replaced (via Lens) — never cleared. A user who mistakenly assigns the wrong image to the edge slot, or who wants to remove an image before saving, has no recourse without a new Lens capture.

**Recommendation:** Add a small `×` remove button on each filled slot (always visible, outside the hover overlay) that clears the slot. Style as a ghost icon in the plate caption area.

---

### P-02 · Replace button is hover-only (touch/keyboard inaccessible) 🟠 High

**Finding:** `.lens-cta-overlay` has `opacity: 0` and becomes visible only on `.plate-slot:hover`. On touch devices and for keyboard navigation, this overlay is never accessible.

**Recommendation:** Show a small persistent "Replace" text link beneath the image caption (always visible when slot is filled), in addition to or instead of the hover overlay.

---

### P-03 · Three equal-height full-width slots dominate the left folio 🟠 High

**Finding:** The `.plate-stack` renders three square (`aspect-ratio: 1`) full-width frames stacked vertically. On a 1280×800 desktop, this column becomes ~1400px tall. The Edge slot receives the same visual weight as Obverse, contrary to numismatic convention.

**Recommendation:** Restructure with a **primary plate** (Obverse, large) and a **secondary strip** (Reverse + Edge, smaller). This warrants a Three-Path visual proposal before implementation (see Blueprint SCR-03).

---

### P-04 · "Import from Digital Archive" permanently disabled 🟡 Medium

**Finding:** `btn-lens-minimal` with `disabled` attribute has been the state since launch. Users with coin photos on their machine have no path to attach them — the Lens (Wi-Fi) is the only photo onboarding path.

**Recommendation:** Implement local file import via `<input type="file" accept="image/jpeg,image/png,image/webp">` triggered by the existing button. Route through an IPC handler to copy the file into `data/images/coins/` and return a relative path.

---

### P-05 · Active-slot affordance is ambiguous 🟡 Medium

**Finding:** Clicking a slot sets it "active" (sienna border, full opacity) but the interface doesn't communicate that activation means "next Lens capture goes here." The connection is non-obvious.

**Recommendation:** When a slot is active and empty, show a small caption annotation: `← Next capture will land here` in `.font-mono` muted style.

---

## Theme 4 — Accessibility

### A-01 · QR dialog missing `aria-labelledby` and focus trap 🟡 Medium

**Finding:** The QR overlay (`role="dialog" aria-modal="true"`) has no `aria-labelledby` pointing to a heading, and does not trap keyboard focus within the dialog.

**Recommendation:** Add an `id`-linked `<h2>` inside `.qr-container` (e.g., "Scan to capture [slot]") referenced via `aria-labelledby`. Implement a `useEffect`-based focus trap within the container while the QR is shown.

---

### A-02 · Required fields missing `aria-required` 🟡 Medium

**Finding:** `title` and `era` inputs lack `required` or `aria-required="true"`. Screen reader users get no indication these fields are mandatory.

**Recommendation:** Add `aria-required="true"` to the `title` input and propagate an `aria-required` prop through `AutocompleteField` to its underlying input for `era`.

---

## Theme 5 — Field Visibility Coherence

### V-01 · Visibility preferences not reflected in the form 🟡 Medium

**Finding:** `FieldVisibilityContext` governs fields shown in `CoinDetail`. `LedgerForm` does not consume `useFieldVisibility()` — all fields always show in the form. Fields toggled off in the view (`fineness`, `die_axis`, `edge_desc`, `provenance`, `acquisition`) still appear as active form fields.

**Recommendation:** Rather than hiding form fields (which risks silent data loss), add a **collapsed section** pattern for low-priority fields. Fields visibility-disabled in the system could render in a "Hidden Fields" accordion, collapsed by default.

---

## Summary Table

| ID | Area | Issue | Severity |
|----|------|--------|----------|
| F-01 | Form Logic | `era` validation error never shown | 🔴 Critical |
| F-02 | Form Logic | `submitError` not rendered | 🟠 High |
| P-01 | PlateEditor | No slot image removal | 🟠 High |
| P-02 | PlateEditor | Replace button hover-only | 🟠 High |
| P-03 | PlateEditor | 3 equal-weight full-width slots | 🟠 High |
| F-04 | Form Logic | No unsaved-changes guard (edit mode) | 🟠 High |
| L-01 | LedgerForm | No required-field indicators | 🟠 High |
| F-03 | Form Logic | "Draft Preserved" shown in edit mode | 🟡 Medium |
| F-05 | Form Logic | `clearDraft` not exposed in UI | 🟡 Medium |
| L-02 | LedgerForm | `year_display`/`year_numeric` split across zones | 🟡 Medium |
| L-03 | LedgerForm | `provenance` single-line | 🟡 Medium |
| L-04 | LedgerForm | Metrics grid 8-item orphan | 🟡 Medium |
| L-05 | LedgerForm | `purchase_price` placeholder not i18n'd | 🟡 Medium |
| L-06 | LedgerForm | `purchase_date` unvalidated text | 🟡 Medium |
| P-04 | PlateEditor | File import permanently disabled | 🟡 Medium |
| P-05 | PlateEditor | Active-slot affordance unclear | 🟡 Medium |
| A-01 | A11y | QR dialog missing aria-labelledby + focus trap | 🟡 Medium |
| A-02 | A11y | Required fields missing `aria-required` | 🟡 Medium |
| V-01 | Visibility | Visibility preferences not reflected in form | 🟡 Medium |

---

## Proposed Blueprint Clusters

| Blueprint | Items | Scope |
|-----------|-------|-------|
| **SCR-01 · Scriptorium Bug Sprint** | F-01, F-02, L-01, L-05, A-02 | Small — pure fixes, ship fast |
| **SCR-02 · Form Completeness & Editing Integrity** | F-03, F-04, F-05, L-02, L-03, L-04, L-06, V-01 | One sprint — form behavior |
| **SCR-03 · PlateEditor Redesign** | P-01, P-02, P-03, P-04, P-05, A-01 | Larger — requires Three-Path visual proposal |
