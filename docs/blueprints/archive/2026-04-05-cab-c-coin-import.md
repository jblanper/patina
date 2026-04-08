# Implementation Blueprint: Coin Import (CAB-C)

**Date:** 2026-04-05
**Status:** Completed
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
**Status:** Approved

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
**Status:** Approved — Pending Implementation

### Audit Findings:

**contextIsolation / sandbox — No regression.**
CAB-C adds no new `BrowserWindow`, no new `webPreferences` block, and does not touch the permission request handler. The five new IPC channel names (`import:csvPreview`, `import:csvExecute`, `import:zipPreview`, `import:zipExecute`, `import:cancel`) are all `ipcMain.handle` registrations in the Main process. `contextIsolation: true` and `sandbox: true` are fully preserved.

**Two-phase IPC design — Architecturally sound and privacy-correct.**
`import:csvPreview` and `import:zipPreview` open the native `dialog.showOpenDialog` in the Main process; the renderer receives only metadata (headers, preview rows, counts, manifest fields). The absolute file path is cached in `stagedCsvPath` / `stagedZipPath` module-level variables — it never serialises through the IPC bridge. The renderer cannot influence which file is processed; it can only provide the field mapping decisions (for CSV) or confirm/skip options. This design is correct and consistent with the "Path Sovereignty" mandate.

**`import:cancel` — Correct clearing scope.**
Clearing both `stagedCsvPath` and `stagedZipPath` in a single handler is correct. A stale staged path from a prior session would allow a subsequent execute call to process a file the curator never confirmed in the current import flow. The cancel handler must be called by the renderer whenever the dialog closes without executing — both on "×" close and on navigation away.

**`CsvExecuteSchema` — Mostly correct; one hardening recommendation.**
```typescript
export const CsvExecuteSchema = z.object({
  fieldMap: z.record(
    z.string().max(100),    // CSV column name (renderer-supplied)
    z.string().max(100)     // Patina field name OR empty string to skip
  ).max(50),
  locale: z.enum(['en', 'es']).default('es'),
  skipDuplicates: z.boolean().default(false),
}).strict();
```
The schema is `.strict()` — unknown top-level keys are rejected. The `max(50)` guard prevents oversized-array injection. The `max(100)` bounds on keys and values are adequate.

**Security gap — `fieldMap` value allowlist (blocking):** The `fieldMap` value (the Patina field name) is validated only with `max(100)`. During import, these values are used as property keys when constructing a `Partial<NewCoin>` object (`coin[patinaField] = row[csvCol]`). A crafted value such as `__proto__` or `constructor` could attempt prototype pollution before `NewCoinSchema.partial()` runs. While Zod's `.strict()` on `NewCoinSchema` will reject unknown keys at validation time, defence-in-depth requires failing earlier. **Required fix:** Restrict `fieldMap` values to the known Patina field names derived from `NewCoinSchema.shape` plus the empty string:

```typescript
const IMPORTABLE_FIELDS = ['', ...Object.keys(NewCoinSchema.shape)] as const;
fieldMap: z.record(
  z.string().max(100),
  z.enum(IMPORTABLE_FIELDS as [string, ...string[]])
).max(50),
```

This eliminates the prototype-pollution window entirely and surfaces invalid field names as a Zod validation error rather than silently mapping to an unknown key.

**`ZipExecuteSchema` — Correct and minimal.**
Only `locale` and `skipDuplicates` — no paths, no IDs, no structural data from the renderer. Correct.

**ZIP extraction path traversal — Requires explicit rejection of full import on traversal.**
The blueprint specifies using `path.normalize(entry.entryName)` and checking that it does not start with `..` or `/`. The implementation must additionally:
1. Check for **null bytes** in `entry.entryName` before normalisation — `\0` in a path can bypass naive prefix checks on some platforms.
2. The blueprint correctly specifies **rejecting the entire import** (not just the offending entry) when any traversal is detected. This prevents a ZIP constructed with one valid image and one traversal entry from partially writing to disk.
3. After `path.normalize()`, verify the resolved write path is still within `data/images/coins/` using `resolvedPath.startsWith(imageRoot)` — same boundary check used by the `patina-img://` protocol handler.

**`stagedCsvPath` / `stagedZipPath` lifetime — `finally` block required.**
The blueprint already specifies clearing in a `finally` block (Section 5 original note). This must be codified in the Section 2B handler specification, not left only as a security note. A partial import failure (e.g. DB error on row 50 of 200) must still clear the staged path to prevent a subsequent execute call from re-processing the same file. Required pattern:

