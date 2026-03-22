# Implementation Blueprint: PDF Export Redesign — The Prestige Catalog

**Date:** 2026-03-22
**Status:** Verification
**Reference:** `docs/style_guide.md` v3.3 "Manuscript Hybrid"

---

## 1. Objective

Redesign the full-collection PDF export to produce a prestige-grade numismatic catalog that reflects Patina's brand identity, remains compact for large collections, and outputs in the user's chosen locale.

**Current problems:**
- Generic typography (Times New Roman throughout) with no brand palette
- One page per coin → 100-coin collection = 100+ pages, impractical
- Plain jspdf-autotable grid layout; no visual hierarchy
- Cover page is three lines of text
- All strings hardcoded in English

**Target outcome:** A document a collector would hand to a peer — parchment background, Cormorant Garamond headings, burnt sienna accents, two coins per page with images and complete metadata, a visual TOC grouped by era, a stats summary, and Spanish labels by default.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** Manuscript Hybrid palette and typography applied directly in jsPDF. Two-column layout with stacked images mirrors auction-house numismatic catalogs. Nothing decorative for its own sake.
- [x] **Privacy First:** Custom fonts embedded from bundled TTF files — no CDN, no network call. All data is local. No new external dependencies beyond what's already in the project.
- [x] **Single-Click Rule:** Export trigger unchanged — "Generate Catalog" in the Cabinet toolbar, one click. Locale passed automatically from `useLanguage`.

---

## 2. Technical Strategy

### 2.1 IPC Chain Updates (additive only)

**`src/common/validation.ts`** — add after `ExportOptionsSchema`:
```typescript
export const PdfExportOptionsSchema = z.object({
  locale: z.enum(['en', 'es']).default('es'),
}).strict();
export type PdfExportOptions = z.infer<typeof PdfExportOptionsSchema>;
```

**`src/main/preload.ts`** line 26 — change:
```typescript
// Before:
exportToPdf: () => ipcRenderer.invoke('export:toPdf'),
// After:
exportToPdf: (locale: 'en' | 'es') => ipcRenderer.invoke('export:toPdf', { locale }),
```

**`src/main/index.ts`** — update `export:toPdf` handler (lines 187–199):
```typescript
ipcMain.handle('export:toPdf', async (_, data: unknown) => {
  const { locale } = validateIpc(PdfExportOptionsSchema, data);
  const result = await dialog.showSaveDialog({ ... });
  if (result.canceled || !result.filePath) return { success: false, error: 'Export cancelled' };
  return exportToPdf(result.filePath, locale);
});
```
Uses the existing `validateIpc` generic helper (line 73).

**`src/renderer/hooks/useExport.ts`** — `exportToPdf` callback accepts `locale`:
```typescript
const exportToPdf = useCallback(async (locale: 'en' | 'es' = 'es') => {
  ...
  await window.electronAPI.exportToPdf(locale);
  ...
}, []);
```

**`src/renderer/components/Cabinet.tsx`** — pass current locale:
```typescript
const { locale } = useLanguage(); // already imported
...
onClick={() => exportToPdf(locale)}
```

### 2.2 Font Bundling

New directory: `assets/fonts/` (project root, not `src/`).

Files to commit (downloaded from Google Fonts):
- `CormorantGaramond-Regular.ttf`
- `CormorantGaramond-Bold.ttf`
- `CormorantGaramond-Italic.ttf`
- `Montserrat-Regular.ttf`
- `Montserrat-Bold.ttf`

**`package.json`** `build` key — add `extraResources`:
```json
"extraResources": [
  { "from": "assets/fonts/", "to": "fonts/", "filter": ["**/*.ttf"] }
]
```

Font path resolution in `pdf.ts` — same `isDev` pattern used for `imageRoot`:
```typescript
const fontRoot = isDev
  ? path.join(process.cwd(), 'assets', 'fonts')
  : path.join(process.resourcesPath, 'fonts');
```

`loadFonts(doc: jsPDF): boolean` — reads each TTF as base64 via `fs.readFileSync`, calls `addFileToVFS` + `addFont`. Returns `false` on any error (entire `FONT_DEFS` loop wrapped in one try/catch) → graceful fallback to `'times'` / `'helvetica'` for all fonts.

### 2.3 Brand Palette & Translations

