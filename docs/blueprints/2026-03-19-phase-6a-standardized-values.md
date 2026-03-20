# Implementation Blueprint: Phase 6 - Standardized Values with Autocomplete

**Date:** 2026-03-19
**Status:** Verification
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

> **Implementation Note:** Both new tables must be added to the `SCHEMA` array in `src/common/schema.ts` — the project's single source of truth for table definitions. The `generateSQL()` function uses `CREATE TABLE IF NOT EXISTS`, so adding them to `SCHEMA` handles migration automatically on next app startup.

**New Table: `vocabularies`**
```sql
CREATE TABLE vocabularies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field TEXT NOT NULL,            -- e.g., 'metal', 'denomination', 'grade'
  value TEXT NOT NULL,            -- e.g., 'Silver', 'Denarius', 'EF-40'
  locale TEXT DEFAULT 'en',       -- reserved for Phase 6b i18n; 'en' only in Phase 6a
  is_builtin INTEGER DEFAULT 0,   -- 1 for pre-seeded values, 0 for user-added
  usage_count INTEGER DEFAULT 0,  -- For sorting by frequency
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(field, value, locale)    -- locale-aware uniqueness for Phase 6b compatibility
);
```

**New Table: `preferences`**
```sql
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
> **Phase 6a scope:** Single key only — `vocab_seeded_version` (stores the seed data version string, e.g. `'6a.1'`). Used at startup to determine whether vocabulary defaults need re-seeding. Broader use (language preference, UI settings) deferred to Phase 6b.

### B. Seeded Vocabularies (Numismatic Standards)

All values use `is_builtin = 1`. Usage counts reflect relative market frequency in major auction catalogs (Roma Numismatics, CNG, Stack's Bowers, Leu Numismatik).

**Metals** (`field = 'metal'`)

| value | is_builtin | usage_count |
|---|---|---|
| Gold | 1 | 40 |
| Silver | 1 | 80 |
| Bronze | 1 | 70 |
| Copper | 1 | 30 |
| Billon | 1 | 20 |
| Electrum | 1 | 15 |
| Orichalcum | 1 | 12 |
| Potin | 1 | 10 |
| Nickel | 1 | 8 |
| Tumbaga | 1 | 5 |
| Pewter | 1 | 4 |

> Note: "Electrum" (corrected from original draft "Electron"). Tumbaga is a gold-copper alloy used in pre-Columbian coinage. Pewter is a tin-lead alloy common in English tokens and medieval issues.

**Denominations** (`field = 'denomination'`)

| value | is_builtin | usage_count |
|---|---|---|
| Aureus | 1 | 40 |
| Denarius | 1 | 80 |
| Antoninianus | 1 | 60 |
| Sestertius | 1 | 50 |
| Dupondius | 1 | 20 |
| As | 1 | 35 |
| Semis | 1 | 10 |
| Triens | 1 | 8 |
| Quadrans | 1 | 12 |
| Uncia | 1 | 6 |
| Quinarius | 1 | 15 |
| Miliarense | 1 | 12 |
| Siliqua | 1 | 18 |
| Follis | 1 | 30 |
| Nummus | 1 | 20 |

> Notes: "Follis" in its strict Diocletianic sense (large reformed bronze, ~10g, 294–330 AD). "Nummus" refers to the small late 4th-century bronze (AE3/AE4, ~1–2g, 330–400 AD). Triens (1/3 As) and Uncia (1/12 As) complete the Republican uncial bronze system. The ambiguity between Follis/Nummus should be noted in the UI tooltip.

**Grades** (`field = 'grade'`) — Full NGC/PCGS Sheldon Numeric Scale

| value | is_builtin | usage_count |
|---|---|---|
| MS-70 | 1 | 2 |
| MS-69 | 1 | 3 |
| MS-68 | 1 | 5 |
| MS-67 | 1 | 8 |
| MS-66 | 1 | 12 |
| MS-65 | 1 | 20 |
| MS-64 | 1 | 18 |
| MS-63 | 1 | 16 |
| MS-62 | 1 | 10 |
| MS-61 | 1 | 6 |
| MS-60 | 1 | 8 |
| AU-58 | 1 | 25 |
| AU-55 | 1 | 20 |
| AU-50 | 1 | 15 |
| EF-45 | 1 | 30 |
| EF-40 | 1 | 35 |
| VF-35 | 1 | 28 |
| VF-30 | 1 | 32 |
| VF-25 | 1 | 25 |
| VF-20 | 1 | 30 |
| F-15 | 1 | 20 |
| F-12 | 1 | 22 |
| VG-10 | 1 | 15 |
| VG-8 | 1 | 18 |
| G-6 | 1 | 10 |
| G-4 | 1 | 8 |
| AG-3 | 1 | 6 |
| FR-2 | 1 | 4 |

> Notes: EF-45/EF-40 use the canonical NGC/PCGS numeric notation (not "XF"). The non-numeric "XF" was archaic British usage retired by both grading services. "Choice" and "Gem" NGC marketing modifiers (e.g., Gem MS-65) are not distinct grade points and are excluded.

**Eras** (`field = 'era'`)

| value | is_builtin | usage_count |
|---|---|---|
| Ancient | 1 | 30 |
| Roman Republic | 1 | 40 |
| Roman Imperial | 1 | 80 |
| Roman Provincial | 1 | 25 |
| Byzantine | 1 | 30 |
| Early Medieval | 1 | 15 |
| High Medieval | 1 | 20 |
| Late Medieval | 1 | 15 |
| Medieval | 1 | 10 |
| Islamic | 1 | 12 |
| Modern | 1 | 20 |

> Notes: "Ancient" retained as catch-all for non-Roman ancient material (Greek, Celtic, Eastern). "Medieval" retained as catch-all for coins not further classified. Roman Republic/Imperial/Provincial map directly to different catalog systems (Crawford/RRC, RIC, RPC respectively).

**Die Axis** (`field = 'die_axis'`)

| value | is_builtin | usage_count |
|---|---|---|
| 1h | 1 | 5 |
| 2h | 1 | 5 |
| 3h | 1 | 15 |
| 4h | 1 | 8 |
| 5h | 1 | 8 |
| 6h | 1 | 50 |
| 7h | 1 | 8 |
| 8h | 1 | 8 |
| 9h | 1 | 15 |
| 10h | 1 | 6 |
| 11h | 1 | 5 |
| 12h | 1 | 45 |

> 6h (coin alignment) dominates Roman Imperial coinage from the 3rd century onward. 12h (medal alignment) is characteristic of early Roman Republican, Greek, and most UK coinage.

**Mints** (`field = 'mint'`)

| value | is_builtin | usage_count |
|---|---|---|
| Rome | 1 | 100 |
| Constantinople | 1 | 60 |
| Antioch | 1 | 45 |
| Alexandria | 1 | 40 |
| Lugdunum | 1 | 30 |
| Siscia | 1 | 25 |
| Mediolanum | 1 | 22 |
| Thessalonica | 1 | 20 |
| Nicomedia | 1 | 20 |
| Athens | 1 | 20 |
| Cyzicus | 1 | 18 |
| Ticinum | 1 | 15 |
| Aquileia | 1 | 15 |
| Carthage | 1 | 12 |
| Ephesus | 1 | 12 |

> Rome dominates for Roman Imperial coinage across nearly all periods. Constantinople becomes primary after 330 AD. Athens weight reflects its importance for Archaic/Classical Greek coinage.

### C. Nomisma.org Integration (Official Taxonomy Source)

> **NOTE:** We can optionally use **Nomisma.org** (American Numismatic Society) as an authoritative external source for standardized vocabulary. This is a **privacy-respecting** approach: we fetch once at seed time and cache locally in SQLite - no external API calls during normal app operation.

**Why Nomisma:**
- Linked Open Data (LOD) standard for numismatic concepts
- CC-BY licensed, free for commercial and non-commercial use
- Provides labels in 40+ languages (EN, ES, DE, FR, IT, etc.)
- Contains 25+ concept types: materials, denominations, mints, periods, regions, manufacture methods, wear, corrosion, shapes, and more

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

**Implementation Note:** Fetch Nomisma data at build/seed time via `getLabel` API or SPARQL, then store in local SQLite. No external network calls required during app runtime. This maintains the "Privacy First" principle while leveraging authoritative taxonomy.

**Fields NOT Covered by Nomisma.org:**

| Field | Why Not in Nomisma | Recommendation for Patina |
|-------|---------------------|---------------------------|
| **Grade** | Commercial grading (NGC/PCGS) - not public taxonomy | Full Sheldon numeric scale MS-70 to FR-2 (seeded per §2B) |
| **Die Axis** | Technical metric, not in ontology | Clock notation 1h–12h (seeded per §2B) |
| **Catalog References** | Available via specialized APIs (OCRE, CRRO) | Link to RIC, RPC, Crawford via external references |
| **Provenance** | Collection history - user-specific | Per-coin free text field |
| **Purchase Price** | Market value - volatile and private | Optional private field |

---

### D. UI Component: AutocompleteField

```typescript
interface AutocompleteFieldProps {
  field: VocabField;
  value: string;
  onChange: (value: string) => void;
  onAddNew: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
}
```

**Behavior:**
1. Display as regular input with dropdown chevron icon
2. On click/ArrowDown: Show dropdown with all options for that field sorted by `usage_count` desc
3. User can type to filter (case-insensitive partial match)
4. Selecting an option calls `vocab:increment` to increment `usage_count` (fire-and-forget; updated sort order takes effect on next dropdown open, not immediately)
5. "Add new value" option appears at bottom if user types a non-existent value
6. New values saved with `is_builtin = 0`
7. Duplicate detection is case-insensitive with display-case preservation
8. A "Reset to defaults" link appears at the bottom of the dropdown when user-added entries (`is_builtin = 0`) exist for that field; clicking it calls `vocab:reset` for that field

**Visual Design:**
- See §7 (UI Assessment) for full specification

### E. IPC Handlers

| Handler | Purpose | Registered |
|---------|---------|------------|
| `vocab:get` | Get all values for a field | `ipcMain.handle` |
| `vocab:add` | Add new vocabulary value | `ipcMain.handle` |
| `vocab:search` | Search values (for autocomplete) | `ipcMain.handle` |
| `vocab:increment` | Increment `usage_count` for a selected value | `ipcMain.handle` |
| `vocab:reset` | Delete user-added entries and restore seeded `usage_count` values; scoped to one field or all fields | `ipcMain.handle` |

> **Note:** `vocab:seed` is **not** an IPC handler. Seeding is called internally from `app.whenReady()` in `src/main/index.ts` before `createWindow()`. The Renderer cannot trigger seeding.

### F. Implementation Steps

1. **Database Schema (`src/common/schema.ts`)**
   - Add `vocabularies` table to the `SCHEMA` array
   - Add `preferences` table to the `SCHEMA` array
   - The `generateSQL()` function with `CREATE TABLE IF NOT EXISTS` handles migration automatically

2. **CoinSchema Migration (`src/common/validation.ts`)**
   - Change `era: z.enum(['Ancient', 'Medieval', 'Modern'])` to `era: z.string().min(1)`
   - The vocabulary system manages valid era values via `ALLOWED_VOCAB_FIELDS` whitelist
   - Add `ALLOWED_VOCAB_FIELDS`, `VocabGetSchema`, `VocabAddSchema`, `VocabSearchSchema`, `VocabIncrementSchema`, `VocabResetSchema` (see §5)

3. **Backend (`src/main/`)**
   - Add `getVocabularies()`, `addVocabulary()`, `searchVocabularies()`, `incrementVocabularyUsage()`, `resetVocabularies()`, `seedVocabularies()` to `db.ts`
   - Add `vocab:get`, `vocab:add`, `vocab:search`, `vocab:increment`, `vocab:reset` IPC handlers in `index.ts` with Zod validation
   - Call `dbService.seedVocabularies()` from `app.whenReady()` before `createWindow()`
   - `seedVocabularies()` logic: (1) read `vocab_seeded_version` from `preferences`; (2) if it matches `CURRENT_SEED_VERSION` constant (e.g. `'6a.1'`), return early; (3) run `INSERT OR IGNORE INTO vocabularies ...` for each seeded entry — the `UNIQUE(field, value, locale)` constraint silently skips existing rows, preserving user-modified `usage_count` values and user-added entries; (4) update `preferences` with new version
   - `resetVocabularies(field?: VocabField)`: (1) `DELETE FROM vocabularies WHERE is_builtin = 0` (scoped to field if provided); (2) `UPDATE vocabularies SET usage_count = <seeded_default> WHERE field = ? AND value = ?` for each affected builtin entry
   - Add vocab methods to `preload.ts` contextBridge (see §5.5)

4. **Frontend (`src/renderer/`)**
   - Create `AutocompleteField.tsx` component
   - Create `useVocabularies.ts` hook with the following interface:
     ```typescript
     // useVocabularies(field: VocabField): UseVocabulariesReturn
     interface UseVocabulariesReturn {
       options: string[];                         // values only, sorted by usage_count desc
       isLoading: boolean;
       error: string | null;
       addVocabulary: (value: string) => Promise<void>;   // returns void; hook refetches after success
       incrementUsage: (value: string) => void;   // fire-and-forget; does not block UI
       resetVocabularies: () => Promise<void>;    // field is bound from hook param
     }
     ```
   - Update `LedgerForm.tsx` to use `AutocompleteField` for: `metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`

5. **Types (`src/common/types.ts`)**
   - Add `Vocabulary` interface: `{ id: number; field: string; value: string; locale: string; is_builtin: boolean; usage_count: number; created_at: string }`
   - Add `VocabularyInput` type: `Omit<Vocabulary, 'id' | 'created_at'>`

---

## 3. Verification Strategy (Quality Oversight)

### Testing Plan
- **Unit Tests:**
  - `src/main/db.test.ts`: Vocabulary CRUD operations
  - `src/renderer/components/AutocompleteField.test.tsx`: Dropdown behavior, filtering, add-new-value
- **Hook Tests:**
  - `src/renderer/hooks/__tests__/useVocabularies.test.ts`: API integration, caching
- **Schema Tests:**
  - Extend `src/common/validation.test.ts` with VocabGetSchema, VocabAddSchema, VocabSearchSchema cases

### Colocation Check
- `src/renderer/components/AutocompleteField.test.tsx` next to `AutocompleteField.tsx`
- `src/renderer/hooks/__tests__/useVocabularies.test.ts` in the hooks `__tests__` directory
- `src/common/validation.test.ts` extended (do not create a duplicate file)

### Mocking Strategy
- Mock `window.electronAPI.getVocab`, `addVocabEntry`, `searchVocab` methods in `setupTests.ts`
- Use `vi.fn()` for IPC calls; `vi.clearAllMocks()` in `beforeEach`

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** Verified

### Audit Findings:
- **System Integrity:** Types must be added to `src/common/types.ts` - create `Vocabulary`, `VocabularyInput` types
- **Abstraction:** Vocabulary service isolated in `src/main/db.ts` - use existing parameterized query pattern
- **Cross-Process:** Zod validation for IPC input - require `.strict()` schemas in validation.ts
- **Schema Abstraction:** New tables must be added to `src/common/schema.ts` SCHEMA array — not as raw SQL in `db.ts`
- **era Enum Conflict (resolved):** `CoinSchema.era` changed from `z.enum([...])` to `z.string().min(1)` — eras are now a managed vocabulary enforced by the `ALLOWED_VOCAB_FIELDS` whitelist at the IPC layer

### Review Notes & Suggestions:
- Vocab types should include: `id`, `field`, `value`, `locale`, `is_builtin`, `usage_count`, `created_at`
- Zod schemas should be added alongside existing schemas in `src/common/validation.ts`
- `vocab:seed` must NOT be exposed as an IPC handler — seeding is a main-process-internal operation

---

## 5. Security Assessment (`securing-electron`)
**Status:** Verified

### 5.1 Final Zod Schemas — `src/common/validation.ts`

```typescript
/**
 * Vocabulary field names that are valid targets for vocab:get and vocab:search.
 * Kept as a const tuple so Zod can infer a union from it.
 */
