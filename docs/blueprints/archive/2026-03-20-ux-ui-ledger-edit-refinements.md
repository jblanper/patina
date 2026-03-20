# Implementation Blueprint: UX-UI Ledger & Edit Coin Refinements

**Date:** 2026-03-20  
**Status:** Completed  
**Reference:** N/A (Standalone UX/UI task)

## 1. Objective
Implement UX/UI adjustments across two pages:
1. **Ledger Page (Cabinet):** Remove "The Cabinet" title, update header to "Patina — The Cabinet", move CTAs above collection count text
2. **Ledger Page (Filters):** Redesign filters with visible checkbox controls while maintaining Patina's archival aesthetic
3. **Edit Coin Page (LedgerForm):** Align all subtitle field values (Era, Minted at, Year, Issuer, Denomination, Reference) to start at the same vertical line

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Filters use understated checkbox controls; form fields use grid alignment per style guide
- [x] **Privacy First:** No external assets or telemetry introduced
- [x] **Single-Click Rule:** CTAs moved to top for faster access; filters remain single-click toggle

## 2. Technical Strategy

### 2.1 Cabinet Page (`src/renderer/components/Cabinet.tsx`)

| Change | Description |
|--------|-------------|
| Remove title | Delete `<h2 className="cabinet-title">The Cabinet</h2>` (line 56) |
| Update header | Change `<h1>Patina</h1>` to `<h1>Patina — The Cabinet</h1>` (line 40) |
| Reorder CTAs | Move `.cabinet-toolbar` div to appear before `.cabinet-subtitle` div |

**Before:**
```tsx
<header className="cabinet-header">
  <div>
    <h2 className="cabinet-title">The Cabinet</h2>          {/* REMOVE */}
    <p className="type-body cabinet-subtitle">...</p>        {/* MOVE DOWN */}
  </div>
  <div className="cabinet-toolbar">...</div>                  {/* MOVE UP */}
</header>
```

**After:**
```tsx
<header className="cabinet-header">
  <h1>Patina — The Cabinet</h1>                              {/* NEW */}
  <div className="cabinet-toolbar">...</div>                  {/* CTA FIRST */}
  <p className="type-body cabinet-subtitle">...</p>           {/* TEXT SECOND */}
</header>
```

### 2.2 Filter Redesign (`src/renderer/components/PatinaSidebar.tsx` + CSS)

**Component Changes:**
- Wrap each filter item in `<label>` element for clickable checkbox
- Add visually hidden `<input type="checkbox">` for actual checkbox functionality
- Retain `aria-pressed` on button for keyboard accessibility
- Update toggle logic to read from checkbox state

**Visual Design:**
```
┌─ ERAS ───────────────────────────┐
│  [x] Ancient                       │  ← checked: accent fill + check
│  [ ] Medieval                      │  ← unchecked: hairline border
│  [ ] Modern                        │
└───────────────────────────────────┘
```

**CSS Changes (`index.css`):**

```css
/* Filter group container - no heavy borders */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-hairline);
}

.filter-group:last-child {
  border-bottom: none;
}

/* Filter list - reset ul */
.filter-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Filter item - label wrapper for checkbox */
.filter-item-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  margin-left: -0.6rem;
  border-left: 2px solid transparent;
  transition: all 0.2s ease;
}

.filter-item-label:hover {
  background: var(--stone-pedestal);
  color: var(--accent-manuscript);
}

.filter-item-label.active {
  color: var(--accent-manuscript);
  font-weight: 600;
  border-left: 2px solid var(--accent-manuscript);
  background: var(--stone-pedestal);
}

/* Custom checkbox */
.filter-checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-hairline);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.filter-item-label.active .filter-checkbox {
  background: var(--accent-manuscript);
  border-color: var(--accent-manuscript);
}

.filter-checkbox::after {
  content: '';
  width: 8px;
  height: 8px;
  background: white;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.filter-item-label.active .filter-checkbox::after {
  opacity: 1;
}

/* Hidden native checkbox for accessibility */
.filter-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Filter text */
.filter-text {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--text-ink);
}

.filter-item-label.active .filter-text {
  color: var(--accent-manuscript);
}
```

### 2.3 Edit Coin Field Alignment (`src/renderer/components/LedgerForm.tsx`)

**CSS Changes (`index.css`):**

```css
/* Grid layout for subtitle fields */
.subtitle-stack {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.75rem 2rem;
  margin-bottom: 1.5rem;
}

.subtitle-item {
  display: contents;
}

.subtitle-label {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  font-weight: 500;
  display: flex;
  align-items: baseline;
  padding-top: 0.1rem;
}

/* Inputs and selects in subtitle - all align at same column */
.subtitle-stack .input-sub,
.subtitle-stack select.input-sub {
  border: none;
  border-bottom: 1px dashed var(--border-hairline);
  background: transparent;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--text-muted);
  font-style: italic;
  width: 100%;
  outline: none;
  padding: 0;
}

.subtitle-stack .input-sub:focus,
.subtitle-stack select.input-sub:focus {
  border-bottom-style: solid;
  color: var(--text-ink);
}
```

**Component Changes (`LedgerForm.tsx`):**
- **Important:** The Era field (currently lines 28-39, outside `.subtitle-stack`) needs to be moved inside `.subtitle-stack` for full grid alignment of all subtitle fields
- Remove `max-width: 400px` from `.input-sub` in existing CSS to allow values to fill available space
- The Era `<select>` should use `select.input-sub` class to match the grid styling