```typescript
ipcMain.handle('import:csvExecute', async (_, options) => {
  const validated = validateIpc(CsvExecuteSchema, options);
  try {
    assert(stagedCsvPath !== null, 'No staged CSV path');
    // ... import logic ...
  } finally {
    stagedCsvPath = null;
  }
});
```

**Image validation on ZIP import — Correct specification.**
Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. SVG is explicitly blocked (consistent with Lens MIME allowlist and the documented rationale against script-bearing formats). Max 10 MB per image is consistent with the Lens upload limit. Collision-safe naming (`import-<timestamp>-<random>.<ext>`) follows the same scheme as `image:importFromFile` — no new attack surface.

**`manifest.json` parsing — Edge case to handle.**
`import:zipPreview` reads `manifest.json` and checks `app: 'Patina'`. The implementation must wrap `JSON.parse()` in a try/catch — a malformed or missing manifest should return `{ cancelled: false, error: 'invalid_archive' }` (or similar), not throw an unhandled exception that surfaces a stack trace to the renderer.

**No renderer-supplied paths — Confirmed.**
All `dialog.showOpenDialog` calls are in the Main process. The renderer bridge exposes `importCsvPreview()` and `importZipPreview()` as zero-argument functions. There is no mechanism by which the renderer can specify a file path for import.

**`NewCoinSchema.partial()` strictness — Pre-verified.**
CAB-B TC-VAL-PARTIAL-STRICT confirmed that `NewCoinSchema.partial()` retains unknown-key rejection under Zod v3 in this project. This applies equally to CAB-C's import validation path. No new test is needed.

### Review Notes & Suggestions:
1. **Blocking — `fieldMap` value allowlist:** Add `z.enum(IMPORTABLE_FIELDS)` to restrict `fieldMap` values to known `NewCoinSchema` field names plus empty string. Prototype-pollution window is small (Zod `.strict()` is a backstop) but elimination at the schema level is the correct defence-in-depth approach.
2. **Blocking — null byte check in ZIP entry paths:** Add explicit `entry.entryName.includes('\0')` check before `path.normalize()` in the ZIP extraction loop.
3. **Blocking — `finally` block in execute handlers:** Codify `stagedCsvPath = null` / `stagedZipPath = null` in `finally` blocks. Move this requirement from the Security section into Section 2B handler specifications so implementors do not miss it.
4. **Non-blocking — `manifest.json` parse safety:** Wrap JSON parsing in try/catch; return a structured error result rather than propagating an exception to the renderer.
5. **Verified: No new attack surface on `import:cancel`.** It accepts no parameters and clears both staged paths — correct.
6. **Verified: `adm-zip` path handling.** `adm-zip`'s `getEntries()` returns `entry.entryName` as a string — this should be treated as untrusted input and normalised before any `path.join` call, per points above.

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Approved with Notes