export const ALLOWED_VOCAB_FIELDS = [
  'metal',
  'denomination',
  'grade',
  'era',
  'die_axis',
  'mint',
] as const;

export type VocabField = typeof ALLOWED_VOCAB_FIELDS[number];

// vocab:get — retrieve all stored values for one vocabulary field
export const VocabGetSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
}).strict();

// vocab:add — write a new vocabulary entry
// Unicode-safe value pattern: permits Unicode letters/digits, spaces, hyphens,
// apostrophes, parentheses, and punctuation. The /u flag is required for \p{}.
// Covers names like "Áureo", "Miliarense", "EF-40", "O'Brien".
export const VocabAddSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  value: z
    .string()
    .trim()                                    // strips leading/trailing whitespace before validation
    .min(1, 'Vocabulary value cannot be empty')
    .max(200, 'Vocabulary value must be 200 characters or fewer')
    .regex(
      /^[\p{L}\p{N}\s\-'().,:&]+$/u,
      'Value contains disallowed characters',
    ),
  locale: z.string().length(2).regex(/^[a-z]{2}$/).optional().default('en'),
}).strict();

// Note: .trim() is a Zod transform — the parsed output value is the trimmed string.
// IPC handlers must use result.data.value (the parsed output), not the raw input.

// vocab:search — prefix/substring search across a single vocabulary field
export const VocabSearchSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  query: z
    .string()
    .max(100, 'Search query must be 100 characters or fewer'),
}).strict();

