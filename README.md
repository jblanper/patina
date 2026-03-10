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

Patina follows a strict **"White Cube" Gallery** aesthetic. The interface is a silent frame designed to let historical objects take center stage.

- **Typography:** Inter (Sans-Serif)
- **Palette:** Gallery White (`#FFFFFF`), Ink Black (`#121212`), Patina Accent (`#43AA8B`)
- **Documentation:** See [Style Guide (Markdown)](docs/style_guide.md) and [Visual Reference (HTML)](docs/style_guide.html).

---

## Development with Gemini CLI

This project uses specialized **Gemini CLI Skills** and **Automated Quality Hooks** to ensure high standards for design, domain accuracy, and security.

### Specialized Skills:
- **`curator-ui`**: Enforces the "White Cube" aesthetic.
- **`numismatic-researcher`**: Ensures technical accuracy for coin records.
- **`electron-security`**: Audits IPC handlers and process isolation.

### Automated Quality Hooks:
The workspace is equipped with real-time feedback hooks that trigger after every turn:
- **Build Status**: Automated `tsc --noEmit` checks.
- **Lint Status**: Automated `eslint` code style audits.
- **Schema Sync**: Automatic extraction of the structured database schema.

**Quick Start:**
1.  Install skills: `gemini skills install .gemini/skills/* --scope workspace`
2.  Reload: Run `/skills reload` in your interactive session.
3.  Mandates: See [GEMINI.md](GEMINI.md) for core engineering rules.

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
