# Patina - Historical Coin Archive

**Patina** is a prestigious yet simple desktop archive designed for serious collectors to document their historical coins without technical friction. It bridges the gap between a physical coin in the hand and a professional record on the computer, prioritizing privacy and ease of use.

---

## Core Principles
- **Respect the History:** A UI that feels like a curator's tool, not a tech gadget.
- **The "Single-Click" Rule:** No feature is more than two clicks away.
- **Privacy First:** Your collection stays on your computer. Period.

---

## Key Features
- **The Gallery (Display Case):** High-resolution grid view of coin obverses with sidebar filters for Era (Ancient, Medieval, Modern) and Metal.
- **The Ledger (Coin Record):** Standardized fields (Weight, Diameter, Die Axis, Legends) and a "Story" box for historical context.
- **The Lens (Wireless Bridge):** A built-in local server that allows you to scan a QR code with your phone and "slide" photos directly into your desktop records via Wi-Fi.
- **Collection Security:** One-click "Export to USB" for backups and a printable PDF "Catalog" generation.

---

## Tech Stack
- **Shell:** [Electron](https://www.electronjs.org/)
- **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Database:** [SQLite3](https://sqlite.org/) (via `better-sqlite3`)
- **Styling:** Vanilla CSS (Gallery White & Ink Black theme)

---

## Design Standards

Patina follows a strict **Manuscript Hybrid (v3.3)** aesthetic. The interface is a silent frame (the "Archival Ledger") designed to let historical objects take center stage.

- **Typography:** Cormorant (Serif), Montserrat (Sans), JetBrains Mono (Technical)
- **Palette:** Parchment (`#FCF9F2`), Iron Gall Ink (`#2D2926`), Burnt Sienna (`#914E32`)
- **CLI Extensions:** For specialized workflows (e.g., `curating-coins`, `securing-electron`), see [The Curator's Automation](docs/workflows_and_skills.md).
- **Style Guides:** See [Technical Style Guide](docs/style_guide.md) and [Visual Reference](docs/style_guide.html).

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [npm](https://www.npmjs.com/)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd patina
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the Vite dev server and the Electron application concurrently:
```bash
npm run dev
```

### Build
Generate production builds for the renderer and main processes:
```bash
npm run build
```

---

## Project Structure
```text
patina/
├── docs/                     # Documentation and Design Specs
├── src/
│   ├── main/                 # Electron main process (System, DB, Local Server)
│   ├── renderer/             # React Frontend (Gallery, Ledger, Styles)
│   ├── common/               # Shared types and constants
│   └── ...
├── data/                     # Local SQLite DB and coin images (Git ignored)
├── public/                   # Static assets
└── package.json
```

---

## License
This project is private and for personal use by historical coin collectors.