// vocab:increment — increment usage_count for a selected existing value
export const VocabIncrementSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  value: z.string().min(1).max(200),
}).strict();

// vocab:reset — delete user-added entries and restore seeded usage_count values
// field is optional: omit to reset all fields, provide to scope to one field
export const VocabResetSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS).optional(),
}).strict();
```

**Regex rationale for `VocabAddSchema.value`:**

| Pattern | Rationale |
|---|---|
| `\p{L}` | All Unicode alphabetic characters (Á, ü, ñ, Greek, Cyrillic) |
| `\p{N}` | Unicode digits and numeric signs |
| `\s` | Spaces within values (e.g., "New Orleans") |
| `\-'().,:&` | Hyphens in grades (EF-40), apostrophes, parentheses, coin references |
| `/u` flag | Required — without it `\p{}` silently degrades |

### 5.2 ALLOWED_VOCAB_FIELDS as Runtime Guard

`ALLOWED_VOCAB_FIELDS` serves as both the Zod enum source and a defence-in-depth runtime guard in `db.ts`. Even though Zod has already validated the `field` at the IPC boundary, vocabulary DB functions must perform a redundant check before any `field` string is interpolated into SQL:

```typescript
if (!ALLOWED_VOCAB_FIELDS.includes(field as VocabField)) {
  throw new Error(`Invalid vocabulary field: ${field}`);
}
```

