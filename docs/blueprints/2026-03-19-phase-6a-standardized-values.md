# Implementation Blueprint: Phase 6 - Standardized Values with Autocomplete

**Date:** 2026-03-19
**Status:** Approved
**Reference:** `docs/technical_plan.md`

## 1. Objective

Implement standardized dropdown/autocomplete for curated fields in the Scriptorium (Add/Edit form), with the ability to add new options. This enhances data consistency while maintaining flexibility for specialized collections.

### Philosophical Alignment
- [ ] **Archival Ledger Aesthetic:** Dropdowns should match the museum label aesthetic - elegant, minimal, with serif typography.
- [ ] **Privacy First:** All vocabulary data stored locally in SQLite - no external APIs or telemetry.
- [ ] **Single-Click Rule:** One click to open dropdown, one click to select. Adding new values is accessible but not intrusive.

---

## 2. Technical Strategy

### A. Database Schema Changes

**New Table: `vocabularies`**
```sql
CREATE TABLE vocabularies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field TEXT NOT NULL,           -- e.g., 'metal', 'denomination', 'grade'
  value TEXT NOT NULL,           -- e.g., 'Silver', 'Denarius', 'XF'
  is_builtin INTEGER DEFAULT 0,   -- 1 for pre-seeded values, 0 for user-added
  usage_count INTEGER DEFAULT 0,  -- For sorting by frequency
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(field, value)
);
```

**New Table: `preferences`**
```sql
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### B. Seeded Vocabularies (Numismatic Standards)

**Metals:**
| Value | Display (EN) | Display (ES) |
|-------|--------------|--------------|
| Gold | Gold (Au) | Oro (Au) |
| Silver | Silver (Ag) | Plata (Ag) |
| Bronze | Bronze | Bronce |
| Copper | Copper | Cobre |
| Billon | Billon | Bilon |
| Potin | Potin | Potín |
| Orichalcum | Orichalcum | Auricalco |
| Electron | Electrum | Electrón |

**Denominations (Roman):**
| Value | Display (EN) | Display (ES) |
|-------|--------------|--------------|
| Antoninianus | Antoninianus | Antoniniano |
| Denarius | Denarius | Denario |
| Quinarius | Quinarius | Quinario |
| Sestertius | Sestertius | Sestercio |
| Dupondius | Dupondius | Dupondio |
| As | As | As |
| Semis | Semis | Semis |
| Quadrans | Quadrans | Quadrante |

**Grades (NGC/PCGS inspired):**
| Value | Display (EN) | Display (ES) |
|-------|--------------|--------------|
| MS | Mint State | Estado Flor de Cuño |
| AU | About Uncirculated | Casi Sin Circular |
| XF | Extremely Fine | Muy Estupendo |
| EF | Extremely Fine | Estupendo |
| VF | Very Fine | Muy Bueno |
| F | Fine | Bueno |
| VG | Very Good | Bastante Bueno |
| G | Good | Regular |
| AG | About Good | Casi Regular |
| Fair | Fair | Fraco |

**Eras:**
| Value |
|-------|
| Ancient |
| Medieval |
| Modern |

**Die Axis Values:**
| Value |
|-------|
| 1h |
| 2h |
| 3h |
| 4h |
| 5h |
| 6h |
| 7h |
| 8h |
| 9h |
| 10h |
| 11h |
| 12h |

### C. Nomisma.org Integration (Official Taxonomy Source)

> **NOTE:** We can optionally use **Nomisma.org** (American Numismatic Society) as an authoritative external source for standardized vocabulary. This is a **privacy-respecting** approach: we fetch once at seed time and cache locally in SQLite - no external API calls during normal app operation.

**Why Nomisma:**
- Linked Open Data (LOD) standard for numismatic concepts
- CC-BY licensed, free for commercial and non-commercial use
- Provides labels in 40+ languages (EN, ES, DE, FR, IT, etc.)
- Contains 25+ concept types: materials, denominations, mints, periods, regions, manufacture methods, wear, corrosion, shapes, and more

**Query Examples:**

```bash
# Get label for a concept (plain text)
curl "https://nomisma.org/apis/getLabel?uri=http://nomisma.org/id/ar&lang=en"
# Response: "Silver"

curl "https://nomisma.org/apis/getLabel?uri=http://nomisma.org/id/aureus&lang=es"
# Response: "Áureo"

