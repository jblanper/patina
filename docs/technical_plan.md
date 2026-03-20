# Patina Technical Plan - 2026-03-10

> **Note:** The contents of this document are a living draft and are subject to change as the project evolves.

**Goal:** Build a "Curator's Tool" for historical coin collectors that balances prestigious aesthetics with a simplified, privacy-first desktop experience.

---

## 1. Technical Stack

| Layer          | Technology             | Rationale                                                                 |
| :------------- | :--------------------- | :------------------------------------------------------------------------ |
| **Shell**      | **Electron**           | Provides native desktop experience and local file system access.          |
| **Frontend**   | **React (TypeScript)** | Industry-standard UI library for high-quality, maintainable components.   |
| **Styling**    | **Vanilla CSS**        | Maximum flexibility to achieve the specific "Museum Label" aesthetic.      |
| **Database**   | **SQLite3**            | A single-file database that is local, portable, and requires no setup.    |
| **Image Bridge** | **Node.js / Express** | Local listener to receive images from a mobile camera over Wi-Fi.         |

---

## 2. Proposed Project Structure

```text
patina/
├── docs/                     # Project documentation
├── src/
│   ├── main/                 # Electron main process (System, Tray, Local Server)
│   │   ├── server.ts         # Express server for the "Lens" mobile bridge
│   │   └── index.ts          # App lifecycle and window management
│   ├── renderer/             # React Frontend
│   │   ├── components/       # Gallery, Ledger, SearchBar, Sidebar
│   │   ├── hooks/            # Database queries and Image Bridge state
│   │   ├── styles/           # Vanilla CSS (Oxford Blue/Verdigris theme)
│   │   └── App.tsx
│   └── common/               # Shared types and constants
├── public/                   # Static assets
├── data/                     # (Local-only) SQLite DB and Coin Images
└── package.json
```

---

## 3. The Ledger (Database Model)

The database schema has been finalized and approved following a research phase into numismatic standards.

**Detailed Specification:** See [Schema Proposal (2026-03-10)](./schema_proposal_2026-03-10.md)

**Core Tables:**
- `coins`: Detailed historical and physical ledger.
- `images`: Multi-image support for obverse, reverse, and edge views.

---

## 4. System Architecture

### A. The Desktop Shell (Electron)
- **Main Process:** Handles application lifecycle, window management, local file I/O, and the SQLite connection.
- **Renderer Process:** Runs the React application. Communicates with the Main process via IPC for database operations.
- **Local Server:** A small Express server embedded in the Main process to manage the "Lens" image bridge.

### B. The Lens (Mobile Bridge)
- **Workflow:**
    1. Desktop generates a QR code with `http://<Local_IP>:PORT/upload`.
    2. Mobile device scans QR and opens a simple web form.
    3. User captures image; mobile sends it to the Desktop server.
    4. Desktop server saves the image to `data/images/` and updates the coin record.

---

## 5. Implementation Phases

### Phase 1: Foundation (Completed)
- [x] Scaffold Electron + React (TypeScript) base.
- [x] Configure `better-sqlite3` with the approved curator schema.
- [x] Implement `npm run db:seed` for numismatically accurate test data. [Blueprint](./blueprints/2026-03-13-seed-data-script.md)
- [x] Establish "Museum Label" design system (Typography, Colors).
- [x] Implement IPC bridge for secure Main/Renderer communication.

### Phase 2: The Display Case (Completed)
**Phase Blueprint:** [2026-03-12-phase-2-display-case.md](./blueprints/2026-03-12-phase-2-display-case.md)
- [x] **Data Management:** Develop `useCoins()` custom hook for centralized state, filtering, and DB interaction. [Blueprint](./blueprints/2026-03-12-t1-usecoins-hook.md)
- [x] **Gallery Grid:** Build `GalleryGrid` and `CoinCard` components with "Museum Label" aesthetic. [Blueprint](./blueprints/2026-03-13-phase-2-t2-gallery-grid.md)
- [x] **Sidebar Filters:** Create `PatinaSidebar` with multi-select filters for Era (Ancient, Medieval, Modern) and Metal (Gold, Silver, Bronze). [Blueprint](./blueprints/2026-03-13-phase-2-t3-sidebar-search.md)
- [x] **Global Search:** Implement a prominent, stylized `SearchBar` for real-time filtering by Year, Country, or Title. [Blueprint](./blueprints/2026-03-13-phase-2-t3-sidebar-search.md)
- [x] **Empty State:** Design a prestigious "Empty Case" view to encourage adding the first coin.
- [x] **Optimization:** Implement `React.memo` and image lazy-loading for large collections.

