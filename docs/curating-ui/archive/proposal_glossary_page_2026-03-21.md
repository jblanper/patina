# Curatorial Proposal: The Glossary Page
**Date:** 2026-03-21
**Status:** Proposed — Awaiting Path Selection

---

## Curatorial Context

The Glossary is a **reference document for the practising collector**, not a transactional screen. Its two source files (`glossary_coin_fields.md` / `_es.md`) cover ~25 fields across 6 sections with rich tables, abbreviation registers, and grading scales. The design challenge is: how do you make a long-form reference artifact feel like part of the Patina sanctuary rather than a detached help page?

Three structural tensions must be resolved:

1. **Entry point:** Where does the collector reach the Glossary in ≤ 2 clicks?
2. **Navigation within the page:** The content is substantial — a collector looking up `die_axis` should not scroll past `era`.
3. **Contextual relevance:** The Glossary is most valuable when a collector is staring at an unknown field in the Scriptorium or CoinDetail.

---

## The Three Paths

---

### Path A — The Manuscript Scroll
*Archetype: The Minimalist*

**Concept:** A single, continuous long-form page rendered in pure Cormorant typography with generous vertical rhythm — the collector reads it like unrolling a vellum manuscript. Navigation is provided by a **sticky alphabetical anchor rail** (a thin vertical strip at the far right, a list of section initials: I · D · P · C · G · P) that jumps to each of the six sections.

**Structure:**
```
/glossary

[sticky section rail — right edge]

§ Identity & Classification
  title ·········· [full entry]
  issuer ·········· [full entry]
  ...

§ Dating
  year_display ·· [full entry]
  ...

[all 6 sections, full scroll]
```

**Entry points:**
- **Primary:** A text link — "Field Reference" — placed in the **Cabinet toolbar** alongside Export Archive and Generate Catalog. One click from the gallery.
- **Secondary:** A small "?" anchor on each field label in the Scriptorium form (e.g., next to `die_axis:`) that deep-links to `/glossary#die_axis`. One click from edit context.

**Interaction signature:** Minimal. No interactivity beyond anchor scroll and the sticky rail. The page closes via the browser back button or a hairline `← Back to Cabinet` link at the top-left.

**Best for:** Collectors who browse the Glossary in full, treating it as an appendix. Clean, dignified, and cohesive with the manuscript aesthetic.

**Trade-off:** Finding a single field requires scrolling or using the section rail — not surgical.

---

### Path B — The Ledger Index
*Archetype: The Ledger*

**Concept:** A two-panel layout that mirrors the Cabinet's `sidebar + main` pattern. The **left panel** (same 280px fixed width as the Archive Explorer) lists all ~25 field names as clickable rows, grouped by section with hairline dividers. The **right panel** renders the currently selected field's full entry — definition, vocabulary tables, examples — in a richly typeset ledger card.

**Structure:**
```
/glossary

┌────────────────┬──────────────────────────────────────────────┐
│ FIELD INDEX    │  die_axis                                    │
│ ─────────────  │  ─────────────────────────────────────────── │
│ Identity       │  Type: Text (clock-hour notation)            │
│  · title ✓    │                                              │
│  · issuer      │  The rotational relationship between the     │
│  · denomination│  obverse die and the reverse die…           │
│ Dating         │                                              │
│  · year_display│  [table: 12h, 6h, 9h…]                      │
│  · year_numeric│                                              │
│ Physical       │  Note for ancient coins…                     │
│  · mint        │                                              │
│  · …           │                                              │
└────────────────┴──────────────────────────────────────────────┘
```

**Entry points:**
- **Primary:** A dedicated button in the **PatinaSidebar bottom section** — a persistent, low-weight `Field Reference` link at the foot of every Cabinet sidebar view, always one click away.
- **Secondary:** Contextual `?` anchors on Scriptorium field labels that navigate to `/glossary` with the matching field pre-selected.

**Interaction signature:** Clicking a field in the index panel updates the right panel without a page reload (client-side state). The selected field row receives an `--accent-manuscript` left border indicator. URL updates to `/glossary?field=die_axis` for bookmarkability.

**Best for:** Collectors who know which field they need to look up. Data-dense, encyclopedic, surgical.

**Trade-off:** The two-panel layout imposes a structural complexity similar to Cabinet — it may feel heavy for what is essentially a reference page. The 280px index panel is real estate cost.

---

### Path C — The Contextual Interlude
*Archetype: The Hybrid / Progressive Disclosure*

**Concept:** The Glossary is not a standalone page at all — it is a **slide-in drawer** (`position: fixed`, 600px max-width, from the right side of the screen) that overlays the current view without destroying context. A collector editing a coin in the Scriptorium, confused by `fineness`, clicks the `?` icon next to the label and the drawer slides in showing only that field's entry. Closing the drawer returns them exactly to their editing state.

