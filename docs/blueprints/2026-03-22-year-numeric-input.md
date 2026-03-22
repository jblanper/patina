# Implementation Blueprint: Year Numeric Input & Era Glossary Correction

**Date:** 2026-03-22
**Status:** Verification

---

## 1. Objective

`year_numeric` is defined in the schema, used for sorting and filtering, but is never surfaced to the user in the Scriptorium form. Any coin added through the UI has `year_numeric = NULL`, making the default sort-by-year meaningless for the curator's own collection.

This blueprint:
1. Adds a signed integer input for `year_numeric` in the **metrics grid** of `LedgerForm` (as "Year CE"), positioned as a technical attribute alongside weight and diameter.
2. Relabels `year_display` from "Year" to **"Date"** — the standard cataloguing term — to clearly distinguish the two fields.
3. Corrects a conceptual inconsistency in `glossaryFields.ts`, where `era` is described as a calendrical system (AD/BC/AH) when the actual seeded vocabulary — and the field's practical role in filtering — defines it as a historical period classifier (Roman Imperial, Medieval, etc.).

No schema changes. No new IPC handlers. No migration.

### Design Rationale

`year_display` is a cataloguing field ("134 AD", "c. 119–122 AD", "AH 76") — it belongs in the subtitle header with era, mint, issuer, denomination, and reference.

`year_numeric` is a technical attribute — a single CE/BCE integer for machine sorting — exactly like weight and diameter. It belongs in the metrics grid. Placing it there separates it naturally from `year_display` without any disambiguation suffixes, and keeps the subtitle stack at its current 6 items.

### Philosophical Alignment
- [x] **Single-Click Rule:** The new field is in the metrics grid, already visible on the form — zero navigation cost.
- [x] **Numismatic Accuracy:** "Date" is the standard cataloguing label for a coin's display date. "Year CE" is precise and unambiguous for the numeric sort value.
- [x] **Archival Ledger Aesthetic:** `year_numeric` uses the same `metric-label` + `input-metric` pattern as weight and diameter. No new visual language introduced.

---

## 2. Technical Strategy

### Scope

| File | Change |
|---|---|
| `src/renderer/components/LedgerForm.tsx` | Relabel `year_display` via i18n; add `year_numeric` as last item in metrics grid |
| `src/renderer/i18n/locales/en.json` | Change value of `ledger.year` → `"Date"`; add `ledger.yearCe` and `ledger.placeholders.yearCe` |
| `src/renderer/i18n/locales/es.json` | Change value of `ledger.year` → `"Fecha"`; add `ledger.yearCe` and `ledger.placeholders.yearCe` |
| `src/renderer/data/glossaryFields.ts` | Correct the `era` field description to reflect its actual role |

No changes to `src/common/`, `src/main/`, `src/renderer/hooks/`, or any test fixtures beyond the component test for `LedgerForm`.

---

### Step 1 — i18n: Update and add keys

**`src/renderer/i18n/locales/en.json`**

Change the value of `ledger.year` (used in `LedgerForm` and as the Glossary `nameKey` for `year_display`):
```json
"year": "Date",
```

Add `yearCe` to the `ledger` label block (after `"year": "Date"`):
```json
"yearCe": "Year CE",
```

Add `yearCe` to `ledger.placeholders` (after `"year": "e.g. 440 BC"`):
```json
"yearCe": "e.g. −44 or 134",
```

**`src/renderer/i18n/locales/es.json`**

Change the value of `ledger.year`:
```json
"year": "Fecha",
```

Add `yearCe` to the `ledger` label block:
```json
"yearCe": "Año EC",
```

Add `yearCe` to `ledger.placeholders`:
```json
"yearCe": "ej. −44 o 134",
```

> **Note:** `glossary.fields.yearNumeric` already exists in both locale files and is used by the Glossary drawer when `openField('year_numeric')` is called. The new `ledger.yearCe` is the compact form label only. No key collision.

> **Note:** `ledger.year` is used in two places: `LedgerForm.tsx:78` (the form label) and `glossaryFields.ts:191` (the `nameKey` for the `year_display` Glossary entry). Changing the value updates both correctly — the Glossary page will show "Date" as the field name, which is accurate.

---

### Step 2 — `LedgerForm.tsx`: Relabel `year_display` and add `year_numeric` to metrics grid