# Get mints as GeoJSON
curl "https://nomisma.org/apis/getMints?id=rome"
```

**SPARQL Query Examples (for bulk seed):**

```sparql
# Get all materials (metals + alloys)
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?id ?label WHERE {
  ?id a nmo:Material ;
      skos:prefLabel ?label .
  FILTER(lang(?label) = "en")
}
LIMIT 100

# Get all Roman denominations
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?id ?label WHERE {
  ?id a nmo:Denomination ;
      skos:prefLabel ?label ;
      <http://nomisma.org/ontology#hasEndDate> ?date .
  FILTER(lang(?label) = "en")
  FILTER(?date >= -27)
}
ORDER BY ?date

# Get mints with geographic coordinates
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?mint ?label ?lat ?long WHERE {
  ?mint a nmo:Mint ;
         skos:prefLabel ?label ;
         geo:location ?loc .
  ?loc geo:lat ?lat ;
       geo:long ?long .
  FILTER(lang(?label) = "en")
}
LIMIT 50

# Get eras/periods
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?id ?label WHERE {
  ?id a nmo:Period ;
      skos:prefLabel ?label .
  FILTER(lang(?label) = "en")
}
ORDER BY ?label

# Get manufacture methods (cast, struck, hammered)
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?id ?label WHERE {
  ?id a nmo:Manufacture ;
      skos:prefLabel ?label .
  FILTER(lang(?label) = "en")
}

# Get coin wear levels
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?id ?label WHERE {
  ?id a nmo:CoinWear ;
      skos:prefLabel ?label .
  FILTER(lang(?label) = "en")
}