### Phase 3: The Ledger (Record View) (Completed)
**Detailed Blueprint:** [2026-03-14-phase-3-ledger.md](./blueprints/2026-03-14-phase-3-ledger.md)
- [x] Build the detailed coin record display.
- [x] Implement the "Story" box (rich text or clean markdown).
- [x] Add the image zoom/inspection functionality.
- [x] **Unified Layout:** Synchronized header width and horizontal margins between the Cabinet and Ledger for a cohesive museum experience.
- [x] **Smart Grid:** Implemented a container-aware layout that stacks automatically without rigid breakpoints.

### Phase 3.5: The Scriptorium (Data Entry) (Completed)
**Detailed Blueprint:** [2026-03-18-phase-3-5-scriptorium.md](./blueprints/2026-03-18-phase-3-5-scriptorium.md)
**Objective:** Build the specialized form for adding and editing coin records, prioritizing high-density numismatic data and seamless integration with the Lens bridge.
- [x] **Scriptorium Form:** Developed a high-fidelity, React-based form based on the "The Scriptorium v6" mockup.
- [x] **Dual-Folio Layout:** Implemented the 45/55 split with the Plate Editor on the left and the Ledger Folio on the right.
- [x] **Zod-Guarded Inputs:** Enforced technical precision (e.g., 2-decimal weights) using Zod schemas shared between Main and Renderer.
- [x] **Lens Integration:** Connected the `useLens()` hook to the "Establish Wireless Bridge" CTA to enable real-time image capture during data entry.
- [x] **IPC Handlers:** Implemented `coin:create` and `coin:update` in the Main process with strict validation using "The Filter".
- [x] **Auto-Draft:** Implemented a debounced "Save Draft" feature to prevent data loss during long cataloging sessions.

### Phase 4: The Lens (Wireless Bridge) (Completed)
**Detailed Blueprint:** [2026-03-17-phase-4-lens.md](./blueprints/2026-03-17-phase-4-lens.md)
- [x] **Express Foundation:** Implement the lightweight server within the Main process with `multer` validation. [Blueprint](./blueprints/2026-03-17-phase-4-lens.md)
- [x] **The Filter (Lens):** Enforce strict session-specific UUID tokens and 10MB file size limits.
- [x] **Mobile UI:** Design a minimal, responsive HTML template served directly by the Main process.
- [x] **IPC Handlers:** Create `lens:start`, `lens:stop`, and `lens:get-status` for the Renderer.
- [x] **Renderer Integration:** Build the `useLens()` hook and the `QRCodeDisplay` component.
- [x] **Add Coin Integration:** Connect the Lens subsystem to the "Add Coin" or "Edit Coin" forms.

### Phase 5: Preservation (Security/Export) (Completed)
**Detailed Blueprint:** [2026-03-19-phase-5-preservation.md](./blueprints/archive/2026-03-19-phase-5-preservation.md)
- [x] Build the "Export Archive" one-click feature (ZIP with DB, CSV, images).
- [x] Implement PDF "Catalog" generation using `jspdf`.

### Phase 6: Enhancement Suite (Approved)
**Objective:** Enhance the curator experience with standardized data entry, internationalization, and customizable views.

#### Phase 6A: Standardized Values with Autocomplete (Approved)
**Detailed Blueprint:** [2026-03-19-phase-6a-standardized-values.md](./blueprints/2026-03-19-phase-6a-standardized-values.md)
- [ ] **Vocabulary Tables:** Create `vocabularies` and `preferences` tables for standardized field values.
- [ ] **Numismatic Vocabularies:** Seed metals (Gold, Silver, Bronze, Electrum), denominations (Aureus, Denarius, Antoninianus), grades (NGC/PCGS scale), eras, and die axis values.
- [ ] **Autocomplete Component:** Build `AutocompleteField` with dropdown, filtering, and "Add new value" functionality.
- [ ] **IPC Handlers:** Implement `vocab:get`, `vocab:add`, `vocab:search` with Zod validation.
- [ ] **Usage Tracking:** Track `usage_count` for sorting by frequency.

#### Phase 6B: Internationalization - Spanish/English (Approved)
**Detailed Blueprint:** [2026-03-19-phase-6b-internationalization.md](./blueprints/2026-03-19-phase-6b-internationalization.md)
- [ ] **i18n Foundation:** Integrate `react-i18next` for translation management.
- [ ] **Translation Files:** Create `en.json` and `es.json` with complete UI translations.
- [ ] **Language Selector:** Build `LanguageSelector` component with immediate language switch.
- [ ] **Numismatic Translations:** Translate field labels (Anverso, Reverso, Bordura) and use "Aleación" for metal.
- [ ] **Locale Formats:** Support DD/MM/YYYY for Spanish.

#### Phase 6C: Field Visibility Settings (Approved)
**Detailed Blueprint:** [2026-03-19-phase-6c-field-visibility.md](./blueprints/2026-03-19-phase-6c-field-visibility.md)
- [ ] **Visibility Table:** Create `field_visibility` table with sensible defaults.
- [ ] **Settings Panel:** Build `FieldVisibilitySettings` component for toggling fields.
- [ ] **Context Provider:** Implement `FieldVisibilityProvider` for global state.
- [ ] **Conditional Rendering:** Update `CoinDetail` and `CoinCard` to respect visibility settings.
- [ ] **Reset Function:** Allow users to restore default visibility.