#### 2a. No structural change to `year_display` subtitle item

The `year_display` input at `LedgerForm.tsx:76-88` requires no code change — the label relabel is handled entirely by the i18n value change in Step 1.

#### 2b. Add `year_numeric` as last item in the metrics grid

Append a new `metric-item` at the end of the `<div className="metrics-grid">` block (after the closing `</div>` of the grade item, before the closing `</div>` of the grid, at `LedgerForm.tsx:226`):

```tsx
<div className="metric-item">
  <button
    className="metric-label"
    onClick={() => openField('year_numeric')}
    aria-label={t('glossary.hintLabel', { field: 'year_numeric' })}
  >
    <span className="label-text">{t('ledger.yearCe')}</span>
    <span className="glossary-hint" aria-hidden="true">†</span>
  </button>
  <input
    type="number"
    className="input-metric"
    placeholder={t('ledger.placeholders.yearCe')}
    value={formData.year_numeric ?? ''}
    onChange={(e) => {
      const raw = e.target.value;
      const parsed = parseInt(raw, 10);
      updateField('year_numeric', raw === '' || isNaN(parsed) ? null : parsed);
    }}
  />
</div>
```

**Why `parseInt` with `isNaN` guard, not `Number(raw)`:** `Number('')` returns `0`, silently storing 0 instead of NULL. The `isNaN` guard also defends against browser-dependent partial inputs (e.g. a lone `-`) that may not be normalised to `''` in all Electron versions.

**Why `value={formData.year_numeric ?? ''}`:** A controlled input requires a string or number. `?? ''` handles both `null` and `undefined` cleanly. **Do not change this to `|| ''`** — year 0 is a valid astronomical representation of 1 BC and must render as `0`, not empty. The `weight` and `diameter` inputs use `|| ''` only because zero values are physically impossible for those fields; year 0 is not.

---

### Step 3 — `glossaryFields.ts`: Correct the `era` description

The `era` entry currently describes the field as "The calendrical or historical era system used for dating this coin. Determines how `year_display` and `year_numeric` should be interpreted." and lists `AD`, `BC`, `AH`, `Byzantine`, `Regnal`, `Undated` as its vocabulary.

This is incorrect. The actual seeded vocabulary and the field's role in the UI is a **historical period classifier** (Roman Imperial, Medieval, Islamic, Modern, etc.). The calendrical sign convention for `year_numeric` (negative = BC) is a fixed rule documented on the `year_numeric` field itself — it does not vary by `era` value.

Replace the `era` entry's `description` and `vocabulary` blocks:

```typescript
description: {
  en: 'The broad historical or cultural period to which this coin belongs. Used for browsing and filtering the collection. Choose from the standard vocabulary or enter a custom period name. This field does not encode the calendar system — see Year CE for date entry conventions.',
  es: 'El período histórico o cultural amplio al que pertenece esta moneda. Se utiliza para navegar y filtrar la colección. Elige del vocabulario estándar o introduce un nombre de período personalizado. Este campo no codifica el sistema de calendario — consulta Año EC para las convenciones de entrada de fechas.',
},
vocabulary: {
  en: {
    columns: ['Value', 'Typical date range'],
    rows: [
      ['Ancient',           'Before c. 500 AD (general use when a more specific period is unknown)'],
      ['Roman Republic',    'c. 509–27 BC'],
      ['Roman Imperial',    'c. 27 BC–476 AD'],
      ['Roman Provincial',  'c. 27 BC–296 AD (civic issues under Roman authority)'],
      ['Byzantine',         'c. 330–1453 AD'],
      ['Islamic',           'c. 622 AD onwards (AH calendar — convert year to CE before entering Year CE)'],
      ['Early Medieval',    'c. 500–1000 AD'],
      ['High Medieval',     'c. 1000–1300 AD'],
      ['Late Medieval',     'c. 1300–1500 AD'],
      ['Medieval',          'c. 500–1500 AD (use when sub-period is unknown)'],
      ['Modern',            'c. 1500 AD onwards'],
    ],
  },
  es: {
    columns: ['Valor', 'Rango de fechas típico'],
    rows: [
      ['Antiguo',              'Antes de c. 500 d. C. (uso general cuando no se conoce un período más específico)'],
      ['República Romana',     'c. 509–27 a. C.'],
      ['Imperio Romano',       'c. 27 a. C.–476 d. C.'],
      ['Provincial Romano',    'c. 27 a. C.–296 d. C. (emisiones cívicas bajo autoridad romana)'],
      ['Bizantino',            'c. 330–1453 d. C.'],
      ['Islámico',             'c. 622 d. C. en adelante (calendario AH — convertir el año a EC antes de introducir Año EC)'],
      ['Alta Edad Media',      'c. 500–1000 d. C.'],
      ['Plena Edad Media',     'c. 1000–1300 d. C.'],
      ['Baja Edad Media',      'c. 1300–1500 d. C.'],
      ['Medieval',             'c. 500–1500 d. C. (usar cuando no se conoce el subperíodo)'],
      ['Moderno',              'c. 1500 d. C. en adelante'],
    ],
  },
},
```