Replace the three color constants (`BLACK`, `GRAY`, `LIGHT_GRAY`) with:
```typescript
const PARCHMENT    = '#FCF9F2';
const IRON_GALL    = '#2D2926';
const BURNT_SIENNA = '#914E32';
const RULE_COLOR   = '#D4C9B0';
```

Static translations map (no runtime i18n import — main process only):
```typescript
type Locale = 'en' | 'es';
const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    specifications: 'Specifications', obverse: 'Obverse', reverse: 'Reverse',
    metal: 'Metal', grade: 'Grade', mint: 'Mint', weight: 'Weight',
    diameter: 'Diameter', dieAxis: 'Die Axis', fineness: 'Fineness',
    catalogRef: 'Catalog Reference', provenance: 'Provenance',
    story: 'Story', acquisition: 'Acquisition',
    tableOfContents: 'Table of Contents',
    collectionStatistics: 'Collection Statistics',
    page: 'Page', generated: 'Generated', totalCoins: 'Total Coins',
    inscriptions: 'Inscriptions', denomination: 'Denomination',
    byMetal: 'By Metal', byEra: 'By Era', byGrade: 'By Grade',
    totalValue: 'Total Value', imageUnavailable: '[Image unavailable]',
    era: 'Era', rarity: 'Rarity',
  },
  es: {
    specifications: 'Especificaciones', obverse: 'Anverso', reverse: 'Reverso',
    metal: 'Metal', grade: 'Grado', mint: 'Ceca', weight: 'Peso',
    diameter: 'Diámetro', dieAxis: 'Eje de Cuño', fineness: 'Fineza',
    catalogRef: 'Referencia de Catálogo', provenance: 'Procedencia',
    story: 'Nota del Curador', acquisition: 'Adquisición',
    tableOfContents: 'Índice de Contenidos',
    collectionStatistics: 'Estadísticas de la Colección',
    page: 'Página', generated: 'Generado', totalCoins: 'Total de Monedas',
    inscriptions: 'Inscripciones', denomination: 'Denominación',
    byMetal: 'Por Metal', byEra: 'Por Época', byGrade: 'Por Grado',
    totalValue: 'Valor Total', imageUnavailable: '[Imagen no disponible]',
    era: 'Época', rarity: 'Rareza',
  },
};
function t(locale: Locale, key: TranslationKey): string { return TRANSLATIONS[locale][key]; }
```

Note: `metal` key uses `'Metal'` in Spanish (same word, avoids confusion with `fineness` = aleación). `story` key uses `'Nota del Curador'` to elevate the personal note field curatorially.

### 2.4 Layout — 2 Coins Per Page

Layout constants:
```typescript
const MARGIN      = 20;
const CONTENT_W   = 170;   // 210 - 2×20
const IMG_COL_W   = 68;    // left column: images
const META_COL_W  = 98;    // right column: metadata (4mm gap between cols)
const SLOT_HEIGHT = 126;   // half-page slot (conservative heuristic — see estimateCoinSlotHeight)
const IMG_SIZE    = 35;    // obverse/reverse image box (mm)
```

**`applyPageBackground(doc)`** — `doc.setFillColor(PARCHMENT)`, `doc.rect(0, 0, 210, 297, 'F')` — called immediately after every `addPage()`.

**`drawHorizontalRule(doc, y, color?)`** — 0.3pt line across CONTENT_W in RULE_COLOR.

**`drawSectionHeader(doc, label, x, y, fonts): number`** — BURNT_SIENNA, FONT_HEADING bold; returns finalY.

**`drawPageFooter(doc, pageNum, total, locale)`** — centered "Página N / M" 9pt IRON_GALL, Y=287mm.

**`estimateCoinSlotHeight(coin, hasImages): number`** — pure computation (no doc):
- Base: 18mm (title + subtitle + rule)
- Images: 82mm if hasImages (2 × 35mm + 2 × 6mm label + gap)
- Spec table: 40mm fixed (8 rows)
- Long text (story, provenance): `Math.ceil(text.length / 55) * 5` per field
- Returns raw estimate; caller compares against SLOT_HEIGHT

