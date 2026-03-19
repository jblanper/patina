# Implementation Blueprint: Phase 5 - Preservation (Security/Export)

**Date:** 2026-03-19
**Status:** In-Progress
**Reference:** `docs/technical_plan_2026-03-10.md`

## 1. Objective

Implement the "Preservation" system enabling curators to:
1. **Export Archive:** Create a structured ZIP archive containing database backup, coin images, JSON manifest, and CSV export for spreadsheet analysis.
2. **Generate PDF Catalog:** Produce a museum-quality full collection catalog with all coin records and images.

### Philosophical Alignment
- [ ] **Archival Ledger Aesthetic:** PDF should feel like a museum catalog; ZIP archive should have a professional manifest.
- [ ] **Privacy First:** All exports remain local. No cloud upload. ZIP/CSV/PDF generated entirely on-device.
- [ ] **Single-Click Rule:** One-click "Export Archive" and "Generate PDF" from the sidebar.

---

## 2. Technical Strategy

### A. Export Archive

**IPC Handler:** `export:toZip`
- **Location:** `src/main/index.ts`
- **Flow:**
  1. Renderer opens native save dialog via `dialog.showSaveDialog()` for user to choose location
  2. Renderer invokes `export:toZip` with user-selected `targetPath`
  3. Main process queries full coin data + images from database
  4. Main creates ZIP using `archiver` with:
     ```
     patina-export-{timestamp}/
     ├── manifest.json       # Export metadata (date, coin count, app version)
     ├── coins.db            # SQLite database backup
     ├── coins.csv           # All coin records as CSV (Excel-compatible)
     └── images/
         ├── coin-1-obverse.jpg
         └── ...
     ```
  5. Main returns `{ success: true, path: string }` or error

**CSV Format (coins.csv):**
- Headers: All `Coin` fields + `obverse_image`, `reverse_image`, `edge_image`
- UTF-8 with BOM for Excel compatibility
- Dates in ISO 8601 format
- Image columns: relative paths to images/ directory

**Zod Validation:**
```typescript
// src/common/validation.ts
import path from 'path';

export const ExportOptionsSchema = z.object({
  targetPath: z.string()
    .optional()
    .refine(val => !val || !val.includes('..'), "Path traversal forbidden")
    .refine(val => !val || path.isAbsolute(val), "Must be absolute path"),
  includeImages: z.boolean().default(true),
  includeCsv: z.boolean().default(true),
}).strict();
```

### B. PDF Catalog Generation

**Library:** `jspdf` + `jspdf-autotable` (for tabular data)
**IPC Handler:** `export:toPdf`
**Location:** `src/main/index.ts`

**PDF Structure:**
1. **Cover Page:** "Patina Collection Catalog" + date + total coins
2. **Table of Contents:** Auto-generated from coin titles
3. **Coin Pages:** One per coin with:
   - Title, issuer, year, era
   - Obverse image (scaled to fit)
   - Reverse image (if exists)
   - Key metadata table (metal, weight, diameter, grade)
   - Obverse/Reverse legends
   - Catalog reference
   - Story/provenance notes

**Image Handling:**
- Images loaded via `patina-img://` protocol
- Converted to base64 for PDF embedding
- Max resolution: 800px width to keep PDF manageable

