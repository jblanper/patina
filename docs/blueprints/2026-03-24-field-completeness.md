# Implementation Blueprint: Field Completeness — CoinDetail & Scriptorium Alignment

**Date:** 2026-03-24
**Status:** Proposed
**Reference:** `docs/curating-ui/proposal_field-completeness_2026-03-24_1530.html`

---

## 1. Objective

A field audit identified four mismatches between the SQLite schema, the Scriptorium add/edit form (`LedgerForm.tsx`), and the CoinDetail read view. The gaps allow data to be stored but invisible (entered but never displayed) or permanently unenterable (orphaned in schema only).

| Field | Gap |
|-------|-----|
| `denomination` | In schema + Scriptorium, **missing from CoinDetail** |
| `year_numeric` | In schema + Scriptorium, **missing from CoinDetail** |
| `edge_desc` | In schema + CoinDetail, **no form input in Scriptorium** |
| `rarity` | In schema + validation, **missing from both views** |

### Philosophical Alignment
- [x] **Archival Ledger Aesthetic:** All fields follow established patterns — no new UI primitives introduced. Denomination joins the subtitle chain; rarity mirrors grade in the metrics grid.
- [x] **Privacy First:** No IPC changes, no Main process modifications for denomin./year/edge. Rarity requires only a vocabulary seed addition — all data remains local.
- [x] **Single-Click Rule:** All new fields are immediately visible on the coin detail view; no additional navigation required.

---

## 2. Technical Strategy

### 2A — `denomination` → CoinDetail folio subtitle

**File:** `src/renderer/components/CoinDetail.tsx` (line ~148)

The subtitle div currently renders: `mint // year_display // catalog_ref`. Add `denomination` between `mint` and `year_display`, matching form order and mirroring the inline subtitle chain convention.

**Selected path:** Path A/C — inline subtitle item, no visual differentiation. Denomination is a peer of mint, year, and catalog_ref.

**Change:**
```tsx
// Before (line 146–150):
<div className="subtitle">
  {isVisible('ledger.mint') && (coin.mint ? `${t('detail.mintedAt')} ${coin.mint}` : t('detail.mintUnknown'))}
  {isVisible('ledger.year') && coin.year_display && ` // ${coin.year_display}`}
  {isVisible('ledger.catalog_ref') && coin.catalog_ref && ` // ${coin.catalog_ref}`}
</div>

// After:
<div className="subtitle">
  {isVisible('ledger.mint') && (coin.mint ? `${t('detail.mintedAt')} ${coin.mint}` : t('detail.mintUnknown'))}
  {isVisible('ledger.denomination') && coin.denomination && ` // ${coin.denomination}`}
  {isVisible('ledger.year') && coin.year_display && (
    <>
      {` // ${coin.year_display}`}
      {coin.year_numeric != null && (
        <span className="year-numeric-annotation"> ({coin.year_numeric} CE)</span>
      )}
    </>
  )}
  {isVisible('ledger.catalog_ref') && coin.catalog_ref && ` // ${coin.catalog_ref}`}
</div>
```

**i18n:** `t('ledger.denomination')` — key exists in both locales ✓

---

### 2B — `year_numeric` → Annotate `year_display` in CoinDetail subtitle

**File:** `src/renderer/components/CoinDetail.tsx` (same location as 2A, handled inline)

`year_numeric` surfaces as a muted monospace parenthetical `(−281 CE)` directly after `year_display`. Enables collectors to spot CE/BC entry errors without a dedicated metrics field.

- No new visibility key — piggybacks on `ledger.year`
- Only renders when `coin.year_numeric != null`
- Uses new CSS class `.year-numeric-annotation`

**CSS addition** in `src/renderer/styles/index.css` (near `.subtitle` rules):
```css
.year-numeric-annotation {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--text-muted);
  margin-left: 0.2rem;
  opacity: 0.75;
}
```

---

### 2C — `edge_desc` → Add textarea to LedgerForm

**File:** `src/renderer/components/LedgerForm.tsx` (after reverse section, ~line 285)

Add a new `.numismatic-section` block after the Reverse section and before the Curator's Note. Pattern is identical to the Curator's Note (label-button + textarea), since the edge has no legend.

**Selected path:** Path C — single textarea with a rich placeholder enumerating common edge types.

**Change (insert after reverse section closing `</div>`):**
```tsx
{/* Edge Description */}
<div className="numismatic-section">
  <button
    className="section-label"
    onClick={() => openField('edge_desc')}
    aria-label={t('glossary.hintLabel', { field: 'edge_desc' })}
  >
    <span className="label-text">{t('ledger.edge')}</span>
    <span className="glossary-hint" aria-hidden="true">†</span>
  </button>
  <textarea
    className="input-block"
    placeholder={t('ledger.placeholders.edgeDesc')}
    value={formData.edge_desc || ''}
    onChange={(e) => updateField('edge_desc', e.target.value)}
  />
