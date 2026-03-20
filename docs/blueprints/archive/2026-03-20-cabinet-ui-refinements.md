# Implementation Blueprint: Cabinet UI Refinements

**Date:** 2026-03-20
**Status:** Completed
**Reference:** [Curator's Audit — The Cabinet 2026-03-20](../curating-ui/audit_cabinet_2026-03-20.md)

---

## 1. Objective

Remediate seven findings from the 2026-03-20 Curator's Audit of the Cabinet page. All changes are confined to the renderer layer (CSS + two minor component edits). No schema, IPC, or security surface is affected.

The changes restore the visual authority of the toolbar, fix an illegible metric divider, tighten spacing, improve click targets, and remove a redundant search label — all while preserving the Manuscript Hybrid v3.3 aesthetic.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Every change brings the implementation closer to the style guide standard. Action buttons become clearly legible; the `//` metric separator regains its numismatic character.
- [x] **Privacy First:** No new assets, CDNs, or external dependencies introduced.
- [x] **Single-Click Rule:** No navigation hierarchy changes. All existing routes remain intact.

---

## 2. Technical Strategy

All changes are surgical and independent. They can be applied in a single commit.

### 2.1 CSS Changes — `src/renderer/styles/index.css`

#### Fix C1 — `.btn-action` color contrast
```css
/* BEFORE */
.btn-action {
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-hairline);
}

/* AFTER */
.btn-action {
  color: var(--text-ink);
  border-bottom: 1px solid var(--text-muted);
}
```

#### Fix H1 — Toolbar gap + right-anchor primary button
```css
/* BEFORE */
.cabinet-toolbar {
  gap: 3rem;
}

/* AFTER */
.cabinet-toolbar {
  gap: 1.5rem;
}

.cabinet-toolbar .btn-primary {
  margin-left: auto;
}
```

#### Fix H2 — Metric divider legibility
```css
/* BEFORE */
.metric-divider {
  color: var(--border-hairline);
}

/* AFTER */
.metric-divider {
  color: var(--text-muted);
}
```

#### Fix M3 — `.btn-action` click target height
```css
/* BEFORE */
.btn-action {
  padding: 0.5rem 0;
}

/* AFTER */
.btn-action {
  padding: 0.75rem 0;
}
```

#### Fix M2 — Gallery grid orphan (auto-fill → auto-fit)
```css
/* BEFORE */
.gallery-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* AFTER */
.gallery-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
```

#### Fix L2 — Sidebar filter group gap
```css
/* BEFORE */
.patina-sidebar {
  gap: 3rem;
}

/* AFTER */
.patina-sidebar {
  gap: 2rem;
}
```

### 2.2 Component Changes

#### Fix M1 — Remove redundant "SEARCH THE LEDGER" visible label (`SearchBar.tsx`)

The `aria-label="Search the coin archive"` on the `<input>` already provides full accessibility coverage. The visible `<label>` with class `type-meta search-label` can be removed. The `.search-bar-container` margin-bottom absorbs the recovered vertical space cleanly.

```tsx
// BEFORE
<div className="search-bar-container">
  <label className="type-meta search-label">Search the Ledger</label>
  <input ... />
</div>

// AFTER
<div className="search-bar-container">
  <input ... />
</div>
```

Also remove the now-unused `.search-label` rule from `index.css`.

#### Fix L1 — Collection count copy (`Cabinet.tsx`)

```tsx
// BEFORE
`The collection contains ${filteredCoins.length} verified historical objects.`

// AFTER
`${filteredCoins.length} ${filteredCoins.length === 1 ? 'object' : 'objects'} in the ledger.`
```

---

## 3. Verification Strategy (Quality Oversight)

- **Testing Plan:**
  - Run existing `CoinCard` tests to confirm no regressions from the `.metric-divider` color change (class name unchanged, only CSS value differs).
  - Run existing `SearchBar` tests to confirm the label removal does not break any assertions. Verify `aria-label` on the input is still present and correct.
  - Run existing `Cabinet` / `GalleryGrid` tests to confirm the subtitle copy change does not break snapshot or content assertions.
  - Run the Playwright screenshot tour (`npx tsx scripts/screenshot-tour.ts`) to visually verify all changes.
- **Colocation Check:** No new source files are introduced; no new test files are required. Pure CSS + two minor component edits.
- **Mocking Strategy:** No Electron API surface is touched; existing mocks in `setupTests.ts` are unaffected.
- **Type-Check Gate:** Run `npx tsc --noEmit` before finalizing. Expected: zero errors (no TypeScript logic changes).

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** All changes are confined to the renderer layer. No `src/common/` types, no `src/main/` IPC handlers, and no `preload.ts` surface are modified.
- **Abstraction:** No business logic is introduced. The copy change in `Cabinet.tsx` is a pure template literal update with a standard pluralization ternary — appropriate inline logic.

### Review Notes & Suggestions:
- The `auto-fill` → `auto-fit` grid change aligns the implementation with the `AGENTS.md` mandate: *"Prefer container-aware CSS Grid (`auto-fit`)"* (AGENTS.md §React & Frontend Architecture). This is a correctness fix, not a preference.
- Confirm `.search-label` CSS rule is removed alongside the JSX change to avoid leaving dead CSS.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
- **The Filter:** No new IPC channels, no new data flows, no changes to Zod schemas. The Filter is unaffected.
- **Protocols:** No changes to `patina-img://` protocol handling or image path logic.

### Review Notes & Suggestions:
- No security concerns. This blueprint is entirely renderer-side CSS and non-functional component copy changes.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### Audit Findings:
- **Coverage Check:** No new functions, hooks, or components are introduced. Existing coverage targets (80% component statements, 90% hook functions) are not impacted.
- **Async Safety:** No async logic is modified.
- **Test Regression Risk:** Neither `SearchBar.test.tsx` nor `Cabinet.test.tsx` exist as colocated test files. A search across all test files confirms zero assertions on `"Search the Ledger"`, `"verified historical objects"`, or `"search-label"` — the strings/classes being removed. No test regressions are possible from these changes.
- **Colocation Rule:** No new source files are introduced; no new test files are required by the Colocation Rule.

### Review Notes & Suggestions:
- The screenshot tour (`npx tsx scripts/screenshot-tour.ts`) is the primary visual regression check and should be run as part of verification.
- Existing `CoinCard` tests cover the `.metric-divider` class indirectly; since only the CSS value changes (not the class name), no assertion updates are needed.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:
- **Aesthetic Compliance:** This blueprint directly implements the 2026-03-20 Curator's Audit findings. All remediation targets have been validated against Manuscript Hybrid v3.3.
- **Accessibility:** The `btn-action` padding increase (M3) brings click targets closer to WCAG 2.5.5 minimums. The search label removal (M1) retains `aria-label` on the input for full screen-reader coverage.

### Review Notes & Suggestions:
- Post-implementation: re-run the Playwright screenshot tour and compare `01-cabinet.png` against the pre-fix version to confirm toolbar, metric divider, and grid improvements are visible.
- The `//` divider fix (H2) is particularly important to verify visually — the before/after contrast difference is significant.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Verified

### Audit Findings:
- **Historical Accuracy:** No catalog references, coin data fields, or numismatic terminology are modified.
- **Collector UX:** The `//` divider fix (H2) directly improves the legibility of the metric line (`SILVER // 17.20g // 24.5mm`). This is the primary data density affordance on the CoinCard and its visibility is critical for a scanning workflow.

### Review Notes & Suggestions:
- The new cabinet subtitle copy (`"3 objects in the ledger."`) is more concise and archival. "In the ledger" is preferred over "verified historical objects" as it references the archival metaphor without over-qualifying the data.

---

## 9. User Consultation & Decisions

### Open Questions:
1. The `SearchBar` label removal (M1) changes the visual rhythm of the search area. Should the `search-bar-container` top margin be adjusted to compensate for the removed label height, or is the current `margin-bottom: 2.5rem` on the container sufficient?
2. For the cabinet subtitle (L1), the proposed copy uses a pluralization ternary. Acceptable inline, or should a utility function be extracted?

### Final Decisions:
1. **Q1 — SearchBar spacing:** The existing `margin-bottom: 2.5rem` on `.search-bar-container` is sufficient. No additional margin adjustment required after label removal.
2. **Q2 — Pluralization logic:** Inline ternary is acceptable for this single case. A shared utility function is not warranted until the pattern recurs in two or more additional locations.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-20
**Outcome:** All 7 findings resolved. 58/58 tests passing. `tsc --noEmit` clean. Screenshot tour confirmed all visual changes.

### Summary of Work
- Applied 5 CSS fixes to `src/renderer/styles/index.css`: toolbar gap, sidebar gap, gallery grid `auto-fit`, metric divider color, and `btn-action` color/padding/border.
- Removed redundant `<label>` from `SearchBar.tsx` and its dead `.search-label` CSS rule.
- Updated Cabinet subtitle copy to archival-toned pluralized form.
- All changes landed in a single, self-contained implementation pass with no scope creep.

### Pain Points
- None. Blueprint was well-scoped; all changes were surgical and independent as designed.

### Things to Consider
- **`btn-action` is global:** The updated color (`--text-ink`) and padding (`0.75rem 0`) now apply to all `btn-action` elements across the app. The Export Toast was visually verified via the screenshot tour — no regressions observed.
- **`auto-fit` is now the confirmed standard:** The `auto-fill` → `auto-fit` correction aligns with the existing AGENTS.md mandate. No further doc revision needed — the mandate was already correct.
