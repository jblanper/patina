# Patina — Technical Plan

> A compass for the Curator's Tool. For phase-level implementation detail, see [`docs/blueprints/`](./blueprints/).

Patina is a privacy-first desktop application for historical coin collectors. It runs entirely on the user's machine — no accounts, no cloud sync, no data leaving the local filesystem.

The guiding philosophy is **Curator-First**: every design and engineering decision prioritises the collector's workflow, collection integrity, and data sovereignty over convenience shortcuts.

---

## Vision

Build a tool that feels like a museum — not a spreadsheet. The interface should reflect the dignity of the objects it catalogues. Data should be numismatically accurate, not generic. The experience should be calm and precise.

---

## Core Principles

### Privacy by Architecture

All data lives locally. SQLite holds the collection. Images live in `data/images/`. The Lens (Wi-Fi bridge) operates on the local network only, never the internet. There are no analytics, no telemetry, and no external dependencies at runtime.

### The Filter

Every piece of data that enters the Main process from the renderer is validated with strict Zod schemas. The renderer is treated as untrusted. This is not optional.

### Single-Click Rule

Every feature must be reachable within two clicks from any screen. Complexity is managed in the implementation, not exposed to the curator.

### Numismatic Accuracy

Fields, vocabularies, and catalog conventions follow established numismatic standards (NGC/PCGS grades, RIC, RPC, Crawford). The tool is designed to feel authoritative to a serious collector.

---

## Technology Choices

| Layer | Technology | Why |
|---|---|---|
| Shell | Electron | Native desktop with local filesystem access |
| Frontend | React + TypeScript | Maintainable, typed component model |
| Styling | Vanilla CSS | Full control over the "Manuscript Hybrid" aesthetic |
| Database | SQLite (`better-sqlite3`) | Single-file, portable, zero-setup |
| Image Bridge | Express.js | Lightweight local server for Wi-Fi photo capture |

These choices are conservative by design. Patina is a long-lived, offline-first tool. Dependencies are minimal and stable.

---

## Design Language

**"Manuscript Hybrid"** — Parchment and Iron Gall ink. The palette, typography, and spacing evoke archival materials without being decorative. Every interaction should feel deliberate.

Design decisions are governed by [`docs/style_guide.md`](./style_guide.md). UI proposals follow the `curating-ui` skill workflow.

---

## System Architecture

Patina runs as two processes:

- **Main** — Node.js/Electron. Owns the SQLite connection, the Lens server, file I/O, and all IPC handlers. Validates all data before it touches the DB.
- **Renderer** — React. Communicates with Main exclusively through the `window.electronAPI` bridge defined in `preload.ts`. Never has direct DB or filesystem access.

`src/common/` holds types and validation schemas shared between both processes.

For a full security walkthrough, see [`docs/architecture/security_data_flow.md`](./architecture/security_data_flow.md).

---

## Roadmap

Patina is built in phases. Each phase has a dedicated blueprint in [`docs/blueprints/`](./blueprints/). Blueprints follow a defined lifecycle: `Draft → Proposed → Approved → In Progress → Verification → Completed → Archived`.

### Completed

**Foundation**
Electron scaffold, SQLite schema with numismatic field model, IPC bridge, and "Manuscript Hybrid" design system.
- [Seed Data Script](./blueprints/archive/2026-03-13-seed-data-script.md)

**The Cabinet (Phase 2)**
Gallery grid with coin cards, sidebar multi-select filters (era, metal, grade), and global real-time search.
- [Phase 2 — The Display Case](./blueprints/archive/2026-03-12-phase-2-display-case.md)
- [T1: useCoins Hook](./blueprints/archive/2026-03-12-t1-usecoins-hook.md)
- [T2: Gallery Grid & Coin Card](./blueprints/archive/2026-03-13-phase-2-t2-gallery-grid.md)
- [T3: Sidebar & Search Bar](./blueprints/archive/2026-03-13-phase-2-t3-sidebar-search.md)

**The Ledger (Phase 3)**
Coin detail view with numismatic metrics, story field, and image inspection panel.
- [Phase 3 — The Ledger](./blueprints/archive/2026-03-14-phase-3-ledger.md)
- [Coin Detail "Ledger Folio" Upgrade](./blueprints/archive/2026-03-15-coin-detail-ledger-upgrade.md)
- [CoinDetail Style Alignment](./blueprints/archive/2026-03-16-coindetail-style-alignment.md)

**The Scriptorium (Phase 3.5)**
High-density data entry form with dual-folio layout, Zod-guarded inputs, and auto-draft.
- [Phase 3.5 — The Scriptorium](./blueprints/archive/2026-03-18-phase-3-5-scriptorium.md)

**The Lens (Phase 4)**
Wi-Fi image bridge: QR code workflow, token-authenticated Express server, real-time capture during data entry.
- [Phase 4 — The Lens](./blueprints/archive/2026-03-17-phase-4-lens.md)