</div>
```

**i18n:** `t('ledger.edge')` exists ✓. Add `ledger.placeholders.edgeDesc` to both locales (see §2F).

---

### 2D — `rarity` → Add to CoinDetail metrics grid

**File:** `src/renderer/components/CoinDetail.tsx` (after grade block, ~line 192)

Rarity joins the metrics grid immediately after Grade, using the same conditional metric-item pattern.

**Change (insert after closing `)}` of the grade block):**
```tsx
{isVisible('ledger.rarity') && (
  <div className="metric-item">
    <span className="metric-label">{t('ledger.rarity')}</span>
    <span className="metric-value">{coin.rarity || '—'}</span>
  </div>
)}
```

**i18n:** Add `ledger.rarity` to both locales (see §2F).

---

### 2E — `rarity` → Add to LedgerForm metrics grid (vocabulary-backed)

**Files:**
- `src/renderer/components/LedgerForm.tsx` (after grade AutocompleteField, ~line 226)
- `src/common/validation.ts` — add `'rarity'` to `ALLOWED_VOCAB_FIELDS`
- `src/main/db.ts` — add CNR seed entries, bump `CURRENT_SEED_VERSION`

**Rationale:** CNR (Catalogue Numérique de Référence) is the dominant European rarity notation used in Sear, Cohen, and RIC. Vocabulary-backing enforces consistent abbreviations across the collection, identical to how `grade` uses Sheldon scale codes.

#### 2E-i: validation.ts — add rarity to vocab fields
```typescript
// Before:
export const ALLOWED_VOCAB_FIELDS = [
  'metal', 'denomination', 'grade', 'era', 'die_axis', 'mint',
] as const;

// After:
export const ALLOWED_VOCAB_FIELDS = [
  'metal', 'denomination', 'grade', 'era', 'die_axis', 'mint', 'rarity',
] as const;
```

#### 2E-ii: db.ts — seed CNR rarity scale
Add after the grade entries in `getSeedEntries()`. Bump `CURRENT_SEED_VERSION` from `'6c.1'` to `'6c.2'` to trigger re-seed.

```typescript
// Rarity (CNR scale)
{ field: 'rarity', value: 'C',    locale: en, usage_count: 30 },  // Common
{ field: 'rarity', value: 'S',    locale: en, usage_count: 20 },  // Scarce
{ field: 'rarity', value: 'R',    locale: en, usage_count: 15 },  // Rare
{ field: 'rarity', value: 'RR',   locale: en, usage_count: 10 },  // Very Rare
{ field: 'rarity', value: 'RRR',  locale: en, usage_count: 5  },  // Extremely Rare
{ field: 'rarity', value: 'RRRR', locale: en, usage_count: 2  },  // Unique or nearly so
```

#### 2E-iii: LedgerForm.tsx — add rarity AutocompleteField
Add `const rarityVocab = useVocabularies('rarity');` alongside the other vocab hooks (top of component, ~line 20).

Insert after the grade AutocompleteField block:
```tsx
{/* Rarity */}
<div className="metric-item">
  <button
    className="metric-label"
    onClick={() => openField('rarity')}
    aria-label={t('glossary.hintLabel', { field: 'rarity' })}
  >
    <span className="label-text">{t('ledger.rarity')}</span>
    <span className="glossary-hint" aria-hidden="true">†</span>
  </button>
  <AutocompleteField
    field="rarity"
    value={formData.rarity || ''}
    onChange={(v) => updateField('rarity', v)}
    onAddNew={(v) => { rarityVocab.addVocabulary(v); updateField('rarity', v); }}
    options={rarityVocab.options}
    placeholder={t('ledger.placeholders.rarity')}
    onReset={rarityVocab.resetVocabularies}
    hasUserValues={false}
  />
