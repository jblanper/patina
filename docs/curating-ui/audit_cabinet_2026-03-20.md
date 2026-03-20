# Curator's Audit — The Cabinet (v1.0)
*Manuscript Hybrid v3.3 compliance review*
*Date: 2026-03-20*

---

## Overall Assessment

The Cabinet page establishes a coherent archival identity. The typography hierarchy is sound, the parchment palette is correctly applied, and metric formatting rules (2-decimal weight, 1-decimal diameter) are rigorously observed. However, several implementation details erode the visual authority of the page — particularly in the toolbar, metric divider, and action affordance.

---

## Findings

### C1 — Critical: Secondary action buttons lack affordance
**Location:** `.btn-action` — `src/renderer/styles/index.css:1413`

The `Export Archive` and `Generate Catalog` buttons use `color: var(--text-muted)` (#7A7875) — the same value as secondary metadata. This makes them visually indistinguishable from inactive labels. Combined with `border-bottom: 1px solid var(--border-hairline)` (#E0DCCD), the underline affordance is nearly invisible against the parchment. A collector scanning the toolbar will not immediately read these as clickable actions.

**Fix:** Change `.btn-action` color to `var(--text-ink)` and the border-bottom to `1px solid var(--text-muted)`.

---

### H1 — High: Toolbar gap creates visual disconnection
**Location:** `.cabinet-toolbar { gap: 3rem }` — `index.css:169`

The `3rem` gap between all three toolbar items treats Export, Generate, and New Entry as equally spaced, unrelated items. The two export actions (secondary) and the entry action (primary) read as three isolated buttons floating across the toolbar. The intended hierarchy — *supporting utilities left, primary CTA right* — is lost.

**Fix:** Reduce gap to `1.5rem`. Apply `margin-left: auto` to `.btn-action.btn-primary` (`+ New Entry`) to right-anchor it, creating a clear secondary/primary split.

```css
.cabinet-toolbar {
  gap: 1.5rem;
}
.cabinet-toolbar .btn-primary {
  margin-left: auto;
}
```

---

### H2 — High: Metric divider `//` is invisible
**Location:** `.metric-divider { color: var(--border-hairline) }` — `index.css:494`

`--border-hairline` (#E0DCCD) on `--bg-manuscript` (#FCF9F2) yields a contrast ratio of approximately 1.4:1 — well below any usable threshold. The `//` separator, which is one of the strongest numismatic-aesthetic choices on the card, disappears entirely at 0.75rem. This is particularly unfortunate because it is visually central to the coin metrics line.

**Fix:** Change to `color: var(--text-muted)` (#7A7875).

---

### M1 — Medium: Search label is redundant with placeholder
**Location:** `SearchBar.tsx:17` + `index.css:328`

`"SEARCH THE LEDGER"` as a `type-meta` block label directly above the input, combined with the italic placeholder `"Title, issuer, or catalog reference..."`, double-labels the field. The label occupies `~1.2rem` of vertical space and provides no information that the placeholder doesn't already communicate at point of use.

The `aria-label="Search the coin archive"` on the input already handles accessibility. The visible label can be removed, tightening the header zone and letting the search input breathe as a ledger entry point.

---

### M2 — Medium: Orphaned grid card with sparse collections
**Location:** `.gallery-grid` — `index.css:359`

With 3 items in a `repeat(auto-fill, minmax(280px, 1fr))` 2-column layout, the Morgan Dollar occupies the first column of row 2, leaving the second column empty. `auto-fill` creates a ghost column with no visual presence, so the lone card has an implicit empty partner. This reads as an incomplete row rather than an intentional archival spacing.

This resolves naturally with more entries, but for curators with small collections the effect is prominent. Switching to `auto-fit` would collapse the ghost column so the single card stretches full-width — a more dignified presentation for a lone entry.

---

### M3 — Medium: `btn-action` click target is too small
**Location:** `.btn-action { padding: 0.5rem 0 }` — `index.css:1417`

Total interactive height is approximately `0.75rem (font) + 1rem (padding) = ~28px`. WCAG 2.5.5 recommends a minimum 44px target. Even on a desktop-only Electron app, 28px is uncomfortably tight for casual use. Raising to `padding: 0.75rem 0` resolves this.

---

### L1 — Low: Collection count copy is verbose
**Location:** `Cabinet.tsx:69`

`"The collection contains 3 verified historical objects."` — "verified historical objects" adds ceremony but reduces information density. Suggested: `"3 objects in the ledger."` — terse, archival, consistent with the app's voice.

---

### L2 — Low: Sidebar filter group spacing is excessive with sparse data
**Location:** `.patina-sidebar { gap: 3rem }` — `index.css:196`

With only ERAS (3 items) and METALS (1 item, Silver), the `3rem` gap leaves a conspicuous void in the sidebar. `2rem` preserves the Expansive Rule (minimum 2rem between components) while reducing the visual emptiness.

---

## Compliance Summary

| Criterion | Status |
|---|---|
| Cormorant for titles, Mono for metrics | ✓ Pass |
| 2-decimal weight rule | ✓ Pass |
| 1-decimal diameter rule | ✓ Pass |
| Solid action uses `--text-ink` bg | ✓ Pass |
| Minimal actions use bottom border only | ✓ Pass |
| `btn-action` color contrast | ✗ Fail — C1 |
| `//` divider legibility | ✗ Fail — H2 |
| WCAG minimum touch target | ✗ Fail — M3 |
| Filter checkboxes with accent fill | ✓ Pass |
| Sidebar hairline right border | ✓ Pass |
| Search underlined input, italic placeholder | ✓ Pass |
| Responsive grid (no breakpoints) | ✓ Pass |

---

## Priority Order for Remediation

1. **C1** — `btn-action` color to `--text-ink` + border-bottom to `--text-muted`
2. **H2** — `metric-divider` color to `--text-muted`
3. **H1** — Toolbar gap `1.5rem` + right-anchor primary button
4. **M3** — Raise `btn-action` padding to `0.75rem 0`
5. **M1** — Remove redundant "SEARCH THE LEDGER" visible label
6. **M2** — Switch grid to `auto-fit`
7. **L1 / L2** — Copy and spacing polish