**Preservation (Phase 5)**
One-click ZIP archive export and PDF catalog generation. Bug fixes for image duplication on re-import.
- [Phase 5 — Preservation](./blueprints/archive/2026-03-19-phase-5-preservation.md)
- [Coin & Image Duplication Fix](./blueprints/archive/2026-03-19-coin-image-duplication-fix.md)

**Enhancement Suite (Phase 6A & 6B)**
Vocabulary autocomplete for standardized fields; Spanish/English i18n with locale-aware date formats and numismatic translations.
- [Phase 6A — Standardized Values with Autocomplete](./blueprints/archive/2026-03-19-phase-6a-standardized-values.md)
- [Phase 6B — Internationalization](./blueprints/archive/2026-03-19-phase-6b-internationalization.md)
- [Phase 6B.2 — i18n Defect Patch](./blueprints/archive/2026-03-21-phase-6b-patch-i18n-defects.md)

**Code Review Remediation (Phase 7)**
38 issues remediated across security, performance, accessibility, code quality, and test coverage. Includes Cabinet and Scriptorium UI refinements.
- [Code Review Remediation](./blueprints/archive/2026-03-20-code-review-remediation.md)
- [UX/UI — Ledger & Edit Coin](./blueprints/archive/2026-03-20-ux-ui-ledger-edit-refinements.md)
- [Cabinet UI Refinements](./blueprints/archive/2026-03-20-cabinet-ui-refinements.md)
- [Cabinet Sort Controls & Grade Filter](./blueprints/archive/2026-03-20-cabinet-sort-grade-filter.md)
- [Coin Detail & Scriptorium UI Refinements](./blueprints/archive/2026-03-20-detail-scriptorium-ui-refinements.md)

**Glossary**
Bilingual field reference page (`/glossary`) and contextual `?` drawer surfacing definitions inline during data entry.
- [Glossary Page — The Contextual Interlude](./blueprints/archive/2026-03-21-glossary-page.md)

**Prestige PDF & Year Input (Phase 6D)**
Redesigned full-collection PDF catalog with Manuscript Hybrid branding, two coins per page, era-grouped TOC, and locale-aware labels. Year Numeric input surfaced in Scriptorium; era vocabulary corrected to historical-period classifier.
- [PDF Export Redesign — The Prestige Catalog](./blueprints/archive/2026-03-22-pdf-export-redesign.md)
- [Year Numeric Input & Era Glossary Correction](./blueprints/archive/2026-03-22-year-numeric-input.md)

**Cabinet Ledge & CoinCard Redesign**
Toolbar collapsed from five flat items to a three-item Command Strip (Personalizar · Herramientas ▾ dropdown · + Nueva Entrada). CoinCard grade moved from the inline metrics row to a dedicated labeled row, eliminating multi-word grade overflow and aligning presentation with numismatic catalogue convention.
- [Cabinet Ledge & CoinCard Redesign](./blueprints/archive/2026-03-23-cabinet-ledge-coincard-redesign.md)

### Active

| Blueprint | Status |
|---|---|
| [Phase 6C: Field Visibility Settings](./blueprints/2026-03-19-phase-6c-field-visibility.md) | Approved |
| [Sidebar Filter Overflow — The Soft Reveal](./blueprints/2026-03-21-sidebar-filter-overflow.md) | Verification |

---

## Ideas Under Discussion

These are directions being considered but not yet shaped into blueprints. They have no commitment or timeline. The goal is to capture thinking in flight.

To research any of these ideas before committing to a blueprint, use `/scouting-ideas`. It will search the competitive landscape, numismatic community, and relevant standards, and produce a structured report in `docs/research/` to feed into `/curating-blueprints`.

- **Collection Statistics Dashboard** — a curator's overview: total coins, distribution by era/metal/grade, acquisition timeline. A read-only "reading room" view built from existing data.
- **Print-Ready Coin Cards** — individual one-page PDFs per coin, suitable for display labels or insurance documentation. Complements the full-catalog PDF.
- **Advanced Full-Text Search** — extend search to cover the Story field and provenance notes, not just structured metadata.
- **Loan & Exhibition Tracking** — record when a coin leaves the collection temporarily (loaned to a museum, sent for grading). Adds a status field and return date without altering the core schema.
- **Multi-Collection Support** — allow the curator to maintain separate collections (personal, inherited, investment) within one installation, each with its own SQLite file.
- **Coin Research Panel** — a contextual panel within the Scriptorium that lets the curator look up numismatic references (Numista, PCGS, museum databases) without leaving the app. The goal is to reduce context-switching during cataloguing and help populate fields accurately from authoritative sources. → [Research report](./research/2026-03-22-coin-research-panel-research.md) (Ready for blueprint)
