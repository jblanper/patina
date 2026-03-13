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
- [x] Implement `npm run db:seed` for numismatically accurate test data.
- [x] Establish "Museum Label" design system (Typography, Colors).
- [x] Implement IPC bridge for secure Main/Renderer communication.

### Phase 2: The Display Case (Current)
- [x] **Data Management:** Develop `useCoins()` custom hook for centralized state, filtering, and DB interaction.
- [x] **Gallery Grid:** Build `GalleryGrid` and `CoinCard` components with "Museum Label" aesthetic.
- [ ] **Sidebar Filters:** Create `PatinaSidebar` with multi-select filters for Era (Ancient, Medieval, Modern) and Metal (Gold, Silver, Bronze).
- [ ] **Global Search:** Implement a prominent, stylized `SearchBar` for real-time filtering by Year, Country, or Title.
- [ ] **Empty State:** Design a prestigious "Empty Case" view to encourage adding the first coin.
- [/] **Optimization:** Implement `React.memo` and image lazy-loading for large collections. (Memoization complete; lazy-loading pending).

### Phase 3: The Ledger (Record View)
- [ ] Build the detailed coin record display.
- [ ] Implement the "Story" box (rich text or clean markdown).
- [ ] Add the image zoom/inspection functionality.

### Phase 4: The Lens (Wireless Bridge)
- [ ] Implement the local Node.js/Express server.
- [ ] Create the QR code generator.
- [ ] Build the minimal mobile upload page.

### Phase 5: Preservation (Security/Export)
- [ ] Build the "Export to USB" one-click archive.
- [ ] Implement PDF "Catalog" generation using a library like `jspdf` or `react-pdf`.

---

## 6. Design Guidelines
- **Primary:** "Oxford Blue" (#0B132B) & "Forest Green" (#1B3022).
- **Accents:** "Aged Bronze" (#8D5B4C) & "Verdigris" (#43AA8B).
- **Fonts:** *Playfair Display* (Serif) for headings, *Inter* (Sans-Serif) for data.
