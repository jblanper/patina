# Curator's Audit — Coin Detail & Scriptorium (v1.0)
*Manuscript Hybrid v3.3 compliance review*
*Date: 2026-03-20*

---

## Overall Assessment

Both pages demonstrate a coherent archival identity: the typography hierarchy is sound, the parchment palette is correctly applied, and the ledger folio structure is well-executed. However, both pages share a recurring structural weakness — **zone separation** — where distinct data categories (physical metrics, numismatic description, acquisition data) bleed into one another without clear visual boundaries. The Scriptorium additionally has a pattern inconsistency in the footer that breaks the form's own visual grammar.

---

## Coin Detail — Findings

### CD-C1 — Critical: No interaction affordance on the plate frame

**Location:** `.plate-frame` — `CoinDetail.tsx:89`, `index.css:588`

The plate frame has `cursor: zoom-in` (CSS-only) but no visible affordance that reveals this capability. A collector scanning the record will not discover the zoom modal — the interaction requires accidental discovery. The `zoom-in` cursor only appears on pointer hover, which provides no cue at all during casual reading. Given that image inspection is a primary use case for numismatists (checking die details, surface condition), this is a significant discoverability failure.

**Fix:** Add a hover overlay — mirroring the `.lens-cta-overlay` pattern already in the codebase. A subtle dark overlay with a magnifier symbol (`⌕` or an SVG icon) at `opacity: 0` transitioning to `opacity: 1` on hover is sufficient. No new CSS pattern is needed.

```css
.plate-frame::after {
  content: '⌕';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 41, 38, 0.15);
  color: white;
  font-size: 2.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.plate-frame:hover::after {
  opacity: 1;
}
```

---

### CD-H1 — High: Destructive action precedes primary action in header

**Location:** `CoinDetail.tsx:58–69`, `.header-actions { gap: 3rem }` — `index.css:176`

"Delete Record" appears before "Edit Record" in DOM order and visually. Both buttons use identical `btn-minimal` styling (same weight, same color, same underline treatment). This places a destructive action at equal visual weight to the primary workflow action. Cognitively, the first item in a scanning sequence is weighted as most important — placing Delete first trains muscle memory toward destruction.

**Fix (two-part):**
1. Reverse the order: `Edit Record` first, `Delete Record` second.
2. Add a hover-only color signal on Delete: `color: var(--error-red); border-color: var(--error-red)` on `.btn-delete:hover`. This demotes the action visually without breaking the archival aesthetic (it only surfaces on deliberate approach).

---

### CD-H2 — High: Metrics grid lacks zone separation from numismatic section

**Location:** `.metrics-grid` — `index.css:719`

The physical metrics (Weight, Diameter, Die Axis, Material, Fineness, Grade) have `margin-bottom: 2.5rem` but no bottom border. The `.numismatic-section` (Obverse/Reverse) begins immediately below with only whitespace as a boundary. The folio header establishes that major section transitions are bordered (`border-bottom: 2px solid var(--text-ink)`). The metrics-to-descriptions transition violates this convention.

In numismatic cataloguing, physical data and iconographic description are fundamentally distinct record categories. The visual grammar should reflect this.

**Fix:** Add `border-bottom: 1px solid var(--border-hairline)` to `.metrics-grid`. This creates a consistent ledger section break that mirrors the folio header's structural logic.

---

### CD-H3 — High: Plate caption "PLATE V" is hardcoded

**Location:** `CoinDetail.tsx:101`

```tsx
PLATE V // {mainImage?.label || 'OBVERSE'} // 2:1 SCALE
```

"PLATE V" is a constant string. In numismatic publication convention, the plate number refers to a physical reference plate (e.g., "Plate 42" in a Sear catalog). Using it as a hardcoded label here creates false archival authority — every coin in the collection is "Plate V." If there is no plate reference, the label should not appear.

**Fix:** Remove the hardcoded "PLATE V". Render only the dynamic portion:

```tsx
{(mainImage?.label || 'OBVERSE').toUpperCase()} // 2:1 SCALE
```

If a true plate reference system is added later (a `plate_ref` field on `CoinImage`), this can be restored dynamically.

---

### CD-M1 — Medium: Curator's Note and Provenance share a section container

**Location:** `CoinDetail.tsx:202–220`