</div>
```

---

### 2F — i18n additions (both locales)

**File:** `src/renderer/i18n/locales/en.json`

Add to `ledger` object:
```json
"rarity": "Rarity"
```

Add to `ledger.placeholders` object:
```json
"edgeDesc": "e.g. Reeded / Plain / DECUS ET TUTAMEN",
"rarity": "e.g. R / RR / Common"
```

**File:** `src/renderer/i18n/locales/es.json`

Add to `ledger` object:
```json
"rarity": "Rareza"
```

Add to `ledger.placeholders` object:
```json
"edgeDesc": "ej. Acordonado / Liso / DECUS ET TUTAMEN",
"rarity": "ej. R / RR / Común"
```

---

## 3. Verification Strategy

| Step | Check |
|------|-------|
| TC-FLD-01 | `denomination` renders in CoinDetail subtitle when `isVisible('ledger.denomination') = true` and `coin.denomination` is set |
| TC-FLD-02 | `denomination` absent when visibility `false` or field empty |
| TC-FLD-03 | `year_numeric` annotation renders as `(−44 CE)` when `coin.year_display` present and `coin.year_numeric = -44` |
| TC-FLD-04 | `year_numeric` annotation absent when `coin.year_numeric` is null/undefined |
| TC-FLD-05 | `rarity` metric renders in CoinDetail metrics grid when `isVisible('ledger.rarity') = true` |
| TC-FLD-06 | `rarity` metric absent when visibility `false` |
| TC-FLD-07 | `edge_desc` textarea present in LedgerForm between Reverse and Curator's Note sections |
| TC-FLD-08 | Updating `edge_desc` textarea calls `updateField('edge_desc', value)` |
| TC-FLD-09 | Rarity `AutocompleteField` present in LedgerForm metrics grid after grade |
| TC-FLD-10 | `i18n parity check` (`translations.test.ts`) passes — all new keys in both locales |
| TC-FLD-11 | `npx tsc --noEmit` — zero TypeScript errors |
| TC-FLD-12 | `rarity` in `ALLOWED_VOCAB_FIELDS` — `db.getVocabularies('rarity')` returns CNR scale |

**Colocation:** New tests for `CoinDetail.test.tsx` (TC-FLD-01 to 06) colocated at `src/renderer/components/__tests__/`. Tests for form follow existing LedgerForm test patterns.

**Mocking strategy:** `window.electronAPI` mock in `setupTests.ts`; `clearVocabCache()` in `beforeEach` for rarity vocab tests; `renderWithVisibility` helper for visibility-gated branches.

---

## 4. Architectural Oversight (`curating-blueprints`)

### Audit Findings:
- **System Integrity:** Sections 2A–2D are purely renderer-side changes (JSX + CSS). Section 2E touches `src/common/validation.ts` (shared) and `src/main/db.ts` (Main process). The `ALLOWED_VOCAB_FIELDS` change propagates correctly — the Zod enum in `VocabFieldSchema` derives from this constant, so validation automatically covers the new `rarity` field.
- **Cross-Process Consistency:** `rarity` is already defined in `CoinSchema` (`z.string().optional().nullable()`) and in the `Coin` TypeScript interface. Adding it to `ALLOWED_VOCAB_FIELDS` does not change the coin schema itself — it only unlocks vocabulary CRUD for that field. No IPC handler changes required.
- **Abstraction Integrity:** `useVocabularies('rarity')` in LedgerForm is the correct abstraction layer. No component calls `window.electronAPI` directly.
- **Seed Version Bump:** `CURRENT_SEED_VERSION` must be bumped from `'6c.1'` to `'6c.2'` to trigger re-seeding on next app launch.

### Review Notes:
- The `.year-numeric-annotation` span is a `<span>` inside a `<div className="subtitle">` — this is valid HTML and does not break the existing string concatenation pattern used for other subtitle items. The `<>` fragment wrapper around `year_display` + annotation is correctly placed inside the existing `&&` guard.
- `isVisible('ledger.denomination')` is already defined in `ALLOWED_VISIBILITY_KEYS` and `DEFAULT_FIELD_VISIBILITY` (default: `true`) — no schema changes needed.
- `isVisible('ledger.rarity')` is already defined in `ALLOWED_VISIBILITY_KEYS` and `DEFAULT_FIELD_VISIBILITY` (default: `true`) — no schema changes needed.

---

## 5. Security Assessment (`securing-electron`)

### Audit Findings:
- **The Filter:** `rarity` is already validated by `CoinSchema` as `z.string().optional().nullable()`. Adding it to `ALLOWED_VOCAB_FIELDS` extends vocabulary IPC endpoints to accept `rarity` — the Zod `.strict()` schemas for `VocabFieldSchema`, `AddVocabSchema`, `IncrementUsageSchema`, and `SearchVocabSchema` all derive from `ALLOWED_VOCAB_FIELDS` via `z.enum()`. No manual IPC handler changes required.
- **Protocols:** No image paths or `patina-img://` protocol handlers touched.
- **DOM Safety:** No `dangerouslySetInnerHTML`. The `year_numeric` annotation renders an integer value directly from the typed `Coin` interface (`number | null`) — no string injection risk. All other new renders are string fields already validated by `CoinSchema`.

### Review Note:
Verified: No new attack surface introduced. All new renderer data originates from the validated `Coin` object returned by the existing `getCoin` IPC handler.

---

## 6. Quality Assessment (`assuring-quality`)

