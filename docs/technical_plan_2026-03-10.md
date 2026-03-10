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

### Phase 1: Foundation (Current)
- [ ] Scaffold Electron + React (TypeScript) base.
- [ ] Configure `better-sqlite3` (pending schema approval).
- [ ] Establish "Museum Label" design system (Typography, Colors).

### Phase 2: The Display Case (Gallery)
- [ ] Implement the visual grid view for coin obverses.
- [ ] Build the "Patina Filters" sidebar (Era, Metal).
- [ ] Develop the prominent search bar for Year/Country.

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
