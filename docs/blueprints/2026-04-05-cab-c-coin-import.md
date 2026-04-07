# Implementation Blueprint: Coin Import (CAB-C)

**Date:** 2026-04-05
**Status:** Proposed
**Reference:** `docs/research/2026-04-03-cabinet-list-bulk-import-research.md`
**Series:** Cabinet Enhancement Series — Blueprint C of 3. Can be implemented independently of CAB-B; depends only on the stable `Cabinet` toolbar infrastructure from CAB-A being Completed.

---

## 1. Objective

Allow curators to import coins into Patina from two sources:

1. **CSV file** — with a field-mapping dialog. Patina's own export CSV auto-maps losslessly; foreign CSVs (from Excel, other tools) require curator confirmation of column-to-field mappings.
2. **Patina ZIP archive** — the inverse of the existing `export:toZip` operation. Imports coins + images from a previously exported Patina archive.

Both paths are strictly local. No external API enrichment. Duplicate detection is advisory — the curator confirms before import proceeds.

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** The import dialog is a deliberate, multi-step review workflow — not a drag-and-drop shortcut. Each step mirrors the care expected of archival work.
- [x] **Privacy First:** All import processing is local. No file path, field value, or image crosses the machine boundary. The staged file path never travels through the renderer bridge.
- [x] **Single-Click Rule:** Import is reachable in two clicks: `Tools ▾ → Import...`. The multi-step dialog is necessary complexity, not avoidable.

---

## 2. Technical Strategy

### 2A — Two-Phase IPC Design (No Renderer-Supplied Paths)

The native file picker dialog runs in the **Main process**. The renderer never receives or sends a file path. Instead:

- **Phase 1 (Preview):** Renderer calls `import:csvPreview` or `import:zipPreview` with no arguments. Main opens a native dialog, reads the file, caches the path in a module-level `stagedImportPath` variable, and returns metadata to the renderer.
- **Phase 2 (Execute):** Renderer sends the curator's decisions (field mapping, skip options). Main reads from `stagedImportPath` (already validated in Phase 1) and performs the import.
- `stagedImportPath` is cleared after execute completes or when the dialog is closed without executing.

This design ensures the renderer is never a vector for path traversal or arbitrary file reads.

### 2B — New IPC Handlers

All handlers are registered in `src/main/index.ts`.

#### `import:csvPreview`
- Opens a native `dialog.showOpenDialog` filtered to `.csv`.
- If cancelled: returns `{ cancelled: true }`.
- Reads the file with `fs.promises.readFile`, parses the first 11 rows (1 header + 10 data rows).
- Caches the absolute path in `let stagedCsvPath: string | null`.
- Returns: `{ headers: string[], preview: string[][], rowCount: number }`.
  - `rowCount` is obtained by counting newlines (fast; no full parse needed).

#### `import:csvExecute`
Validated by new `CsvExecuteSchema`:
```typescript
export const CsvExecuteSchema = z.object({
  fieldMap: z.record(
    z.string().max(100),     // CSV column name
    z.string().max(100)      // Patina field name OR empty string to skip
  ).max(50),
  locale: z.enum(['en', 'es']).default('es'),
  skipDuplicates: z.boolean().default(false),
}).strict();
```

Main process logic:
1. Asserts `stagedCsvPath` is set.
2. Reads full CSV with `fs.promises.readFile`.
3. Parses all rows using the `fieldMap` to translate column names to `NewCoin` field names.
4. For each row, constructs a candidate `Partial<NewCoin>`, then validates with `NewCoinSchema.partial()`.
5. **Duplicate detection:** For each candidate, compute fingerprint `${title.toLowerCase()}|${year_numeric}|${issuer?.toLowerCase() ?? ''}`. Compare against in-memory fingerprints of existing coins (fetched once at the start of the import via `dbService.getCoins()`). Flag fingerprint matches as `duplicates`.
6. If `skipDuplicates: true`: skip flagged rows silently.
7. If `skipDuplicates: false`: import all rows regardless; duplicates are surfaced in the result for curator awareness.
8. For each valid row: `dbService.addCoin(mapped)`.
9. For each vocabulary field value not already in the vocab store: `dbService.addVocabEntry(field, value, locale)`.
10. Clears `stagedCsvPath`.
11. Returns: `{ imported: number, skipped: number, duplicates: DuplicateInfo[], errors: RowError[] }`.