### Phase 7: Code Review Remediation (Approved)
**Detailed Blueprint:** [2026-03-20-code-review-remediation.md](./blueprints/2026-03-20-code-review-remediation.md)
**Objective:** Remediate 38 issues across Security, Performance, UX/Accessibility, Code Quality, and Testing identified in the 2026-03-20 code review.
- [ ] **Security:** Enable SQLite foreign keys, fix MIME allowlist, remove `bypassCSP`, fix type annotations.
- [ ] **Performance:** Convert sync file reads to async; optimize N+1 export queries.
- [ ] **UX/Accessibility:** Add Era selector, Delete button, keyboard navigation, ARIA compliance, contrast fixes.
- [ ] **Code Quality:** Eliminate `any` types, move inline styles to CSS, remove dead code.
- [ ] **Testing:** Add missing tests for validation, hooks, and components.

#### UX/UI Refinements (Completed)
**Detailed Blueprint:** [2026-03-20-ux-ui-ledger-edit-refinements.md](./blueprints/archive/2026-03-20-ux-ui-ledger-edit-refinements.md)
- [x] Updated Cabinet header to "Patina — The Cabinet"
- [x] Moved CTAs above collection count
- [x] Redesigned filters with visible checkbox controls
- [x] Aligned Edit Coin form fields vertically via CSS grid

#### Cabinet UI Refinements (Proposed)
**Detailed Blueprint:** [2026-03-20-cabinet-ui-refinements.md](./blueprints/2026-03-20-cabinet-ui-refinements.md)
**Reference Audit:** [audit_cabinet_2026-03-20.md](./curating-ui/audit_cabinet_2026-03-20.md)
- [ ] Fix `btn-action` color contrast (C1) — `--text-muted` → `--text-ink`
- [ ] Fix toolbar gap and right-anchor primary CTA (H1)
- [ ] Fix metric divider `//` legibility (H2) — `--border-hairline` → `--text-muted`
- [ ] Increase `btn-action` click target padding (M3)
- [ ] Remove redundant "SEARCH THE LEDGER" visible label (M1)
- [ ] Switch gallery grid to `auto-fit` (M2)
- [ ] Polish collection count copy and sidebar gap (L1, L2)

#### Coin Detail & Scriptorium UI Refinements (Approved)
**Detailed Blueprint:** [2026-03-20-detail-scriptorium-ui-refinements.md](./blueprints/2026-03-20-detail-scriptorium-ui-refinements.md)
**Reference Audit:** [audit_detail_and_scriptorium_2026-03-20.md](./curating-ui/audit_detail_and_scriptorium_2026-03-20.md)
**Visual Mockup:** [mockup_detail_scriptorium_refinements_2026-03-20.html](./curating-ui/archive/mockup_detail_scriptorium_refinements_2026-03-20.html)
- [ ] Add zoom affordance overlay to plate frame — CD-C1
- [ ] Reverse header button order; add `.btn-delete` hover signal — CD-H1
- [ ] Add `border-bottom` to `.metrics-grid` for zone separation — CD-H2
- [ ] Remove hardcoded "PLATE V" from plate caption — CD-H3
- [ ] Separate Provenance into its own `numismatic-section` — CD-M1
- [ ] Unify footer font family to `var(--font-mono)` — CD-M2
- [ ] Replace `.export-result` in delete modal with `.modal-actions` — CD-L1
- [ ] Replace `[AUTO-ISSUE]` / `#001` with `—` / `#NEW` fallbacks — SC-C1
- [ ] Convert Scriptorium footer to `metrics-grid` pattern — SC-H1
- [ ] Fix `input-legend` to `width: 100%; max-width: 320px` — SC-H2
- [ ] Reduce `.plate-stack` gap to `2rem` — SC-M1
- [ ] Give first plate slot full opacity (obverse primacy) — SC-M2
- [ ] Widen subtitle label column to `130px` — SC-M3
- [ ] Add `border-top` to `.ledger-footer` — SC-L1
- [ ] Improve empty plate frame border to `var(--text-muted)` — SC-L2

---

## 7. Design Guidelines (Updated to v3.3)
> **Note:** See [style_guide.md](./style_guide.md) for the definitive design system.

- **Theme:** "Manuscript Hybrid" (Parchment & Iron Gall Ink).
- **Primary:** "Parchment" (#FCF9F2) & "Iron Gall Ink" (#2D2926).
- **Accents:** "Burnt Sienna" (#914E32) & "Vellum" (#E0DCCD).
- **Fonts:**
  - *Cormorant Garamond* (Serif) for headings.
  - *Montserrat* (Sans-Serif) for body text.
  - *JetBrains Mono* (Monospace) for technical metrics.