## 3. Verification Strategy (Quality Oversight)

- **Testing Plan:**
  - Visual verification: Filters display checkbox states correctly
  - Visual verification: Form fields align vertically
  - Visual verification: CTAs appear above collection count
  - Functional: Checkbox filters still toggle correctly and update results
- **Colocation Check:** No new components or hooks created
- **Mocking Strategy:** N/A - UI-only changes

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Changes are UI-only; no cross-process communication or type changes
- **Abstraction:** No business logic introduced; pure presentational changes

### Review Notes & Suggestions:
- Verified: No architectural concerns identified. Changes are purely presentational CSS and component markup.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** N/A - no IPC or data validation changes; filter state managed via React props within sandboxed Renderer
- **Protocols:** N/A - no protocol changes
- **CSP Compliance:** Verified - no inline handlers, no external resources, no `dangerouslySetInnerHTML`
- **XSS Prevention:** Verified - all rendered values are React-escaped or static strings

### Review Notes & Suggestions:
- Accessibility note: If using native checkbox inputs, ensure `aria-checked` (not `aria-pressed`) is applied; current blueprint's visually-hidden checkbox pattern preserves button semantics correctly

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Coverage Check:** N/A - UI-only template changes; no existing tests for Cabinet, PatinaSidebar, or LedgerForm components
- **Async Safety:** N/A - no async operations introduced

### Review Notes & Suggestions:
- CSS changes present minimal risk since there are no component tests that could break
- The Era field (LedgerForm.tsx:28-39) is currently outside `.subtitle-stack` and may need separate styling for full vertical alignment

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:
- **Filter Checkbox Design:** The 1px hairline border on `.filter-checkbox` is consistent with the style guide's border standard (`--border-hairline`). No drop shadows are introduced; state changes use background shifts (`--stone-pedestal`) per "Elevation" rule. This is a justified trade-off - the "Archival Labels" approach is intentionally overridden for user clarity per Section 9's explicit decision.
- **Form Field Alignment:** CSS grid with `border-bottom: 1px dashed var(--border-hairline)` complies with "Underlined only (border-bottom). No side or top borders." The dashed style is an acceptable stylistic variation.
- **Accessibility:** Native `<input type="checkbox">` preserved (visually hidden) with ARIA attributes, ensuring screen reader support.

### Review Notes & Suggestions:
- **Approved with documentation note:** Per the blueprint's own suggestion (Section 10), consider adding a formal exception to `docs/style_guide.md` for checkbox-based filters. This prevents future conflicts during style guide reviews and documents the deliberate trade-off.
- The checkbox's `::after` pseudo-element uses `background: white` for the checkmark - verify this white contrast is acceptable against `--accent-manuscript` fill in all contexts (especially high-contrast modes).

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings:
- **Historical Accuracy:** N/A - no coin data or terminology changes
- **Collector UX:** Filters now clearly indicate selection state via visible checkboxes; form fields align for easier data entry

### Review Notes & Suggestions:
1. **Cabinet Header:** Removing redundant h2 title and moving CTAs above collection count is appropriate. Professional collectors benefit from faster access to Export/Catalog functions.

2. **Filter Checkboxes:** The checkbox design is a clear improvement. Current button-based filters rely solely on border-left + font-weight for active state. Visible checkboxes provide instant feedback for multi-filter selection (Era + Metal combinations common in numismatic research).

3. **Form Field Alignment:** Blueprint CSS grid (`100px 1fr`) is correct. Full alignment requires moving the Era `<div className="subtitle-item">` (LedgerForm.tsx:28-39) inside `.subtitle-stack` (line 41). This structural change should be explicitly noted in the component changes section.

**Final Assessment:** All three UX improvements support professional coin collector workflows. The changes are low-risk, accessibility-preserving, and align with the Archival Ledger aesthetic.

---

## 9. User Consultation & Decisions

### Open Questions:
1. (None - all decisions made in initial conversation)

### Final Decisions:
- Filters must have visible checkbox controls for user clarity (overriding style guide's "archival label" approach)
- Form fields use single-column stack with grid alignment (not two-column layout)
- Style guide violations are acceptable where they improve user clarity

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-20  
**Outcome:** Success

### Summary of Work
- Updated Cabinet header to "Patina — The Cabinet"
- Removed redundant "The Cabinet" h2 title
- Moved CTAs (Export Archive, Generate Catalog, New Entry) above collection count text
- Redesigned filters with visible checkbox controls (checked = accent fill, unchecked = hairline border)
- Implemented form field grid alignment for Edit Coin page (Era, Minted at, Year, Issuer, Denomination, Reference all align vertically)
- Era field moved inside .subtitle-stack for proper grid alignment

### Verification Results
| Skill | Status |
|-------|--------|
| Security (`securing-electron`) | ✓ Pass - CSP compliant, no XSS risks |
| Quality (`assuring-quality`) | ✓ Pass - TypeScript compiles, no breaks |
| UI (`curating-ui`) | ✓ Pass - Style guide compliant with documented exception |
| Numismatic (`curating-coins`) | ✓ Pass - Collector UX improved |

### Pain Points
- Era field required structural change (moved from outside to inside .subtitle-stack)

### Things to Consider
- **Core Doc Revision:** Document checkbox-based filter design as exception to "Archival Labels" in `docs/style_guide.md` to prevent future style conflicts
- **Accessibility Testing:** Test `.subtitle-item { display: contents }` with screen readers to confirm label-input associations remain semantically linked
