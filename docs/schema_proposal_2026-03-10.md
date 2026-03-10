# Patina Database Schema Proposal - 2026-03-10

## 1. Research Methodology & Decision Rationale

### Sources Investigated
To ensure Patina serves both casual collectors and serious numismatists, I researched four primary sectors:
1.  **Community Platforms (Numista):** Identified the need for detailed physical parameters (Die Axis, Weight, Diameter) and catalog references.
2.  **Professional Grading (PCGS/NGC):** Analyzed standards for condition (Grade) and rarity scales.
3.  **Specialized Software (OpenNumismat):** Reviewed the pain points of "over-engineering" (80+ fields) to select only high-signal data points.
4.  **Museum Standards (CIDOC-CRM/Spectrum):** Highlighted the importance of **Provenance** (pedigree) and **Historical Context** (narrative story) for coins with historical value.

### Method & Decisions
The final proposal uses a **"High-Signal Synthesis"** method. I intentionally rejected fields that contribute to "technical friction" (like specific seller commission or storage folder IDs) in favor of fields that enhance the "Curator" experience.

**Key Decisions:**
-   **Dual-Date System:** Historical dates (e.g., "44 BC") are notoriously hard to sort. We use a display string for the user and a numeric integer for the engine.
-   **Legend Transcription:** Serious collectors value the exact text on a coin. Dedicated fields for Obverse and Reverse legends were included to separate them from visual descriptions.
-   **Narrative Focus:** The "Story" field is given prominence to align with the "Respect the History" mandate.

---

## 2. Table: `coins` (The Ledger)

| Field | Type | Constraints | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique internal identifier. | `1` |
| `title` | TEXT | NOT NULL | A concise, descriptive name for the coin. | `Athens Owl Tetradrachm` |
| `issuer` | TEXT | | The authority, ruler, or state that issued the coin. | `Roman Republic` |
| `denomination` | TEXT | | The face value or unit of account. | `1 Denarius` |
| `year_display` | TEXT | | The date as it should appear in the UI. | `44 BC` |
| `year_numeric` | INTEGER | | A sortable integer (BC is negative). | `-44` |
| `era` | TEXT | DEFAULT 'Modern' | Broad historical classification for filtering. | `Ancient` |
| `mint` | TEXT | | The specific location/city where the coin was struck. | `Rome` |
| `metal` | TEXT | | The primary material of the coin. | `Silver` |
| `fineness` | TEXT | | The purity of the metal content. | `.925` |
| `weight` | REAL | | The mass of the coin in grams. | `4.25` |
| `diameter` | REAL | | The maximum width of the coin in millimeters. | `18.5` |
| `die_axis` | TEXT | | The relative orientation of the obverse and reverse. | `6h` or `180°` |
| `obverse_legend` | TEXT | | The exact transcription of text on the front side. | `CAESAR DICT PERPETVO` |
| `obverse_desc` | TEXT | | Visual description of the imagery on the front. | `Laureate head of Caesar` |
| `reverse_legend` | TEXT | | The exact transcription of text on the back side. | `P SEPVLLIVS MACER` |
| `reverse_desc` | TEXT | | Visual description of the imagery on the back. | `Venus Victrix holding Victory` |
| `edge_desc` | TEXT | | Physical characteristics of the coin's rim. | `Reeded` or `Lettered` |
| `catalog_ref` | TEXT | | Reference number in standard numismatic books. | `RIC I 480` |
| `rarity` | TEXT | | Indication of how scarce the coin is. | `R2` or `Extremely Rare` |
| `grade` | TEXT | | The physical condition/preservation state. | `Ch XF (Choice Extra Fine)` |
| `provenance` | TEXT | | The ownership history or "pedigree" of the coin. | `Ex. Huntington Collection` |
| `story` | TEXT | | A large narrative area for historical context. | `Struck during the civil war...` |
| `purchase_price` | REAL | | The amount paid for the coin. | `1250.00` |
| `purchase_date` | TEXT | | The date of acquisition (YYYY-MM-DD). | `2024-03-10` |
| `purchase_source` | TEXT | | The auction house or dealer. | `Heritage Auctions` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Metadata for when the record was created. | `2026-03-10 14:00:00` |

---

## 3. Table: `images` (The Lens Output)

| Field | Type | Constraints | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique internal identifier for the image. | `101` |
| `coin_id` | INTEGER | NOT NULL, REFERENCES coins(id) | Link to the specific coin in the Ledger. | `1` |
| `path` | TEXT | NOT NULL | Relative path to the file in `data/images/`. | `coin_1_obv.jpg` |
| `label` | TEXT | | User-defined label for the photo. | `Obverse (Macro)` |
| `is_primary` | INTEGER | DEFAULT 0 | Flag (0 or 1) to mark the main gallery thumbnail. | `1` |
| `sort_order` | INTEGER | DEFAULT 0 | Used to arrange images in the record view. | `0` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Metadata for when the image was added. | `2026-03-10 14:05:00` |
