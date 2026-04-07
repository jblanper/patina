# Research Report: Cabinet List View, Bulk Operations & Coin Import

**Date:** 2026-04-03
**Idea source:** User proposal (not yet in `docs/technical_plan.md`)
**Status:** Draft

---

## 1. Idea Summary

Three linked capabilities for the Cabinet page: (1) a **list/table view** that sits alongside the current gallery grid, toggled by the curator, (2) **multi-select and bulk operations** — change a field across all selected coins, bulk delete, and scoped PDF/ZIP export for a selection — and (3) **coin import** from an external file (CSV or Patina ZIP). The collector problem this solves is scale: a grid of 50+ coins becomes unwieldy for triage, batch metadata correction, or comparing attributes across rows. Import addresses the #1 friction when switching to Patina from an existing spreadsheet or another tool.

---

## 2. Research Questions

### Q1: How do desktop collection managers implement grid/list toggle and what selection patterns do they use?

No coin-specific tool implements a polished grid/list toggle, but the wider landscape is clear. Airtable, Microsoft Lists, and Lightroom all use an icon-pair toggle (grid ↔ list) persisted per-session. Selection in list view is universally **checkbox-based**: a header "select all" checkbox and per-row checkboxes, with Shift+Click for range selection and Ctrl/Cmd+Click for additive single selection. In grid view the pattern adapts: a small checkbox appears on hover in the card corner (Lightroom, Google Photos). The PatternFly design system documents this pattern explicitly as "bulk selection" and treats the selection toolbar as a contextual control strip that appears only when items are selected.

EzCoin uses a spreadsheet-style grid view as its primary display with right-click bulk operations, but no gallery toggle. OpenNumismat supports both a thumbnail view and a list view (its list is the primary mode). No coin tool currently implements the modern checkbox + floating action bar pattern — this is a gap Patina can close.

### Q2: What bulk-edit UX patterns exist in desktop collection tools — field-at-a-time modal vs. inline spreadsheet?

The established pattern for numismatic tools (CoinManage, US Coin, OpenNumismat) is **field-at-a-time via modal**: the curator selects coins, invokes "bulk edit", picks one field from a dropdown, sets the new value, and confirms. This matches Patina's architecture well — each field update goes through the existing `updateCoin` IPC handler and Zod validation. It avoids the complexity of an inline spreadsheet editor, which would require bypassing the current form/validation pipeline.

US Coin explicitly describes: "copy settings (Location, Variety, Supplier, etc.) to a large number of coins at once." CoinManage labels it "batch edit coins." Neither exposes raw table editing — they always go through a modal or copy-from-selected-coin pattern. This is the right constraint for Patina: bulk edits should be deliberate, not accidental.

### Q3: What import formats do numismatic tools support, and what field-mapping challenges arise?

OpenNumismat is the benchmark: it imports Excel, CSV, and has dedicated importers for Colnect, Numista, uCoin, and several legacy desktop apps. Its import pipeline shows a **field-mapping dialog** on entry: the file columns are shown alongside Patina field targets; the user manually maps or confirms auto-detected mappings. The first 10 rows are previewed.

PCGS Collection Manager accepts a specific CSV template with known column headers (certification number, denomination, year, grade, etc.). Colnect uses catalog-code-based import (not field-level CSV).

For Patina the realistic scope is: **CSV import** with a field mapping step, plus **ZIP re-import** of a Patina export archive. No external API lookups — this preserves privacy-first architecture. Field-mapping challenge: collectors' existing spreadsheets use arbitrary column names ("Cond", "Cat#", "Wt (g)") that will never auto-map cleanly. A mapping dialog is non-negotiable.

### Q4: What do collectors say about bulk operations and import in existing tools?

Very high signal on all three sub-topics:

- **Bulk edit:** Collectors managing 500+ coins routinely work around single-edit-only tools by staying in Excel. CoinManage users explicitly cite batch edit as the reason they chose it over simpler tools.
- **Import:** "A collection of 500 coins that would take days to re-enter manually can be imported in about five minutes" (MyCoinWorX). Multiple CoinTalk threads show collectors writing their own Numista-to-Excel macros because no tool bridged it cleanly.
- **Subset PDF:** Insurance, estate documentation, and appraisal are the three primary drivers. Collectors explicitly describe needing to export "only the high-value pieces" or "only certified coins" — not the whole collection — to share with an adjuster or heir.
- **List view:** The Excel stickiness is almost entirely about **sortable columns and instant search-across-rows**. Collectors say things like "with a spreadsheet, I can search for just about any parameter." The gallery is for browsing; the list is for managing.

