# Implementation Blueprint: Phase 6 - Internationalization (Spanish/English)

**Date:** 2026-03-19
**Status:** Approved
**Reference:** `docs/technical_plan.md`

## 1. Objective

Implement a complete i18n system allowing users to switch between English and Spanish. All UI text, labels, placeholders, and messages must be translated while maintaining the archival aesthetic.

### Philosophical Alignment
- [ ] **Archival Ledger Aesthetic:** Translations must preserve the museum-quality typography. Spanish accents must render correctly (á, é, í, ó, ú, ñ, ¿, ¡).
- [ ] **Privacy First:** All translations stored locally - no external translation APIs or telemetry.
- [ ] **Single-Click Rule:** Language switch accessible within one click from the sidebar or header.

---

## 2. Technical Strategy

### A. Architecture

**Library:** `react-i18next` (lightweight, no external CDN dependencies)
**Structure:**
```
src/
├── renderer/
│   ├── i18n/
│   │   ├── index.ts           # i18next configuration
│   │   ├── locales/
│   │   │   ├── en.json        # English translations
│   │   │   └── es.json        # Spanish translations
│   │   └── useTranslation.ts  # Custom hook with type safety
```

### B. Translation Namespace Design

**Namespace: `common`** (shared across app)
```json
{
  "app": {
    "title": "Patina",
    "tagline": "A Curator's Digital Cabinet"
  },
  "nav": {
    "cabinet": "Cabinet",
    "addCoin": "Add Entry",
    "settings": "Settings"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "export": "Export",
    "import": "Import"
  }
}
```

**Namespace: `ledger`** (coin record UI)
```json
{
  "fields": {
    "title": "Designation",
    "issuer": "Issuer",
    "denomination": "Denomination",
    "year": "Year",
    "era": "Era",
    "mint": "Mint",
    "metal": "Material",
    "weight": "Weight",
    "diameter": "Diameter",
    "die_axis": "Die Axis",
    "grade": "Grade",
    "obverse": "Obverse",
    "reverse": "Reverse",
    "edge": "Edge",
    "legend": "Legend",
    "description": "Description",
    "catalog_ref": "Catalog Reference",
    "provenance": "Provenance",
    "story": "Curator's Note",
    "acquisition": "Acquisition"
  },
  "placeholders": {
    "title": "Designation of the coin...",
    "mint": "City / Mint",
    "year": "e.g. 440 BC"
  }
}
```

**Namespace: `cabinet`** (gallery UI)
```json
{
  "filters": {
    "era": "Era",
    "metal": "Material",
    "search": "Search the collection..."
  },
  "empty": {
    "title": "The Cabinet Awaits",
    "subtitle": "Your collection is ready to be curated"
  }
}
```

### C. UI Components

**LanguageSelector:**
- Compact dropdown in sidebar or header
- Options: "English" / "Español"
- Persists selection to `preferences` table
- Triggers full re-render on change

**TranslatableText Component:**
```typescript
interface TranslatableTextProps {
  ns: string;      // namespace
  i18nKey: string; // translation key
  values?: object; // interpolation values
}

// Usage: <TranslatableText ns="ledger" i18nKey="fields.title" />
```

### D. Database Changes

**Preferences Table (for language setting):**
```typescript
// Already defined in Phase 6A blueprint
// key: 'language', value: 'en' | 'es'
```

### E. Implementation Steps

1. **Install Dependencies**
   - `npm install react-i18next i18next`

2. **Create Translation Files**
   - `src/renderer/i18n/locales/en.json`
   - `src/renderer/i18n/locales/es.json`
   - Copy existing English strings as base
   - Translate all strings to Spanish

3. **Configure i18next**
   - `src/renderer/i18n/index.ts`
   - Load language from preferences on startup
   - Enable `react` integration

4. **Create LanguageSelector Component**
   - `src/renderer/components/LanguageSelector.tsx`
   - Add to PatinaSidebar or app header

5. **Update Existing Components**
   - Replace all hardcoded strings with `<TranslatableText>` or `t()` hook
   - Priority: Start with `LedgerForm.tsx`, then `CoinDetail.tsx`, then others

6. **Integration with usePreferences Hook**
   - Load language preference on app init
   - Update preference when user switches language

### F. Translated String Examples

| Key | English | Spanish |
|-----|---------|---------|
| `nav.cabinet` | Cabinet | Gabinete |
| `nav.addCoin` | Add Entry | Nueva Entrada |
| `fields.title` | Designation | Denominación |
| `fields.obverse` | Obverse | **Anverso** |
| `fields.reverse` | Reverse | **Reverso** |
| `fields.edge` | Edge | **Bordura** |
| `fields.metal` | Material | Aleación |
| `fields.weight` | Weight | Peso |
| `fields.era.ancient` | Ancient | Antiguo |
| `fields.era.medieval` | Medieval | Medieval |
| `fields.era.modern` | Modern | Moderno |
| `empty.title` | The Cabinet Awaits | El Gabinete Espera |
| `actions.save` | Index to Ledger | Indexar al Registro |

> **Note:** Catalog references (RIC, RPC, Crawford, BMC) remain in original language per international numismatic standards.

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan
- **Component Tests:**
  - `LanguageSelector.test.tsx`: Toggle functionality, preference persistence
  - `TranslatableText.test.tsx`: Key resolution, interpolation
- **Integration Tests:**
  - Full language switch cycle
  - Verify all pages render in Spanish

### Colocation Check
- `src/renderer/components/LanguageSelector.test.tsx` next to `LanguageSelector.tsx`
- Translation files in `src/renderer/i18n/locales/`