**`drawCoinSlot(doc, coin, images, slotY, locale, fonts): number`**
1. Title: FONT_HEADING bold 14pt, IRON_GALL
2. Subtitle: issuer · year_display · era · mint — FONT_BODY italic 9pt, BURNT_SIENNA; filter falsy values
3. Thin RULE_COLOR rule
4. Left column (X=MARGIN, W=IMG_COL_W): obverse 35×35mm with RULE_COLOR border, 4mm gap, reverse 35×35mm with RULE_COLOR border, 9pt labels "Anverso"/"Reverso" centered below each
5. Right column (X=MARGIN+IMG_COL_W+4, W=META_COL_W): `autoTable` `theme:'plain'` two-column key-value — denomination, metal, weight, diameter, fineness, die_axis, grade, mint, catalog_ref, rarity — then inscription rows (obverse_legend, obverse_desc, reverse_legend, reverse_desc, edge_desc), then provenance/story rows, then acquisition inline (price · date · source)
6. Returns `(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY`

Overflow: if `estimateCoinSlotHeight > SLOT_HEIGHT`, coin is placed alone on a full page. Coins that fit are paired; second coin starts at `slotY = MARGIN + SLOT_HEIGHT + 5` with a separator rule between them.

### 2.5 Cover Page

**`drawCoverPage(doc, coins, allImages, locale, fonts)`**:
1. `applyPageBackground(doc)`
2. Featured coin selection: iterate coins, for each find primary image in allImages Map, call `fs.statSync(fullPath).size`, track max — fallback to `coins[0]` primary image if no images exist
3. Featured image centered at X=55, Y=50, 100×100mm, 1pt BURNT_SIENNA border frame
4. Collection title "Patina" — FONT_HEADING bold 36pt IRON_GALL, centered, Y=165mm
5. Subtitle: `t(locale, 'generated') + ': ' + date + '  ·  ' + totalCoins + ' ' + t(locale, 'totalCoins')` — FONT_BODY 11pt IRON_GALL, centered, Y=176mm
6. Stats panel: RULE_COLOR filled rect at Y=200mm, height 30mm; inside: year range, most common metal (reduce coins array), printed in FONT_BODY 10pt IRON_GALL

### 2.6 Visual TOC

**Two-pass strategy:**

Pass 1 (before coin pages): `doc.addPage()` × `tocPageCount` — record page numbers in `tocPageNums[]`.

Pass 2 (after all coin pages rendered): for each `tocPageNum`, `doc.setPage(n)`, `applyPageBackground(doc)`, render entries for that page.

TOC entries grouped by era — when era changes between consecutive entries, print an era subheading in FONT_HEADING italic 11pt BURNT_SIENNA.

Each entry row (22mm tall including thumbnail):
- `doc.addImage(thumbnail, 'JPEG', x, y, 15, 15)` — obverse thumbnail
- Coin title FONT_BODY 10pt IRON_GALL at X+18
- `setLineDash([0.5, 2])` dot leader from title end to 4mm before page number
- Page number right-aligned FONT_BODY 10pt IRON_GALL
- `setLineDash([])` to reset

`tocPageCount = Math.ceil(coins.length / 14)` (14 entries per page accounting for era subheadings).

### 2.7 Stats Summary Page

After TOC pages, before coin entries. Recorded as placeholder, back-filled via `doc.setPage()`.

**`drawStatsPage(doc, coins, locale, fonts)`**:
- Section header: `t(locale, 'collectionStatistics')` in BURNT_SIENNA
- `drawBarChart(doc, byMetal, x, y, 100, fonts)` — count occurrences per `coin.metal`, sort descending, top 8
- `drawBarChart(doc, byEra, ...)` — same for `coin.era`
- `drawBarChart(doc, byGrade, ...)` — same for `coin.grade`
- Total value: if any `purchase_price` is defined, sum and print `t(locale, 'totalValue') + ': $' + total.toFixed(2)`

**`drawBarChart(doc, data, x, y, maxBarWidth, fonts): number`**:
- Each row: label (40mm FONT_BODY 9pt IRON_GALL), filled BURNT_SIENNA rect `(count/maxCount * maxBarWidth)mm × 4mm`, count value 8pt right of bar
- 8mm between rows; returns finalY

### 2.8 Revised `exportToPdf` Main Flow