### Audit Findings:
1. **Colocation rule compliance.** The two planned test files (`src/main/__tests__/import.test.ts` and `src/renderer/components/__tests__/ImportDialog.test.tsx`) comply with project colocation conventions. There are currently no tests under `src/main/` — the new `src/main/__tests__/` directory will be the first main-process unit test directory. This is a structural precedent and should be noted in `AGENTS.md` once established.
2. **Main-process test infrastructure gap.** There is no existing `src/main/__tests__/` directory and no established pattern for unit-testing IPC handlers in isolation. It is not possible to call `ipcMain.handle` in Vitest/JSDOM directly. The handler logic must be extracted into pure async functions in `src/main/import/` (the architecture section already suggests this) and tested as ordinary async functions with mocked `dbService` and `adm-zip`. IPC registration need not be unit-tested separately.
3. **`setupTests.ts` mock extension is under-specified.** The five stubs (`importCsvPreview`, `importCsvExecute`, `importZipPreview`, `importZipExecute`, `importCancel`) must be typed with their full return signatures, because `ImportDialog` reads the resolved values to advance steps. Without typed stubs the component tests risk `any`-escaping the TypeScript check.
4. **Missing TC for `fieldMap` value allowlist.** The security audit (Section 5) requires `fieldMap` values to be restricted to `z.enum(IMPORTABLE_FIELDS)`. TC-VAL-CSV-EXEC only tests the 50-key limit. There is no TC that validates the allowlist rejects `__proto__`, `constructor`, or any non-schema key.
5. **Missing TC for null byte in ZIP entry paths.** TC-IMP-ZIP-02 tests `../` traversal, but the security audit mandates an explicit null-byte (`\0`) check before `path.normalize()`. No TC covers a ZIP entry whose name contains `\0`.
6. **Missing TC for `finally` block path-clearing on failure.** TC-IMP-CSV-09 only checks that the staged path is null after a *successful* execute. There is no TC where `dbService.addCoin` throws mid-loop to verify the `finally` branch fires and the path is still null afterwards.
7. **`validation.ts` 100% branch coverage — not fully achievable with stated TCs.** `CsvExecuteSchema` has additional branches beyond the 50-key limit: `locale` default, `skipDuplicates` default, the new `z.enum(IMPORTABLE_FIELDS)` value constraint, and `.strict()` unknown-key rejection. `ZipExecuteSchema` has locale and `skipDuplicates` defaults. At minimum 4–5 sub-cases per schema are required, matching the `PdfExportOptionsSchema` granularity pattern.
8. **Async patterns.** TC-IMP-DLG-04 (step 3 skipped) and TC-IMP-DLG-05 (result counts) must use `await screen.findBy*` rather than `waitFor(() => expect(screen.getBy*))` — the project-preferred idiom per `testing_standards.md` §5.5.
9. **Missing TC for malformed `manifest.json`.** TC-IMP-ZIP-03 tests a wrong `app` field, but not syntactically invalid JSON in `manifest.json`. This is a distinct code branch (the `JSON.parse` try/catch).
10. **Missing TC for `import:cancel` main-process effect.** TC-IMP-DLG-06 verifies the dialog *calls* `importCancel`, but no main-process TC verifies that both `stagedCsvPath` and `stagedZipPath` are actually set to `null` after the handler fires.
11. **Missing TC for disallowed image extension.** No TC exercises the extension-allowlist branch for a ZIP containing a `.svg` or `.exe` image entry.
12. **Missing TC for oversized image.** The 10 MB per-image limit has no TC. The `testing_standards.md` §7.2 pattern requires file-size rejection to be tested.
13. **TC-IMP-ZIP-04 non-deterministic without fake timers.** Verifying collision-safe filenames (`import-<timestamp>-<random>.<ext>`) requires `vi.useFakeTimers()` or a regex assertion. Without this the TC is non-deterministic.
14. **`clearVocabCache()` not mentioned.** If `ImportDialog` renders vocabulary-backed components, the vocab cache must be cleared in `beforeEach` per project standard. Not mentioned in the mock extension plan.
15. **i18n parity test.** `translations.test.ts` will fail if the 13 new keys from Section 2G are added to only one locale file. This is a known footgun and must be in the implementation checklist.

### Review Notes & Suggestions:
1. **(blocking)** Add TC-VAL-CSV-EXEC-ALLOWLIST: `CsvExecuteSchema` rejects a `fieldMap` value not in `NewCoinSchema.shape` (e.g. `{ "Col A": "__proto__" }` must fail).
2. **(blocking)** Add TC-IMP-ZIP-NULL-BYTE: a crafted ZIP entry whose `entryName` contains `\0` must cause the entire import to be rejected.
3. **(blocking)** Add TC-IMP-CSV-FINALLY and TC-IMP-ZIP-FINALLY: mock `dbService.addCoin` to throw on the second call; assert `stagedCsvPath` / `stagedZipPath` is `null` after the handler rejects.
4. **(blocking)** Specify the IPC handler test harness pattern explicitly in Section 3. Recommended: extract import logic into pure async functions (`processCsvImport`, `processZipImport`) in `src/main/import/` and test those directly with mocked dependencies.
5. **(non-blocking)** Split TC-VAL-CSV-EXEC into granular sub-cases per the `PdfExportOptionsSchema` pattern: valid input, 50-key accepted, 51-key rejected, `locale` default, `skipDuplicates` default, `.strict()` extra-key rejection. Mirror for TC-VAL-ZIP-EXEC.
6. **(non-blocking)** Add TC-IMP-ZIP-INVALID-MANIFEST: ZIP with syntactically invalid `manifest.json` returns a structured error, not an unhandled exception.
7. **(non-blocking)** Add TC-IMP-ZIP-DISALLOWED-EXT: ZIP with a `.svg` image entry is rejected.
8. **(non-blocking)** Add TC-IMP-ZIP-OVERSIZE-IMAGE: image entry exceeding 10 MB is rejected and counted as an error.
9. **(non-blocking)** Specify in Section 3 that TC-IMP-ZIP-04 uses `vi.useFakeTimers()` and asserts the filename against a regex `^import-\d+-[a-z0-9]+\.(jpg|jpeg|png|webp)$`.
10. **(non-blocking)** Add `clearVocabCache()` in `beforeEach` to the mock extension plan for any `ImportDialog` test rendering vocabulary-backed elements.
11. **(non-blocking)** Add TC-IMP-CANCEL-CLEARS-BOTH: main-process test confirming `import:cancel` sets both staged paths to `null` regardless of which was previously set.
12. **(non-blocking)** Flag in the implementation checklist that `en.json` and `es.json` must both receive the 13 new Section 2G keys before `npm test` runs.

