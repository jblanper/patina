# Implementation Blueprint: Phase 6 - Internationalization (Spanish/English)

**Date:** 2026-03-19
**Status:** Verification
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

2. **Extend The Filter — Preference IPC Bridge** *(architectural prerequisite)*
   - Add `PreferenceGetSchema` and `PreferenceSetSchema` to `src/common/validation.ts`
   - Add `dbService.getPreference(key)` / `dbService.setPreference(key, value)` to `src/main/db.ts`
   - Add `pref:get` / `pref:set` IPC handlers to `src/main/index.ts`
   - Expose `getPreference` / `setPreference` in `src/main/preload.ts`
   - Add both methods to global mock in `src/renderer/setupTests.ts` (default: `'es'`)

3. **Extend Vocabulary Bridge for Locale** *(architectural prerequisite)*
   - Add optional `locale` param to `VocabGetSchema` and `VocabSearchSchema` in `validation.ts`
   - Update `dbService.getVocabularies(field, locale?)` and `dbService.searchVocabularies(field, query, locale?)` in `db.ts`
   - Update `getVocab` and `searchVocab` in `preload.ts` to pass locale

4. **Seed Spanish Vocabulary Entries**
   - Add `locale: 'es'` entries for metals and eras in `getSeedEntries()` in `db.ts`
   - Bump `CURRENT_SEED_VERSION` to `'6b.1'`

5. **Create Translation Files**
   - `src/renderer/i18n/locales/en.json` — all namespaces (common, ledger, cabinet)
   - `src/renderer/i18n/locales/es.json` — complete Spanish translations
   - Must include all numismatic terms: Anverso, Reverso, Bordura, Aleación

6. **Configure i18next**
   - `src/renderer/i18n/index.ts` — initialize with default language `'es'`
   - Loads saved language from `getPreference('language')` on startup; falls back to `'es'`

7. **Create `useLanguage` Hook**
   - `src/renderer/hooks/useLanguage.ts`
   - Wraps `i18n.changeLanguage()` + persists via `setPreference('language', lang)`
   - Exposes `{ language, switchLanguage }` to components

8. **Create LanguageSelector Component**
   - `src/renderer/components/LanguageSelector.tsx`
   - Add to PatinaSidebar (single-click rule compliance)

9. **Update Existing Components**
   - Replace all hardcoded strings with `t()` from `useTranslation`
   - Priority: `LedgerForm.tsx` → `CoinDetail.tsx` → `Cabinet.tsx` → `PatinaSidebar.tsx`
   - Pass active `language` to `getVocab` / `searchVocab` calls for locale-filtered autocomplete

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
**Status:** Issues Found

### Audit Findings:

#### 1. Vocabulary locale gap — CRITICAL ❌
`getVocabularies` and `searchVocabularies` in `db.ts` do **not** filter by locale. When Spanish entries are seeded, both `Gold` and `Oro` would appear simultaneously in autocomplete. Both methods and their `VocabGetSchema`/`VocabSearchSchema` Zod schemas must accept an optional `locale` parameter that defaults to `'en'` (for backwards compat) and is switched to `'es'` by the active language context.

#### 2. Missing preference IPC bridge — CRITICAL ❌
No `getPreference`/`setPreference` exists in `src/main/preload.ts` or `src/main/index.ts`. The `LanguageSelector` has no mechanism to persist or load the language preference. The following must be added through The Filter:
- `PreferenceGetSchema`: `z.object({ key: z.literal('language') }).strict()`
- `PreferenceSetSchema`: `z.object({ key: z.literal('language'), value: z.enum(['en', 'es']) }).strict()`
- IPC channels: `pref:get` / `pref:set`
- `dbService.getPreference(key)` / `dbService.setPreference(key, value)` in `db.ts`
- Bridge methods: `getPreference` / `setPreference` in `preload.ts`

> **Note:** The `preferences` table already exists in the schema with `(key, value)` columns. Infrastructure is ready — only the IPC layer is missing.

#### 3. Approved design patterns — VERIFIED ✓
- `useTranslation` hook from `react-i18next` correctly encapsulates i18n logic; components need not know the active language
- No new domain types required in `src/common/types.ts` — preference persistence uses the existing `preferences` table
- i18next initialization belongs in the renderer (`src/renderer/i18n/index.ts`); no main-process involvement needed beyond the DB preference bridge

