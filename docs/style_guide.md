# Patina - "The Gallery" Design System (v2.0)

This document is the definitive source of truth for the Patina visual identity. It follows a **"White Cube" Gallery** philosophy: the interface is a silent frame that recedes to let the historical objects take center stage.

---

## 1. Color Palette (CSS Variables)

Defined in `src/renderer/styles/index.css`.

| Variable | HEX | Usage |
| :--- | :--- | :--- |
| `--bg-gallery` | `#FFFFFF` | Primary background (The "Gallery Wall"). |
| `--text-ink` | `#121212` | High-contrast typography and primary borders. |
| `--text-muted` | `#757575` | Secondary metadata and labels. |
| `--border-hairline`| `#EEEEEE` | Subtle structural dividers and secondary frames. |
| `--accent-patina` | `#43AA8B` | Action states, primary buttons, and success indicators. |
| `--stone-gray` | `#F5F5F5` | Ultra-light background for secondary containers. |

---

## 2. Typography

We use a **100% Sans-Serif** approach to achieve a prestigious, modern archival feel.

### Principal Typeface: **Inter**
- **Headings:** Bold (600/700), tight tracking (-1px to -2px), left-aligned.
- **Body:** Regular (400), 16px minimum for high legibility.
- **Metadata:** Light (300/400), uppercase, tracking increased (+1px to +2px) for a catalog-label effect.

---

## 3. Layout & Structure

### Spacing (The "Expansive" Rule)
- Avoid any sense of digital clutter. Use large margins to create a "sanctuary" for the viewer.
- **Main View Padding:** `4rem` (64px).
- **Component Gap:** `2rem` (32px) minimum between gallery elements.

### Borders & Depth
- **Borders:** Use `1px solid var(--border-hairline)` for standard containment.
- **Depth:** No drop shadows. Depth is achieved via contrast and whitespace.
- **Focus:** Active elements use `1px solid var(--text-ink)`.

---

## 4. Component Standards

### The Pedestal (Coin Cards)
- **Frame:** Light gray background (`--stone-gray`) with a 1:1.2 aspect ratio.
- **Labeling:** Title in Bold; Metadata (Year, Metal) in Light Uppercase.
- **Interaction:** Transition to a `var(--text-ink)` border on hover.

### Action Elements
- **Solid Actions:** Black background (`--text-ink`) with white text. High-contrast, no rounding.
- **Minimal Actions:** Text-only with a bottom border (`1px solid var(--text-ink)`).
- **Hover:** All actions transition to `--accent-patina`.
- **Focus:** Accessibility is key; active focus states use `2px solid` outlines with offset.

### Form Inputs
- **Style:** Underlined only (`border-bottom`). No side or top borders.
- **Focus:** Transition `border-bottom` to `var(--text-ink)`.
- **Labels:** Use "Catalog Label" typography (Small, Uppercase, Spaced).

### Empty States
- **The "Silent Gallery" Rule:** Use dashed borders and centered, uppercase typography to indicate empty views. Avoid playful illustrations; maintain a somber, archival tone.