---

## 3. Verification Strategy

### Testing Plan

**File: `src/renderer/components/__tests__/LedgerForm.test.tsx`** — extend existing suite:

- `renders year CE input in metrics grid` — assert an input with placeholder matching `ledger.placeholders.yearCe` is present.
- `year CE input calls updateField with integer on change` — simulate typing `134`, assert `updateField('year_numeric', 134)` called.
- `year CE input calls updateField with negative integer` — simulate typing `-44`, assert `updateField('year_numeric', -44)` called.
- `year CE input calls updateField with null when cleared` — simulate clearing the input (`''`), assert `updateField('year_numeric', null)` called.
- `year CE input is empty when formData.year_numeric is null` — render with `year_numeric: null`, assert input value is `''`.
- `year CE input is empty when formData.year_numeric is undefined` — render with `year_numeric` omitted from formData, assert input value is `''`. Validates `?? ''` handles both `null` and `undefined`.
- `year CE glossary hint button calls openField('year_numeric')` — simulate click on `†` button, assert `openField` called with `'year_numeric'`.

### Colocation Check
- `LedgerForm.test.tsx` → `src/renderer/components/__tests__/LedgerForm.test.tsx` ✓

### Mocking Strategy
- `window.electronAPI` global mock from `setupTests.ts` — clear in `beforeEach`.
- `useGlossaryContext` mock: provide `openField: vi.fn()` — same pattern as existing `LedgerForm` tests.
- `useVocabularies` mock: return `{ options: [], addVocabulary: vi.fn(), resetVocabularies: vi.fn() }` — unchanged from existing tests.

### i18n Parity
The `translations.test.ts` bidirectional key-parity test will enforce that `ledger.yearCe` and `ledger.placeholders.yearCe` are present in both locale files. No manual check needed.

---

## 4. Architectural Oversight
**Status:** Verified

### Audit Findings
- **Process boundary:** No new IPC handler needed. `year_numeric` is already part of `NewCoin` / `NewCoinSchema`. The existing `updateCoin` and `addCoin` handlers pass the full `NewCoin` object — the field will be included automatically.
- **Zod validation:** `NewCoinSchema` already defines `year_numeric: z.number().int().optional().nullable()`. No schema change required.
- **Null handling:** The `?? ''` controlled input pattern and `raw === '' || isNaN(parsed)` double guard ensure no `NaN` or `undefined` reaches the IPC layer.
- **No abstraction needed:** The `onChange` handler is three lines. Extracting it would be premature.

### Review Notes
- **`?? ''` vs `|| ''` — this difference is intentional and must not be normalised.** `weight` and `diameter` use `|| ''` safely because 0 is physically impossible for those fields. Year 0 is valid astronomical notation for 1 BC. Using `|| ''` would silently erase it.

---

## 5. Security Assessment
**Status:** Verified — No issues identified.

- **The Filter:** `year_numeric` is already validated as `z.number().int().optional().nullable()` in `NewCoinSchema`. A non-integer value passed from the renderer will be rejected at the Main process boundary.
- **Input surface:** `type="number"` inputs restrict browser-side entry to numeric characters. Combined with the `parseInt` + `isNaN` double guard, no string payload can reach the DB as `year_numeric`.
- **No new IPC surface.**

---

## 6. Quality Assessment
**Status:** Verified with 2 additions incorporated.