### Review Notes & Suggestions:
1. Implement `PreferenceGetSchema` / `PreferenceSetSchema` with strict key whitelisting — do not use a generic `z.string()` key, to prevent arbitrary preference injection
2. When language is loaded from DB on startup, if the value is not `'en' | 'es'`, silently default to `'es'` — never throw a startup crash for a bad preference value
3. Pass `locale` to `getVocab` / `searchVocab` calls from the active `useLanguage` context, not as a hardcoded string in each call site

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified — Minor Action Items

### Audit Findings:

#### 1. Static translation files — VERIFIED ✓
`en.json` and `es.json` are loaded by `react-i18next` at bundle time (Vite resolves them as static imports). No `fetch()` calls, no CDN, no dynamic `import()` — fully CSP-compatible and sandbox-safe.

#### 2. Preference IPC handlers must use strict Zod validation — ACTION REQUIRED ⚠️
The new `pref:get` and `pref:set` IPC handlers follow the same pattern as all other handlers in `index.ts`. Both must pass through `validateIpc()`. Specifically:
- The `key` param must be validated as `z.literal('language')` — not `z.string()`. This ensures no arbitrary key can be read or written via the bridge, preventing a future class of information leakage.
- The `value` param in `pref:set` must be `z.enum(['en', 'es'])` — rejecting any other string prevents a malformed value from being stored and later crashing i18next initialization.

#### 3. No new attack surface from i18next runtime — VERIFIED ✓
i18next does not use `eval`, does not load remote resources, and does not manipulate the DOM directly. The `react-i18next` integration is purely declarative — `t()` returns strings used as React children, which React escapes. No XSS risk.

### Review Notes & Suggestions:
- Verified: No novel security concerns introduced by static i18n files
- Required: Strict key whitelisting in `PreferenceGetSchema` and `PreferenceSetSchema`

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Issues Found

### Audit Findings:

#### 1. Global mock requires update — CRITICAL ❌
`src/renderer/setupTests.ts` defines the global `window.electronAPI` mock. The two new bridge methods (`getPreference`, `setPreference`) must be added here, or every existing test will fail TypeScript compilation after the preload types are updated.
```typescript
getPreference: vi.fn().mockResolvedValue('es'),
setPreference: vi.fn().mockResolvedValue(undefined),
```

#### 2. Required test files — ACTION REQUIRED ⚠️
- `src/renderer/components/LanguageSelector.test.tsx` (collocated): must cover toggle rendering, click-to-switch, and persistence call to `setPreference`
- `src/renderer/hooks/__tests__/useLanguage.test.ts`: must cover (a) load-from-prefs with valid value, (b) fallback to `'es'` when preference is missing/invalid, (c) `switchLanguage()` calls both `i18n.changeLanguage` and `setPreference`

#### 3. i18next mock pattern — REQUIRED ⚠️
All component tests that render translated strings must mock `react-i18next` to avoid initialization errors in jsdom:
```typescript
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'es' }
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}))
```

#### 4. Translation key completeness check — REQUIRED ⚠️
A test in `src/renderer/i18n/__tests__/translations.test.ts` must verify that every key present in `en.json` has a corresponding entry in `es.json`. This prevents partial-translation regressions.

#### 5. Coverage targets
- `LanguageSelector.tsx`: 80% statement coverage (component mandate)
- `useLanguage.ts`: 90% function coverage (hooks mandate)
- `src/renderer/i18n/index.ts`: excluded from coverage — configuration, not logic

### Review Notes & Suggestions:
1. The `getPreference` mock in `setupTests.ts` should default to `'es'` to match the Spanish-default decision
2. Do not test i18next internals — mock the library and test only the integration seams (preference load, preference persist, language change event)

---

## 7. UI Assessment (`curating-ui`)
**Status:** Issues Found

### Audit Findings:

#### 1. Typography — Spanish Accents — VERIFIED ✓
Both Cormorant Garamond and Montserrat are full Unicode Latin Extended fonts. All Spanish characters (á, é, í, ó, ú, ñ, ¿, ¡, ü) render correctly with no font substitution fallback. The archival aesthetic is preserved. Specific terms audited:
- **Anverso, Reverso** in Cormorant Garamond (`.section-label`): clean render, similar character width to English equivalents
- **Aleación** (accent over first 'a') in Montserrat (`.metric-label`): verified within font coverage
- **Épocas** (É with accent) in Montserrat (filter labels): renders correctly; uppercase rendering via CSS `text-transform: uppercase` must be confirmed — `É` uppercases correctly in standard CSS