**PDF Styling (Manuscript Hybrid v3.3 - Final):**
- **Background:** White (#FFFFFF)
- **Typography:** Garamond (Times) throughout - serif for elegant, scholarly feel
- **Layout:** Left-aligned text, clean section separators with hairline borders
- **Coin Images:** Side-by-side obverse/reverse with thin border frame
- **Specifications Table:** 4-column grid (Label | Value | Label | Value), 35mm label width
- **Inscriptions/Additional Tables:** 2-column grid, 35mm label width (all sections aligned)
- **Page Numbers:** Bottom center, Garamond
- **Visual:** Minimal, museum-quality catalog aesthetic

### C. UI Components

**Header Integration (Rev 1):**
- Export buttons moved to Cabinet header, next to "+ New Entry" button
- Two CTAs: "Export Archive" | "Generate Catalog"
- Follows Single-Click Rule - one click from main view

**Toast Notification (Rev 1):**
- Removed modal entirely - replaced with simple toast notification
- Auto-dismisses after 5 seconds
- Fixed bottom-right position
- Shows success message with filename or error message

**Hook:**
- `useExport.ts`: Manages export state (idle/exporting/success/error)

---

## 3. Implementation Plan

### Step 1: Dependencies
- [ ] Install `archiver` (for ZIP creation)
- [ ] Install `jspdf` + `jspdf-autotable` (for PDF)

### Step 2: Validation Schema
- [ ] Add `ExportOptionsSchema` to `src/common/validation.ts` with path traversal prevention
- [ ] Add `exportCsvField()` utility to escape formula characters (`=`, `+`, `-`, `@`)

### Step 4: ZIP Export Handler
- [ ] Create `src/main/export/zip.ts` - Archive creation logic
- [ ] Create `src/main/export/zip.test.ts` (co-located)
- [ ] Add `export:toZip` IPC handler in `index.ts` with `validate(ExportOptionsSchema, payload)`

### Step 5: PDF Catalog Handler
- [ ] Create `src/main/export/pdf.ts` - PDF generation logic
- [ ] Create `src/main/export/pdf.test.ts` (co-located)
- [ ] Implement cover page, TOC, coin pages with all numismatic fields
- [ ] Enforce 800px max image dimension
- [ ] Add `export:toPdf` IPC handler in `index.ts`

### Step 6: Renderer Integration (Rev 1)
- [x] Create `src/renderer/hooks/useExport.ts`
- [x] Create `src/renderer/components/ExportToast.tsx` (replaces ExportModal)
- [x] Add export buttons to Cabinet header
- [x] Remove preservation section from sidebar

---

## 4. Verification Strategy (Quality Oversight)

### Testing Plan
- **Unit Tests (co-located with source):**
  - `src/main/export/zip.test.ts`: CSV generation, ZIP structure verification
  - `src/main/export/pdf.test.ts`: PDF page count, field inclusion
- **Hook Tests:**
  - `src/renderer/hooks/__tests__/useExport.test.ts`: State transitions, error handling

### Mocking Strategy
- Mock `window.electronAPI.export:toZip` and `export:toPdf`
- Use `vi.fn()` for progress callbacks

---

## 5. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Types defined in `src/common/types.ts` ensure cross-process consistency.
- **Abstraction:** Export logic isolated in `src/main/export/` modules; business logic does not leak into IPC handlers.
- **IPC Handlers:** Minimal, delegating to service modules.

### Review Notes & Suggestions:
- Verified: No issues identified.

---

## 6. Security Assessment (`securing-electron`)
**Status:** Issues Found

### Audit Findings:
1. **CRITICAL FIXED:** Path validation added to `ExportOptionsSchema` with `.refine()` for traversal prevention and absolute path requirement.
2. **CSV Formula Injection:** Fields starting with `=`, `+`, `-`, `@` must be escaped with `'` prefix to prevent Excel formula execution.
3. **Resource Limits:** Max image dimension (800px) enforced in PDF generation; ZIP chunked writing for large collections.

### Review Notes & Suggestions:
1. Implement CSV escaping: prefix formula chars with `'`
2. Add max export size guard (e.g., 500MB total)
3. Validate `patina-img://` URLs when converting to base64 for PDF

---

## 7. Quality Assessment (`assuring-quality`)
**Status:** Issues Found

### Audit Findings:
- **Coverage Targets:** ✅ Specified - 90% for `useExport.ts`, 100% for validation schemas.
- **Colocation Rule:** ⚠️ Tests must be co-located next to source files per AGENTS.md:
  - `src/main/export/zip.test.ts` (not `src/main/__tests__/export.test.ts`)
  - `src/main/export/pdf.test.ts`
  - `src/renderer/hooks/__tests__/useExport.test.ts`
- **Mocking Strategy:** ✅ Correct - Mock `window.electronAPI` with `vi.fn()`.
- **Async Safety:** ✅ Addressed - Use `waitFor` for progress state transitions.

### Review Notes & Suggestions:
1. Fix colocation: move tests next to source modules
2. Add explicit error handling test cases for ZIP/PDF failures
3. Test `ExportOptionsSchema` validation in isolation

---

## 8. UI Assessment (`curating-ui`)
**Status:** Issues Found

### Audit Findings:
1. **Icons:** Use archival-style SVG icons (wax seal, ledger book, archive box) instead of generic hard drive/document icons.
2. **PDF Styling:** Manuscript Hybrid v3.3 specified in blueprint (Cormorant Garamond, JetBrains Mono, Parchment background, Iron Gall Ink text).
3. **ExportModal CSS:** Use style guide variables:
   ```css
   .export-progress { background: var(--stone-pedestal); border: 1px solid var(--border-hairline); }
   .export-status { font-family: var(--font-serif); font-style: italic; color: var(--text-muted); }
   ```
4. **Accessibility (ARIA):**
   - Modal: `role="dialog"`, `aria-labelledby="export-title"`, `aria-modal="true"`
   - Progress: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
   - Announce completion with `aria-live="assertive"`

### Review Notes & Suggestions:
1. Native save dialog handles destination selection automatically
2. Reframe button labels: "Export Archive", "Generate Catalog"
3. Keyboard: Escape to cancel modal

---

## 9. Numismatic & UX Assessment (`curating-coins`)
**Status:** Issues Found

### Audit Findings:
1. **CSV Field Enumeration:** All 25 fields must be explicitly listed:
   ```
   id, title, issuer, denomination, year_display, year_numeric, era, mint, metal, fineness, 
   weight, diameter, die_axis, obverse_legend, obverse_desc, reverse_legend, reverse_desc, 
   edge_desc, catalog_ref, rarity, grade, provenance, story, purchase_price, purchase_date, 
   purchase_source, created_at
   ```

2. **PDF Metadata Table:** Expand to include:
   - `denomination`, `mint`, `fineness`, `die_axis` (diagnostic for authenticity), `rarity`

3. **PDF Acquisition Section:** Explicitly include `purchase_price`, `purchase_date`, `purchase_source` alongside `provenance`.

4. **CSV Image Paths:** Add `images/` relative path column for spreadsheet reference.

### Review Notes & Suggestions:
1. Enumerate all CSV columns explicitly in blueprint
2. Test CSV output to verify all 25 fields present
3. Add "Die Axis: {value}h" to PDF coin page metadata

---

## 10. User Consultation & Decisions
### Decisions Logged:
1. **Export Format:** Structured ZIP with manifest.json + coins.db + coins.csv + images/
2. **PDF Scope:** Full collection catalog (all coins)
3. **Selection:** All coins (one-click export)
4. **Destination:** Native save dialog (no USB-specific functionality)

---

## 11. Post-Implementation Retrospective
**Date:** Pending
**Outcome:** TBD

### Summary of Work
- [Pending implementation]

### Pain Points
- [Pending implementation]

### Things to Consider
- [Future: Selective export by filter]
- **Core Doc Revision:** TBD