### Q5: What are the privacy/data-integrity risks of import?

**Privacy:** CSV import is entirely local — no risk as long as Patina never calls an external API to enrich imported data. The field-mapping dialog must not phone home. All image paths in an imported ZIP must be re-rooted under `data/images/` and validated with the same traversal-blocking rules as the existing `patina-img://` protocol.

**Data integrity risks:**
- Duplicate detection: importing a CSV with no `id` field means Patina cannot know if a coin already exists. A simple title+year+issuer hash check can flag likely duplicates for curator confirmation.
- Schema conflicts: imported fields outside Patina's schema must be surfaced as "unmapped columns" and discarded with user notification.
- Image collisions: ZIP re-import may carry images whose filenames clash with existing files. Use the same `import-<timestamp>-<random>.<ext>` naming already used by `image:importFromFile`.
- Vocab pollution: bulk-imported coins may carry free-text values for vocabulary fields (metal, grade, era) that don't match existing vocab entries. Patina should add them as custom vocab entries rather than silently dropping them.

---

## 3. Competitive Landscape

| Tool | View Modes | Selection Pattern | Bulk Operations | Import Formats |
|---|---|---|---|---|
| **OpenNumismat** | List (primary) + thumbnail sidebar | Single-click row select; Ctrl+Click multi | Bulk delete; no bulk field edit documented | Excel, CSV, Colnect, Numista, uCoin, legacy apps |
| **EzCoin** | Spreadsheet grid (primary) + thumbnail viewer | Grid row select + right-click menu | Change grade in batch; right-click "Remove Selected" | Not documented |
| **CoinManage** | List/table primary | Not documented | "Batch edit coins" | CSV (with PCGS template) |
| **US Coin** | List/table | Not documented | "Copy settings to large number of coins" | CSV |
| **Numista** | Table (search) + collection list | No multi-select | None native | Export: XLSX/CSV; Import: API-limited (2,000 calls/month) |
| **Colnect** | List (default) | No true multi-select | "Quick Mark" bulk assign | CSV catalog codes only |
| **Collectify** | Mobile-first; no documented toggle | Not documented | Not documented | Not documented |
| **Lightroom** *(UX ref)* | Grid + List (Loupe) | Checkbox + Shift/Ctrl+Click | Export selection, Delete, Keyword edit | N/A |

**Key gap:** No coin tool implements the modern **checkbox + contextual action toolbar** pattern. All rely on right-click menus or legacy grid UX. Patina has an opportunity to be the first coin tool with a genuinely modern bulk-select UX.

---

## 4. Community Signals

- **[CoinTalk — "How does everyone catalog their collection?"]:** "With a spreadsheet, I can search for just about any parameter." — collectors with 742+ coins cite sort/filter as the primary reason they stay in Excel despite its limitations (WORKFLOW).

- **[CoinTalk — "Pop-up Pictures of Coins in Excel"]:** "Lots of folks, like me, keep their coin inventory data in Excel... they would like to have pictures of their coins in the spreadsheet." Direct image embedding "makes spreadsheets enormous" — collectors want visual AND tabular simultaneously (PAIN_POINT).

- **[MyCoinWorX — Complete Guide 2025]:** "A collection of 500 coins that would take days to re-enter manually can be imported in about five minutes." Manual data entry is the #1 deterrent to switching tools (PAIN_POINT).

- **[Collectors Universe forums]:** US Coin and CoinManage are recommended specifically because they allow copying a field value to multiple coins at once. Collectors who switch to those tools cite batch edit as a deciding factor (FEATURE_REQUEST).

- **[CoinTalk — "Best way to document coin collection for ease of estate"]:** "Ensuring heirs can find things via picture instead of name" — subset PDF covering high-value or key coins, with images, is the document collectors most need for estate and insurance (PAIN_POINT).

- **[CoinTalk — "I wrote a macro to get numista coin info into Excel"]:** A collector built a script extracting 18 data fields per coin from Numista (~1 second/coin) because no dedicated tool bridged it cleanly. Strong signal that import is desired even at significant effort (FEATURE_REQUEST).

- **[Collectors Universe — Insurance discussions]:** "Documentation should include detailed inventory with current values... photographs of every item... purchase receipts." Subset export (not full collection) for insurance/appraisal is the most cited PDF use case (PAIN_POINT).

