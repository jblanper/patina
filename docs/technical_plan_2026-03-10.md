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

### Phase 4: The Lens (Wireless Bridge) (In Progress)
**Detailed Blueprint:** [2026-03-17-phase-4-lens.md](./blueprints/2026-03-17-phase-4-lens.md)
- [x] **Express Foundation:** Implement the lightweight server within the Main process with `multer` validation. [Blueprint](./blueprints/2026-03-17-phase-4-lens.md)
- [x] **The Filter (Lens):** Enforce strict session-specific UUID tokens and 10MB file size limits.
- [x] **Mobile UI:** Design a minimal, responsive HTML template served directly by the Main process.
- [x] **IPC Handlers:** Create `lens:start`, `lens:stop`, and `lens:get-status` for the Renderer.
- [ ] **Renderer Integration:** Build the `useLens()` hook and the `QRCodeDisplay` component.
- [ ] **Add Coin Integration:** Connect the Lens subsystem to the "Add Coin" or "Edit Coin" forms.

### Phase 5: Preservation (Security/Export)
- [ ] Build the "Export to USB" one-click archive.
- [ ] Implement PDF "Catalog" generation using a library like `jspdf` or `react-pdf`.

---

## 6. Design Guidelines (Updated to v3.3)
> **Note:** See [style_guide.md](./style_guide.md) for the definitive design system.

- **Theme:** "Manuscript Hybrid" (Parchment & Iron Gall Ink).
- **Primary:** "Parchment" (#FCF9F2) & "Iron Gall Ink" (#2D2926).
- **Accents:** "Burnt Sienna" (#914E32) & "Vellum" (#E0DCCD).
- **Fonts:**
  - *Cormorant Garamond* (Serif) for headings.
  - *Montserrat* (Sans-Serif) for body text.
  - *JetBrains Mono* (Monospace) for technical metrics.
