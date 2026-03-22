# Patina — Historical Coin Archive

**Patina** is a privacy-first desktop archive for serious coin collectors. It bridges the gap between a physical coin in hand and a professional record on screen — prioritising privacy, archival precision, and ease of use. All data stays on your machine.

---

## Core Principles
- **Respect the History:** A UI that feels like a curator's tool, not a tech gadget.
- **The "Single-Click" Rule:** No feature is more than two clicks away.
- **Privacy First:** Your collection stays on your computer. No telemetry, no cloud sync, no external CDNs.

---

## Key Features

- **The Cabinet:** High-resolution gallery grid with sidebar filters for Era, Metal, and Grade. Bilingual interface (Spanish / English).
- **The Ledger:** Full coin record — weight, diameter, die axis, legends, catalog references (RIC/RPC/Crawford), provenance, rarity, and a curator's narrative field.
- **The Scriptorium:** Rich data-entry form with a dual-folio layout (plate editor + metadata form). Multi-image support (Obverse, Reverse, Edge).
- **The Lens (Wireless Bridge):** Built-in local server — scan a QR code with your phone and push photos directly into records over Wi-Fi.
- **Vocabulary System:** Standardised values for metal, denomination, grade, era, die axis, and mint. Autocomplete-backed form fields sourced from Nomisma.org (seeded locally at startup).
- **Field Glossary:** Bilingual (EN/ES) coin field reference, accessible from the Cabinet toolbar and as a contextual slide-in drawer from any field label.
- **Collection Export:** One-click ZIP archive (CSV + images + DB snapshot) and PDF catalog with cover page, TOC, and per-coin plates.

---

## Tech Stack

- **Shell:** [Electron](https://www.electronjs.org/)
- **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Database:** [SQLite](https://sqlite.org/) via `better-sqlite3`
- **i18n:** `react-i18next` (ES default, EN available)
- **Styling:** Vanilla CSS — Manuscript Hybrid v3.3

---

## Design Standards

Patina follows the **Manuscript Hybrid (v3.3)** aesthetic — a silent archival frame that lets historical objects take centre stage.

- **Typography:** Cormorant Garamond (serif), Montserrat (sans), JetBrains Mono (metrics)
- **Palette:** Parchment `#FCF9F2`, Iron Gall Ink `#2D2926`, Burnt Sienna `#914E32`
- **Style references:** `docs/style_guide.md` and `docs/style_guide.html`
- **CLI extensions:** `docs/workflows_and_skills.md`

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- npm

### Installation
```bash
git clone <repository-url>
cd patina
npm install --legacy-peer-deps
```

### Development
```bash
npm run dev        # Vite renderer + tsc watch + Electron
```

### Build
```bash
npm run build
```

### Seed test data
```bash
npm run db:seed
```

---

## Project Structure

```text
patina/
├── docs/               # Documentation, blueprints, style guide, research reports
├── skills/             # Claude Code skill definitions (curating, scouting, QA, security…)
├── src/
│   ├── main/           # Electron main process (DB, IPC, Lens server)
│   ├── renderer/       # React frontend (Cabinet, Ledger, Scriptorium, Glossary)
│   └── common/         # Shared types, Zod schemas, SQLite schema
├── data/               # Local SQLite DB and coin images (git-ignored)
└── public/             # Static assets
```

---

## License

Private — for personal use by historical coin collectors.