---

## 7. UI Assessment (`curating-ui`)
**Status:** Approved with Notes

### Audit Findings:
1. **Manuscript Hybrid v3.3 compliance — mostly aligned, two gaps.** The deliberate multi-step workflow philosophy matches the archival aesthetic. However: (a) The "large card-buttons" for Step 1 have no typography/layout spec. They must use `--bg-manuscript`/`--stone-pedestal` background, `1px solid var(--border-hairline)` border, `--accent-manuscript` hover/focus state, and Cormorant heading + Montserrat sub-label — consistent with the Pedestal pattern. Without this spec, the implementor will invent treatment ad-hoc. (b) The blueprint specifies no step indicator. Given a 4-step flow, some step orientation is needed, but it must be understated — mono small-caps `--text-muted` breadcrumb, not a progress bar.
2. **Accessibility — three concrete gaps.** (a) Focus-trapping is mentioned but the mechanism is unspecified. The existing `BulkEditModal` relies on a `ref` for programmatic focus only, with no Tab-cycle containment. A 4-step modal with multiple `<select>`, checkboxes, and preview table requires a proper trap — must specify `useFocusTrap(modalRef)` or a library, and confirm sandbox compatibility. (b) `aria-live="polite"` step announcements appear in Section 7 placeholder text but are absent from Section 2C (the implementable spec). Must specify: a single `<div aria-live="polite" aria-atomic="true" className="sr-only">` that receives the step heading on each transition. (c) The `<select>` elements in Step 2A have no `<label>` association specified. Must mandate `<label htmlFor>` with a generated `id` per row, or `aria-label={csvHeader}` on each `<select>`.
3. **Progress indication absent from Section 2C.** Section 7 placeholder text notes the spinner requirement but it is not in the implementable spec. An "executing" intermediate state must be specified inside the Step 2A/2B confirm handler (after click, before IPC resolves): disabled Import button, processing label, and spinner. Reuse `.export-progress` / `.progress-bar` CSS or a new `@keyframes`-based spinner.
4. **Touch targets — not specified for new elements.** Standard `.btn-action` / `.btn-minimal` buttons in Steps 2–4 inherit compliant padding. The risk is Step 1 card-buttons and Step 3 per-row checkbox controls, which have no established CSS class. `min-height: 44px` must be explicit.
5. **Responsive layout for Step 2A — unspecified.** The two-column mapping layout and preview table have no responsive spec. Required: `display: grid; min-width: 0` on the two-column wrapper, `overflow-wrap: anywhere` on header text cells; `table-layout: fixed; width: 100%` with `overflow: hidden; text-overflow: ellipsis` on preview table cells (within `max-width: 90vw` modal).
6. **New CSS classes needed.** The following will be required and don't yet exist in `index.css`: `.import-source-card`, `.import-field-mapping`, `.import-preview-table`, `.import-executing`, `.import-error-details`. Naming convention `import-*` is consistent with `bulk-edit-*` and `export-*` prefixes. All must be added to `index.css`, not as `style={{}}` inline props.
7. **Single-Click Rule — verified.** `Tools ▾ → Import...` is reachable in two clicks from Cabinet. Compliant.
8. **Cabinet.tsx integration — correct pattern, one ordering note.** The proposed snippet matches existing `exportToZip` / `exportToPdf` item pattern (same class, `role="menuitem"`, `setToolsOpen(false)`, `t()` call). Import should be positioned as the second item (after Export Archive, before Generate Catalog) to group import/export operations together. The blueprint does not specify this ordering.