```
exportToPdf(targetPath: string, locale: 'en' | 'es' = 'es'): Promise<ExportResult>

1.  doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
2.  fontsLoaded = loadFonts(doc)
    FONT_HEADING = fontsLoaded ? 'CormorantGaramond' : 'times'
    FONT_BODY    = fontsLoaded ? 'Montserrat'        : 'helvetica'

3.  coins = dbService.getCoins()
    allImages = new Map<number, CoinImage[]>()
    for coin of coins: allImages.set(coin.id, dbService.getImagesByCoinId(coin.id))

4.  // Cover page (page 1)
    applyPageBackground(doc)
    drawCoverPage(doc, coins, allImages, locale, { heading: FONT_HEADING, body: FONT_BODY })

5.  // Compute pagePlan
    pagePlan: Array<{ coins: Coin[]; pageIndex: number }> = []
    i = 0; pageIndex = 0
    while i < coins.length:
      coinA = coins[i]
      estA = estimateCoinSlotHeight(coinA, allImages.get(coinA.id)!.length > 0)
      if estA > SLOT_HEIGHT or i+1 >= coins.length:
        pagePlan.push({ coins: [coinA], pageIndex: pageIndex++ }); i++
      else:
        coinB = coins[i+1]
        estB = estimateCoinSlotHeight(coinB, allImages.get(coinB.id)!.length > 0)
        pagePlan.push({ coins: [coinA, coinB], pageIndex: pageIndex++ }); i += 2

6.  // TOC + stats placeholders
    tocPageCount = Math.ceil(Math.max(coins.length, 1) / 14)
    tocPageNums: number[] = []
    for tp of [0..tocPageCount-1]:
      doc.addPage(); applyPageBackground(doc)
      tocPageNums.push(doc.getNumberOfPages())
    doc.addPage(); applyPageBackground(doc)
    statsPageNum = doc.getNumberOfPages()
    // offset: toc pages + 1 stats page + 1 cover page already rendered
    pageOffset = tocPageCount + 2

7.  // Render coin pages
    coinPageMap = new Map<number, number>()  // coinId → actual doc page
    for plan of pagePlan:
      doc.addPage(); applyPageBackground(doc)
      docPage = doc.getNumberOfPages()
      plan.coins.forEach(c => coinPageMap.set(c.id, docPage))
      yPos = MARGIN
      for (idx, coin) of plan.coins.entries():
        if idx === 1:
          drawHorizontalRule(doc, yPos + 2)
          yPos += 8
        drawCoinSlot(doc, coin, allImages.get(coin.id)!, yPos, locale, fonts)
        yPos += SLOT_HEIGHT + 5
      drawPageFooter(doc, docPage, doc.getNumberOfPages(), locale)

8.  // Back-fill TOC
    coinsGroupedByEra = groupAndSortByEra(coins)  // sort coins by era alphabetically
    tocEntries = coinsGroupedByEra.map(c => ({
      coin: c, pageNum: coinPageMap.get(c.id) ?? 0,
      obverseImg: allImages.get(c.id)?.find(img => img.label === 'Obverse' || img.is_primary)
    }))
    for (tp, tocPageNum) of tocPageNums.entries():
      doc.setPage(tocPageNum)
      applyPageBackground(doc)
      drawSectionHeader(doc, t(locale, 'tableOfContents'), MARGIN, MARGIN, fonts)
      entries = tocEntries.slice(tp * 14, (tp + 1) * 14)
      renderTocEntries(doc, entries, locale, fonts)

9.  // Back-fill stats
    doc.setPage(statsPageNum)
    applyPageBackground(doc)
    drawStatsPage(doc, coins, locale, fonts)
    drawPageFooter(doc, statsPageNum, doc.getNumberOfPages(), locale)

10. buf = doc.output('arraybuffer')
    fs.writeFileSync(targetPath, Buffer.from(buf))
    return { success: true, path: targetPath }
```

---

## 3. Verification Strategy

### Testing Plan

**`src/main/export/pdf.test.ts`** — mock additions:
```typescript
// jsPDF mock:
setFillColor: vi.fn(),
setLineDash: vi.fn(),
existsFileInVFS: vi.fn().mockReturnValue(false),
addFileToVFS: vi.fn(),
addFont: vi.fn(),
getNumberOfPages: vi.fn().mockReturnValue(5),
setPage: vi.fn(),
splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
getTextWidth: vi.fn().mockReturnValue(50),

// fs mock:
statSync: vi.fn().mockReturnValue({ size: 1000 }),
```

