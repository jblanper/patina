# Style Fix Plan: CoinDetail Path B v2 Alignment

**Date:** 2026-03-16  
**Related Blueprint:** 2026-03-15-coin-detail-ledger-upgrade.md  
**Objective:** Align the implemented `CoinDetail` component styling with the approved mockup and ensure full mobile responsiveness.

---

## Problem Statement

The current `CoinDetail` implementation diverges significantly from the `proposal_coin_detail_path_b_v2.html` mockup in several areas:

- Class name mismatches
- Missing critical CSS styles (zoom modal, thumbnails, navigation)
- Incomplete responsive design
- Container/wrapper structure issues

---

## Detailed Analysis

### 1. CLASS NAME MISMATCHES

| Mockup Class | Implementation Class | Action |
| :--- | :--- | :--- |
| `.meta-line` | `.folio-meta` | Rename implementation |
| `.subtitle` | `.folio-subtitle` | Rename implementation |

**Impact:** These are structural class name changes that require updates in both `CoinDetail.tsx` and `index.css`.

---

### 2. MISSING CSS CLASSES

The following classes are fully defined in the mockup but absent or incomplete in `index.css`:

| Class | Purpose | Status |
| :--- | :--- | :--- |
| `.nav-back` | Back button styling (top left) | Missing |
| `.zoom-modal` | Full-screen image zoom overlay | Missing |
| `.zoom-content` | Modal content container | Missing |
| `.zoom-close` | Close button (×) | Missing |
| `.zoom-image` | Zoomed image | Missing |
| `.thumbnail-btn` | Thumbnail button wrapper | Missing |
| `.thumbnail-img` | Thumbnail image | Missing |
| `.main-image` | Main plate image | Missing |
| `.no-image-placeholder` | Placeholder when no image | Missing |
| `.back-btn` | Replacement for nav-back? | Different class |

**Action:** Add all missing styles with exact mockup specifications.

---

### 3. LAYOUT/STRUCTURE DIFFERENCES

**Mockup Structure:**
```html
<div class="browser-frame">
  <div class="frame-header">...</div>
  <div class="frame-content">
    <a class="nav-back">← Close</a>
    <div class="layout-grid">...</div>
  </div>
</div>
```

**Implementation Structure:**
```html
<div class="coin-detail-container">
  <button class="back-btn">← Close Ledger Entry</button>
  <div class="ledger-layout">...</div>
</div>
```

**Issues:**
- Implementation uses `<button>` instead of `<a>` for back navigation (functionally OK but semantically different)
- No `.browser-frame` wrapper with border, shadow, and max-width
- No `.frame-header` (mockup has browser chrome, but this is presentation-only; can skip)
- Classes: `.nav-back` vs `.back-btn` need alignment

**Decision:**  
We will keep the button (better accessibility) but style it like `.nav-back`. We'll add `.coin-detail-container` with appropriate max-width and centering to mimic the `.browser-frame` presentation layer.

---

### 4. RESPONSIVE DESIGN GAPS

**Current Breakpoint:**
```css
@media (max-width: 900px) { ... }
```

**Required Additional Breakpoints:**

| Breakpoint | Changes |
| :--- | :--- |
| **≥ 1200px** | Keep current 45% | 55% grid, max-width 1400px container |
| **900px–1199px** | Reduce padding: left/right folios: 2rem instead of 4rem |
| **768px–899px** | Stack grid: 1fr, adjust metrics to 2 columns, smaller fonts |
| **≤ 480px** | Full-width layout, 1 column metrics, stacked footer, touch optimization |

**Specific Mobile Requirements:**
- Metrics grid: 2 columns on tablet, 1 on mobile
- Footer: Stack vertically (grid-template-columns: 1fr) on mobile
- Plate frame: Smaller max-width (300px) on mobile
- Font size scaling with `clamp()` where needed
- Minimum touch target: 44px for buttons/thumbnails

---

### 5. TYPOGRAPHY & SPACING

**Verified from Mockup:**

| Element | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| `.meta-line` | Montserrat (Mono) | 0.75rem | 500 | 1 |
| `h1` (folio title) | Cormorant | 3.2rem | 700 | 1 |
| `.subtitle` | Cormorant | 1.4rem | 400 | 1 |
| `.metric-label` | Montserrat | 0.7rem | 500 | 1 |
| `.metric-value` | JetBrains Mono | 0.95rem | 400 | 1 |
| `.section-label` | JetBrains Mono | 0.75rem | 500 | 1 |
| `.desc-text` | Cormorant | 1.1rem | 400 | 1.5 |

**Implementation matches except for class renames.** Verify after renaming.

---

### 6. INTERACTIVE STATES

**Missing:**
- Hover/focus states for thumbnails (border color change)
- Zoom modal backdrop blur
- Close button hover effect
- Back button hover (mockup shows color + border transition)

**Action:** Add all interactive states to match mockup transitions.

---

## Implementation Plan (4 Phases)