Provenance and curatorial narrative are co-located in a single `numismatic-section` div. In archival cataloguing, provenance is acquisition chain data (former owners, auction records, legal compliance) — distinct from a curator's interpretive note. The current layout runs the italic curator quote directly into `PROVENANCE: EX. STACK'S BOWERS, JAN 2024` with only a `margin-top: 1.5rem` gap. There is no visual boundary.

**Fix:** Separate provenance into its own `numismatic-section` with its own `section-label`. This accurately reflects archival data taxonomy and allows either field to be omitted independently without layout collapse.

---

### CD-M2 — Medium: Footer data uses mixed font families

**Location:** `.ledger-footer`, `.footer-item` — `index.css:824`

`.footer-item strong` correctly uses `var(--font-mono)` for the labels ("Acquired:", "Cost:"). But the inline values (date string, price) fall back to `var(--font-sans)` — the body text default. Acquisition date and price are archival metrics and should be rendered in JetBrains Mono for precision and visual consistency with the metrics grid above.

**Fix:** Add `font-family: var(--font-mono)` to `.footer-item` directly (not just `strong`).

---

### CD-L1 — Low: Delete confirmation reuses `.export-result` class

**Location:** `CoinDetail.tsx:78`

The modal's button container uses `<div className="export-result">` — a class designed for the export toast workflow. The buttons render correctly, but this is fragile CSS coupling. A future change to `.export-result` would silently affect the delete modal.

**Fix:** Replace with a semantic class: `modal-actions` with `display: flex; gap: 1.5rem; justify-content: flex-end`.

---

## Scriptorium — Findings

### SC-C1 — Critical: Meta line renders `[AUTO-ERA]` and `[AUTO-ISSUE]` tokens

**Location:** `LedgerForm.tsx:15`

```tsx
ENTRY #001 // {formData.era?.toUpperCase() || '[AUTO-ERA]'} // {formData.metal?.toUpperCase() || '[AUTO-ISSUE]'}
```

Square-bracket fallback tokens read as debug output, not archival language. `[AUTO-ISSUE]` is prominently displayed while the metal field is empty (which is the case for every new coin on first load). Since `era` defaults to "Ancient", `[AUTO-ERA]` rarely appears — but `[AUTO-ISSUE]` is visible from the moment the form opens.

**Fix:** Replace square-bracket fallbacks with em-dashes, matching the convention used in the detail view:

```tsx
ENTRY #NEW // {formData.era?.toUpperCase() || 'ANCIENT'} // {formData.metal?.toUpperCase() || '—'}
```

Also change `#001` to `#NEW` for clarity — the entry doesn't yet have an ID at creation time.

---

### SC-H1 — High: Footer inline inputs break the form's own visual grammar

**Location:** `LedgerForm.tsx:221–253`

Every other field in the Scriptorium uses a consistent two-row pattern: label above, input below (subtitle-stack, metrics-grid, numismatic-section). The acquisition footer abruptly shifts to a horizontal inline pattern — `<strong>Acquired:</strong> <input>` — where label and input share a row.

This creates three problems:
1. Visual inconsistency — the footer looks like a different product than the form above it.
2. Input width compression — the inline label consumes horizontal space, leaving the input narrower.
3. Poor tab order coherence — the horizontal layout interrupts the top-to-bottom scanning rhythm.

**Fix:** Convert the footer to a three-column metrics-grid layout matching the physical data section above:

```tsx
<footer className="ledger-footer">
  <div className="metrics-grid">
    <div className="metric-item">
      <span className="metric-label">Acquired</span>
      <input type="text" className="input-metric" placeholder="YYYY-MM-DD" ... />
    </div>
    <div className="metric-item">
      <span className="metric-label">Source</span>
      <input type="text" className="input-metric" placeholder="e.g. CNG Auctions" ... />
    </div>
    <div className="metric-item">
      <span className="metric-label">Cost</span>
      <input type="number" className="input-metric" placeholder="0.00" ... />
    </div>
  </div>
</footer>
```

This brings the footer into alignment with the metrics-grid directly above it, creating a cohesive "ledger data" zone for all numerical/archival fields.

---

### SC-H2 — High: Fixed-width `.input-legend` breaks responsive contract

**Location:** `.input-legend { width: 250px }` — `index.css:1175`

`width: 250px` is a magic number that does not respect the right-folio's container width. Long legends (`IMP CAES HADRIANVS AUG`, `ΘΕΑΣ ΡΩΜΗΣ ΚΑΙ ΑΙΩΝΙΟΥ ΔΙΑΜΟΝΗΣ`) will overflow or clip the container at reduced window widths. The style guide mandates zero-overflow responsiveness.

**Fix:** Change to `width: 100%; max-width: 320px`. The wider max-width also gives Roman legends room to breathe without wrapping.

---

### SC-M1 — Medium: Plate slot stack gap is excessive, creating folio imbalance

**Location:** `.plate-stack { gap: 3rem }` — `index.css:933`

Three square plate frames with 3rem gaps between them create a left folio that extends significantly below the right folio's content area. This asymmetry is particularly visible on add (empty form), where the right folio is relatively compact and the left extends to fill vertical space with three large empty frames.

**Fix:** Reduce to `gap: 2rem`. This preserves the Expansive Rule (minimum 2rem component gap) while reducing the left-folio overhang.