### Review Notes & Suggestions:
1. **(blocking)** Specify the focus-trap implementation in Section 2C. Either a `useFocusTrap(modalRef)` hook or a confirmed sandbox-compatible library. Without this, the modal fails WCAG 2.1 SC 2.1.2.
2. **(blocking)** Promote the `aria-live="polite"` region into Section 2C's component structure spec. Add: `<div aria-live="polite" aria-atomic="true" className="sr-only">` receiving the step heading on each transition.
3. **(blocking)** Mandate `<label htmlFor>` or `aria-label` for every `<select>` in the field-mapping step. Left-column text alone is not a programmatically associated label.
4. **(blocking)** Add an "executing" sub-state to Step 2A/B in Section 2C: disabled button, processing label, spinner. This state must also have a test case (TC-IMP-DLG-07: executing state is visible during IPC call).
5. **(blocking)** Add responsive overflow specification for Step 2A: `display: grid; min-width: 0` on the two-column mapping wrapper; `table-layout: fixed; width: 100%` for the preview table.
6. **(non-blocking)** Specify card-button visual treatment for Step 1: `--stone-pedestal` background, `1px solid var(--border-hairline)` border, `--accent-manuscript` hover, Cormorant heading + Montserrat sub-label, `min-height: 80px`, `padding: 1.5rem`.
7. **(non-blocking)** Add a step indicator: `<p className="sr-only" aria-live="polite">` for screen readers, plus a visible mono small-caps breadcrumb `"Step N of 4"` in `--text-muted` `var(--font-mono)` 0.65rem beneath the dialog heading.
8. **(non-blocking)** Specify dropdown ordering: Import appears as the second item (after Export Archive, before Generate Catalog).
9. **(non-blocking)** Specify the Step 4 expandable error panel using `<details>`/`<summary>` semantics (or `<button aria-expanded>` + conditional render), consistent with `.filter-show-more` disclosure pattern. Add `.import-error-details` CSS class.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Approved with Notes

### Audit Findings:
1. **Duplicate detection fingerprint — inadequate for common collector scenarios.** The proposed fingerprint `title | year_numeric | issuer` produces false positives for cross-mint varieties: a 1921-D Morgan Dollar and 1921-S Morgan Dollar share all three fields but are distinct catalogued coins. It also produces false positives for a collector owning multiple grade examples of the same type. The most likely false-negative is title formatting variation across sources (PCGS exports "Morgan Dollar", a spreadsheet has "Morgan $1"). Adding `mint` to the fingerprint would resolve the most common false-positive at no cost to the advisory-only design. `catalog_ref` was evaluated but rejected for the fingerprint because it is blank in most foreign CSV sources. The fingerprint remains advisory-only and curator-confirmed, which is the correct design for the first release.
2. **Field mapping auto-detection — substantial gaps for common external sources.** The following common column names from PCGS Portfolio exports, NGC registry exports, and Excel templates would NOT auto-map: `"Coin Name"` / `"Coin Description"` → `title`; `"Country"` → `issuer`; `"Year"` or `"Date"` → `year_display` / `year_numeric`; `"Cert #"` / `"PCGS #"` / `"NGC #"` → `catalog_ref`; `"Mintmark"` → `mint`; `"Notes"` → `story`; `"Weight (g)"` → `weight`. The `year` split (`year_display` + `year_numeric`) is especially problematic — almost every external source has a single `"Year"` column. The importer should handle `"Year"` mapping to both fields automatically.
3. **Vocabulary enrichment — correct policy, one edge case.** Auto-adding novel vocab values (electrum, billon, orichalcum, potin) is numismatically correct and must not be restricted. However: (a) `import:csvExecute` will attempt N identical `addVocabEntry` calls when N rows share the same novel value, causing N unnecessary DB round-trips (only the first succeeds due to the UNIQUE constraint). Deduplicate in memory before writing. (b) `VocabAddSchema` has a character allowlist that blocks values like `"Bi-metallic (Cu/Ni)"` or `"BI/AE"` (common PCGS metal notations). If a vocab add fails validation silently, the coin is imported but its vocab field value has no entry in the store — an orphaned value that autocomplete never surfaces. This behaviour must be specified.
4. **CSV round-trip fidelity — coin data complete, images lossy.** The Section 2F column list maps 1:1 to `NewCoinSchema.shape` fields. No coin data fields are missing. However, the three image columns (`obverse_image`, `reverse_image`, `edge_image`) are lossy for coins with more than one image per side — a second obverse image is silently dropped on export and therefore on re-import. This is a known simplification that must be documented as a known limitation.
5. **CSV-only image handling — silent skip is acceptable but should surface in result.** Silently skipping image columns in CSV-only import is acceptable for the happy path, but a collector who exports a ZIP, edits `coins.csv` in Excel, and re-imports that CSV will find all coins imageless with no warning. The result step does not currently surface this scenario. When image columns were mapped but all resolved to no-op, the result should display an advisory line.
6. **`id` and `created_at` handling — correct design, needs result-step communication.** Always creating new records (ignoring `id`) is correct. However, collectors who use Patina-assigned IDs as external references (paper ledgers, cross-references) will be confused. The result step should note that new IDs were assigned.
7. **Collector UX — two-source design is correct.** CSV vs. ZIP maps directly to the two collector migration scenarios from the research. The Step 1 CSV sub-label `"Spreadsheet or other tool export"` undersells that Patina's own exported CSV is also valid input here. The label should include a clarifying phrase.
8. **Collection-merge scenario highlights fingerprint weakness.** The most acute use of duplicate detection is merging two Patina collections (home and travel machines). Both sides have Patina-format data with identical `catalog_ref` values that could provide exact-match deduplication — but `catalog_ref` is not in the fingerprint. This is acceptable for v1 given the advisory-only design, but worth noting for a future fingerprint upgrade.