### Phase 1: Foundation & Class Renames (Low Risk)
1. In `index.css`: Rename `.folio-meta` → `.meta-line`, `.folio-subtitle` → `.subtitle`
2. In `CoinDetail.tsx`: Update JSX to use `className="meta-line"` and `className="subtitle"`
3. Add `.coin-detail-container` with:
   ```css
   .coin-detail-container {
     max-width: 1400px;
     margin: 0 auto;
     background: var(--bg-manuscript);
     min-height: 100vh;
   }
   ```

### Phase 2: Missing Styles (Medium Risk)
4. Add `.back-btn` styles (merge `.nav-back` + button element support)
5. Add `.main-image` (width: 100%, height: auto, display: block)
6. Add `.no-image-placeholder` (centered text, muted color)
7. Add thumbnail styles:
   ```css
   .thumbnail-btn {
     border: 1px solid var(--border-hairline);
     background: none;
     padding: 0.25rem;
     cursor: pointer;
     transition: border-color 0.2s;
   }
   .thumbnail-btn.active { border-color: var(--accent-manuscript); }
   .thumbnail-img { width: 60px; height: 60px; object-fit: contain; }
   ```
8. Add zoom modal styles (from mockup)

### Phase 3: Responsive Layout (Medium Risk)
9. Add breakpoint `@media (max-width: 1199px)`:
   - `.left-folio`, `.right-folio` padding: 2rem (from 4rem)
10. Add breakpoint `@media (max-width: 899px)`:
    - `.ledger-layout` → `grid-template-columns: 1fr`
    - `.metrics-grid` → `grid-template-columns: repeat(2, 1fr)`
    - Reduce font sizes slightly (using `clamp()`)
11. Add breakpoint `@media (max-width: 480px)`:
    - `.metrics-grid` → `1fr`
    - `.ledger-footer` → `grid-template-columns: 1fr`
    - `.plate-frame` max-width: 300px
    - `.folio-title` font-size: 2.2rem
    - Ensure touch targets ≥ 44px

### Phase 4: Polish & Verification (Low Risk)
12. Verify all colors match mockup exactly
13. Test hover/focus transitions
14. Run lint and type check
15. Visual regression test (manual)

---

## Files to Modify

| File | Changes |
| :--- | :--- |
| `src/renderer/components/CoinDetail.tsx` | Class name updates (meta-line, subtitle) |
| `src/renderer/styles/index.css` | Add ~150 lines of new CSS (new classes, responsive breakpoints) |

---

## Success Criteria

- [x] All mockup class names implemented correctly
- [x] Zoom modal functional with backdrop blur
- [x] Thumbnail strip shows active state
- [x] Single-column layout on ≤ 899px
- [x] Metrics grid: 3 columns (desktop), 2 (tablet), 1 (mobile)
- [x] Footer stacks on mobile
- [x] Back button matches `.nav-back` styling
- [x] Container centered with max-width 1400px
- [x] No lint or type errors
- [x] Existing tests still pass
- [x] **Overflow issues resolved** - content adjusts smoothly to any viewport width without horizontal/vertical overflow

---

## Post-Implementation Fixes (2026-03-16)

After initial implementation, testing revealed content overflow on certain viewport sizes. Applied the following CSS enhancements:

- Added `overflow-x: hidden` to `.coin-detail-container`
- Set `min-width: 0` on grid items (`.left-folio`, `.right-folio`, `.metric-item`, `.footer-item`) to allow proper shrinking
- Applied `overflow-wrap: anywhere` and `word-break: break-word` to all text containers (`.folio-title`, `.meta-line`, `.subtitle`, `.desc-text`, `.metric-value`, `.plate-caption`)
- Updated image handling:
  - `.main-image`: `height: 100%` + `object-fit: contain` (prevents vertical overflow in plate frame)
  - `.thumbnail-img`: replaced fixed height with `aspect-ratio: 1` (responsive squares)
- Enhanced `.thumbnail-strip` with `flex-wrap: wrap` and `justify-content: center` to handle many images
- Added safety rules: `.nav-back { max-width: 100%; overflow-wrap: anywhere; }`

All changes are backward-compatible and maintain the archival aesthetic while ensuring robust responsiveness.

---

## Estimated Effort

- **Phase 1:** 10 minutes
- **Phase 2:** 20 minutes
- **Phase 3:** 25 minutes
- **Phase 4:** 10 minutes
- **Total:** ~65 minutes

---

## Rollback Plan

All changes are in CSS and one component. Rollback is straightforward:
- Revert CSS changes to pre-fix state
- Restore original class names in `CoinDetail.tsx`

---

**Status:** Implementation complete. All fixes applied and committed.

### Unified Layout Sync (2026-03-17)
Following initial styling, the layout was unified with the main Cabinet page:
- **Header Alignment:** Replaced the local back-button container with the global `.app-header` to match the Cabinet's top line and horizontal spacing.
- **Smart Grid Refinement:** Transitioned from strict `@media` breakpoints to a container-aware CSS Grid: `repeat(auto-fit, minmax(min(100%, 500px), 1fr))`. This ensures the 45/55 split on desktop and a graceful stack on mobile without any overflow.
- **Folio Spacing:** Implemented exactly `4rem` of horizontal padding on both sides of the central divider to create the 8rem "whitespace sanctuary" required for the archival aesthetic.