New test cases:
1. `exportToPdf('/tmp/...', 'es')` → succeeds; spy `doc.text` args contain 'Especificaciones'
2. `exportToPdf('/tmp/...', 'en')` → spy `doc.text` contains 'Specifications'
3. Font load failure (`readFileSync` throws for `.ttf` extension) → returns `{ success: true }` (graceful fallback)
4. 2 coins → `addPage` called: 1 cover + tocN + 1 stats + 1 content = correct total; `setPage` called for TOC back-fill
5. 3 coins → 2 content pages (3rd coin solo due to `i+1 >= length`)
6. Coin with `estimateCoinSlotHeight > SLOT_HEIGHT` → placed solo (pagePlan has 1 coin)
7. Empty collection → returns `{ success: true }`; no coin `addPage` calls; cover + TOC + stats only
8. `PdfExportOptionsSchema` unit tests: locale 'en' ✓, 'es' ✓, default 'es' ✓, invalid value throws
9. TOC exact boundary: 14 coins → `tocPageCount === 1`; 15 coins → `tocPageCount === 2`

**`src/renderer/hooks/__tests__/useExport.test.ts`** — update `exportToPdf()` → `exportToPdf('es')`.

**`setupTests.ts`** — update `exportToPdf` mock signature: `vi.fn().mockResolvedValue({ success: true })` (locale arg accepted but unused in mock).

### Colocation Check
- `pdf.test.ts` colocated beside `pdf.ts` ✓
- `useExport.test.ts` in `hooks/__tests__/` ✓

### Mocking Strategy
- All Node modules (`fs`, `path`, `electron`) mocked at module level — existing pattern unchanged
- jsPDF mock extended in-place (no new mock files)

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Verified

### Audit Findings

**System Integrity:**
- `PdfExportOptionsSchema` follows the exact pattern of `VocabGetSchema` and `PreferenceSetSchema` — `.strict()` enum, exported type. Schema lives in `src/common/`; validated in main process via existing `validateIpc` helper (line 73 of `index.ts`). Full cross-process consistency.
- `Locale = 'en' | 'es'` in `pdf.ts` mirrors the union already used in `validation.ts`. No new type divergence.
- Font loading isolated to `loadFonts()` — no side effects if fonts are absent. `FONT_HEADING` / `FONT_BODY` string constants propagate cleanly through all helpers as a `fonts` parameter object.

**Abstraction:**
- No PDF logic leaks into the Electron bridge. The `preload.ts` change is a pure parameter addition. The renderer hook has no knowledge of font names, palette values, or layout constants — all encapsulated in `pdf.ts`.
- The two-pass TOC (`setPage` back-fill) is entirely within `pdf.ts`; no new IPC channels required.

### Review Notes

- Wrap the entire `FONT_DEFS` loop in a **single** try/catch so that if any one font fails to load, all fonts fall back to Times/Helvetica for visual consistency. Do not catch per-font and mix custom + system fonts.
- `estimateCoinSlotHeight` is a heuristic. Add a comment explaining that 126mm is a conservative half-page estimate — actual rendering may be shorter, pushing the second coin upward slightly, which is acceptable. This prevents future maintainers from "fixing" the constant without understanding it.
- Verify `Math.ceil(14/14) === 1` edge case for TOC page count — 14 coins should produce exactly 1 TOC page, not 2.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Verified

### Audit Findings

**The Filter:**
- `PdfExportOptionsSchema` uses `.strict()` and `z.enum(['en', 'es'])` — closed set, no injection surface.
- `validateIpc(PdfExportOptionsSchema, data)` at the IPC boundary follows "The Filter" mandate exactly.
- Font file paths: constructed as `path.join(fontRoot, file)` where `file` is a hardcoded constant from `FONT_DEFS`, **not** user-controlled. No path traversal risk.
- `fs.statSync` for cover selection uses paths from `imageRoot + coin.image.path` — same trust model as existing `loadImageAsBase64` (DB is considered internal trusted data).

**Protocols:**
- No new IPC channels. No new use of `patina-img://` or `file://`. The only new renderer-to-main data is `{ locale: 'en' | 'es' }`.

