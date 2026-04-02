# Patina - "The Manuscript Hybrid" Design System (v3.3)

This document is the definitive source of truth for the Patina visual identity. It follows an **Archival Ledger** philosophy: the interface is a warm, tactile space designed for the private management of historical objects.

---

## 1. Color Palette (CSS Variables)

Defined in `src/renderer/styles/index.css`. These colors are tested for WCAG 2.1 Level AA compliance.

| Variable | HEX | Usage |
| :--- | :--- | :--- |
| `--bg-manuscript` | `#FCF9F2` | Primary background (Parchment). Reduces glare. |
| `--text-ink` | `#2D2926` | High-contrast typography (Iron Gall Ink). |
| `--text-muted` | `#6A6764` | Secondary metadata and labels. |
| `--border-hairline`| `#E0DCCD` | Subtle structural dividers (Vellum tone). |
| `--accent-manuscript` | `#914E32` | Action states and primary accents (Burnt Sienna). |
| `--stone-pedestal` | `#F0EDE6` | Soft background for coin frames and containers. |
| `--error-red` | `#B22222` | Error states, validation messages, and critical alerts. |

---

## 2. Typography

We use a **Scholarly Hybrid** approach to balance historical authority with technical precision.

### Principal Serifs: **Cormorant Garamond**
- **Headings & Titles:** Bold (600/700), tight tracking, elegant weight. Use `clamp()` for responsive scaling.
- **Logo:** Italicized Cormorant for a hand-signed archival feel.

### Principal Sans: **Montserrat**
- **Functional UI:** Regular (400) for buttons, navigation, and labels.
- **Body Text:** High legibility at 16px minimum.

### Technical Mono: **JetBrains Mono**
- **Metrics:** Used for all weights, measurements, and catalog references to ensure scientific precision and alignment.
- **The "2-Decimal Rule":** Weight (grams) MUST be recorded to exactly two decimal places (e.g., `17.20g`).
- **The "1-Decimal Rule":** Diameter (mm) MUST be recorded to exactly one decimal place (e.g., `19.5mm`).

---

### Layout & Structure

### Spacing (The "Expansive" Rule)
- Maintain large margins to create a "sanctuary" for the collector.
- **Responsive Padding:** `clamp(3rem, 8vw, 4rem)`.
- **Component Gap:** `2rem` (32px) minimum between elements.
- **Section Margin:** `2.5rem` minimum between major sections to maintain "breathability."

### The "Smart Ledger" Grid
For primary layouts (e.g., Coin Detail), use a modern, container-aware grid that adapts automatically without rigid breakpoints:
```css
.ledger-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 500px), 1fr));
}

@media (min-width: 1000px) {
  .ledger-layout {
    grid-template-columns: 45% 55%; /* Precise folio split */
  }
}
```
### The "Sanctuary" Rule (Padding)
Maintain a strict horizontal breath around the central divider:
- **Folio Padding:** Exactly `4rem` on both sides of the central hairline (creating an 8rem sanctuary).
- **Responsive Scaling:** Padding scales down naturally via the global `.app-container` using `clamp(3rem, 8vw, 4rem)`.

### Borders & Depth
- **Borders:** Use `1px solid var(--border-hairline)` for structural division.
- **Elevation:** No drop shadows. Use slight background shifts (e.g., `--stone-pedestal`) to define areas.


### The Sidebar (The "Archive Explorer")
- **Width:** Fixed `280px` to maintain a stable ledger structure.
- **Position:** Persistent on the left for the Gallery view.
- **Filtering:** Use "Archival Labels" (Small, Sans-serif, Spaced) for multi-select categories (Era, Metal).

---

## 4. Component Standards

### The Pedestal (Coin Cards)
- **Frame:** Borderless with a `--stone-pedestal` background.
- **Labeling:** Title in **Cormorant Bold**; Metadata in **JetBrains Mono**.
- **Interaction:** Subtle background darkening on hover (`#F4F1E9`). Support `focus-visible` with `var(--accent-manuscript)`.

### Action Elements

Button variant inventory:

| Class | Use-case | Resting state | Hover state |
|-------|----------|---------------|-------------|
| `.btn-solid` | Primary CTA (submit, save) | `--text-ink` fill, white text | `--accent-manuscript` fill |
| `.btn-minimal` | Secondary / cancel | Text-only + bottom border, `--font-mono` | `--accent-manuscript` color |
| `.btn-ghost` | Header destructive-secondary (e.g. "Discard Draft") | Hairline border, muted mono text | `--text-ink` border + color |
| `.btn-delete` | Final destructive confirmation | Muted text + muted bottom border | `--error-red` color + border |
| `.btn-tools` | Toolbar dropdown trigger | Hairline border, muted mono text | `--accent-manuscript` |

**Distinguishing `.btn-ghost` from `.btn-tools`:** Both share the same mono/uppercase/hairline-border resting state. `.btn-ghost` is reserved for header-level destructive-secondary actions and nudges toward `--text-ink` on hover. `.btn-tools` is a toolbar dropdown trigger that nudges toward `--accent-manuscript`. Do not use either interchangeably.

- **Destructive Actions (`.btn-delete`):** Rendered in `--text-muted` with a `--text-muted` bottom border at rest — visually de-prioritised to avoid drawing attention. On hover only, transitions to `--error-red` color and border. This "deferred disclosure" pattern surfaces the destructive signal only on deliberate approach, preventing accidental triggering while maintaining discoverability. Apply `.btn-delete` to any action that permanently removes data (coin records, images). Never use `--error-red` at rest state.

### Form Inputs
- **Style:** Underlined only (`border-bottom`). No side or top borders.
- **Labels:** Use "Catalog Label" typography (Small, Sans-serif, Spaced).
- **Validation:** Use `var(--error-red)` for `border-color` and helper text.
- **Schema Guard:** All inputs are guarded by **Zod validation** to ensure technical precision (e.g., `ERR_INVALID_METRIC`).

### Destructive Action Modals (WCAG 3.2.4)
Confirmation modals for irreversible actions (deleting a coin, removing an image) must follow this button order:

1. **Cancel** — primary position (left or top), styled as a minimal action.
2. **Destructive action** — secondary position (right or bottom), styled with `.btn-delete`.

This ordering prevents accidental destructive actions by making the safe path the default. Use `.modal-actions` as the container class. Never reverse the order.

### Error Handling
- **Alerts:** Use high-contrast banners with `4px` left borders in `var(--error-red)`.
- **Tone:** Maintain a somber, technical tone even in failure states.

### Empty States
- **The "Silent Archive" Rule:** Use soft background containers and italicized serif typography. Left-aligned to mirror the start of a new ledger entry.

---

## 5. Filtering & Search (The Data Engine)

### Global Search
- **Behavior:** Debounced (300ms) to maintain a calm interface.
- **Scope:** Search across Title, Issuer, Denomination, Provenance, and Catalog Reference.

### Order By (Single-Select Sort)
The sidebar's first group. Controls the sort order of the Cabinet gallery.
- **Options:** Year (`year_numeric`), Title (`title`), Acquired (`purchase_date`). Default: Year.
- **Direction toggle:** Two-segment Asc/Desc button pair (`.sort-dir-toggle` / `.dir-btn`). Active segment uses `--accent-manuscript` background fill; inactive uses muted text.
- **Radio indicator:** Single-select rows use `.filter-radio` — a 14×14px ring (1px hairline border, 50% radius) with a 6×6px `--accent-manuscript` dot on active state. Use `aria-pressed` on direction buttons, not `role="radio"`.
- **Reset behaviour:** `clearFilters` restores sort to `year_numeric / ascending`. Sort is a presentation preference, not a filter, but it is reset alongside filters for a clean slate.
- **`SORT_OPTIONS` constant:** Must be defined at module level (outside the component) to prevent re-allocation on each render.

### Archival Filters (Multi-Select)
- **Eras:** Ancient, Medieval, Modern.
- **Metals:** Dynamically generated from the collection.
- **Grade:** Dynamically generated from the collection (free-text values from `CoinSchema.grade`). Empty state: "No grades recorded" (mirrors "No metals indexed" pattern).
- **Sidebar order:** Order By → Era → Metals → Grade.