#### 2. String Length Impact Analysis — ACTION REQUIRED ⚠️

| Component | English | Spanish | Risk |
|-----------|---------|---------|------|
| `.section-label` "Curator's Note" | 14 chars | "Nota del Curador" (16) | Low — label is full-width block |
| `.metric-label` "Material" | 8 chars | "Aleación" (8) | None |
| `.metric-label` "Diameter" | 8 chars | "Diámetro" (8) | None |
| `.subtitle-label` "Minted at" | 9 chars | "Acuñado en" (10) | Low |
| `.filter-label` "Metals" | 6 chars | "Metales" (7) | None |
| `reset-btn` "Reset Archive View" | 18 chars | "Restablecer Filtros" (19) | Low — `width: fit-content` respects content |
| Nav link "Add Entry" | 9 chars | "Nueva Entrada" (13) | Medium — check button width in context |

No overflow risks identified at the 280px sidebar width. All labels are block-level or have sufficient container width.

#### 3. Single-Click Rule Compliance — RESOLVED ✓

`App.tsx` has no persistent layout shell. The `LanguageSelector` will be placed in the `PatinaSidebar` footer — 1 click from Cabinet, 2 clicks from `CoinDetail`/`Scriptorium` (nav-back → toggle). The project's two-click mandate is satisfied from all views.

**Decision (2026-03-21):** Language is a one-time setup action, not a frequent operation. Sidebar-only placement is appropriate. No `AppChrome` wrapper or persistent header is needed.

#### 4. ERAS Array — Silent Breakage Risk — ACTION REQUIRED ⚠️

`PatinaSidebar.tsx` line 12: `const ERAS = ['Ancient', 'Medieval', 'Modern'] as const;`

These strings serve **dual purpose**: as filter values (sent to `filterCoins()` to match DB records) and as display labels. If a future refactor naively wraps them in `t()` and replaces the array with translated strings, the filters will stop matching DB records (which store the English era strings).

**Required implementation pattern:**
```typescript
const ERAS = [
  { value: 'Ancient',  labelKey: 'filters.era.ancient'  },
  { value: 'Medieval', labelKey: 'filters.era.medieval' },
  { value: 'Modern',   labelKey: 'filters.era.modern'   },
] as const;
// value → DB query, t(labelKey) → display
```

This pattern must be used in `PatinaSidebar.tsx` to ensure filter functionality is unchanged in both language modes.

#### 5. LanguageSelector Component Design — SPECIFICATION
To maintain the archival aesthetic, the selector must use the existing `.sort-dir-toggle` / `.dir-btn` CSS pattern (reuse, no new classes):
```tsx
<div className="language-selector sort-dir-toggle">
  <button className={`dir-btn ${lang === 'es' ? 'active' : ''}`} onClick={() => switchLanguage('es')}>ES</button>
  <button className={`dir-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => switchLanguage('en')}>EN</button>