### Review Notes

- Verified: No issues identified. The locale parameter is the only new data surface and it is strictly validated with a closed enum.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Verified

### Audit Findings

**Coverage Check:**
- `PdfExportOptionsSchema` adds 3 branches (locale 'en', locale 'es', default 'es') — all must be tested to maintain 100% branch coverage on `validation.ts`.
- `loadFonts` failure path (returns `false`) is a new branch in `pdf.ts` — must be tested.
- PagePlan solo-page overflow path is a new branch — must be tested.
- All existing 7 test cases in `pdf.test.ts` remain valid after updating call signatures to include `locale`.

**Async Safety:**
- `exportToPdf` is `async` and all tests `await` it — no sync query issues.
- No new `useEffect` or IPC push listeners introduced.

### Review Notes

- The `writeFileSync` error test (line 133) uses CommonJS `require('fs')` style — verify this still intercepts the vi.mock correctly. If brittle, refactor to use the vi-mocked module directly via `import * as fsMod from 'fs'` and `vi.spyOn(fsMod, 'writeFileSync')`.
- Add a test asserting `setPage` is called during TOC back-fill — validates the two-pass logic without testing jsPDF internals directly.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Verified

### Audit Findings

**Aesthetic Compliance:**
- PDF palette mirrors Manuscript Hybrid v3.3 exactly: Parchment `#FCF9F2`, Iron Gall `#2D2926`, Burnt Sienna `#914E32`. Rule color `#D4C9B0` is consistent with the warm-grey tones in the style guide.
- Cormorant Garamond for headings, Montserrat for body — matches the app's font stack precisely.
- Cover page places the coin image as the visual hero; typography recedes below it — Silent Frame principle applied.

**Accessibility:**
- PDF output is not an interactive DOM — WCAG contrast and keyboard nav criteria do not apply. Font sizes (9pt minimum for body text) are above the legible threshold for A4 print.
- No UI components added or modified beyond a locale parameter passed to the existing export button call.

### Review Notes

- Use **9pt minimum** for the smallest text elements, including image labels. At A4 print resolution 8pt is technically legible but 9pt is safer for non-Roman scripts and diacritics in legends.
- TOC dot leader: ensure the line terminates 3–4mm before the page number, not flush against it.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified

### Audit Findings

**Historical Accuracy:**
- Spanish label choices are professionally accurate:
  - "Anverso / Reverso" — standard in Spanish-language numismatic auctions (Herrero, Vico & Canto, Áureo)
  - "Ceca" — the canonical Spanish term for mint, used across Hispano-Arabic, medieval, and modern catalogs
  - "Eje de Cuño" — standard die axis term in Spanish numismatic literature
  - "Metal" retained in Spanish (same word, avoids confusion with `fineness` field which represents aleación/alloy percentage)
  - "Bordura" — correct for edge; preferred over "Canto" for formal catalog usage
  - "Nota del Curador" for Story — elevates the personal note field to curatorial register
  - "Referencia de Catálogo" — matches citation format in major Spanish auction catalogs

**Collector UX:**
- Two coins per page mirrors RIC pocket editions and CNG printed inventory lists — familiar density for experienced collectors.
- TOC grouped by era matches RIC (by emperor period) and SNG (by region/period) organizational logic.
- Stats page (metal / era / grade breakdown) matches the analytical overview collectors use for portfolio assessment.
- Full metadata column (catalog_ref, provenance, rarity) satisfies ICOM Object ID standard for archival documentation.

### Review Notes

- The cover featured coin uses largest image file size as heuristic. This is visually sound. Flag as a future enhancement: allow collector to pin a cover coin via a preference setting.
- Inscriptions in the right column should render in a monospace or lighter-weight font when displaying ancient legends (e.g. ΑΘΕ, ΑΘΕΝΑΙΩΝ) — FONT_BODY italic or JetBrains Mono would both work. Recommend FONT_HEADING italic for obverse/reverse legends to evoke the manuscript aesthetic.

---

## 9. User Consultation & Decisions

### Open Questions

None — all design decisions resolved during brainstorming session on 2026-03-22.

### Final Decisions