# Get regions with coordinates
PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?region ?label ?lat ?long WHERE {
  ?region a nmo:Region ;
          skos:prefLabel ?label ;
          geo:location ?loc .
  ?loc geo:lat ?lat ;
       geo:long ?long .
  FILTER(lang(?label) = "en")
}
LIMIT 30
```

**Nomisma Concept Types (Complete List):**

| Concept Type | Description | Example IDs |
|--------------|-------------|-------------|
| **Material** | Metals and alloys | `av`, `ar`, `aes`, `cu`, `billon`, `electrum`, `orichalcum`, `potin`, `ni` (nickel), `sn` (tin), `zn` (zinc), `cupro-nickel` |
| **Denomination** | Coin denominations | `aureus`, `denarius`, `antoninianus`, `sestertius`, `dupondius`, `as`, `semis`, `quadrans`, `quinarius`, `miliarense`, `siliqua`, `follis`, `nummus` |
| **Mint** | Minting locations | `rome`, `constantinople`, `antioch`, `alexandria`, `smyrna`, `athens`, `carthage` |
| **Period** | Historical periods | `roman_republic`, `roman_imperial`, `byzantine_numismatics`, `medieval_numismatics`, `islamic_numismatics`, `greek_numismatics` |
| **Region** | Geographic regions | `italy`, `gaul`, `hispania`, `britannia`, `syria`, `asia_minor` |
| **Manufacture** | Production methods | `cast` (cast coinage), `struck` (hammered/struck), `milled` (machine made) |
| **Coin Wear** | Wear levels (German scale) | `little_to_no_wear`, `worn`, `very_worn`, `extremely_worn`, `wear_undetermined` |
| **Corrosion** | Corrosion types | (various corrosion states) |
| **Shape** | Coin shapes | `round`, `square`, `irregular`, `shaped` |
| **Object Type** | Type of numismatic object | `coin`, `follis`, `ingot`, `token`, `medal` |
| **Symbol** | Monograms, mint marks | Various |
| **Monogram** | Monogram symbols | Various |
| **Authenticity** | Authenticity status | `genuine`, `counterfeit`, `forgery`, `authentic` |
| **Deity** | deities depicted on coins | `jupiter`, `mars`, `venus`, `apollo`, `minerva` |
| **Person** | Historical figures | `augustus`, `constantine`, `trajan` |
| **Organization** | Issuing authorities | `roman_empire`, `roman_republic`, `byzantine_empire` |
| **Field of Numismatics** | Academic fields | `roman_numismatics`, `greek_numismatics`, `byzantine_numismatics`, `medieval_numismatics` |
| **Series** | Coin series/types | `ric` (Roman Imperial Coinage), `rrc` (Roman Republican Coinage), `rpc` (Roman Provincial Coinage) |

**Nomisma ID Reference for Seed Data:**

| Field | Nomisma ID | Example Label (EN) |
|-------|------------|---------------------|
| **Metals** | | |
| Gold | `av` | Gold |
| Silver | `ar` | Silver |
| Bronze | `aes` | Bronze |
| Copper | `cu` | Copper |
| Billon | `billon` | Billon |
| Electrum | `electrum` | Electrum |
| Orichalcum | `orichalcum` | Orichalcum |
| Potin | `potin` | Potin |
| Nickel | `ni` | Nickel |
| **Denominations** | | |
| Aureus | `aureus` | Aureus |
| Denarius | `denarius` | Denarius |
| Antoninianus | `antoninianus` | Antoninianus |
| Sestertius | `sestertius` | Sestertius |
| Dupondius | `dupondius` | Dupondius |
| As | `as` | As |
| Semis | `semis` | Semis |
| Quadrans | `quadrans` | Quadrans |
| Quinarius | `quinarius` | Quinarius |
| Miliarense | `miliarense` | Miliarense |
| Siliqua | `siliqua` | Siliqua |
| Follis | `follis` | Follis |
| Nummus | `nummus` | Nummus |
| **Manufacture** | | |
| Cast | `cast` | Cast |
| Struck/Hammered | `struck` | Struck |
| **Coin Wear** | | |
| Little to no wear | `little_to_no_wear` | Little to no wear |
| Worn | `worn` | Worn (U 3) |
| Very worn | `very_worn` | Very worn (U 4) |
| Extremely worn | `extremely_worn` | Extremely worn (U 5) |
| **Mints** | | |
| Rome | `rome` | Rome |
| Constantinople | `constantinople` | Constantinople |
| Antioch | `antioch` | Antioch |
| Alexandria | `alexandria` | Alexandria |
| **Eras** | | |
| Roman Republic | `roman_republic` | Roman Republic |
| Roman Imperial | `roman_imperial` | Roman Imperial |
| Roman Provincial | `roman_provincial` | Roman Provincial |
| Byzantine | `byzantine_numismatics` | Byzantine Numismatics |
| Medieval | `medieval_numismatics` | Medieval Numismatics |
| Islamic | `islamic_numismatics` | Islamic Numismatics |

**Implementation Note:** Fetch Nomisma data at build/seed time via `getLabel` API or SPARQL, then store in local SQLite. No external network calls required during app runtime. This maintains the "Privacy First" principle while leveraging authoritative taxonomy.

**Fields NOT Covered by Nomisma.org:**

| Field | Why Not in Nomisma | Recommendation for Patina |
|-------|---------------------|---------------------------|
| **Grade** | Commercial grading (NGC/PCGS) - not public taxonomy | Use numeric scale: MS-60, MS-65, MS-70, AU-58, etc. to FR-2 |
| **Die Axis** | Technical metric, not in ontology | Use clock notation: 1h, 2h, ... 12h |
| **Catalog References** | Available via specialized APIs (OCRE, CRRO) | Link to RIC, RPC, Crawford via external references |
| **Condition Details** | Patina, toning levels - subjective | Custom vocabulary or free text |
| **Provenance** | Collection history - user-specific | Per-coin free text field |
| **Purchase Price** | Market value - volatile and private | Optional private field |
| **Edge Type** | Reeded, plain, lettered - not in ontology | Custom vocabulary: "Reeded", "Plain", "Lettered", " milled" |
| **Certification** | NGC/PCGS cert numbers - private | Optional field with format validation |
| **Die Variety** | Die identifiers - highly specific | Per-collection, free text |
| **Weight Range** | Variable - not a taxonomy | Use actual measurement in grams |
| **Diameter Range** | Variable - not a taxonomy | Use actual measurement in mm |
| **Technique** | Minting technique (struck/cast) - partially covered | Use Nomisma's `nmo:Manufacture` (cast, struck, milled) |

**Modern Online Resources (for Reference Lookup):**

These services can be used to validate catalog references and provide external links:

| Resource | URL | Description |
|----------|-----|-------------|
| **OCRE** | `https://numismatics.org/ocre` | Online Coins of the Roman Empire - RIC database with type lookup |
| **CRRO** | `https://numismatics.org/crro` | Coinage of the Roman Republic Online - Crawford database |
| **PAS** | `https://finds.org.uk/database` | Portable Antiquities Scheme - UK find database with identifications |
| **ACS** | (American Coin Atlas) | Greek coin type database and geographical mapping |
| **CoinArchivesPro** | (commercial) | Auction record database for pricing research |
| **NGC Coin Explorer** | `https://www.ngccoin.com/coin-explorer/` | Modern world coin database with grading standards |