### 5.3 XSS Risk — No Sanitization Required at DB Layer

**Conclusion: no HTML sanitization at DB insert time. Mitigate at render time.**

React JSX escapes all text content by default. A vocabulary value like `<script>alert(1)</script>` stored in the DB renders as the literal string — not executed HTML — because React uses `textContent`, not `innerHTML`.

**The only real XSS vector** is `dangerouslySetInnerHTML`. This must never be used in `AutocompleteField` or any component rendering vocabulary values. Option labels must always be React text nodes: `<li>{value}</li>`, never `<li dangerouslySetInnerHTML=... />`.

**The structural defence** is the `VocabAddSchema.value` regex: characters `<`, `>`, and `"` are not in the allowed set and are rejected before reaching `better-sqlite3`. Do NOT add DOMPurify or HTML entity encoding at write time — this would corrupt legitimate values (`O'Brien` → `O&#39;Brien`) and create a data integrity bug.

### 5.4 `vocab:seed` — NOT an IPC Handler

`vocab:seed` must not appear on the IPC surface. Seeding is called from `app.whenReady()` in `src/main/index.ts` before the window opens:

```typescript
app.whenReady().then(() => {
  dbService.seedVocabularies();  // internal — no IPC, no bridge
  // ... protocol registration, session setup ...
  createWindow();
});
```

`seedVocabularies()` is never registered with `ipcMain.handle` and never appears in `preload.ts`.

### 5.5 `preload.ts` Additions

```typescript
// Add to import in preload.ts:
import type { VocabField } from '../common/validation';

// Add inside contextBridge.exposeInMainWorld('electronAPI', { ... }):

  // Vocabulary API
  getVocab: (field: VocabField) =>
    ipcRenderer.invoke('vocab:get', { field }),

  addVocabEntry: (field: VocabField, value: string): Promise<void> =>
    ipcRenderer.invoke('vocab:add', { field, value }),

  searchVocab: (field: VocabField, query: string) =>
    ipcRenderer.invoke('vocab:search', { field, query }),

  incrementVocabUsage: (field: VocabField, value: string): Promise<void> =>
    ipcRenderer.invoke('vocab:increment', { field, value }),

  resetVocab: (field?: VocabField): Promise<void> =>
    ipcRenderer.invoke('vocab:reset', { field }),
```

**Notes:** Arguments are passed as single object payloads to match `.strict()` schema expectations. The `locale` parameter is omitted from the preload signature for Phase 6a — the main process applies `default('en')` from `VocabAddSchema`. `ALLOWED_VOCAB_FIELDS` can be imported directly by the Renderer from `src/common/validation.ts` without an IPC round-trip. `addVocabEntry` returns `Promise<void>` — the hook is responsible for refetching the updated list after a successful add.

### 5.6 IPC Surface Summary

| Handler | Schema | Registered in main | Exposed in preload |
|---|---|---|---|
| `vocab:get` | `VocabGetSchema` | `ipcMain.handle` | `getVocab(field)` |
| `vocab:add` | `VocabAddSchema` | `ipcMain.handle` | `addVocabEntry(field, value): Promise<void>` |
| `vocab:search` | `VocabSearchSchema` | `ipcMain.handle` | `searchVocab(field, query)` |
| `vocab:increment` | `VocabIncrementSchema` | `ipcMain.handle` | `incrementVocabUsage(field, value): Promise<void>` |
| `vocab:reset` | `VocabResetSchema` | `ipcMain.handle` | `resetVocab(field?): Promise<void>` |
| `vocab:seed` | N/A — internal only | Not registered | Not exposed |