- **Goal:** Full redesign — branding + layout + all extra sections
- **Coin layout:** 2 coins per page; small stacked images (35mm) in left column; all metadata in right column; nothing dropped
- **Extra sections:** All four — cover redesign, visual TOC grouped by era, stats summary page, Spanish labels
- **Font strategy:** Bundle Cormorant Garamond + Montserrat TTFs; graceful fallback to Times/Helvetica
- **Spanish as default** — matches app default locale (`'es'`)

---

## 10. Post-Implementation Retrospective

**Date:** 2026-03-22
**Outcome:** Implementation complete — all four issues resolved in post-launch verification.

### Summary of Work
- [x] IPC chain updated (validation, preload, handler, hook, Cabinet)
- [x] Font files bundled in `assets/fonts/`, `extraResources` configured in `package.json`
- [x] `pdf.ts` fully rewritten with new layout, palette, translations, helpers
- [x] `pdf.test.ts` updated with new mocks and test cases (18 tests)
- [x] `npx tsc --noEmit` passes with zero errors
- [x] All tests green — 190/190 passing

### Post-Launch Fixes (2026-03-22 — Verification)

#### 1. Progressive JPEG images invisible in PDF

**Symptom:** Images were embedded in the PDF but rendered as 1-pixel-tall strips, making them invisible.

**Root Cause:** `jsPDF` misreads progressive JPEG (SOF2) markers, reporting dimensions of e.g. `1281×1` instead of `3024×3024`. The images were correctly embedded but the PDF's image viewport was collapsed.

**Fix (v1 — superseded):** Jimp (pure JS) decode + re-encode. Worked but made PDF generation noticeably slow with even 3 images due to full pixel-buffer decode/encode in JS.

**Fix (v2 — current):** `loadImageAsBase64()` uses Electron's `nativeImage.createFromBuffer(buffer).toJPEG(92)` to normalize all JPEGs. Chromium's native image stack handles progressive JPEG correctly and runs at native speed — no async, no new dependency, `jimp` removed.
```
Progressive JPEG (SOF2) → nativeImage.createFromBuffer → .toJPEG(92) → jsPDF ✓
```
PNGs are passed through unchanged. `loadImageAsBase64`, `drawCoinSlot`, `drawCoverPage`, and `renderTocEntries` are all synchronous.

**Tradeoff:** Output is re-encoded at quality 92 (baseline). File size increase vs progressive source is acceptable for a one-time catalog export.

#### 2. Montserrat italic font error

**Symptom:** `Unable to look up font label for font 'Montserrat', 'italic'`.

**Root Cause:** `FONT_DEFS` only included `Montserrat-Regular` and `Montserrat-Bold`; the subtitle line called `doc.setFont(fonts.body, 'italic')` requesting a non-existent italic variant.

**Fix:** Added `Montserrat-Italic.ttf` to `FONT_DEFS` (6th entry) and to `assets/fonts/`. The file was obtained by downloading the WOFF2 from Google Fonts and converting to TTF using Python's fonttools + brotli.

#### 3. Date format DD/MM/YYYY

**Symptom:** Cover page showed locale-dependent date output (e.g., `22/3/2026`).

**Fix:** Replaced `new Date().toLocaleDateString()` with explicit zero-padded formatting:
```typescript
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const date = `${day}/${month}/${year}`;
```

#### 4. Cover page stats redesign

**Decision:** Adopted Option C — inline manuscript footer.

- Removed the filled `RULE_COLOR` rectangle (too "dashboard widget")
- Title moved from Y=165 → Y=168 for breathing room below the hero image
- Thin 0.3pt hairline rule at Y=197
- Stats as a single centered line at Y=205: `202 BC – AD 202  ·  Silver (12)`
- Subtitle line adjusted to Y=179 accordingly

### Pain Points
- jsPDF's progressive JPEG handling required a significant diagnosis detour (isolated via Python PDF parsing to find embedded `/Width 1281 /Height 1` in the PDF binary)
- First fix (Jimp) introduced unacceptable generation latency; replaced with `nativeImage` in the same session

### Things to Consider
- Allow collector to pin a cover coin via a preference
- Use FONT_HEADING italic for obverse/reverse legend text (ancient scripts)
- Consider landscape orientation option for wider image display in a future iteration
- **Core Doc Revision:** Confirm if `@AGENTS.md` or `docs/style_guide.md` need updates after implementation
