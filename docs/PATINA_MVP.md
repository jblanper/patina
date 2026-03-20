# Patina - Historical Coin Archive

**Goal:** A prestigious yet simple desktop archive for serious collectors to document their coins without technical friction.

---

## 1. Core Principles
- **Respect the History:** The UI should feel like a curator's tool, not a tech gadget.
- **The "Single-Click" Rule:** No feature should be more than two clicks away.
- **Privacy First:** Your collection stays on your computer. Period.

---

## 2. Implementation Phases

### Phase 1: Foundation (Completed)
- [x] Electron + React (TypeScript) scaffold
- [x] SQLite3 database with curator schema
- [x] Museum Label design system
- [x] Secure IPC bridge

### Phase 2: The Display Case (Completed)
- [x] Gallery grid with high-resolution coin images
- [x] Sidebar filters (Era, Metal)
- [x] Global search bar
- [x] Empty state view

### Phase 3: The Ledger (Completed)
- [x] Detailed coin record display
- [x] Story box for provenance and history
- [x] Image zoom functionality
- [x] Smart responsive grid

### Phase 3.5: The Scriptorium (Completed)
- [x] Add/Edit form with dual-folio layout
- [x] Plate Editor for obverse/reverse/edge images
- [x] Lens integration for wireless capture
- [x] Auto-draft with localStorage
- [x] Zod validation for technical precision

### Phase 4: The Lens (Completed)
- [x] Express server for wireless image transfer
- [x] QR code session initiation
- [x] Mobile web interface
- [x] Multer validation (10MB limit)

### Phase 5: Preservation (Completed)
- [x] ZIP export with database, CSV, images
- [x] PDF catalog generation
- [x] Toast notifications

### Phase 6: Enhancement Suite (In Progress)
- [ ] Standardized vocabulary with autocomplete
- [ ] Internationalization (English/Spanish)
- [ ] Field visibility settings

---

## 3. Feature Set

### A. The Gallery (The "Display Case")
- **Visual Browsing:** High-resolution grid view of coin obverses.
- **Patina Filters:** A simple sidebar to filter by Era (Ancient, Medieval, Modern) and Metal (Gold, Silver, Bronze).
- **Search:** A large, prominent search bar for Year or Country.

### B. The Ledger (The "Coin Record")
- **Standardized Fields:** Name, Year, Mint, Weight, Diameter, Grade.
- **The "Story" Box:** A large, distraction-free area for the collector to type the coin's provenance or historical context.
- **Image Zoom:** Hover or click to inspect the fine details of the strike.

### C. The "Lens" (Wireless Image Bridge)
- **Instant Pair:** Click "Add Photo" on Desktop -> Scan QR with Phone.
- **Live Transfer:** Phone camera acts as a wireless peripheral. Once the shutter clicks, the photo "slides" into the Desktop record instantly via local Wi-Fi.

### D. Collection Security
- **Archive Backup:** A giant "Export to USB" button that creates a self-contained folder of the database and all images.
- **Physical Print:** Generate a clean, printable PDF "Catalog" of the collection.

---

## 4. Design Identity (Manuscript Hybrid v3.3)
- **Primary Colors:** Parchment (#FCF9F2) & Iron Gall Ink (#2D2926)
- **Accent Colors:** Burnt Sienna (#914E32) & Vellum (#E0DCCD)
- **Typography:**
  - *Cormorant Garamond* (Serif) for headings
  - *Montserrat* (Sans-Serif) for body text
  - *JetBrains Mono* (Monospace) for technical metrics
- **Visual Metaphor:** Large margins and clean borders, avoiding cluttered "technical" dashboards

---

## 5. Competitive Research

| App Name | Platform | Key Features | The Friction Point |
| :--- | :--- | :--- | :--- |
| **OpenNumismat** | Desktop | Open-source, 80+ data fields, highly technical. | **Overwhelming UI:** Too many buttons and fields; feels like 90s software. |
| **CoinSnap** | Mobile | AI identification and automatic market valuation. | **Privacy & Cost:** Cloud-dependent and subscription-based; many seniors dislike "renting" software. |
| **Numista** | Web | Massive global database and trading community. | **Workflow:** Getting high-quality photos from a phone into the web database is tedious. |
| **Coinoscope** | Mobile | Visual search engine for identification. | **Storage:** Great for finding info, but not built for archiving a permanent private collection. |
| **PCGS CoinFacts** | Mobile/Web | Professional grading data and auction tracking. | **Specialized:** Focused on US coins and professional grading; less useful for world history. |

**Patina's Competitive Edge:** We win by being the simplest bridge between a physical coin in the hand and a professional record on the computer. We prioritize **Privacy** (Local storage) and **Ease of Use** (The QR-to-Camera link).

---

## 6. Technical Foundation
- **Identity:** Patina (Desktop Electron App)
- **Engine:** SQLite3
- **Bridge:** Local Node.js / Express listener for the "Lens" feature.
