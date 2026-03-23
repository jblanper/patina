# Implementation Blueprint: Cabinet Ledge & CoinCard Redesign

**Date:** 2026-03-23
**Status:** Completed
**Reference:** `docs/curating-ui/proposal_ledge_coincard_2026-03-23.html`

---

## 1. Objective

Two distinct UI defects in the Cabinet view were identified and resolved:

1. **The Ledge toolbar** — five flat, visually identical underlined buttons (`PERSONALIZAR VISTA`, `EXPORTAR ARCHIVO`, `GENERAR CATÁLOGO`, `REFERENCIA DE CAMPOS`, `+ NUEVA ENTRADA`) created noise and provided no hierarchy between primary CTA and secondary utility actions.

2. **CoinCard grade overflow** — the inline metrics row (`ELECTRUM // 8.10G // 20.5MM // CHOICE XF`) broke layout when the grade was multi-word, splitting tokens across lines.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** The Command Strip reduces the toolbar to three items; the Grade Row mirrors professional numismatic catalogue convention of separating physical specs from condition grade.
- [x] **Privacy First:** No external CDNs or telemetry introduced. All changes are purely structural and stylistic.
- [x] **Single-Click Rule:** Secondary actions remain accessible in two clicks (toolbar → dropdown → action). Primary CTA is immediate.

---

## 2. Technical Strategy

### 2A — The Command Strip (Ledge Toolbar)

**Selected path:** Path 1 — three-item toolbar: `Personalizar Vista` ghost trigger · `Herramientas ▾` dropdown · `+ Nueva Entrada` CTA.

**Changes:**
- `Cabinet.tsx`: Added `toolsOpen` state, `toolsRef` (`useRef<HTMLDivElement>`), and a `useEffect` click-outside handler scoped to `toolsRef`. Replaced three `btn-action` buttons and one `Link` with a `.tools-menu` container holding a `.btn-tools` trigger and a conditionally rendered `.tools-dropdown` panel.
- `en.json` / `es.json`: Added `cabinet.tools` key (`"Tools"` / `"Herramientas"`).
- `index.css`: Added `.tools-menu`, `.btn-tools`, `.tools-dropdown`, `.tools-dropdown-item` rules. Removed dead `.glossary-toolbar-link` rule.
- `aria-expanded` on the trigger, `role="menu"` on the panel, `role="menuitem"` on each item.

**Dropdown items:**
| Item | Action |
|---|---|
| Export Archive | `exportToZip()` + close |
| Generate Catalog | `exportToPdf(language)` + close |
| Field Reference | `<Link to="/glossary">` + close |

### 2B — The Grade Row (CoinCard)

**Selected path:** Path B — dedicated labeled row below the metrics strip.

**Changes:**
- `CoinCard.tsx`: Added `useTranslation`. Removed `metric-grade` span from the inline metrics row. Added `.coin-grade-row` block below `.coin-metrics`, rendered conditionally on `isVisible('card.grade') && coin.grade`. Label uses `t('ledger.grade')` for locale-awareness; value in `.coin-grade-value`.
- `index.css`: Added `.coin-grade-row`, `.coin-grade-label`, `.coin-grade-value` rules near `.coin-ref`. Removed dead `.metric-grade` rule.
- `CoinCard.test.tsx`: Updated TC-CC-01/02/03 to assert `.coin-grade-row` / `.coin-grade-value` instead of `.metric-grade`.

---

## 3. Verification Strategy (Quality Oversight)

- **Testing Plan:** TC-CC-01 verifies grade row renders with correct text when `card.grade=true`; TC-CC-02 verifies it is absent when `card.grade=false`; TC-CC-03 verifies it is absent when `coin.grade` is `undefined`.
- **Colocation Check:** `CoinCard.test.tsx` colocated at `src/renderer/components/__tests__/`.
- **Mocking Strategy:** `window.electronAPI` global mock in `setupTests.ts`; `react-i18next` global mock resolves `t('ledger.grade')` → `"Grade"` in test environment.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Verified

### Audit Findings:
- **System Integrity:** Changes are renderer-only. No IPC handlers, no Zod schemas, no Main process files touched. `src/common/` unchanged. Cross-process consistency unaffected.
- **Abstraction:** Dropdown state (`toolsOpen`) is internal to `Cabinet.tsx`. No business logic leaks into the bridge. `exportToZip` and `exportToPdf` are called through `useExport` hook as before.