```typescript
interface DuplicateInfo {
  rowIndex: number;
  title: string;
  existingId: number;
}

interface RowError {
  rowIndex: number;
  message: string;
}
```

#### `import:zipPreview`
- Opens a native dialog filtered to `.zip`.
- Reads `manifest.json` from the ZIP using `adm-zip` (or `archiver`'s read mode) — must be a Patina archive (`app: 'Patina'` in manifest).
- Caches path in `stagedZipPath`.
- Returns: `{ coinCount: number, hasImages: boolean, exportDate: string, appVersion: string }`.

#### `import:zipExecute`
Validated by `ZipExecuteSchema`:
```typescript
export const ZipExecuteSchema = z.object({
  locale: z.enum(['en', 'es']).default('es'),
  skipDuplicates: z.boolean().default(false),
}).strict();
```

Main process logic:
1. Asserts `stagedZipPath` is set.
2. Extracts `coins.csv` from the ZIP. Parses it using the Patina CSV column definitions (auto-mapped — no field-mapping step needed for a Patina-origin ZIP).
3. Extracts `images/` entries. For each image:
   - Validates: no path traversal (`..`), allowed extension (`.jpg`, `.jpeg`, `.png`, `.webp`), max 10 MB.
   - Writes to `data/images/coins/` with a collision-safe name: `import-<timestamp>-<random>.<ext>` (same scheme as `image:importFromFile`).
   - Records the new relative path for use in `db:addImage`.
4. Imports coins using the same duplicate-detection and vocab-enrichment logic as `import:csvExecute`.
5. For each coin imported, creates corresponding `CoinImage` records via `dbService.addImage()`.
6. Clears `stagedZipPath`.
7. Returns `{ imported, skipped, duplicates, errors }`.

#### `import:cancel`
Clears `stagedCsvPath` and `stagedZipPath`. Called by the renderer when the dialog closes without executing. No parameters. No Zod schema needed (empty payload).

### 2C — `ImportDialog` Component

**New file:** `src/renderer/components/ImportDialog.tsx`

A multi-step modal (`role="dialog"`, `aria-modal="true"`, focus-trapped).

**Step 1 — Source Selection**
Two large card-buttons:
- "From CSV file" — sub-label: "Spreadsheet or other tool export"
- "From Patina Archive (ZIP)" — sub-label: "Re-import a previous Patina backup"

On selection, calls `import:csvPreview` or `import:zipPreview` and advances.

**Step 2A — CSV: Field Mapping**
- Left column: CSV headers (as returned by `import:csvPreview`).
- Right column: `<select>` per header, pre-populated with Patina field names plus a "— skip —" option.
- Auto-detection: if a CSV header exactly matches a Patina field name (case-insensitive), pre-select it.
- Preview table: shows the first 5 data rows with the current mapping applied (column names update in real time).
- Checkbox: "Skip potential duplicates automatically" (maps to `skipDuplicates`).
- Confirm button: disabled unless `title` is mapped (title is the only required field).

**Step 2B — ZIP: Archive Review**
- Shows: coin count, export date, whether images are included.
- Shows a warning if `appVersion` in the manifest differs significantly from current.
- Checkbox: "Skip potential duplicates automatically".
- Single "Import" confirm button.

**Step 3 — Duplicate Review** (only when `skipDuplicates: false` and duplicates were found)
- Shows a list of flagged rows: `[Row N] [Coin title] — likely matches existing coin "[title]" (id: N)`.
- Curator can check/uncheck individual rows to decide which to import anyway.
- If this step has no duplicates, it is skipped.

**Step 4 — Result**
- Summary: "Imported N coins. N skipped (duplicates). N errors."
- If errors > 0: expandable "Show details" panel with `RowError` list.
- "Done" button closes the dialog and triggers `useCoins.refresh()`.

### 2D — Cabinet Integration

`Cabinet.tsx` additions:
- `importOpen` state.
- New item in `Tools ▾` dropdown:
  ```tsx
  <button className="tools-dropdown-item" role="menuitem"
    onClick={() => { setImportOpen(true); setToolsOpen(false); }}>
    {t('cabinet.importCoins')}
  </button>
  ```

After `ImportDialog` closes with a successful import, `Cabinet` calls `useCoins.refresh()` to reload the grid/list.

### 2E — `adm-zip` Dependency

ZIP reading in Main requires a read-capable ZIP library. The current stack uses `archiver` (write-only). Add `adm-zip` as a dependency for reading ZIPs in the import path:

```bash
npm install adm-zip --legacy-peer-deps
npm install @types/adm-zip --save-dev --legacy-peer-deps
```

`adm-zip` is a pure-JavaScript library — no native rebuild required.

### 2F — Patina CSV Round-Trip Column Mapping

The auto-map for Patina-origin CSVs uses the canonical `CSV_HEADERS` from `src/main/export/zip.ts`. This constant should be moved to `src/common/schema.ts` (or a new `src/common/csv.ts`) so both the exporter and the importer reference the same source of truth.

Patina-origin columns: `id`, `title`, `issuer`, `denomination`, `year_display`, `year_numeric`, `era`, `mint`, `metal`, `fineness`, `weight`, `diameter`, `die_axis`, `obverse_legend`, `obverse_desc`, `reverse_legend`, `reverse_desc`, `edge_desc`, `catalog_ref`, `rarity`, `grade`, `provenance`, `story`, `purchase_price`, `purchase_date`, `purchase_source`, `created_at`, `obverse_image`, `reverse_image`, `edge_image`.

On re-import: `id` and `created_at` are ignored (new records are created). Image columns (`obverse_image`, `reverse_image`, `edge_image`) are used in ZIP re-import only; in CSV-only import they reference paths that don't exist locally and are silently skipped.

### 2G — i18n Keys

| Key | English | Spanish |
|-----|---------|---------|
| `cabinet.importCoins` | `"Import..."` | `"Importar..."` |
| `import.title` | `"Import Coins"` | `"Importar Monedas"` |
| `import.fromCsv` | `"From CSV file"` | `"Desde archivo CSV"` |
| `import.fromCsvSub` | `"Spreadsheet or other tool export"` | `"Hoja de cálculo u otra herramienta"` |
| `import.fromZip` | `"From Patina Archive (ZIP)"` | `"Desde archivo Patina (ZIP)"` |
| `import.fromZipSub` | `"Re-import a previous Patina backup"` | `"Reimportar una copia de seguridad Patina"` |
| `import.fieldMapping` | `"Map columns to fields"` | `"Asignar columnas a campos"` |
| `import.skipDuplicates` | `"Skip potential duplicates automatically"` | `"Omitir duplicados potenciales automáticamente"` |
| `import.reviewDuplicates` | `"Review potential duplicates"` | `"Revisar duplicados potenciales"` |
| `import.confirmButton` | `"Import"` | `"Importar"` |
| `import.result` | `"Import complete"` | `"Importación completada"` |
| `import.resultSummary` | `"Imported {{imported}} · Skipped {{skipped}} · Errors {{errors}}"` | `"Importadas {{imported}} · Omitidas {{skipped}} · Errores {{errors}}"` |
| `import.noTitleWarning` | `"Title column is required"` | `"La columna de título es obligatoria"` |
| `import.invalidZip` | `"This file does not appear to be a Patina archive"` | `"Este archivo no parece ser un archivo Patina"` |

---

## 3. Verification Strategy (Quality Oversight)

### Test Cases

**`import.csvPreview` IPC handler** (`src/main/__tests__/import.test.ts`):
- TC-IMP-CSV-01: Handler opens dialog; cancelled dialog returns `{ cancelled: true }`.
- TC-IMP-CSV-02: Valid CSV sets `stagedCsvPath` and returns correct `headers` and `preview` rows.
- TC-IMP-CSV-03: Malformed CSV (no header row) returns an error result.

**`import.csvExecute` IPC handler:**
- TC-IMP-CSV-04: Valid field map creates coins via `dbService.addCoin` for each row.
- TC-IMP-CSV-05: Row with missing required `title` is counted as error, not imported.
- TC-IMP-CSV-06: Duplicate fingerprint match is included in `duplicates` when `skipDuplicates: false`.
- TC-IMP-CSV-07: Duplicate is skipped when `skipDuplicates: true`.
- TC-IMP-CSV-08: Vocabulary field values not in vocab store trigger `dbService.addVocabEntry`.
- TC-IMP-CSV-09: `stagedCsvPath` is null after execute (cleared on completion).
- TC-IMP-CSV-10: `CsvExecuteSchema` rejects `fieldMap` with > 50 keys.

**`import.zipExecute` IPC handler:**
- TC-IMP-ZIP-01: Valid Patina ZIP imports coins and images.
- TC-IMP-ZIP-02: Image with path traversal (`..`) is blocked and counted as error.
- TC-IMP-ZIP-03: Non-Patina ZIP (missing `manifest.json` or wrong `app` field) rejected at preview stage.
- TC-IMP-ZIP-04: Image filenames are collision-safe (`import-<timestamp>-<random>.<ext>`).

**`ImportDialog.test.tsx`** (`src/renderer/components/__tests__/ImportDialog.test.tsx`):
- TC-IMP-DLG-01: Step 1 renders source selection cards.
- TC-IMP-DLG-02: Confirm button disabled until `title` column is mapped.
- TC-IMP-DLG-03: Auto-detects matching columns when CSV headers match Patina field names.
- TC-IMP-DLG-04: Step 3 (duplicate review) skipped when no duplicates returned.
- TC-IMP-DLG-05: Step 4 result shows correct imported/skipped/error counts.
- TC-IMP-DLG-06: Closing dialog without importing calls `import:cancel`.

**`validation.ts` additions:**
- TC-VAL-CSV-EXEC: `CsvExecuteSchema` accepts valid map; rejects oversized map (> 50 keys).
- TC-VAL-ZIP-EXEC: `ZipExecuteSchema` accepts valid input.

- **Colocation:** All test files colocated with source.
- **Mocking:** `window.electronAPI` extended in `setupTests.ts` with `importCsvPreview`, `importCsvExecute`, `importZipPreview`, `importZipExecute`, `importCancel` stubs.
- **Async:** `waitFor` for all multi-step dialog transitions.
- **Coverage:** `CsvExecuteSchema` branches (50-key limit, missing `title`, `skipDuplicates` toggle) must hit 100% branch coverage in `validation.ts`.

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Pending

### Audit Findings:
- **System Integrity:** The two-phase IPC design (preview/execute with `stagedCsvPath`) is architecturally sound. The staged path never crosses the renderer bridge. The renderer is untrusted per "The Filter" mandate.
- **Abstraction:** All file I/O, ZIP extraction, and CSV parsing live in the Main process. The renderer only sees metadata (headers, preview rows, counts). No business logic leaks into the bridge.
- **CSV_HEADERS consolidation:** Moving `CSV_HEADERS` from `zip.ts` to `src/common/schema.ts` or `src/common/csv.ts` is the correct call — it eliminates the risk of the exporter and importer diverging silently.
- **`adm-zip` addition:** A new dependency. It is pure JavaScript, actively maintained, and widely used in Electron apps for ZIP read operations. No `@electron/rebuild` required.

### Review Notes & Suggestions:
- The `import:cancel` handler must clear both `stagedCsvPath` and `stagedZipPath`. Leaving a stale staged path would allow a subsequent `import:csvExecute` call to process a file the curator never intended to import in the current session.
- `stagedCsvPath` and `stagedZipPath` should be module-level `let` variables in a dedicated `src/main/import/` directory, not in `index.ts`, to keep the IPC registration file manageable.

---

## 5. Security Assessment (`securing-electron`)
**Status:** Pending

### Audit Findings:
- **The Filter:** `CsvExecuteSchema` and `ZipExecuteSchema` are `.strict()`. The `fieldMap` record keys and values are bounded by `max(100)` character limits. The `fieldMap` itself is bounded to 50 entries (matching the number of Patina CSV columns).
- **Path traversal:** ZIP extraction must check every entry path for `..` components before writing. Use `path.normalize(entry.entryName)` and verify it does not start with `..` or `/`. Reject the entire import (not just the offending entry) if any traversal is detected.
- **Image validation on ZIP import:** Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. SVG explicitly blocked (consistent with Lens MIME allowlist). Max 10 MB per image (consistent with Lens limit).
- **Staged path lifetime:** `stagedCsvPath` and `stagedZipPath` must be cleared in a `finally` block in the execute handler, not only on success, to prevent a stale path persisting after a partial failure.
- **No renderer-supplied paths:** Confirmed. All `dialog.showOpenDialog` calls are in the Main process.

### Review Notes & Suggestions:
- Pending specialist audit.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending

### Audit Findings:
- **Coverage Check:** The import handlers in Main contain branching logic (duplicate detection, error paths, `skipDuplicates` flag, ZIP vs CSV paths). These are high-value branches requiring close to 100% coverage. `validation.ts` additions must maintain 100% branch coverage.
- **Async Safety:** `import:csvExecute` loops with sequential `dbService.addCoin` calls (synchronous in `better-sqlite3`). The Main-side test must mock `dbService` methods.
- **ZIP extraction safety:** TC-IMP-ZIP-02 (path traversal block) must be tested with a crafted ZIP containing a `../` entry.

### Review Notes & Suggestions:
- Pending specialist audit.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** Manuscript Hybrid v3.3 — pending.
- **Accessibility:** Multi-step modal must trap focus at each step. Step transitions must announce the new step title via `aria-live="polite"`. The field mapping `<select>` elements must have associated `<label>` elements.
- **Progress indication:** The execute step (which may take several seconds for large CSVs) must show a spinner or progress indicator so the curator does not perceive the app as frozen.

### Review Notes & Suggestions:
- Pending specialist audit.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Pending

### Audit Findings:
- **Historical Accuracy:** The field mapping dialog surfaces Patina's canonical field names (using existing `t('ledger.*')` labels). Collectors importing from PCGS CSV templates will see familiar column names in the left column. Auto-detection handles common variations (`"Grade"` → `grade`, `"Metal"` → `metal`).
- **Vocabulary enrichment:** Importing coins with non-standard vocabulary values (e.g. `"Billon"` for metal if not in the current vocab) adds them as custom entries automatically. This is the correct behaviour — it preserves collector data without silently discarding it.
- **Collector UX:** The two-source design (CSV vs. ZIP) directly maps to the two collector migration scenarios from the research: (1) migrating from a spreadsheet, (2) restoring a Patina backup. No other import paths are needed for the initial release.

### Review Notes & Suggestions:
- Pending specialist audit.

---

## 9. User Consultation & Decisions

### Open Questions:
1. **Duplicate detection strategy:** The proposed fingerprint (`title + year_numeric + issuer`) will produce false positives for coins with the same name from different mints or varieties. Should `mint` or `catalog_ref` be added to the fingerprint? Current proposal: keep the fingerprint simple and advisory-only; the curator reviews flagged duplicates before import.
2. **CSV-only image handling:** If a CSV references image column values (e.g. `obverse_image = coins/abc.jpg`) but no ZIP is provided, those paths don't exist locally. Current proposal: silently skip (import the coin without images, no error). Should the curator be warned per-coin?
3. **Import progress UI:** For large CSVs (500+ rows), the execute step may take 1–2 seconds. Is a spinner sufficient, or should row-by-row progress be shown? Current proposal: spinner only (the execute handler is synchronous in Main, so row-level progress would require an `ipcMain.emit` loop which adds complexity).
4. **`adm-zip` vs. existing `archiver` for ZIP reading:** `archiver` is write-only. `adm-zip` is the simplest read-capable alternative. Confirm acceptance of this new dependency.

### Final Decisions:
- Pending user review.

---

## 10. Post-Implementation Retrospective
**Date:** —
**Outcome:** —

### Summary of Work
—

### Pain Points
—

### Things to Consider
—
- **Core Doc Revision:** `docs/reference/ipc_api.md` must document all four new import handlers. `AGENTS.md` should note the two-phase IPC pattern (staged file path) as the canonical approach for any future Main-side file operations that require a dialog + execute step. `docs/reference/csv.ts` (or `schema.ts`) consolidation of `CSV_HEADERS` should be noted.
