# Mockup: The Curator's Desk (Creation Interface)

**Style:** Path B (Dedicated Full Page)
**Reference:** `docs/curating-ui/proposal_scriptorium_2026-03-17.html`

## Visual Structure

The interface mimics the `CoinDetail` layout but with editable fields. It is a "What You See Is What You Get" (WYSIWYG) editor for the ledger.

```text
+-------------------------------------------------------+---------------------------------------------------------------+
|  [ HEADER: < Back to Cabinet                          |   [ ACTION: Save to Ledger ]  [ Cancel ]                      |
+-------------------------------------------------------+---------------------------------------------------------------+
|                                                       |                                                               |
|  [ LEFT FOLIO: THE PLATE ]                            |   [ RIGHT FOLIO: THE RECORD ]                                 |
|                                                       |                                                               |
|  +-------------------------------------------------+  |   ENTRY # [ Auto-Generated ]                                  |
|  |                                                 |  |                                                               |
|  |   [ LENS PREVIEW AREA ]                         |  |   TITLE (H1 Serif)                                            |
|  |                                                 |  |   [ Input: "Athenian Owl Tetradrachm" ]                       |
|  |   [Icon: Camera/QR]                             |  |   _________________________________________________________   |
|  |                                                 |  |                                                               |
|  |   "Scan with Mobile to Attach Obverse"          |  |   ISSUER / MINT                                               |
|  |                                                 |  |   [ Input: "Athens" ]        [ Input: "Attica" ]              |
|  |   [ BUTTON: Activate Lens ]                     |  |   ________________________   ________________________         |
|  |   [ Link: Upload from Disk ]                    |  |                                                               |
|  |                                                 |  |   YEAR (Numeric)             ERA (Select)                     |
|  |                                                 |  |   [ Input: "450" ]           [ v BC ]                         |
|  +-------------------------------------------------+  |   ________________________   ________________________         |
|                                                       |                                                               |
|   [ THUMBNAIL STRIP ]                                 |   ---------------------------------------------------------   |
|   [+] Add Reverse  [+] Add Edge                       |   TECHNICAL METRICS (JetBrains Mono)                          |
|                                                       |                                                               |
|                                                       |   MATERIAL       WEIGHT (g)     DIAMETER (mm)    AXIS (h)     |
|                                                       |   [ AR ]         [ 17.20 ]      [ 24.5 ]         [ 12 ]       |
|                                                       |   ______         _________      ____________     ______       |
|                                                       |                                                               |
|                                                       |   ---------------------------------------------------------   |
|                                                       |   NUMISMATIC DATA                                             |
|                                                       |                                                               |
|                                                       |   CATALOG REFERENCE (e.g. RIC, RPC)                           |
|                                                       |   [ Input: "HGC 4, 1597" ]                                    |
|                                                       |   _________________________________________________________   |
|                                                       |                                                               |
|                                                       |   OBVERSE LEGEND              REVERSE LEGEND                  |
|                                                       |   [ Input... ]                [ Input: "AOE" ]                |
|                                                       |   ________________________    ________________________        |
|                                                       |                                                               |
|                                                       |   CURATOR'S NOTE (Story)                                      |
|                                                       |   +-------------------------------------------------------+   |
|                                                       |   | The owl of Athena, symbol of wisdom...                |   |
|                                                       |   |                                                       |   |
|                                                       |   |                                                       |   |
|                                                       |   +-------------------------------------------------------+   |
|                                                       |                                                               |
|                                                       |   PROVENANCE                                                  |
|                                                       |   [ Input: "Ex. BCD Collection" ]                             |
|                                                       |   _________________________________________________________   |
|                                                       |                                                               |
|                                                       |   ACQUISITION                                                 |
|                                                       |   Date: [ 2024-01-15 ]    Price: [ Hidden ]    Source: [..]   |
|                                                       |                                                               |
+-------------------------------------------------------+---------------------------------------------------------------+
```

## Data Fields Checklist (Zod Validation)

### 1. Core Identity
- **Title:** Required. String.
- **Issuer/City:** Required. String.
- **Mint:** Optional. String.
- **Year:** Required. Numeric (can be 0 if unknown).
- **Era:** Required. Enum: `['BC', 'AD']`.

### 2. Physical Metrics (The "2-Decimal" Rule)
- **Material:** Required. Enum/String (Gold, Silver, Bronze, Billon).
- **Weight:** Required. Float (Max 2 decimals).
- **Diameter:** Required. Float (Max 1 decimal).
- **Die Axis:** Optional. Integer (1-12).

### 3. Cataloging
- **Catalog Reference:** Optional. String (e.g., "RIC II 218").
- **Legends:** Optional. Strings.
- **Descriptions:** Optional. Text area.

### 4. Preservation
- **Provenance:** Optional. String.
- **Story:** Optional. Rich Text / Markdown.
- **Purchase Data:** Date (ISO), Price (Float), Source (String).

## Lens Integration
- The **Left Folio** serves as the "Lens" receiver.
- Default state: "Waiting for connection...".
- Active state: Shows QR Code.
- Success state: Shows high-res image preview with "Retake" option.