### Action Items:
- [ ] Add `ALLOWED_VOCAB_FIELDS`, `VocabField`, and all Zod schemas (`VocabGetSchema`, `VocabAddSchema`, `VocabSearchSchema`, `VocabIncrementSchema`, `VocabResetSchema`) to `src/common/validation.ts`
- [ ] Add vocabulary methods to `src/main/db.ts` with parameterized queries + runtime allowlist guard: `getVocabularies`, `addVocabulary`, `searchVocabularies`, `incrementVocabularyUsage`, `resetVocabularies`, `seedVocabularies`
- [ ] Add all vocab IPC handlers to `src/main/index.ts` with `.strict()` validation (`vocab:get`, `vocab:add`, `vocab:search`, `vocab:increment`, `vocab:reset`)
- [ ] Add all vocab methods to `src/main/preload.ts` with typed interfaces
- [ ] Call `dbService.seedVocabularies()` from `app.whenReady()` — not via IPC; use `INSERT OR IGNORE` + `CURRENT_SEED_VERSION` guard (see §2F step 3)
- [ ] Add unit tests for all Zod schema validation in `src/common/validation.test.ts`

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** Verified

### 6.1 Test File List

Following the Colocation Rule:

```
src/renderer/components/AutocompleteField.test.tsx   ← colocated with AutocompleteField.tsx
src/renderer/hooks/__tests__/useVocabularies.test.ts
src/common/validation.test.ts                        ← extend existing file, do not create a duplicate
```

### 6.2 AutocompleteField Test Cases

**Setup:** `DEFAULT_PROPS = { value: '', onChange: vi.fn(), options: ['Roman', 'Byzantine', 'Greek', 'Medieval'], placeholder: '...', onAddNew: vi.fn() }`. Run `vi.clearAllMocks()` in `beforeEach`.

**Rendering**
- TC-AC-01: Renders placeholder text
- TC-AC-02: Renders dropdown chevron icon with accessible label (aria-hidden)

**Dropdown Opening**
- TC-AC-03: Opens dropdown on click showing all options as `role="option"` elements
- TC-AC-04: `getAllByRole('option')` returns array of length `OPTIONS.length`

**Filtering**
- TC-AC-05: Filters options on typing (case-insensitive — `'rom'` shows only `'Roman'`)
- TC-AC-06: Shows all options when input is cleared

**Option Selection**
- TC-AC-07: Click selects option and calls `onChange` with the value; dropdown closes
- TC-AC-08: Input displays selected value after selection

**Add-New Option**
- TC-AC-09: Shows `Add "Sassanid"` option when typed value has no match
- TC-AC-10: Clicking Add option calls `onAddNew` with the typed value
- TC-AC-11: Does NOT show Add option when typed value exactly matches existing (case-insensitive — test `'roman'` and `'ROMAN'`)
- TC-AC-12: Does NOT show Add option when typed value exactly matches after trimming

**Closing**
- TC-AC-13: Escape closes dropdown; focus returns to input
- TC-AC-14: Blur closes dropdown (use `waitFor` — blur handling may be deferred)

**Keyboard Navigation**
- TC-AC-15: ArrowDown moves highlight to first option (`aria-selected="true"`)
- TC-AC-16: ArrowDown wraps from last option to first
- TC-AC-17: ArrowUp from first option wraps to last
- TC-AC-18: Enter confirms highlighted option; calls `onChange`; closes dropdown
- TC-AC-19: Enter on Add-New option calls `onAddNew` with typed value

**Accessibility / ARIA**
- TC-AC-20: Input has `role="combobox"` (on container `<div>`)
- TC-AC-21: `aria-expanded` reflects dropdown state (false → true → false)
- TC-AC-22: `aria-controls` links input to listbox `id`
- TC-AC-23: `aria-activedescendant` tracks keyboard-focused option `id`

**Scroll Close**
- TC-AC-24: Dispatching a `scroll` event on the nearest scrollable ancestor while the dropdown is open causes the dropdown to close (assert `aria-expanded="false"`)

### 6.3 useVocabularies Test Cases

**Hook interface:** `useVocabularies(field: VocabField)` returns `{ options: string[], isLoading: boolean, error: string | null, addVocabulary, incrementUsage, resetVocabularies }`. `addVocabulary` returns `Promise<void>` — the hook refetches the full list after a successful add. `incrementUsage` is fire-and-forget (no await, no state update). `resetVocabularies` returns `Promise<void>` and refetches after success.

**Initial Load**
- TC-UV-01: Loads vocabularies for a field on mount; `isLoading` true then false
- TC-UV-02: Returns empty array when no vocabularies exist; no error

**Caching**
- TC-UV-03: Does not re-fetch for the same field across renders (call count = 1)
- TC-UV-04: Fetches independently for different field names (call count = 2)

**addVocabulary**
- TC-UV-05: Calls `electronAPI.addVocabEntry` with correct `{ field, value }`; resolves `Promise<void>`
- TC-UV-06: Triggers a refresh of the vocabulary list after successful add
- TC-UV-07: Does not mutate state optimistically before API resolves (use deferred promise)

**incrementUsage**
- TC-UV-08: Calls `electronAPI.incrementVocabUsage` with `{ field, value }` when `incrementUsage` is invoked
- TC-UV-09: Does not update `options` state or trigger a re-fetch (fire-and-forget)

**searchVocabularies**
- TC-UV-10: Calls `electronAPI.searchVocab` with `{ field, query }` and returns result
- TC-UV-11: Empty string query returns all vocabularies

**resetVocabularies**
- TC-UV-12: Calls `electronAPI.resetVocab` with `{ field }` (the field bound to the hook)
- TC-UV-13: Triggers a refresh of the vocabulary list after successful reset
- TC-UV-14: Sets `error` and leaves list unchanged when `resetVocab` rejects

**Error Handling**
- TC-UV-15: Sets `error` and clears `isLoading` when `getVocab` rejects
- TC-UV-16: Sets `error` and leaves list unchanged when `addVocabEntry` rejects
- TC-UV-17: Clears `error` on successful re-fetch after previous error

