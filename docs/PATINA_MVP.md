# Patina - Historical Coin Archive

**Goal:** A prestigious yet simple desktop archive for serious collectors to document their coins without technical friction.

---

## 1. Core Principles
- **Respect the History:** The UI should feel like a curator's tool, not a tech gadget.
- **The "Single-Click" Rule:** No feature should be more than two clicks away.
- **Privacy First:** Your collection stays on your computer. Period.

---

## 2. MVP Feature Set

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

## 3. Design Identity (Cues for UI/UX)
- **Primary Color Palette:** A deep, muted "Oxford Blue" or a rich "Forest Green" (mimicking an old leather-bound ledger).
- **Accent Colors:** A soft, aged bronze or "Verdigris" (the classic oxidized copper green) for buttons and highlights.
- **Typography:** - **Headings:** High-legibility Serif font (e.g., *Georgia* or *Playfair Display*) for a "Museum Label" feel.
  - **Body/Data:** Simple, clean Sans-Serif (e.g., *Inter* or *Arial*) at a minimum 16px size for maximum readability.
- **Visual Metaphor:** Large margins and clean borders, avoiding cluttered "technical" dashboards.

---

## 4. Competitive Research

| App Name | Platform | Key Features | The Friction Point |
| :--- | :--- | :--- | :--- |
| **OpenNumismat** | Desktop | Open-source, 80+ data fields, highly technical. | **Overwhelming UI:** Too many buttons and fields; feels like 90s software. |
| **CoinSnap** | Mobile | AI identification and automatic market valuation. | **Privacy & Cost:** Cloud-dependent and subscription-based; many seniors dislike "renting" software. |
| **Numista** | Web | Massive global database and trading community. | **Workflow:** Getting high-quality photos from a phone into the web database is tedious. |
| **Coinoscope** | Mobile | Visual search engine for identification. | **Storage:** Great for finding info, but not built for archiving a permanent private collection. |
| **PCGS CoinFacts** | Mobile/Web | Professional grading data and auction tracking. | **Specialized:** Focused on US coins and professional grading; less useful for world history. |

**Patina's Competitive Edge:** We win by being the simplest bridge between a physical coin in the hand and a professional record on the computer. We prioritize **Privacy** (Local storage) and **Ease of Use** (The QR-to-Camera link).

---

## 5. Technical Foundation
- **Identity:** Patina (Desktop Electron App)
- **Engine:** SQLite3
- **Bridge:** Local Node.js / Express listener for the "Lens" feature.
