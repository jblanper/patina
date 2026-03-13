# Patina - "The Manuscript Hybrid" Design System (v3.3)

This document is the definitive source of truth for the Patina visual identity. It follows an **Archival Ledger** philosophy: the interface is a warm, tactile space designed for the private management of historical objects.

---

## 1. Color Palette (CSS Variables)

Defined in `src/renderer/styles/index.css`. These colors are tested for WCAG 2.1 Level AA compliance.

| Variable | HEX | Usage |
| :--- | :--- | :--- |
| `--bg-manuscript` | `#FCF9F2` | Primary background (Parchment). Reduces glare. |
| `--text-ink` | `#2D2926` | High-contrast typography (Iron Gall Ink). |
| `--text-muted` | `#7A7875` | Secondary metadata and labels. |
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

## 3. Layout & Structure

### Spacing (The "Expansive" Rule)
- Maintain large margins to create a "sanctuary" for the collector.
- **Responsive Padding:** `clamp(3rem, 8vw, 4rem)`.
- **Component Gap:** `2rem` (32px) minimum between elements.
- **Section Margin:** `2.5rem` minimum between major sections to maintain "breathability."

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
- **Solid Actions:** `--text-ink` background with white text. High-contrast, no rounding.
- **Minimal Actions:** Text-only with a bottom border using `var(--font-mono)`.
- **Hover:** All actions transition to `--accent-manuscript`.

### Form Inputs
- **Style:** Underlined only (`border-bottom`). No side or top borders.
- **Labels:** Use "Catalog Label" typography (Small, Sans-serif, Spaced).
- **Validation:** Use `var(--error-red)` for `border-color` and helper text.
- **Schema Guard:** All inputs are guarded by **Zod validation** to ensure technical precision (e.g., `ERR_INVALID_METRIC`).

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

### Archival Filters (Multi-Select)
- **Eras:** Ancient, Medieval, Modern.
- **Metals:** Dynamically generated from the collection (AU, AR, AE, EL, BI).
- **Sort:** Default to `year_numeric` to preserve the chronological integrity of the archive.