### Mocking Strategy
- Mock `window.electronAPI` for preference read/write
- Mock i18next for component tests

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Pending

### Audit Findings:
- **System Integrity:** All translation keys must be defined in TypeScript interfaces
- **Abstraction:** `useTranslation` hook encapsulates i18n logic
- **Extensibility:** Easy to add more languages later (fr, de, it)

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 5. Security Assessment (`securing-electron`)
**Status:** Pending

### Audit Findings:
- **No Security Concerns:** Translation files are static JSON, no user input processing
- **CSP Compatible:** No dynamic content loading

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending

### Audit Findings:
- **Coverage:** 80% statement coverage for new components
- **Translation Completeness:** All hardcoded strings must be replaced

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending

### Audit Findings:
- **Typography:** Verify Spanish accents render correctly with Cormorant Garamond/Montserrat
- **Layout:** "Español" label should fit existing UI without breaking layout

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Issues Found

### Audit Findings:

#### 1. Spanish Numismatic Terminology - INCOMPLETE
The blueprint defines basic era translations but omits critical numismatic vocabulary:

| Key | English | Blueprint Spanish | Standard Spanish | Status |
|-----|---------|-------------------|------------------|--------|
| `fields.obverse` | Obverse | (missing) | **Anverso** | ❌ Missing |
| `fields.reverse` | Reverse | (missing) | **Reverso** | ❌ Missing |
| `fields.edge` | Edge | (missing) | **Bordura** | ❌ Missing |
| `fields.metal` | Material | Material | **Aleación** | ⚠️ Generic |

**Standard References:** Per numismatic convention (Glossary §1), the standard Spanish terms are:
- **Anverso** - The "heads" side showing the ruler's portrait or primary deity
- **Reverso** - The "tails" side showing deity, personification, or historical scene
- **Bordura** - The outer rim/edge of the coin
- **Aleación** - Alloy composition (preferred over generic "Material")

#### 2. Era Translations - VERIFIED ✓
| Key | English | Spanish | Status |
|-----|---------|---------|--------|
| `fields.era.ancient` | Ancient | Antiguo | ✓ Verified |
| `fields.era.medieval` | Medieval | Medieval | ✓ Verified |
| `fields.era.modern` | Modern | Moderno | ✓ Verified |

#### 3. Catalog References - VERIFIED ✓
Per `catalog_standards.md` §1-2, catalog abbreviations (RIC, RPC, Crawford, BMC, DOC, Sear, SNG) remain in original language as international standards. **Decision is correct.**

### Review Notes & Suggestions:

**Action Items (Required):**
1. [ ] Add `"fields.obverse": "Anverso"` to `es.json` ledger namespace
2. [ ] Add `"fields.reverse": "Reverso"` to `es.json` ledger namespace  
3. [ ] Add `"fields.edge": "Bordura"` to `es.json` ledger namespace
4. [ ] Consider `"fields.metal": "Aleación"` for numismatic precision (or document why "Material" is preferred for user comprehension)
5. [ ] Add legend for "Anverso/Reverso" field labels in UI to explain obverse/reverse concepts to novice collectors

**UX Consideration:**
- The Cabinet (Gabinete) maintains the archival aesthetic in both languages
- Ensure "Anverso" and "Reverso" labels render correctly with Cormorant Garamond typography

---

## 9. User Consultation & Decisions
### Open Questions:
1. Should the language switch be immediate or require app restart? → **IMMEDIATE**
2. Should vocabulary autocomplete values also be translated? → Yes, add translations
3. Should date formats follow locale (MM/DD/YYYY vs DD/MM/YYYY)? → Yes, ES uses DD/MM/YYYY

### Final Decisions:
- **Language Switch:** Immediate (no restart required)
- **Numismatic Translations Required:**
  - Anverso (Obverse), Reverso (Reverse), Bordura (Edge)
  - Aleación (for Alloy/Metal instead of generic "Material")
- **Catalog References:** RIC, RPC, BMC remain in original language

### Note: Nomisma.org as Vocabulary Translation Source

Phase 6a seed data was hand-curated and covers English-only vocabulary values. For Phase 6b, **Nomisma.org** (American Numismatic Society) is a natural fit for translating vocabulary entries:

- CC-BY licensed Linked Open Data with labels in 40+ languages including Spanish
- Covers metals (`av`→Gold/Oro, `ar`→Silver/Plata), denominations, mints, and periods
- Fetch once at build/seed time via their `getLabel` API or SPARQL endpoint — no runtime calls
- Results stored in the existing `vocabularies` table using the reserved `locale` column (e.g. `locale = 'es'`)
- The `UNIQUE(field, value, locale)` constraint in the schema was designed for exactly this

**Fields NOT covered by Nomisma** (grades, die axis) would fall back to untranslated English values, which is acceptable — these are international standards (EF-40, 6h) with no conventional Spanish equivalent.

**Implementation sketch:**
1. Add a `scripts/fetch_nomisma_vocab.ts` build-time script
2. Query Nomisma SPARQL for `skos:prefLabel` where `xml:lang = 'es'`
3. `INSERT OR IGNORE INTO vocabularies (field, value, locale, is_builtin, usage_count)` for each result
4. Bump `CURRENT_SEED_VERSION` to `'6b.1'` to trigger re-seed on next launch

---

## 10. Post-Implementation Retrospective
**Date:** Pending
**Outcome:** TBD

### Summary of Work
- [Pending implementation]

### Pain Points
- [Pending implementation]

### Things to Consider
- [Future: Add French, German, Italian translations]
- [Future: RTL language support (Arabic, Hebrew)]
- **Core Doc Revision:** Update style_guide.md for i18n font requirements