### Review Notes & Suggestions:
1. **(non-blocking)** Add `mint` to the duplicate fingerprint: `title.toLowerCase() | year_numeric | issuer?.toLowerCase() | mint?.toLowerCase()`. Resolves the most common false-positive scenario (cross-mint varieties) at no implementation cost.
2. **(non-blocking)** Define a `CSV_FIELD_ALIASES` constant in `src/common/csv.ts` alongside `CSV_HEADERS` to cover common external column names that don't exact-match Patina field names: `"Country"` → `issuer`, `"Year"` / `"Date"` → `year_display`, `"Cert #"` / `"PCGS #"` / `"NGC #"` → `catalog_ref`, `"Mintmark"` → `mint`, `"Notes"` → `story`, `"Coin Name"` / `"Coin Description"` → `title`.
3. **(non-blocking)** For a single `"Year"` column in a foreign CSV, automatically populate both `year_display` (as-is string) and `year_numeric` (parsed integer, or null if non-numeric) rather than requiring the curator to map a single source column to two destination fields manually.
4. **(non-blocking)** In Step 4 (result), when image columns were mapped but produced zero imported images, surface: `"Images were not imported — use 'Import from Archive (ZIP)' to include images"`.
5. **(non-blocking)** In the result summary, include a note that new record IDs were assigned, to prevent confusion for collectors who cross-reference by Patina ID externally.
6. **(non-blocking)** Deduplicate vocabulary additions in memory within `import:csvExecute` before calling `dbService.addVocabEntry`. Collect unique `(field, value)` pairs from all rows, then insert once per unique pair.
7. **(non-blocking)** Clarify what happens when `addVocabEntry` fails validation (e.g. a metal value containing characters outside the VocabAddSchema allowlist). Recommended: skip the vocab add silently and still import the coin with the raw value, but document this behaviour in Section 2B.
8. **(non-blocking)** Document the known limitation in Section 2F: the three image columns are lossy for coins with more than one image per side (round-trip is not lossless for multi-image coins).
9. **(non-blocking)** Revise the Step 1 CSV sub-label to `"Spreadsheet, another tool, or a Patina CSV export"` to clarify that Patina's own exported CSV is valid input for this path.

---

## 9. User Consultation & Decisions

### Open Questions:
1. **Duplicate detection fingerprint — add `mint`?** The proposed fingerprint (`title + year_numeric + issuer`) produces false positives for cross-mint varieties (e.g. 1921-D vs 1921-S Morgan Dollar). Numismatic audit recommends adding `mint`. Current proposal: add `mint` to the fingerprint. Curator review remains advisory-only. **Decision needed: confirm `mint` addition.**
2. **CSV-only image handling — advisory in result step?** If a CSV references image column values but no ZIP is provided, those paths don't exist locally. Current proposal: silently skip image columns, but surface an advisory line in Step 4 when image columns were mapped but produced no imports. **Decision needed: confirm advisory line in result.**
3. **Import progress UI:** For large CSVs (500+ rows), the execute step may take 1–2 seconds. Current proposal: an "executing" intermediate state with spinner (required by UI audit). Spinner only — no row-by-row progress (that would require an `ipcMain.emit` loop, adding complexity). **Decision needed: confirm spinner-only is sufficient.**
4. **`adm-zip` vs. existing `archiver` for ZIP reading:** `archiver` is write-only. `adm-zip` is the simplest read-capable alternative (pure JS, no native rebuild). Confirm acceptance of this new dependency.
5. **`CSV_FIELD_ALIASES` for external tool column names?** Numismatic audit identified common PCGS/NGC/Excel column names that don't auto-map (`"Country"` → `issuer`, `"Year"` → `year_display`, `"Cert #"` → `catalog_ref`, etc.). Should a `CSV_FIELD_ALIASES` constant be added to `src/common/csv.ts` to pre-populate auto-detection? This would significantly reduce mapping friction for collectors migrating from PCGS/NGC tools. **Decision needed: include aliases in v1 or defer.**
6. **`"Year"` column auto-mapping to split fields?** Almost every external source has a single `"Year"` column, not Patina's `year_display` + `year_numeric` split. Should a single `"Year"` column automatically populate both fields? **Decision needed: confirm auto-split behaviour.**
7. **`VocabAddSchema` allowlist failures during import.** If a vocab value (e.g. `"Bi-metallic (Cu/Ni)"`) fails the allowlist during import, should the coin be imported with the raw value (vocab add silently skipped) or flagged as a row error? **Decision needed: specify behaviour.**