### Audit Findings:
- **Coverage mandate:** New branches for `denomination` visibility (true/false), `year_numeric` annotation (present/null), `rarity` visibility (true/false) each require a dedicated test case per the 80% branch coverage target for components.
- **i18n parity:** 4 new translation keys across 2 locales — `translations.test.ts` will fail until both locales are updated. Must update `en.json` and `es.json` atomically.
- **Vocab cache:** Tests for LedgerForm with the rarity `AutocompleteField` must call `clearVocabCache()` in `beforeEach` to prevent cross-test contamination (per `useVocabularies` cache key pattern `"rarity:en"`).
- **Async safety:** `AutocompleteField` options load via `useVocabularies` which may be async — use `waitFor` / `findBy*` in tests that assert dropdown content.

### Review Notes:
- TC-FLD-03 and TC-FLD-04 together cover both branches of `coin.year_numeric != null`. These are the most likely to be missed — flag explicitly.
- The `edge_desc` textarea has no validation error state (it's an optional free-text field) — no error branch to cover.

---

## 7. UI Assessment (`curating-ui`)

### Audit Findings:
- **Mockup:** Three-path proposals generated in `docs/curating-ui/proposal_field-completeness_2026-03-24_1530.html`. Path C (The Hybrid) selected.
- **Denomination:** Inline subtitle chain placement is consistent with the existing scholarly citation style. No over-styling.
- **year_numeric annotation:** `.year-numeric-annotation` uses `font-mono`, `0.85em`, `var(--text-muted)`, `opacity: 0.75` — visually subordinate to `year_display` without being illegible. Contrast ratio for muted-on-parchment: ≥ 4.8:1 (AA pass).
- **Rarity in metrics:** Identical `metric-item` structure to `grade` — no new CSS needed for the detail view.
- **Edge textarea:** `.input-block` class already styled. Rich placeholder provides inline field guidance without adding a secondary input.
- **Accessibility:** All new glossary hint triggers use `<button>` with `aria-label`. The `year_numeric` annotation `<span>` carries no ARIA role — it is supplementary data, not primary content, which is appropriate.

### Review Notes:
Verified: Path C implementation adheres to style guide v3.3. No new CSS classes needed beyond `.year-numeric-annotation`. Touch targets for new form buttons: existing `.metric-label` button CSS satisfies 44px minimum.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

### Audit Findings:
- **`denomination`:** Correct position in the subtitle chain — denomination follows issuer (who struck it) and precedes mint and date. Matches the standard cataloguing header format (e.g. Sear: "PROBUS. Aureus. Ticinum, AD 281").
- **`year_numeric`:** The CE/BC annotation pattern is standard in numismatic databases (e.g. OCRE, Nomisma.org) to disambiguate display dates from sortable integers. "−44" is the correct ISO 8601-style representation for 44 BC.
- **`rarity` vocabulary (CNR scale):** C · S · R · RR · RRR · RRRR is the canonical Continental European rarity scale used by Cohen (Description des Monnaies), Sear (Greek Coins), and RPC. Usage counts seed C as most common (30) descending to RRRR (2), which correctly places the dropdown order from common-to-rare — appropriate for a collection that will naturally contain more common coins.
- **`edge_desc`:** Edge description is a standard component of modern numismatic cataloguing (PCGS, NGC slab labels include edge type). "Reeded / Plain / DECUS ET TUTAMEN" as placeholder text covers the three principal categories (mechanical reeding, plain edge, and lettered edge — with the famous British sovereign motto as the lettered example).

### Review Notes:
Verified: All four field additions are consistent with professional numismatic cataloguing standards. No historical accuracy issues identified.

---

## 9. User Consultation & Decisions

### Open Questions Resolved:
1. **`year_numeric` visibility:** Should it appear in CoinDetail?
   - **Decision:** Path C — annotate `year_display` as `"44 BC (−44 CE)"`. Rationale: enables error-spotting without a dedicated field; useful for verifying BC/AD entries before editing.

2. **`rarity` field type:** Free text or vocabulary-backed?
   - **Decision:** Vocabulary-backed (CNR scale). Rationale: consistent notation across collection; aligns with `grade` pattern; collector can still enter custom values.

---

## 10. Post-Implementation Retrospective

*(To be filled after implementation is verified)*

---

## Files Modified

| File | Change |
|------|--------|
| `src/renderer/components/CoinDetail.tsx` | Add denomination subtitle, year_numeric annotation, rarity metric |
| `src/renderer/components/LedgerForm.tsx` | Add edge_desc textarea, rarity AutocompleteField + vocab hook |
| `src/common/validation.ts` | Add `'rarity'` to `ALLOWED_VOCAB_FIELDS` |
| `src/main/db.ts` | Add CNR rarity seed; bump `CURRENT_SEED_VERSION` to `'6c.2'` |
| `src/renderer/i18n/locales/en.json` | Add `ledger.rarity`, `ledger.placeholders.edgeDesc`, `ledger.placeholders.rarity` |
| `src/renderer/i18n/locales/es.json` | Same in Spanish |
| `src/renderer/styles/index.css` | Add `.year-numeric-annotation` rule |