- **[Open Library of Humanities — academic research]:** Researchers noted that thumbnail grid layouts "mimic storage drawers but don't serve discovery well" — validating that list/table view is a distinct, necessary mode (WORKFLOW).

---

## 5. Relevant Standards

- **No numismatic standard governs file formats.** There is no industry-standard CSV schema for coin data. PCGS publishes a template (certification number, denomination, year, grade, notes), but it is US-coin-centric and omits ancient/medieval fields. OpenNumismat's internal XML/CSV structure is the closest thing to a de-facto open format.
- **Recommended Patina CSV format:** Column headers derived from Patina's own `Coin` type (`title`, `issuer`, `denomination`, `year_display`, `era`, `metal`, `grade`, `catalog_ref`, etc.). This doubles as a round-trip export format — import of a Patina CSV export should be lossless.
- **ZIP re-import:** Patina already exports a ZIP containing a CSV + `images/` folder (Phase 5). Import is the natural inverse. Image paths must be re-validated through the existing traversal-blocking rules.
- **Privacy:** All import processing is local. No field value, image, or metadata should leave the machine. Enrichment from PCGS/NGC APIs is explicitly out of scope.
- **Vocab validation on import:** Imported vocabulary-field values (`metal`, `grade`, `era`, `denomination`, `mint`, `die_axis`) should be added as custom vocab entries if not already present. `ALLOWED_VOCAB_FIELDS` in `validation.ts` is the authority.

---

## 6. Open Questions

- [ ] **Duplicate detection strategy on CSV import:** Should Patina attempt fuzzy dedup (title+year match) or require the curator to review all imported coins as new? What UI surfaces this?
- [ ] **View-mode persistence:** Should grid/list preference persist between sessions (in preferences store) or reset to grid each launch?
- [ ] **Bulk field edit scope:** Which fields are eligible for bulk edit? Vocabulary fields (metal, grade, era) are natural candidates. Should `title`, `story`, or `purchase_price` be included? Each adds UI and validation complexity.
- [ ] **Selection across view modes:** If the curator selects 3 coins in list view and toggles to grid, does selection persist? It should — but requires shared state.
- [ ] **Import image handling:** If the imported CSV references image paths that don't exist in the ZIP (e.g., curator imports CSV only), should those coins be created without images, or should the import warn per-coin?
- [ ] **Subset PDF vs. scoped ZIP:** The existing PDF generator and ZIP exporter operate on the full collection. Scoping to a selection requires passing a `coinIds` filter through the IPC layer — a new parameter on both `export:toPdf` and `export:toZip`.

---

## 7. Directional Recommendation

**Verdict: Ready for blueprint — but phase the work into three separate blueprints.**

The research confirms strong collector demand for all three capabilities. Each is technically coherent and consistent with Patina's architecture. However, they are independent enough in scope that a single blueprint would be too large to review and verify safely.

**Recommended phasing:**

1. **Blueprint A — List View + Multi-Select:** Add a toggleable list/table view alongside the gallery grid in the Cabinet, with checkbox-based multi-select working in both modes. Selection state is shared across view toggle. No bulk operations yet — just the selection infrastructure. This is the foundation the other two blueprints depend on.

2. **Blueprint B — Bulk Operations:** Build on Blueprint A's selection state to add the contextual action bar: bulk field edit (field-at-a-time modal, vocabulary fields first), bulk delete (with confirmation), and scoped PDF/ZIP export (passing `coinIds` filter through existing export IPC handlers).

3. **Blueprint C — Coin Import:** CSV import with a field-mapping dialog. Patina's own CSV format (round-trip from export) maps automatically; foreign CSVs require curator confirmation. Duplicate detection flags likely matches. Vocabulary values in imported data are added as custom entries. ZIP re-import of a Patina archive is the high-fidelity path.

**Key design constraints for the architect:**
- Bulk edit must use the existing `updateCoin` IPC + Zod validation pipeline — no raw DB writes.
- List view columns should be sortable (this is the primary collector motivation for the toggle).
- Import is strictly local — no external API enrichment.
- Subset PDF/ZIP requires a `coinIds` parameter on both export handlers.
- Duplicate detection on import is advisory, not blocking — the curator confirms.

---

*If proceeding: activate `/curating-blueprints` and reference this report in Phase 0. Start with Blueprint A.*