### 6.4 Zod Schema Test Cases (100% branch coverage mandate)

**VocabGetSchema**
- TC-VS-01: Valid field name passes
- TC-VS-02: All allowed field names pass (parameterised `it.each`)
- TC-VS-03: Invalid field name rejected; issue path `['field']`
- TC-VS-04: Missing `field` property rejected
- TC-VS-05: Extra properties rejected; issue code `'unrecognized_keys'`

**VocabAddSchema**
- TC-VS-06: Valid `{ field, value }` passes
- TC-VS-07: Empty value string rejected; issue path `['value']`
- TC-VS-08: Value at exactly 200 chars passes (boundary)
- TC-VS-09: Value at 201 chars rejected; issue path `['value']`
- TC-VS-10: Invalid field name rejected; issue path `['field']`
- TC-VS-11: Extra properties rejected; issue code `'unrecognized_keys'`
- TC-VS-12: Whitespace-only value rejected — `.trim()` reduces `"   "` to `""`, then `.min(1)` rejects it; issue path `['value']`
- TC-VS-13: Value with leading/trailing spaces is accepted and output is trimmed (`"  Silver  "` → parsed `value` is `"Silver"`)

**VocabSearchSchema**
- TC-VS-14: Valid `{ field, query }` passes
- TC-VS-15: Empty query string passes (valid "return all" signal)
- TC-VS-16: Query at exactly 100 chars passes (boundary)
- TC-VS-17: Query at 101 chars rejected; issue path `['query']`
- TC-VS-18: Invalid field name rejected
- TC-VS-19: Extra properties rejected; issue code `'unrecognized_keys'`

**VocabIncrementSchema**
- TC-VS-20: Valid `{ field, value }` passes
- TC-VS-21: Invalid field name rejected; issue path `['field']`
- TC-VS-22: Empty value string rejected; issue path `['value']`
- TC-VS-23: Extra properties rejected; issue code `'unrecognized_keys'`

**VocabResetSchema**
- TC-VS-24: `{}` passes (omitted field = full reset)
- TC-VS-25: Valid `{ field }` passes (scoped reset)
- TC-VS-26: Invalid field name rejected; issue path `['field']`
- TC-VS-27: Extra properties rejected; issue code `'unrecognized_keys'`

### 6.5 Mocking Strategy

**Global mock additions to `src/renderer/setupTests.ts`:**
```typescript
getVocab: vi.fn().mockResolvedValue([]),
addVocabEntry: vi.fn().mockResolvedValue(undefined),
searchVocab: vi.fn().mockResolvedValue([]),
incrementVocabUsage: vi.fn().mockResolvedValue(undefined),
resetVocab: vi.fn().mockResolvedValue(undefined),
```

**Per-test overrides:** Use `mockResolvedValueOnce` for single-call cases; `mockRejectedValueOnce` for error cases. Run `vi.clearAllMocks()` in `beforeEach` (not `vi.resetAllMocks()` — that would wipe the global stubs).

**Type-safe mock helpers per test file:**
```typescript
const mockGetVocab = window.electronAPI.getVocab as ReturnType<typeof vi.fn>
```

**Never import from `src/main/db.ts` in renderer tests.** All DB interaction is observable only through `window.electronAPI` mocks.

### Coverage Compliance Summary

| Target | Mandate | Test Coverage |
|---|---|---|
| `src/common/validation.ts` | 100% branch | TC-VS-01 through TC-VS-27 cover all branches including all enum members, boundary values, missing fields, extra keys, `.trim()` transform, and new increment/reset schemas |
| `src/renderer/hooks/useVocabularies.ts` | 90% function | TC-UV-01 through TC-UV-17 exercise load, cache, add, increment, reset, search, refresh, and all error-state transitions |
| `src/renderer/components/AutocompleteField.tsx` | 80% statement | TC-AC-01 through TC-AC-24 cover all render paths, interaction flows, keyboard branches, ARIA logic, and scroll-close behavior |

---

## 7. UI Assessment (`curating-ui`)
**Status:** Verified

### Audit Findings:

#### 7.1 ARIA Combobox Specification

The `AutocompleteField` component implements the ARIA 1.2 combobox pattern with `aria-autocomplete="list"`. The component is composed of three distinct ARIA roles: a wrapping container, a text input (the combobox), and a listbox popup.

**Container element** (`<div>`):
```
role="combobox"
aria-haspopup="listbox"
aria-expanded="false" | "true"        — toggled when dropdown opens/closes
aria-owns="autocomplete-listbox-{id}" — references the listbox by ID
```
The container wraps both the `<input>` and the `<ul>` listbox so that the relationship is explicit in the accessibility tree. Do not place `role="combobox"` on the `<input>` itself — the input holds `aria-controls` instead.

**Input element** (`<input type="text">`):
```
role="textbox"                          — implicit on <input type="text">, no need to set explicitly
aria-autocomplete="list"                — options appear in a separate listbox element
aria-expanded="false" | "true"          — mirrors the container's expanded state
aria-controls="autocomplete-listbox-{id}"
aria-activedescendant=""                — set to the id of the currently highlighted option,
                                          empty string when no option is focused
autocomplete="off"                      — disables native browser autocomplete
```

**Listbox element** (`<ul>`):
```
role="listbox"
id="autocomplete-listbox-{id}"         — ID referenced by aria-controls and aria-owns
aria-label="{field label} options"     — e.g. "Metal options"
```
The listbox is rendered in the DOM at all times but hidden via CSS (`display: none`) when closed. Do not use conditional rendering for the listbox — screen readers need the element present to resolve `aria-controls`.