- **Coverage:** The 7 new tests in §3 cover all branches of the `onChange` handler (integer, negative integer, empty/null, undefined initial state) and the glossary-hint branch. 80% statement mandate met.
- **No regression:** `year_display` input structure is unchanged; only its i18n label value changes. Existing `LedgerForm` tests asserting on placeholders and field behaviour are unaffected.
- **i18n parity:** The bidirectional `translations.test.ts` will enforce `ledger.yearCe` and `ledger.placeholders.yearCe` are present in both locales.

### Review Notes
- Added `isNaN(parsed)` guard to `onChange` handler: defends against partial-input edge cases that may not be normalised to `''` in all Electron versions.
- Added `undefined` initial state test: `NewCoin.year_numeric` is optional; `?? ''` handles `undefined` and `null` — both cases are tested.

---

## 7. UI Assessment
**Status:** Verified

- **Placement:** Metrics grid as the last of 7 items. The metrics grid uses `repeat(3, 1fr)` — 7 items produce 2 full rows + 1 item in a third row. On desktop Electron, this lone item occupies the left-most cell of row 3, left-aligned and consistent in width with all other metric cells. This is acceptable for a desktop-only application.
- **Input type:** `type="number"` is consistent with `weight` and `diameter`. Allows negative values natively.
- **Touch targets:** `input-metric` class meets the 44px minimum.
- **No new CSS required.** `metric-label` and `input-metric` are reused verbatim.
- **Subtitle stack unchanged:** Stays at 6 items (era, mint, year_display, issuer, denomination, catalog_ref). No density concern.

### Review Notes
- **Metrics grid orphan (7th item):** Row 3 has a single cell. This is the correct trade-off — placing `year_numeric` in the subtitle stack would require disambiguation labels, which is worse UX than a lone metric cell. The orphan is preferable to label confusion.
- **Label pair resolved:** `year_display` is labelled "Date" (catalog entry), `year_numeric` is labelled "Year CE" (technical sort integer). The two fields are now in different sections and carry unambiguous labels — the original confusion is fully eliminated.

---

## 8. Numismatic & UX Assessment
**Status:** Verified with 1 future note.

- **Sign convention** (negative = BC, positive = AD) is documented in two places: the `year_numeric` glossary entry (already correct) and the corrected `era` vocabulary table (Islamic row notes the AH → CE conversion requirement).
- **Sorting:** Once `year_numeric` is populated, the default Cabinet sort (oldest first, nulls last) will correctly order the curator's own coins. This closes a silent gap where the sort appeared to work in seed data but did nothing for user-entered coins.
- **"Date" is standard numismatic terminology** for the display date field. PCGS, NGC, and major auction catalogues all use "Date" for the human-readable dating string.
- **Era vocabulary table:** The date ranges are approximate and consistent with Numista, PCGS, and NGC period classifications. They serve as a reference guide, not a hard constraint.

### Review Notes
- **Year 0 (future note, out of scope):** In astronomical year numbering, year 0 = 1 BC. The field stores whatever integer the curator enters — this works in practice — but a future enhancement could add a note to the `year_numeric` glossary description: "There is no year 0 in historical reckoning; 1 BC = year_numeric −1."

---

## 9. User Consultation & Decisions

### Final Decisions
- **Decision 1 — No calendar field.** `era` remains a historical period classifier. The sign of `year_numeric` (negative = BC/BCE) is the sole encoding of calendar direction.
- **Decision 2 — Glossary correction over vocabulary change.** The seeded era vocabulary is correct and stays unchanged. Only the glossary description is corrected.
- **Decision 3 — `type="number"` input.** Consistent with `weight` and `diameter`. Allows negative values natively.
- **Decision 4 — NULL on empty, not 0.** An absent date is semantically different from year 0. `year_numeric = NULL` is the correct representation for "not recorded".
- **Decision 5 — `year_numeric` goes in the metrics grid, not the subtitle stack.** `year_display` is a cataloguing field; `year_numeric` is a technical attribute. Placing them in different sections eliminates label disambiguation entirely. `year_display` is relabelled "Date"; `year_numeric` is labelled "Year CE". The 7th-item orphan in the metrics grid is an acceptable trade-off on desktop Electron.

---

## 10. Post-Implementation Retrospective
**Date:** —
**Outcome:** —

### Summary of Work
- (To be completed after implementation)

### Pain Points
- (To be completed after implementation)