### Final Decisions:
1. **Add `mint` to duplicate fingerprint.** Approved. Fingerprint becomes `title.toLowerCase() | year_numeric | issuer?.toLowerCase() | mint?.toLowerCase()`. Advisory-only design retained.
2. **CSV-only image handling.** Approved: silently skip image columns, but display an advisory line in Step 4 when image columns were mapped but produced no imports.
3. **Import progress UI.** Approved: spinner-only "executing" intermediate state. No row-by-row progress.
4. **`adm-zip` dependency.** Approved.
5. **`CSV_FIELD_ALIASES` in `src/common/csv.ts`.** Approved for v1. High-confidence aliases: `"Country"` → `issuer`, `"Year"` / `"Date"` → `year_display`, `"Cert #"` / `"PCGS #"` / `"NGC #"` → `catalog_ref`, `"Mintmark"` → `mint`, `"Notes"` → `story`, `"Coin Name"` / `"Coin Description"` → `title`, `"Weight (g)"` / `"Weight (gr.)"` → `weight`.
6. **`"Year"` auto-split to `year_display` + `year_numeric`.** Approved for v1. Implementation rule: when a single source column is mapped to `year_display` and no column is explicitly mapped to `year_numeric`, the execute handler additionally coerces the value to `year_numeric` via `parseInt(value) || null`. Must not fire when a Patina-format CSV already provides a separate `year_numeric` column.
7. **`VocabAddSchema` allowlist failures during import.** Row error. Coin is not imported; the row is counted in `errors` with a message indicating the vocab value was invalid. Curator is informed, no silent data loss.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-04-08
**Outcome:** Completed

### Summary of Work
- Created `src/common/csv.ts` with `CSV_HEADERS` (moved from `zip.ts`) and `CSV_FIELD_ALIASES` for PCGS/NGC/Excel column normalisation.
- Added `CsvExecuteSchema` and `ZipExecuteSchema` to `src/common/validation.ts`, including an allowlist guard (`z.enum(IMPORTABLE_FIELDS)`) that eliminates prototype-pollution risk before `NewCoinSchema` validation runs.
- Implemented `src/main/import/csv.ts` (`previewCsv`, `processCsvImport`) and `src/main/import/zip.ts` (`previewZip`, `processZipImport`) as pure async functions testable without an IPC environment.
- Registered 5 new IPC handlers in `src/main/index.ts` with `stagedCsvPath` / `stagedZipPath` module-level vars, `finally`-block clearing, and `validateIpc` Zod validation.
- Extended `src/main/preload.ts` and `src/renderer/electron.d.ts` with typed bridge methods.
- Created `src/renderer/components/ImportDialog.tsx` — 4-step modal with focus trap, aria-live step announcements, `<label htmlFor>` associations, executing spinner, and `<details>`/`<summary>` error panel.
- Integrated Import dialog into `Cabinet.tsx` Tools dropdown (second item, after Export Archive).
- Added 14 i18n keys to both `en.json` and `es.json` in parity.
- Added 6 CSS classes to `index.css` (`import-source-card`, `import-field-mapping`, `import-preview-table`, `import-executing`, `import-error-details`, `import-step-indicator`).
- Extended `setupTests.ts` with 5 typed stubs.
- Wrote 21 new tests across `validation.test.ts`, `src/main/__tests__/import.test.ts`, and `ImportDialog.test.tsx`.
- All 512 tests pass; `npx tsc --noEmit` — zero errors.
- Updated `docs/reference/ipc_api.md` with the 5 new handlers.
- Added Two-Phase Import Pattern and main-process test pattern to `AGENTS.md`.