> **Exception:** Filter controls use visible checkbox indicators (1px hairline border, accent fill on checked state) rather than pure "Archival Labels" text-only approach. This trade-off prioritizes user clarity for multi-select operations while maintaining the archival aesthetic through hairline borders and accent color states.

#### Filter Checkbox CSS Classes
- **`.filter-checkbox`** — Custom 16×16px ring (1px hairline border, 50% radius). On checked state: accent fill with 8×8px `--accent-manuscript` dot inside. The native `<input type="checkbox">` is visually hidden but remains in the DOM for screen readers.
- **`.filter-item-label`** — Wraps the checkbox and label text. On active (checked) state: left border in `--accent-manuscript`, bold weight, and soft background fill.

#### Filter Overflow: The Soft Reveal
Dynamic filter groups (Metals, Grade) truncate to 8 values when the list exceeds that threshold. The pattern is implemented in `PatinaSidebar` via `renderOverflowGroup`.

- **`TRUNCATION_THRESHOLD = 8`** — Module-level constant (not a prop). Change in one place if ever revised.
- **Active-selection pinning** — Selected values are sorted to the top of the list before truncation is applied; a selected value is never hidden.
- **`.filter-overflow-wrap`** — `position: relative` wrapper that hosts the fade overlay.
- **`.filter-overflow-wrap.truncated::after`** — `pointer-events: none` gradient fade from `transparent` to `var(--bg-manuscript)`, applied only when the list is truncated. Do **not** remove `pointer-events: none` — without it the overlay intercepts clicks on the last visible filter item.
- **`.filter-show-more`** — Trigger button styled as an archival footnote cross-reference: `var(--font-mono)`, `0.65rem`, `var(--accent-manuscript)`, uppercase, letter-spacing. Uses `aria-expanded` to signal disclosure state (WCAG 4.1.2).
- **Expand state is local, not persisted** — The sidebar opens in compact state on every session. Do not lift this state to `localStorage` or a hook.
- **Fixed groups are never truncated** — Sort and Eras have small, fixed value sets. Do not apply `renderOverflowGroup` to them.
- **No expand/collapse animation** — Do not add `transition` on `max-height`. Animated reflow shifts the sidebar while the user is interacting with it.

---

## 6. Accessibility Patterns

### Visually Hidden (`.sr-only`)

Use `.sr-only` to make an element available to screen readers while keeping it invisible on screen. This is the canonical visually-hidden pattern for the project — do not use `display: none` or `visibility: hidden` when the element must remain in the accessibility tree.

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Use cases:**
- Dialog titles referenced by `aria-labelledby` that should not appear visually (e.g. the QR dialog `<h2 id="qr-dialog-title">`)
- Supplementary labels for icon-only controls

---

## 7. PlateEditor (Scriptorium — Left Folio)

### Layout: Hero + Strip (Path A)

The left folio uses a two-tier plate layout:

| Class | Role |
|-------|------|
| `.plate-primary` | Obverse — full-width primary frame (4:3 aspect ratio). Visually dominant. |
| `.plate-secondary-strip` | Horizontal strip below the primary; houses Reverse and Edge side by side. |
| `.plate-secondary-slot` | Individual slot within the strip. Keeps `aspect-ratio: 1`. |

Active slot is indicated by a `--accent-manuscript` (Burnt Sienna) border. On mobile (`< 1000px`) the strip becomes a 2-column sub-row beneath the primary.

### Caption Action Bar: Icon Trio

When a slot contains an image, three icon buttons appear below the caption:

| Class | Icon | Action | Hover colour |
|-------|------|--------|--------------|
| `.btn-plate-icon-action` | Circular arrows | Replace (opens Lens) | `--accent-manuscript` |
| `.btn-plate-icon-action` | Download arrow | Import from file | `--accent-manuscript` |
| `.btn-plate-icon-action.btn-plate-icon-action--remove` | Trash | Clear slot | `--error-red` |

Two `.plate-action-sep` hairline dividers (1px × 24px, `--border-hairline`) separate the three buttons.

**Compact variant (secondary slots):** `.btn-plate-icon-action--compact` hides the text label and shows a dark pill tooltip via `::after { content: attr(data-tooltip) }` on hover/focus. All compact buttons carry an explicit `aria-label` for screen readers; SVGs are `aria-hidden="true"`.