</div>
```
This renders as two compact inline buttons, identical to the Asc/Desc sort toggle, requiring zero new CSS. Maximum width: ~80px — well within the 280px sidebar or a top-bar.

### Review Notes & Suggestions:
1. **Resolved:** Single-Click Rule — sidebar footer placement satisfies 2-click mandate from all views (2026-03-21)
2. **Required:** Use value/labelKey pair pattern for ERAS array to protect filter DB queries
3. **Verified:** Typography fully supports all required Spanish characters — no font risk
4. **Verified:** No layout overflow risks from Spanish string lengths within current component widths
5. **Required:** Reuse `.sort-dir-toggle`/`.dir-btn` CSS for `LanguageSelector` — zero new stylesheet additions

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
4. Should Nomisma REST API be used for vocabulary translations, or hand-curated? → **HAND-CURATED (2026-03-21)**
5. What is the default language? → **SPANISH (`'es'`)** — primary user base is Spanish-speaking

### Final Decisions:
- **Default Language:** `'es'` (Spanish). The app launches in Spanish unless the user has previously saved `'en'` as their preference.
- **Language Switch:** Immediate (no restart required)
- **Numismatic Translations Required:**
  - Anverso (Obverse), Reverso (Reverse), Bordura (Edge)
  - Aleación (for Alloy/Metal instead of generic "Material")
- **Catalog References:** RIC, RPC, BMC remain in original language
- **Vocabulary Translation Strategy:** Hand-curated Spanish seed entries in `db.ts` directly. ~22 terms require translation (metals + eras); denomination and mint names are Latin/proper nouns used identically in Spanish numismatics. Grades and die axis are international standards and do not translate.
- **LanguageSelector Placement:** Sidebar footer only (`PatinaSidebar.tsx`, below "Reset Archive View"). Language is a one-time setup action — sidebar placement satisfies the 2-click rule from all views without structural complexity. Reuses `.sort-dir-toggle`/`.dir-btn` CSS. No AppChrome or persistent header needed. (Decision: 2026-03-21)
- **ERAS Array Pattern:** Use `{ value, labelKey }` pairs — `value` is the DB key (English), `labelKey` is the i18n translation key for display.

### Note: Nomisma.org — Deferred to Future Phase

Nomisma.org supports both a REST API (JSON-LD via `https://nomisma.org/id/{concept}.jsonld`) and SPARQL. However, given that only ~22 vocabulary terms require Spanish translation and Spanish is the mission-critical default language, **hand-curation is safer and faster** than relying on a build-time network dependency. Decision (2026-03-21): Nomisma integration deferred to a future 6b.1 enhancement. All Spanish vocabulary entries will be curated directly in `getSeedEntries()` with `locale: 'es'`.

---

## 10. Post-Implementation Retrospective
**Date:** 2026-03-21
**Outcome:** Completed — All 136 tests pass, zero TypeScript errors.

### Summary of Work
- Installed `react-i18next` + `i18next` as runtime dependencies
- Added `PreferenceGetSchema` / `PreferenceSetSchema` to `validation.ts` (strict key whitelisting)
- Extended `VocabGetSchema` / `VocabSearchSchema` with optional `locale` param
- Added `getPreference` / `setPreference` to `dbService` in `db.ts`
- Updated `getVocabularies` / `searchVocabularies` to filter by locale (fixes vocabulary locale gap)
- Added 11 Spanish metal entries and 11 Spanish era entries to `getSeedEntries()`; bumped seed version to `6b.1`
- Added `pref:get` / `pref:set` IPC handlers to `index.ts` (through `validateIpc`)
- Extended `preload.ts` with `getPreference` / `setPreference` bridge methods
- Updated `electron.d.ts` type declarations for new bridge methods and locale-aware vocab methods
- Updated `setupTests.ts` with `getPreference` / `setPreference` mocks + global `react-i18next` mock that resolves keys to actual English strings (preserving all existing test assertions)
- Created `src/renderer/i18n/index.ts` (i18next init, default lang `'es'`, static JSON resources)
- Created `src/renderer/i18n/locales/en.json` and `es.json` covering all UI namespaces
- Created `src/renderer/hooks/useLanguage.ts` (wraps `i18n.changeLanguage` + preference persistence)
- Created `src/renderer/components/LanguageSelector.tsx` (reuses `.sort-dir-toggle`/`.dir-btn` CSS, zero new CSS)
- Updated `App.tsx` to load saved preference on startup and apply via `i18n.changeLanguage`
- Updated `PatinaSidebar.tsx`: ERAS array uses `{ value, labelKey }` pairs; added `LanguageSelector` to sidebar footer
- Updated `LedgerForm.tsx`, `CoinDetail.tsx`, `Cabinet.tsx`, `GalleryGrid.tsx`, `SearchBar.tsx`, `Scriptorium.tsx` with `useTranslation`
- Created `LanguageSelector.test.tsx`, `hooks/__tests__/useLanguage.test.ts`, `i18n/__tests__/translations.test.ts`

### Pain Points
- The global `react-i18next` mock in `setupTests.ts` needed to resolve translation keys to actual English strings to preserve 14 existing component test assertions that check for English text. Solution: JSON key resolver function in the setup file.
- Pre-existing TypeScript error in `CoinDetail.test.tsx` (`mockResolvedValue(undefined)` where `boolean` was required) was discovered and fixed.

### Things to Consider
- [Future: Add French, German, Italian translations]
- [Future: RTL language support (Arabic, Hebrew)]
- **Core Doc Revision:** Update style_guide.md for i18n font requirements