### Pain Points
- `ZodRecord<ZodString, ZodEnum>.max()` does not exist in this version of Zod — replaced with `.refine(m => Object.keys(m).length <= 50)`. Same security guarantee, slightly different error path.
- `NewCoin` (manually typed as `Omit<Coin, 'id' | 'created_at'>`) uses `string | undefined` for optional fields while Zod infers `string | null | undefined`. Used `?? undefined` in the mapping loop to satisfy the type without changing DB behaviour (SQLite binds undefined as NULL).
- aria-live `sr-only` div and the visible step paragraph both render the same translation string — `findByText()` in tests found multiple elements. Fixed by using `findAllByText` / `waitFor` + `getAllByText` where both matches are acceptable.

### Things to Consider
- **Core Doc Revision:** `docs/reference/ipc_api.md` now documents all 5 new import handlers. `AGENTS.md` now documents the Two-Phase Import Pattern and main-process test location. `CSV_HEADERS` consolidation in `src/common/csv.ts` is done.
- **Future fingerprint upgrade:** For collection-merge via Patina→Patina ZIP, `catalog_ref` would provide exact-match deduplication. Current fingerprint (`title|year_numeric|issuer|mint`) is advisory-only and appropriate for v1.

---

## 11. Post-Release Amendments
**Date:** 2026-04-08

### CSV Import Removed

After release, two issues surfaced:

1. **CSV import silently skipped coins.** `VocabAddSchema` character validation (`/^[\p{L}\p{N}\s\-'().,:&/]+$/u`) rejects common numismatic grade notations such as `MS65+` and `PF-70 DCAM` (the `+` is outside the allowlist). Coins with such values in any vocab field (`grade`, `metal`, `denomination`, `era`, `die_axis`, `mint`, `rarity`) were counted as row errors without clear curator feedback. Fixing the allowlist would weaken the security posture of `vocab:add`; allowing the import path to bypass it would create two different validation paths for the same field — a maintenance risk.

2. **Field-mapping UI complexity adds friction with low payoff.** The primary use case for import is Patina → Patina collection transfer, which the ZIP path already handles end-to-end. Standalone CSV import from external tools was a secondary use case that the field-mapping step does not meaningfully simplify for collectors: most PCGS/NGC exports still require manual column selection, and the `CSV_FIELD_ALIASES` heuristic does not cover all variants.

**Decision:** CSV import removed entirely. The `import:csvPreview` and `import:csvExecute` IPC handlers are removed, along with the field-mapping step in `ImportDialog`. `src/main/import/csv.ts` is retained as an internal module (its parser and `processCsvImport` are used by the ZIP importer), but it is no longer exposed through the bridge.

**Changes:**
- Removed `CsvExecuteSchema` and `CsvExecuteOptions` from `src/common/validation.ts`.
- Removed `import:csvPreview` and `import:csvExecute` handlers from `src/main/index.ts`.
- Removed `importCsvPreview` and `importCsvExecute` from `src/main/preload.ts` and `src/renderer/electron.d.ts`.
- Removed CSV source card, field-mapping step, and `hadImageColumns` advisory from `ImportDialog.tsx`.
- Removed 6 CSV-specific i18n keys from `en.json` and `es.json`: `fromCsv`, `fromCsvSub`, `fieldMapping`, `noTitleWarning`, `imageAdvisory`, `skipField`.
- Simplified `ImportDialog` to ZIP-only: dialog triggers `importZipPreview()` immediately on open; if the native file picker is cancelled, the dialog closes. Steps reduced from 4 to 3 (zip-review → optional duplicate-review → result).
- Rewrote `ImportDialog.test.tsx` to cover the ZIP-only flow.
- Removed `CsvExecuteSchema` test block from `validation.test.ts`.

### ZIP Image Import Bug Fixed

`attachImagesFromCsv` in `src/main/import/zip.ts` used a naive `split('\n')` to re-parse the CSV for image column lookup. `processCsvImport` (called earlier in the same ZIP flow) uses `splitCsvLines()`, which correctly handles quoted fields containing embedded newlines (e.g. a `story` or `provenance` value with a line break). When any coin had such a field, the two parsers diverged in row count, causing `insertedRowIds.get(rowIndex)` to return `undefined` for misaligned rows — silently skipping all image attachments for those and all subsequent coins.

**Fix:** `splitCsvLines` exported from `src/main/import/csv.ts` and used in `attachImagesFromCsv` in place of `split('\n')`.