### Review Notes:
- Click-outside pattern uses `mousedown` (not `click`) to prevent race with the toggle handler — correct.
- `useEffect` guard on `if (!toolsOpen) return` prevents unnecessary listener registration when the dropdown is closed — efficient.
- The `Link` inside the dropdown uses `role="menuitem"` and closes the menu `onClick` — accessible.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Verified — No issues identified.

### Audit Findings:
- **The Filter:** No new IPC channels added. No renderer data flows to Main.
- **Protocols:** No image paths or protocol handlers modified.
- **DOM Safety:** No `dangerouslySetInnerHTML` or user-controlled string injection. Dropdown items are static translated strings.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Verified

### Audit Findings:
- **Coverage Check:** TC-CC-01/02/03 cover all three branches of the grade visibility condition (`card.grade=true + grade present`, `card.grade=false`, `grade=undefined`). 357/357 tests passing post-implementation.
- **Async Safety:** No async state introduced; no `waitFor` changes needed.
- **i18n parity:** `cabinet.tools` key added to both `en.json` and `es.json`; `translations.test.ts` parity check passes.

### Review Notes:
- Dead CSS removed (`metric-grade`, `glossary-toolbar-link`) — no orphan selectors.
- TypeScript zero-error confirmed via `npx tsc --noEmit`.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Verified

### Audit Findings:
- **Aesthetic Compliance:** Three-path proposals generated in `docs/curating-ui/proposal_ledge_coincard_2026-03-23.html` prior to implementation. User selected Path 1 (Command Strip) and Path B (Grade Row) after reviewing all six interactive mockups.
- **Accessibility:** `aria-expanded`, `role="menu"`, and `role="menuitem"` applied. Touch target on `.btn-tools` (0.4rem padding, bordered box) meets minimum. Dropdown closes on click-outside.
- **Typography:** `.btn-tools` uses `font-mono`, `text-transform: uppercase` — consistent with toolbar register. `.coin-grade-label` in muted tone; `.coin-grade-value` in Iron Gall bold — clear visual hierarchy.

### Review Notes:
- The `▾` chevron in the button label is Unicode U+25BE (small black down-pointing triangle) — purely decorative, not announced to screen readers, which is correct since `aria-expanded` carries the state.
- `.tools-dropdown` uses `z-index: 200`, safely above the gallery grid (`z-index` unset) and below modals.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified — No issues identified.

### Audit Findings:
- **Historical Accuracy:** Grade display change is purely presentational. No grade vocabulary or validation modified.
- **Collector UX:** Separating the grade from the physical metrics row directly mirrors how professional numismatic catalogues (HGC, RIC, PCGS population reports) present condition separately from physical specifications. The labeled row (`Grade · VF-35`) removes ambiguity for novice collectors without reducing density for experienced ones.

---

## 9. User Consultation & Decisions

### Open Questions:
1. Ledge toolbar: Path 1 (Command Strip / dropdown) vs. Path 2 (Stratified Header / two-tier row)?
2. CoinCard grade: which of three display paths?

### Final Decisions:
- **Ledge:** Path 1 — Command Strip. Rationale: export and catalog generation are infrequent; they do not deserve permanent real estate. Collapses to two clicks per Single-Click Rule.
- **CoinCard grade:** Path B — dedicated labeled row. Rationale: cleanest to implement; aligns with numismatic convention.

---

## 10. Post-Implementation Retrospective

**Date:** 2026-03-23
**Outcome:** Both changes shipped cleanly. Zero TypeScript errors, 357/357 tests passing.

### Summary of Work
- Replaced five-item flat toolbar with three-item Command Strip (ghost trigger + dropdown + primary CTA).
- Removed grade from inline metrics row; added dedicated `.coin-grade-row` with locale-aware label and bold value.
- Added `cabinet.tools` i18n key to both locales.
- Removed two dead CSS rules (`.metric-grade`, `.glossary-toolbar-link`).
- Updated three CoinCard test cases for new DOM structure.

### Pain Points
- None significant. The CSS was straightforward. The click-outside pattern is idiomatic.

### Things to Consider
- The `.tools-dropdown` could eventually be extracted into a shared `<ToolsMenu>` component if the same pattern is needed in other views (e.g., CoinDetail header actions).
- **Core Doc Revision:** Style guide does not require updates — no new design tokens introduced. `AGENTS.md` not modified — no new architectural patterns established beyond existing practices.