---

### SC-M2 — Medium: All three plate slots have identical visual weight (no obverse primacy)

**Location:** `PlateEditor.tsx`, `.plate-slot { opacity: 0.6 }` — `index.css:942`

All three slots (Obverse, Reverse, Edge) render at `opacity: 0.6` with identical visual treatment. In numismatic convention, the obverse is always the primary face — the portrait or deity side that defines the coin's identity. There is no visual signal that the collector should capture the obverse first.

**Fix:** Give the first slot (Obverse) full opacity by default:

```css
.plate-slot:first-child {
  opacity: 1;
}
```

This inverts the convention: Obverse is always active and ready; Reverse and Edge are secondary, revealed at `opacity: 0.6` until interacted with.

---

### SC-M3 — Medium: Subtitle label column too narrow for "DENOMINATION"

**Location:** `.subtitle-stack { grid-template-columns: 100px 1fr }` — `index.css:1071`

"DENOMINATION" at `0.7rem` / `letter-spacing: 1.5px` / `font-weight: 500` spans approximately 98–105px. The fixed `100px` column creates a layout risk — the label either clips or wraps to a second line, breaking the grid's visual rhythm. This is a precision issue for a precision-first application.

**Fix:** Increase label column to `min-content` or a fixed `130px`:

```css
.subtitle-stack {
  grid-template-columns: 130px 1fr;
}
```

---

### SC-L1 — Low: Footer lacks a top border separator from provenance

**Location:** `.ledger-footer { padding-top: 2.5rem }` — `index.css:824`

The provenance input is the last field of the final `numismatic-section`. The footer begins immediately below with only padding as a boundary. The folio establishes that major section transitions use a hairline (`border-bottom` on `.folio-header`, etc.). The footer — which marks the transition from descriptive to financial/administrative data — warrants the same treatment.

**Fix:** Add `border-top: 1px solid var(--border-hairline)` to `.ledger-footer`.

---

### SC-L2 — Low: Empty plate frames are nearly invisible with dashed hairline border

**Location:** `.plate-frame-edit { border: 1px dashed var(--border-hairline) }` — `index.css:955`

`--border-hairline` (#E0DCCD) on `--stone-pedestal` (#F0EDE6) background yields a contrast ratio of approximately 1.5:1. At `opacity: 0.6`, the empty frame borders become virtually invisible. The upload-zone convention (dashed border) is well-established, but it must be legible to communicate intent.

**Fix:** Change empty slot border to `1px dashed var(--text-muted)`. This is still clearly subordinate to the active slot's solid accent border while being legible.

---

## Compliance Summary

| Criterion | Coin Detail | Scriptorium |
|---|---|---|
| Cormorant for titles, Mono for metrics | ✓ Pass | ✓ Pass |
| Folio split 45/55 responsive grid | ✓ Pass | ✓ Pass |
| Section transitions bordered | ✗ Fail — CD-H2 | ✗ Fail — SC-L1 |
| Hardcoded/debug text absent | ✗ Fail — CD-H3 | ✗ Fail — SC-C1 |
| Interactive affordances visible | ✗ Fail — CD-C1 | — |
| Destructive action order | ✗ Fail — CD-H1 | N/A |
| Form pattern consistency | N/A | ✗ Fail — SC-H1 |
| Zero-overflow responsiveness | ✓ Pass | ✗ Fail — SC-H2 |
| Obverse visual primacy | N/A | ✗ Fail — SC-M2 |
| Footer font family consistency | ✗ Fail — CD-M2 | Uses mono ✓ |

---

## Priority Order for Remediation

### Coin Detail
1. **CD-C1** — Add plate frame zoom affordance overlay
2. **CD-H1** — Reverse button order + hover-only delete color signal
3. **CD-H2** — Add `border-bottom` to `.metrics-grid`
4. **CD-H3** — Remove hardcoded "PLATE V" from caption
5. **CD-M1** — Separate provenance into its own section
6. **CD-M2** — `font-family: var(--font-mono)` on `.footer-item`
7. **CD-L1** — Replace `export-result` class with `modal-actions`

### Scriptorium
1. **SC-C1** — Replace `[AUTO-ISSUE]` with `—` fallback; `#001` → `#NEW`
2. **SC-H1** — Convert footer to `metrics-grid` pattern
3. **SC-H2** — `input-legend` to `width: 100%; max-width: 320px`
4. **SC-M1** — Reduce `.plate-stack` gap to `2rem`
5. **SC-M2** — First plate slot full opacity by default
6. **SC-M3** — Subtitle label column to `130px`
7. **SC-L1** — `border-top` on `.ledger-footer`
8. **SC-L2** — Empty slot dashed border to `var(--text-muted)`