For collectors who want to browse the full Glossary, a full-page mode is also accessible at `/glossary` where the drawer expands to fill the viewport, rendering the manuscript scroll (Path A's layout) inside.

**Structure (drawer mode):**
```
Current view (dimmed 20%)     ┌─────────────────────────────┐
                              │  ← fineness                 │
[Cabinet / Scriptorium /      │  ─────────────────────────  │
 CoinDetail — partially       │  Type: Text                 │
 visible and dimmed]          │                             │
                              │  The proportion of precious │
                              │  metal in the alloy…        │
                              │                             │
                              │  [fineness table]           │
                              │                             │
                              │  Browse all fields ↗        │
                              └─────────────────────────────┘
```

**Entry points:**
- **Contextual (primary use case):** `?` icon on every field label in Scriptorium and CoinDetail — opens the drawer to that specific field. This is the highest-value entry point: the collector is at the point of need.
- **Full browse:** A "Field Reference" link in the Cabinet toolbar navigates to `/glossary` (full-page mode).
- **Keyboard:** `?` key shortcut (standard help convention) opens the drawer to a field-list index.

**Interaction signature:** CSS slide-in transition (`transform: translateX`). Backdrop click or `Esc` closes. The full-page `/glossary` route renders the same content without the overlay chrome.

**Best for:** The "Curator-First" philosophy — the reference appears at the moment of authoring, not as a separate pilgrimage. Maximum contextual utility with minimal disruption.

**Trade-off:** The drawer mechanism adds implementation complexity (focus management, `aria-modal`, backdrop, and Esc handling must all be correct). The `?` icon on every Scriptorium field requires care not to clutter the form aesthetic.

---

## Shared Decisions (All Paths)

| Concern | Decision |
|---|---|
| **Route** | `/glossary` exists in all three paths as a stable URL |
| **i18n** | Language follows the app's current `i18n` setting — EN or ES — rendering the corresponding glossary content |
| **Single-Click Rule** | All paths satisfy ≤ 2 clicks from any screen |
| **Typography** | Section headings in Cormorant Garamond Bold; field names in JetBrains Mono; body in Montserrat 400 |
| **Field name display** | Rendered as `code` spans (`--font-mono`, `--accent-manuscript` color) to match their appearance in the Scriptorium |
| **Tables** | `border-collapse`, `border-hairline` rows, alternating `--stone-pedestal` rows for legibility |
| **Back navigation** | All paths provide a clear `← Back` affordance (hairline link, top-left) |

---

## Effort Estimates

### Path A — The Manuscript Scroll

**Complexity: Low**

| Work Item | Notes |
|---|---|
| New route `/glossary` | Add one `<Route>` to `App.tsx` |
| `Glossary` component | Single static component; no hooks, no IPC, no state |
| Glossary content data | ~25 field entries as a typed constant (TS object array) — one source of truth for both languages |
| i18n integration | `useTranslation` to select EN or ES content set; no new translation keys needed beyond page title |
| Sticky section rail | Pure CSS `position: sticky`; no JS |
| Anchor deep-links | HTML `id` attributes on each field entry; native browser scroll |
| `?` links in Scriptorium | One `<a href="/glossary#field_name">` per label — additive, no logic change |
| Cabinet toolbar link | One `<button>` / `<Link>` added to existing toolbar |
| CSS | ~40–60 new lines in `index.css`; reuses all existing variables |
| Tests | One smoke test (renders without crash); no async, no mocks needed |

**Unknowns / risks:** None significant. The content rendering is static. The only decision is whether glossary entries live as inline JSX, a JSON file, or a parsed markdown — a TS typed object is simplest and most type-safe.

---

### Path C — The Contextual Interlude

**Complexity: Medium**

| Work Item | Notes |
|---|---|
| New route `/glossary` | Add one `<Route>` — same as Path A |
| `Glossary` component (full-page) | Path A's scroll layout reused inside the full-page mode |
| `GlossaryDrawer` component | `position: fixed` overlay, slide-in, backdrop, close controls — new component |
| `useGlossaryDrawer` hook | State: `{ open: boolean, field: string \| null }`; open/close actions |
| Focus management | On open: move focus into drawer; on close: return focus to trigger element — required for `aria-modal` compliance |
| `Esc` key handler | Global `keydown` listener (mounted/unmounted with drawer open state) |
| Backdrop click handler | `mousedown` on overlay closes drawer |
| `?` trigger icons | Added to every field label in `LedgerForm` (~25 fields) and CoinDetail field rows — more additive edits than Path A, but same pattern repeated |
| `?` keyboard shortcut | Global `keydown` listener for `key === '?'` — opens drawer to field index |
| Scroll-lock | `overflow: hidden` on `body` while drawer is open to prevent background scroll |
| CSS | ~80–100 new lines; slide-in keyframe animation, backdrop, drawer chrome |
| i18n | Same as Path A |
| Tests | Drawer open/close, Esc close, focus return, backdrop click — 5–8 test cases; `window.electronAPI` mock not needed (pure UI state) |

**Unknowns / risks:**
- **Focus trap:** A proper focus trap inside `aria-modal` (Tab cycling) requires either a small utility or a library. Implementing it from scratch without a helper (~30 lines) is feasible but must cover edge cases (no focusable children, Shift+Tab).
- **`?` icon density in Scriptorium:** The Scriptorium form has ~25 fields. Adding a small icon to each requires a visual audit to ensure the form does not feel cluttered. This is a styling judgment call that may iterate.
- **CoinDetail integration:** CoinDetail field rows are currently rendered differently from Scriptorium — the `?` trigger pattern must adapt to both layouts.

---

## Recommendation

**Path C** is the most architecturally aligned with the Patina philosophy and delivers the highest collector value. It is a **Medium** effort — achievable in a focused implementation phase with no IPC changes, no new Electron APIs, and no database work. The complexity is entirely front-end.

**Path A** is the safer starting point if a phased approach is preferred: ship the scroll page first, then layer the drawer on top in a subsequent phase (Path A is a subset of Path C's full-page mode).

---

*Proposal by: Chief Curator & UX/UI Designer — Patina*
*Awaiting collector's selection to proceed to mockup phase.*