> **Note:** These are external resources for reference validation only. Patina maintains local vocabulary for privacy. Future integration could include auto-linking to OCRE/CRRO URIs for coin type lookups.

---

### D. UI Component: AutocompleteField

```typescript
interface AutocompleteFieldProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Behavior:**
1. Display as regular input with dropdown icon
2. On focus: Show dropdown with all options for that field
3. Options sorted by `usage_count` (most used first)
4. User can type to filter
5. Selecting an option increments `usage_count`
6. "Add new value" option at bottom if user types non-existent value
7. New values saved with `is_builtin = 0`

**Visual Design:**
- Dropdown matches style guide (serif font, parchment background)
- Subtle shadow, hairline border
- Hover state with slight background tint
- "Add '[value]'" option styled differently (italic, muted)

### E. IPC Handlers

| Handler | Purpose |
|---------|---------|
| `vocab:get` | Get all values for a field |
| `vocab:add` | Add new vocabulary value |
| `vocab:search` | Search values (for autocomplete) |
| `vocab:seed` | Seed initial vocabulary tables |

### F. Implementation Steps

1. **Database Migration**
   - Create `vocabularies` table
   - Create `preferences` table
   - Seed with numismatic standard values

2. **Backend (`src/main/`)**
   - Add `getVocabularies()`, `addVocabulary()`, `searchVocabularies()` to `db.ts`
   - Add IPC handlers in `index.ts`
   - Add `seedVocabularies()` for initial data

3. **Frontend (`src/renderer/`)**
   - Create `AutocompleteField.tsx` component
   - Create `useVocabularies.ts` hook
   - Update `LedgerForm.tsx` to use `AutocompleteField` for: `metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`

4. **i18n Integration**
   - Store display values in both EN/ES in vocabulary
   - Or use a separate `vocabularies_i18n` table for translations

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan
- **Unit Tests:**
  - `src/main/db.test.ts`: Vocabulary CRUD operations
  - `src/renderer/components/__tests__/AutocompleteField.test.tsx`: Dropdown behavior, filtering, add-new-value
- **Hook Tests:**
  - `src/renderer/hooks/__tests__/useVocabularies.test.ts`: API integration, caching

### Colocation Check
- `src/main/export/` → Already following colocation
- New: `src/renderer/components/AutocompleteField.test.tsx` next to `AutocompleteField.tsx`

### Mocking Strategy
- Mock `window.electronAPI.vocab:*` methods
- Use `vi.fn()` for IPC calls

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Types must be added to `src/common/types.ts` - create `Vocabulary`, `VocabularyInput` types
- **Abstraction:** Vocabulary service isolated in `src/main/db.ts` - use existing parameterized query pattern
- **Cross-Process:** Zod validation for IPC input - require `.strict()` schemas in validation.ts

### Review Notes & Suggestions:
- Vocab types should include: `id`, `field`, `value`, `is_builtin`, `usage_count`, `created_at`
- Zod schemas should be added alongside existing schemas in `src/common/validation.ts`

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### Audit Findings:
1. **IPC Handler Security (vocab:get, vocab:add, vocab:search):**
   - ✅ Currently NO IPC validation layer exists for vocab handlers - this is a CRITICAL GAP
   - ❌ Blueprint does NOT specify Zod schemas with `.strict()` for these handlers
   - **Required:** Add `VocabGetSchema`, `VocabAddSchema`, `VocabSearchSchema` in `src/common/validation.ts`

2. **SQL Injection Prevention:**
   - ✅ `db.ts` already uses parameterized queries with `?` placeholders (lines 60-62, 72, 86)
   - ✅ Pattern is consistent with existing secure implementation
   - No changes needed for SQL injection prevention

3. **Input Sanitization (XSS in Autocomplete):**
   - ❌ **CRITICAL GAP:** No XSS protection for vocabulary values rendered in UI
   - User-added vocabulary could contain script tags, event handlers, or dangerous attributes
   - **Required:** HTML-escape all vocabulary values in AutocompleteField before rendering
   - Consider adding sanitization at both:
     - Input: Sanitize on `vocab:add` before DB insert
     - Output: Escape when rendering options

4. **The Filter Principle:**
   - ❌ **CRITICAL GAP:** `field` parameter in `vocab:get` and `vocab:search` has NO whitelist validation
   - Current blueprint allows ANY field name - attacker could query arbitrary column names
   - **Required:** Define ALLOWED_FIELDS whitelist: `['metal', 'denomination', 'grade', 'era', 'die_axis', 'mint']`
   - Validate `field` parameter against whitelist in IPC handler

### Review Notes & Suggestions:
1. **Add Zod schemas to `src/common/validation.ts`:**
   ```typescript
   const ALLOWED_VOCAB_FIELDS = ['metal', 'denomination', 'grade', 'era', 'die_axis', 'mint'] as const;
   
   export const VocabGetSchema = z.object({
     field: z.enum(ALLOWED_VOCAB_FIELDS)
   }).strict();
   
   export const VocabAddSchema = z.object({
     field: z.enum(ALLOWED_VOCAB_FIELDS),
     value: z.string().min(1).max(200).regex(/^[\w\s\-.,;:'"()\/]+$/)
   }).strict();
   
   export const VocabSearchSchema = z.object({
     field: z.enum(ALLOWED_VOCAB_FIELDS),
     query: z.string().max(100)
   }).strict();
   ```

2. **Add XSS sanitization in `db.ts` vocabulary functions:**
   - Use a simple HTML entity encoder for vocabulary values on insert
   - Or use a lightweight sanitization library (e.g., DOMPurify via node)

3. **Add IPC validation in `index.ts` vocab handlers:**
   ```typescript
   ipcMain.handle('vocab:get', (_, data: unknown) => {
     const validated = VocabGetSchema.strict().parse(data);
     return dbService.getVocabularies(validated.field);
   });
   ```

4. **Update `preload.ts` to expose vocab methods:**
   ```typescript
   getVocabularies: (field: string) => ipcRenderer.invoke('vocab:get', { field }),
   addVocabulary: (field: string, value: string) => ipcRenderer.invoke('vocab:add', { field, value }),
   searchVocabularies: (field: string, query: string) => ipcRenderer.invoke('vocab:search', { field, query }),
   ```

### Action Items:
- [ ] Add ALLOWED_FIELDS constant and Zod schemas to `src/common/validation.ts`
- [ ] Add vocabulary methods to `src/main/db.ts` with parameterized queries
- [ ] Add vocab IPC handlers to `src/main/index.ts` with `.strict()` validation
- [ ] Add vocab methods to `src/main/preload.ts` with typed interfaces
- [ ] Implement XSS sanitization for vocabulary values (input and output)
- [ ] Add unit tests for Zod schema validation in `src/common/validation.test.ts`

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Pending

### Audit Findings:
- **Coverage Targets:** 90% for `useVocabularies`, 80% for `AutocompleteField`
- **Async Safety:** Use `waitFor` for dropdown state changes

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 7. UI Assessment (`curating-ui`)
**Status:** Pending

### Audit Findings:
- **Aesthetic Compliance:** Dropdown must match Manuscript Hybrid v3.3
- **Accessibility:** ARIA attributes for combobox pattern

### Review Notes & Suggestions:
- [Pending Phase II Audit]

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Issues Found

### Audit Findings:

#### A. Historical Accuracy

**Metals (8 values):**
- ⚠️ **Inconsistency:** Value is "Electron" but Display (EN) shows "Electrum" — mismatched pair will cause lookup issues. Standard term is "Electrum" (value and display should align).
- ✅ Standard abbreviations (Au, Ag) are appropriate for expert users.

**Denominations (8 values):**
- ⚠️ **Missing Critical Gold Denomination:** "Aureus" is absent — this is the fundamental Roman gold coin and must be included.
- ⚠️ **Missing Late Roman Silver:** "Miliarense" and "Siliqua" are absent — essential for 4th-5th century coinage.
- ⚠️ **Missing Fractional Bronze:** The full uncial system (Triens, Uncia) is not represented. Consider adding "Triens" (1/3 As) and "Uncia" (1/12 As).
- ✅ "Sestertius" spelling is correct (not "Sesterius").

**Grades (10 values):**
- ⚠️ **Duplicate EF/XF:** "EF" (Extremely Fine) and "XF" (Extremely Fine) are duplicates — both map to the same grade tier. NGC/PCGS use "XF" exclusively; "EF" is archaic.
- ⚠️ **Missing Numeric Grades:** Professional catalogs require MS-60 through MS-70, AU-50, AU-55, AU-58, etc. These are essential for auction cataloging.
- ⚠️ **"Fair" is non-standard:** Use "FR" to match NGC/PCGS convention.

**Eras (3 values):**
- ⚠️ **Oversimplified:** Only 3 broad eras. Roman coinage requires: "Roman Republic", "Roman Imperial", "Roman Provincial" (RPC reference). Medieval should specify: "Early Medieval", "High Medieval", "Late Medieval".
- ⚠️ **Byzantine Missing:** Should be added as "Byzantine" or incorporated into "Medieval".
- ⚠️ **Islamic Era Missing:** For completeness, add "Islamic" as numismatic collections often span regions.

**Die Axis (12 values):**
- ✅ Correctly formatted with "h" suffix (e.g., "6h").
- ✅ Covers full 1-12h range per technical_metrics.md standards.

#### B. Completeness Assessment

| Category | Current | Recommended | Gap |
|----------|---------|-------------|-----|
| Metals | 8 | 10 | Missing "Tumbaga", "Pewter" |
| Denominations | 8 | 15+ | Missing Aureus, Siliqua, fractional bronze |
| Grades | 10 | 25+ | Missing numeric scale (MS-70 to FR-2) |
| Eras | 3 | 8 | Roman subtypes, Byzantine, Islamic |
| Die Axis | 12 | 12 | Complete |

#### C. Collector UX Assessment

**usage_count Prioritization:**
- ⚠️ **Default weights not specified.** For initial seeding, assign usage weights to reflect market frequency:
  - **Grade:** MS (5), AU (4), XF (4), VF (3), F (2), VG (1), G (1), AG (1), Fair (1)
  - **Metal:** Silver (5), Bronze (4), Gold (4), Copper (3), Billon (2)
  - **Denomination:** Denarius (5), Aureus (4), Antoninianus (3), Sestertius (3), As (2)
  - **Die Axis:** 6h (5), 12h (4), 3h (2), 9h (2), others (1)

**Catalog Reference Formatting:**
- This blueprint addresses vocabulary, not catalog references directly. However, recommend adding a separate "catalog_reference" vocabulary with RIC/RPC/Crawford prefixes pre-seeded for autocomplete.

### Review Notes & Suggestions

**Action Items (Priority Order):**

1. **[CRITICAL]** Fix "Electron" → "Electrum" in value column
2. **[HIGH]** Add "Aureus" denomination (gold standard)
3. **[HIGH]** Remove duplicate "EF"; keep only "XF" (NGC/PCGS standard)
4. **[HIGH]** Add numeric grading scale (MS-60 to FR-2) for auction cataloging
5. **[MEDIUM]** Expand eras to include Roman Republic/Imperial/Provincial and Byzantine
6. **[MEDIUM]** Add Siliqua, Miliarense for late Roman coverage
7. **[LOW]** Add initial `usage_count` weights for prioritization
8. **[LOW]** Consider adding catalog reference prefixes (RIC, RPC, Crawford, BMC, SNG, DOC, Sear) as vocabulary

**Collector Workflow Considerations:**
- The autocomplete should support partial matches (e.g., "den" matches "Denarius")
- Consider "slug" field for programmatic matching separate from display names
- For Spanish translations: verify terminology with native speaker review

**Schema Enhancement:**
- Add `slug TEXT` column for normalized lookup (e.g., "electrum" → value "Electrum")
- Add `sort_order INTEGER` column to override usage_count for initial seeding order

---

## 9. User Consultation & Decisions
### Open Questions:
1. Should user-added vocabularies be per-collection or global? → **GLOBAL**
2. Should we offer a way to reset to default vocabulary? → Yes, implement reset function
3. How should duplicate detection work (case-insensitive)? → Yes, with display-case preservation

### Final Decisions:
- **Scope:** Global vocabulary (shared across all collections)
- **Numismatic Fixes (Required):**
  - Fix "Electron" → "Electrum"
  - Add Aureus, Siliqua, Miliarense denominations
  - Remove duplicate EF, keep XF per NGC/PCGS
  - Add numeric grading scale (MS-60 to FR-2)

---

## 10. Post-Implementation Retrospective
**Date:** Pending
**Outcome:** TBD

### Summary of Work
- [Pending implementation]

### Pain Points
- [Pending implementation]

### Things to Consider
- [Future: Import vocabulary from CSV]
- [Future: Sync vocabulary between collections]
- **Core Doc Revision:** Update schema docs
