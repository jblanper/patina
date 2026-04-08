# Implementation Blueprint: Cabinet Toolbar & Sidebar Toggle Refinement

**Date:** 2026-04-08  
**Status:** Completed  
**Reference:** `docs/curating-ui/proposal_cabinet_toolbar_2026-04-08.html`

## 1. Objective

Two targeted UI refinements to the Cabinet (Ledger) page:

1. **Toolbar coherence** — Remove the standalone `CUSTOMIZE DISPLAY` text-link button from the toolbar. Move the action into the TOOLS dropdown (top of list, above a divider). The toolbar collapses to a clean three-zone grammar: `[⊞ | ≡]  TOOLS ▾  ───  + NEW ENTRY`.

2. **Sidebar affordance** — When the filter sidebar is collapsed, display a vertical "FILTERS" label (`writing-mode: vertical-rl`) below the expand chevron in the 44px strip, making the hidden panel immediately legible without hover.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** Reduces visual noise; the toolbar recedes, objects remain the hero.
- [x] **Privacy First:** Pure CSS/React changes — no external dependencies.
- [x] **Single-Click Rule:** Customize Display remains one click away (via TOOLS ▾).

## 2. Technical Strategy

### 2.1 `src/renderer/components/Cabinet.tsx`

- Remove the `<button className="btn-customize">` element from `cabinet-toolbar`.
- Add a `<button className="tools-dropdown-item">` for `t('cabinet.customizeDisplay')` at the top of the `tools-dropdown` div, followed by an `<hr className="tools-dropdown-divider" />` to separate it from data-operation items.

### 2.2 `src/renderer/components/PatinaSidebar.tsx`

- When `!isOpen`, render a `<span className="btn-sidebar-toggle-label-vertical">` inside the toggle button containing `{t('sidebar.expand')}` (or a dedicated key — see 2.3).
- The label sits below the chevron SVG; the full 44px × full-height strip remains the click target.

### 2.3 i18n keys (`src/renderer/i18n/en.json` + `es.json`)

No new keys needed — `sidebar.expand` (already exists) is used as the vertical label. If the displayed text should be a shorter "Filters" rather than "Show filters", add:

| Key | EN | ES |
|---|---|---|
| `sidebar.filtersLabel` | `Filters` | `Filtros` |

### 2.4 `src/renderer/styles/index.css`

- **`.btn-customize`** — can be removed entirely once no longer referenced (or kept if used elsewhere; verify with grep).
- **`.tools-dropdown-divider`** — add a minimal hairline rule style:
  ```css
  .tools-dropdown-divider {
    border: none;
    border-top: 1px solid var(--border-hairline);
    margin: 0.25rem 0;
  }
  ```
- **`.btn-sidebar-toggle-label-vertical`** (new class) — vertical label for collapsed state:
  ```css
  .btn-sidebar-toggle-label-vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    white-space: nowrap;
  }
  ```

## 3. Verification Strategy

- **Testing Plan:**
  - `Cabinet.test.tsx`: verify `btn-customize` no longer renders; verify "Customize Display" item appears in the tools dropdown when opened.
  - `PatinaSidebar.test.tsx`: verify vertical label renders when `isOpen=false`; verify it is absent when `isOpen=true`.
- **Colocation Check:** Tests live beside source files — no new test files required, update existing.
- **Mocking Strategy:** No new IPC calls — existing `window.electronAPI` mock is sufficient.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Verified  
### Audit Findings:
- **System Integrity:** Pure renderer-layer change. No IPC, no schema, no Main process touch.
- **Abstraction:** No logic leaks — `setDrawerOpen` call moves from a standalone button into a dropdown item. Hook contract unchanged.

### Review Notes & Suggestions:
- Confirm `.btn-customize` has no other consumers before removing the CSS class (`grep -r "btn-customize" src/`).

---

## 5. Security Assessment (`securing-electron`)

**Status:** Verified — No issues identified. Pure renderer DOM/CSS change; no new IPC surface, no protocol changes, no untrusted data rendered.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Verified  
### Audit Findings:
- **Coverage Check:** Two existing test files updated (Cabinet, PatinaSidebar). No new branches in hooks or validation.
- **Async Safety:** Toggle open/close is synchronous state — no `waitFor` needed for the new label assertion.
- **`btn-customize` consumer check:** Class is also used by `CoinDetail.tsx` — CSS retained, only the Cabinet button element is removed.

### Review Notes & Suggestions:
- Ensured "Customize Display" menu item test opens the dropdown first (`fireEvent.click(toolsButton)`) before asserting the item is present.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Verified — Proposal authored and approved by `curating-ui` in session (`proposal_cabinet_toolbar_2026-04-08.html`). Manuscript Hybrid v3.3 compliance confirmed. Touch targets ≥ 44px maintained.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified — No coin data, cataloguing logic, or numismatic display is affected.

---

## 9. User Consultation & Decisions

### Final Decisions:
- **Toolbar:** "Customize Display" moves into TOOLS dropdown (not into the view-toggle icon group).
- **Sidebar collapsed:** Vertical "FILTERS" label approved as proposed.
- `curating-ui` re-audit during this session waived by user instruction.

---

## 10. Post-Implementation Retrospective

**Completed:** 2026-04-08

### What was implemented
- `Cabinet.tsx`: removed standalone `btn-customize` button from toolbar; added "Customize Display" as first item in `tools-dropdown` with `hr.tools-dropdown-divider` separator.
- `PatinaSidebar.tsx`: added `btn-sidebar-toggle-label-vertical` span rendered when `!isOpen`.
- `index.css`: added `.tools-dropdown-divider` hairline rule; added `.btn-sidebar-toggle-label-vertical` vertical text style; updated `.app-layout--sidebar-collapsed .btn-sidebar-toggle` to `flex-direction: column` so label sits below chevron.
- `en.json` / `es.json`: added `sidebar.filtersLabel` ("Filters" / "Filtros").
- Tests: 3 new cases in `Cabinet.test.tsx` (TC-CAB-D-01/02/03), 2 new cases in `PatinaSidebar.test.tsx` (TC-CAB-D-04/05).

### Notes
- `btn-customize` CSS class retained — still consumed by `CoinDetail.tsx`.
- `tsc --noEmit`: zero errors. Test suite: 510/510 passed.