**Regular option element** (`<li>`):
```
role="option"
id="autocomplete-option-{id}-{index}"  — unique ID per option, referenced by aria-activedescendant
aria-selected="false" | "true"         — true when this option matches the current input value
```

**"Add new value" option element** (`<li>`):
```
role="option"
id="autocomplete-option-{id}-add-new"
aria-selected="false"
aria-label="Add new value: {typed value}" — the full prompt read by screen readers
data-action="add-new"                     — hook for automated testing
```

---

#### 7.2 Visual Design Specification

**Input field**

| Property | Value |
|---|---|
| Border | `none; border-bottom: 1px dashed var(--border-hairline)` at rest |
| Border (focused) | `border-bottom: 1px solid var(--text-ink)` |
| Background | `transparent` |
| Font family | `var(--font-serif)` — Cormorant Garamond, italic |
| Font size | `1.4rem` (subtitle-stack placement); `1rem` (standalone metric placement) |
| Color at rest | `var(--text-muted)` — `#6A6764` |
| Color on focus / with value | `var(--text-ink)` — `#2D2926` |
| Padding right | `1.5rem` — reserved for the chevron icon |

**Dropdown trigger icon**

A minimal downward chevron rendered as an inline SVG, positioned `absolute; right: 0; top: 50%; transform: translateY(-50%)`. Color `var(--text-muted)` at rest → `var(--text-ink)` on focus. Rotates 180° via `transform: rotate(180deg)` while dropdown is open. `aria-hidden` — visual affordance only.

**Dropdown container**

| Property | Value |
|---|---|
| Background | `var(--bg-manuscript)` — `#FCF9F2` |
| Border | `1px solid var(--border-hairline)` — `#E0DCCD` |
| Box shadow | `0 4px 16px rgba(45, 41, 38, 0.08)` |
| Max height | `240px` — approximately 6 options at standard row height |
| Overflow | `overflow-y: auto` |
| Margin top | `4px` |
| Z-index | `200` — required to render above all `.ledger-layout` elements; ensure no ancestor creates an unintentional stacking context |
| Min width | `200px` — guarantees legibility at narrow breakpoints where `.subtitle-stack` collapses |
| Transition | `opacity 0.15s ease` — static fade only; no slide animation |

**Option item**

| State | Appearance |
|---|---|
| Default | `padding: 0.6rem 0.75rem`; `var(--font-serif)`; `1rem`; color `var(--text-ink)` |
| Hover | Background `var(--stone-pedestal)` — `#F0EDE6` |
| Active / keyboard-focused | Background `var(--stone-pedestal)`; left border `2px solid var(--accent-manuscript)`; padding-left adjusted to `calc(0.75rem - 2px)` |
| Selected (matches current value) | Color `var(--accent-manuscript)`; font-weight `600` |

**"Add new value" option**

| Property | Value |
|---|---|
| Font style | `italic` |
| Color | `var(--accent-manuscript)` — `#914E32` (Burnt Sienna) |
| Prefix text | `Add "` + typed value + `"` |
| Separator | `1px solid var(--border-hairline)` above the item |

**Focus ring:** Bottom-border thickens from `1px dashed` to `1px solid` at focus. Keyboard-focused option uses left-border accent treatment — consistent with `.filter-item-label.active`.

---

#### 7.3 CSS Class Names

All classes in `src/renderer/styles/index.css` under `/* --- AutocompleteField --- */`:

| Class | Element | Purpose |
|---|---|---|
| `.autocomplete-field` | Outer `<div>` | `position: relative` — anchors the floating dropdown |
| `.autocomplete-input` | `<input>` | Standalone variant; inherits bottom-border pattern |
| `.autocomplete-chevron` | SVG `<span>` | Absolute-positioned trigger icon |
| `.autocomplete-chevron.open` | SVG when open | `transform: rotate(180deg)` |
| `.autocomplete-dropdown` | `<ul>` listbox | Floating container; `display: none` by default; `z-index: 200`; `min-width: 200px`; `opacity 0.15s ease` transition |
| `.autocomplete-dropdown.open` | `<ul>` when visible | `display: block` |
| `.autocomplete-option` | `<li>` items | Default option row |
| `.autocomplete-option--active` | `<li>` keyboard-focused | Left-border accent + stone-pedestal background |
| `.autocomplete-option--selected` | `<li>` matching value | Sienna color + semibold weight |
| `.autocomplete-option--add-new` | `<li>` add-new row | Italic, sienna, hairline separator above |

The `.subtitle-stack` context overrides `.autocomplete-input` sizing to `1.4rem` italic serif — scoping via `.subtitle-stack .autocomplete-input`.

---

#### 7.4 Keyboard Interaction Specification

| Key | Behavior |
|---|---|
| `Tab` | Moves focus to input. Dropdown does not open on Tab-focus alone. |
| `Click` on input | Opens dropdown, shows all options sorted by `usage_count` desc. |
| `ArrowDown` (closed) | Opens dropdown and highlights first option. |
| `ArrowDown` (open) | Moves highlight to next option. Wraps last → first. Updates `aria-activedescendant`. |
| `ArrowUp` (open) | Moves highlight to previous option. Wraps first → last. |
| `Enter` | If option highlighted: selects, closes, increments `usage_count`. If Add-New highlighted: creates entry, selects, closes. If nothing highlighted: no action. |
| `Escape` | Closes dropdown. Retains current input value. Returns focus to input. |
| `Typing` | Filters options (case-insensitive). First match auto-highlighted. Add-New appears when no exact match exists. |
| `Home` / `End` | Native cursor movement within input; does not navigate dropdown. |
| `Tab` (open) | Closes dropdown without selecting. Advances focus to next form element. |
| Scroll (nearest scrollable ancestor, open) | Closes dropdown without selecting. Attach listener on open; remove on close. |

**Wrap behavior:** ArrowDown on the last regular option wraps to the first regular option — not to the Add-New option. The Add-New option is reachable only by continuing ArrowDown past the last regular option.

---

#### 7.5 Single-Click Rule Compliance

**Selecting an existing value — 2 interactions:**
1. Click input (dropdown opens)
2. Click desired option (selected, dropdown closes)

**Adding a new value — 2 interactions:**
1. Click input and type (Add option appears as typed string diverges from existing entries)
2. Click `Add "[value]"` or Enter with Add-New highlighted (entry created and field populated)

Compliance: **Confirmed.** Both pointer and keyboard paths require at most 2 discrete interactions.

---

#### 7.6 Reset to Defaults UI

A "Reset to defaults" action is available per-field, accessible from within the dropdown itself.

**Trigger:** A small `<button>` rendered as the last item in the dropdown listbox, separated from the option list by a `1px solid var(--border-hairline)` divider. Rendered only when `options` contains at least one user-added entry (`is_builtin = 0`). Since the component receives only `string[]` options, the parent (`LedgerForm`) is responsible for passing an `onReset?: () => void` prop and a `hasUserValues?: boolean` prop to control visibility.

**Appearance:**

| Property | Value |
|---|---|
| Font style | `italic` |
| Color | `var(--text-muted)` — `#6A6764` |
| Text | `Reset to defaults` |
| Separator | `1px solid var(--border-hairline)` above the item |

**Behavior:** Clicking calls `onReset()` (which maps to `useVocabularies.resetVocabularies()`), closes the dropdown, and triggers a list refresh. No confirmation dialog — the action is recoverable (any reset value can be re-added as a user entry).

**`AutocompleteFieldProps` addition:**
```typescript
onReset?: () => void;      // if omitted, reset button is never rendered
hasUserValues?: boolean;   // controls reset button visibility
```

---

### Review Notes & Suggestions:

1. **Subtitle-stack placement:** The dropdown must break out of the grid flow via `position: absolute` anchored to the input, not the grid cell. Verify the dropdown does not clip at the `.subtitle-stack` grid boundary.
2. ~~**Z-index:**~~ Formalised as a requirement — see §7.2 and §7.3.
3. ~~**Scroll close:**~~ Formalised as a requirement — see §7.4 (keyboard interaction table) and §6.2 TC-AC-24.
4. **Placeholder:** Inherit `color: var(--text-muted); font-style: italic; opacity: 0.6` consistent with existing `.input-sub` placeholder treatment.
5. ~~**Minimum width:**~~ Formalised as a requirement — see §7.2.
6. ~~**Open transition:**~~ Formalised as a requirement — see §7.2.

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** Resolved

All action items from the original audit have been addressed in the revised seed data (§2B):

| Action | Status |
|---|---|
| Fix "Electron" → "Electrum" | ✅ Corrected |
| Add "Aureus" denomination | ✅ Added (usage_count: 40) |
| Remove duplicate "EF"; use numeric EF-45/EF-40 | ✅ Replaced with full Sheldon scale |
| Add numeric grading scale (MS-70 to FR-2, 28 values) | ✅ Complete |
| Expand eras to Roman Republic/Imperial/Provincial, Byzantine, Islamic | ✅ 11 eras seeded |
| Add Siliqua, Miliarense | ✅ Added |
| Add Triens, Uncia (fractional bronze) | ✅ Added |
| Add Tumbaga, Pewter to metals | ✅ Added |
| Add initial `usage_count` weights | ✅ All categories weighted |
| Add Mint as new vocabulary field | ✅ 15 mints seeded |

### Remaining Numismatic Notes:
- "Follis" vs "Nummus" disambiguation should be surfaced as a UI tooltip on the denomination field
- A future phase may add Greek-specific eras (Archaic, Classical, Hellenistic) for non-Roman collections
- Catalog reference prefixes (RIC, RPC, Crawford, BMC, SNG, DOC, Sear) may be added as a separate `catalog_ref` vocabulary field in a future phase

---

## 9. User Consultation & Decisions

### Open Questions (Original):
1. Should user-added vocabularies be per-collection or global? → **GLOBAL**
2. Should we offer a way to reset to default vocabulary? → **Yes, implement reset function**
3. How should duplicate detection work (case-insensitive)? → **Yes, with display-case preservation**

### Decisions Added 2026-03-20:
4. **`era` enum conflict:** `CoinSchema.era` changed from `z.enum(['Ancient', 'Medieval', 'Modern'])` to `z.string().min(1)`. Eras become a managed vocabulary enforced via the `ALLOWED_VOCAB_FIELDS` whitelist at the IPC layer — consistent with how `metal`, `denomination`, etc. are handled.

5. **`preferences` table scope:** Keep in Phase 6a but scoped to a single key: `vocab_seeded_version`. Used at startup to detect when to re-seed defaults. Broader preference use deferred to Phase 6b.

6. **i18n approach:** Phase 6a seeds English values only. The `vocabularies` table includes a `locale TEXT DEFAULT 'en'` column and `UNIQUE(field, value, locale)` constraint to enable Phase 6b to add translations without a schema migration.

### Final Decisions:
- **Scope:** Global vocabulary (shared across all collections)
- **Seed data:** 6 fields — metal (11), denomination (15), grade (28), era (11), die_axis (12), mint (15) = 92 total seeded entries
- **i18n deferral:** EN only in Phase 6a; `locale` column reserved for Phase 6b
- **No runtime external calls:** All vocabulary data local in SQLite; Nomisma.org fetch is seed-time only

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
- [Future: Add Greek-specific eras for non-Roman collections]
- [Future: catalog_ref vocabulary field with RIC/RPC/Crawford/BMC/SNG/DOC/Sear prefixes]
- **Core Doc Revision:** Update schema docs after implementation
