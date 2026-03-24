# Implementation Blueprint: Coin Research Panel — The Marginalia

**Date:** 2026-03-23
**Status:** Proposed
**Reference:** `docs/research/2026-03-22-coin-research-panel-research.md` (all open questions resolved)

---

## 1. Objective

Add a collapsible reference panel to the Scriptorium that surfaces numismatic lookup results from two sources — a bundled offline ANS catalog (OCRE + CRRO, CC0) and the Numista REST API — alongside the data-entry form. The collector types a catalog reference or title, triggers a lookup, and reviews a per-field suggestion list before selectively applying values to the form.

**Problem solved:** Collectors currently work across 4–6 separate browser tabs during a single cataloguing session, manually transcribing from external databases. No existing desktop tool integrates structured reference data alongside the entry form with selective field application.

**Design metaphor:** A marginalia column — the primary text (form) on the left, commentary (reference data) in a narrower column to the right. The panel recedes when not in use; the historical object remains the hero.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** Panel is a push-drawer column, not a modal. Two-state interaction (Search / Stage) is calm and deliberate. Attribution footer is understated. Matches the manuscript marginalia metaphor of the Manuscript Hybrid design language.
- [x] **Privacy First:** No CDN. No telemetry. No collection data in outbound requests. The renderer never touches the network. All HTTP calls originate from the Main process with a hardcoded API hostname. The collector's own Numista key is stored locally and never transmitted to any Patina server (there is no Patina server).
- [x] **Single-Click Rule:** Panel toggle is one click from the Scriptorium tab handle. Search and lookup are two interactions from that. API key settings are accessible from the existing `Herramientas ▾` dropdown.

---

## 2. Technical Strategy

### 2.1 DB — New `reference_cache` Table

Add to the `SCHEMA` array in `src/common/schema.ts` (after the `field_visibility` table):

```typescript
{
  name: 'reference_cache',
  columns: [
    { name: 'id',         type: 'TEXT', constraints: 'PRIMARY KEY' },
    { name: 'source',     type: 'TEXT', constraints: 'NOT NULL' },
    { name: 'data',       type: 'TEXT', constraints: 'NOT NULL' },
    { name: 'cached_at',  type: 'INTEGER', constraints: 'NOT NULL' },
  ]
}
```

- `id`: `"numista:{N-number}"` or `"ans:{catalog-ref}"` — globally unique per type per source.
- `data`: Raw JSON string (the original API or local-DB response before mapping).
- `cached_at`: Unix timestamp (seconds). TTL: 30 days (`30 * 24 * 60 * 60 = 2592000`).
- Cache is read-only from the renderer — all read/write goes through IPC handlers.

### 2.2 Shared Types (`src/common/types.ts`)

Add three new exported interfaces (no changes to `Coin` or existing types):

```typescript
export interface ReferenceSuggestion {
  field: string;           // matches keyof NewCoin
  value: string | number;
  label: string;           // localised field label for display in the panel
}

export interface ReferenceSearchResult {
  typeId: string;          // Numista N-number (string) or ANS OCRE/CRRO URI fragment
  title: string;
  catalogRef: string;      // Primary reference, e.g. "KM# 169" or "RIC I Augustus 15"
  issuer: string;
  yearRange: string;       // "1958–1970" or "27 BCE–14 CE"
  source: 'numista' | 'ans';
  fromCache: boolean;
}

export interface ReferenceLookupResult {
  source: 'numista' | 'ans';
  typeId: string;
  title: string;
  catalogRef: string;
  allCatalogRefs: string[];   // all cross-references, for the collector to inspect
  suggestions: ReferenceSuggestion[];
  fromCache: boolean;
}
```

### 2.3 Validation Schemas (`src/common/validation.ts`)

Add after the `PdfExportOptionsSchema` block:

```typescript
// ── Reference Panel Schemas ─────────────────────────────────────────────────

export const RefSearchSchema = z.object({
  query:  z.string().min(1).max(200, 'Query must be 200 characters or fewer').trim(),
  source: z.enum(['numista', 'ans']),
}).strict();

export const RefLookupSchema = z.object({
  typeId: z.string().min(1).max(500),
  source: z.enum(['numista', 'ans']),
}).strict();

export const RefSetApiKeySchema = z.object({
  key: z.string()
    .min(1, 'API key cannot be empty')
    .max(500, 'API key must be 500 characters or fewer')
    .regex(/^[\w\-]+$/, 'API key contains disallowed characters'),
}).strict();

export const RefTestApiKeySchema = RefSetApiKeySchema; // same shape, same validation
```

### 2.4 IPC Bridge (`src/main/preload.ts`)

Add a new `// Reference Panel API` section after the `// Field Visibility API` block:

```typescript
// Reference Panel API
refSearch:      (query: string, source: 'numista' | 'ans') =>
  ipcRenderer.invoke('ref:search', { query, source }),
refLookup:      (typeId: string, source: 'numista' | 'ans') =>
  ipcRenderer.invoke('ref:lookup', { typeId, source }),
refGetApiKey:   () =>
  ipcRenderer.invoke('ref:getApiKey'),
refSetApiKey:   (key: string) =>
  ipcRenderer.invoke('ref:setApiKey', { key }),
refTestApiKey:  (key: string) =>
  ipcRenderer.invoke('ref:testApiKey', { key }),
```

All five methods pass only structured, schema-validated payloads. The renderer never constructs a URL or issues a network request directly.

### 2.5 IPC Handlers (`src/main/index.ts`)

Add after the `prefs:resetVisibility` handler:

```typescript
// Reference Panel IPC Handlers
ipcMain.handle('ref:search', async (_, data: unknown) => {
  const { query, source } = validateIpc(RefSearchSchema, data);
  return referenceService.search(query, source);
});

ipcMain.handle('ref:lookup', async (_, data: unknown) => {
  const { typeId, source } = validateIpc(RefLookupSchema, data);
  return referenceService.lookup(typeId, source);
});

ipcMain.handle('ref:getApiKey', () => {
  return dbService.getPreference('numista_api_key');
});

ipcMain.handle('ref:setApiKey', (_, data: unknown) => {
  const { key } = validateIpc(RefSetApiKeySchema, data);
  dbService.setPreference('numista_api_key', key);
});

ipcMain.handle('ref:testApiKey', async (_, data: unknown) => {
  const { key } = validateIpc(RefTestApiKeySchema, data);
  return referenceService.testApiKey(key);
});
```

**Preference key expansion (required `db.ts` change):** `dbService.getPreference` and `dbService.setPreference` are currently typed as `(key: 'language')` — a literal type that will cause a `tsc` error when called with `'numista_api_key'`. As part of T1, widen the union in `src/main/db.ts`:
```typescript
// Before:
getPreference: (key: 'language'): string | null => { ... }
setPreference: (key: 'language', value: string): void => { ... }

// After:
getPreference: (key: 'language' | 'numista_api_key'): string | null => { ... }
setPreference: (key: 'language' | 'numista_api_key', value: string): void => { ... }
```
This keeps the type safe (only hardcoded caller-controlled keys) while allowing the new preference. The existing `PreferenceGetSchema` / `PreferenceSetSchema` are unaffected — the `ref:getApiKey` and `ref:setApiKey` IPC handlers use their own dedicated schemas and do not go through the generic `pref:get` / `pref:set` channel.

### 2.6 ANS Build Pipeline (`scripts/build-ans-bundle.cjs`)

A Node.js build-time script (not shipped to end users). Runs during development setup and in CI.

```
npm run build:ans-catalog
```

**Steps:**
1. Download OCRE and CRRO RDF/N-Triples dumps from ANS GitHub tagged releases (HTTPS fetch).
2. Parse with `n3` npm package; extract Nomisma.org triples of interest:
   - `nmo:NumismaticObject` types only
   - `dcterms:title`, `skos:prefLabel`
   - `nmo:hasMaterial` → `metal`
   - `nmo:hasStartDate`, `nmo:hasEndDate`
   - `nmo:hasWeight`, `nmo:hasDiameter`
   - `nmo:hasMint` → `mint`
   - `dcterms:description` (obverse/reverse)
   - `nmo:hasLegend` (obverse/reverse legends)
   - `crm:P1_is_identified_by` → catalog reference (RIC/Crawford number)
3. Write to `resources/ans-catalog.db` (SQLite):
   - Table: `ans_types(id TEXT PRIMARY KEY, catalog_ref TEXT, authority TEXT, mint TEXT, start_year INTEGER, end_year INTEGER, metal TEXT, weight REAL, diameter REAL, obverse_desc TEXT, obverse_legend TEXT, reverse_desc TEXT, reverse_legend TEXT, full_title TEXT)`
   - FTS5 virtual table: `ans_fts(full_title, authority, obverse_desc, reverse_desc, obverse_legend, reverse_legend)` with `content=ans_types`.
4. Target: ≤ 35 MB compressed. Version stamp written to `resources/ans-catalog-version.txt`.

The bundled DB ships in Electron `resources/`. In production, accessed via `path.join(process.resourcesPath, 'ans-catalog.db')`. In development: `path.join(app.getAppPath(), 'resources/ans-catalog.db')`.

### 2.7 ANS Catalog Service (`src/main/ans-catalog.ts`)

New read-only service, lazily initialised:

```typescript
export class AnsCatalogService {
  private db: Database.Database | null = null;

  private getDb(): Database.Database { /* lazy init with read-only flag */ }

  searchByText(query: string): ReferenceSearchResult[] { /* FTS5 query */ }
  lookupById(id: string): RawAnsRecord | null { /* exact ID match */ }
  lookupByCatalogRef(ref: string): RawAnsRecord | null { /* parsed RIC/Crawford notation */ }
  isAvailable(): boolean { /* returns false if resources/ans-catalog.db absent */ }
}
```

If `ans-catalog.db` is absent (first-dev-checkout scenario), `isAvailable()` returns `false` and the panel's ANS source option is disabled with an inline message guiding the developer to run `npm run build:ans-catalog`.

### 2.8 Reference Service (`src/main/reference-service.ts`)

The single coordination layer for both data paths. Owns all field mapping logic.

```typescript
export class ReferenceService {
  constructor(private db: DatabaseService, private ansCatalog: AnsCatalogService) {}

  async search(query: string, source: 'numista' | 'ans'): Promise<ReferenceSearchResult[]>
  async lookup(typeId: string, source: 'numista' | 'ans'): Promise<ReferenceLookupResult>
  async testApiKey(key: string): Promise<{ ok: boolean; error?: string }>

  // Private: Numista API
  private async numistaSearch(query: string, apiKey: string): Promise<...>
  private async numistaLookup(typeId: string, apiKey: string): Promise<...>
  private mapNumistaToSuggestions(raw: NumistaTypeRecord): ReferenceSuggestion[]

  // Private: Cache
  private getCached(id: string): ReferenceLookupResult | null
  private setCached(id: string, source: string, raw: unknown): void

  // Private: Field mapping
  private mapOrientation(val: 'coin' | 'medal' | 'variable'): string
  private inferEra(minYear: number): string
}
```

**Numista network calls:** Use `net.fetch` from `electron` — Electron-idiomatic, respects system proxy, stays in the Main process. Base URL hardcoded to `https://api.numista.com/api/v3/`. The API key is retrieved from `dbService.getPreference('numista_api_key')` — never passed in from the renderer. If no key is stored, `search` and `lookup` for the `numista` source return an `{ error: 'no_api_key' }` sentinel that the renderer uses to show the "Configure API key" prompt.

**Field mapping table** (implemented in `mapNumistaToSuggestions`):

| Patina `field` | Numista path | Transform |
|---|---|---|
| `title` | `title` | Direct |
| `issuer` | `issuer.name` | Object → string |
| `denomination` | `value.text` | Direct |
| `year_display` | `min_year` + `max_year` | BCE/CE aware (see note below) |
| `metal` | `composition.text` | Service-layer fuzzy match against vocabulary (see note) |
| `weight` | `weight` | Direct (grams) |
| `diameter` | `diameter` | Direct (mm) |
| `die_axis` | `orientation` | `"coin"→"6h"`, `"medal"→"12h"`, `"variable"→` omit (no suggestion) |
| `obverse_legend` | `obverse.lettering` | Skip if absent |
| `obverse_desc` | `obverse.description` | Direct |
| `reverse_legend` | `reverse.lettering` | Skip if absent |
| `reverse_desc` | `reverse.description` | Direct |
| `edge_desc` | `edge.description` | Fallback to `edge.type` if absent |
| `catalog_ref` | `references[0]` | `"{catalogue.name} {number}"` (see RIC/Crawford note) |
| `mint` | `mints[0].name` | First mint; pass `lang` param to Numista for locale-aware name |
| `era` | Derived from `min_year` via vocabulary lookup | See era note below |

Fields with no Numista equivalent (`fineness`, `grade`, `rarity`, `provenance`, `story`, acquisition fields) are excluded from suggestions — they are specimen-specific, not type data. `rarity` is also excluded because it has no seeded vocabulary values and is not in `ALLOWED_VOCAB_FIELDS`.

**Die-axis note:** The seeded `die_axis` vocabulary uses clock-position notation (`1h`–`12h`), not degree notation. `"coin"` alignment (reverse rotated 180° relative to obverse) maps to `"6h"`. `"medal"` alignment (dies aligned 0°) maps to `"12h"`. `"variable"` has no single vocabulary equivalent and must be omitted from suggestions.

**Year display note:** Numista `min_year` and `max_year` are plain integers; negative values represent BCE. The mapping:
- `-44` → `"44 BCE"`, `14` → `"14 CE"`
- Range: `min_year=-27, max_year=14` → `"27 BCE–14 CE"`
- Single year: `min_year=1958, max_year=1958` → `"1958"`
- Year `0` is invalid in the historical calendar — if Numista returns `0`, treat it as `1 BCE`
- `year_numeric` is not suggested from the type record (only the display string is)

**Metal note:** `composition.text` is a free-text string (e.g., `"Copper-nickel"`). Fuzzy matching must occur in `mapNumistaToSuggestions` in the service layer (not in the UI). Strategy: case-insensitive exact match first; strip fineness suffixes (e.g., `"Silver 0.900"` → `"Silver"`); common aliases (`"Copper-nickel"` → no seeded match — pass through as raw suggestion with a `matched: false` flag the UI uses to show a "no vocabulary match" indicator).

**RIC/Crawford note:** For OCRE records, the catalog reference display format must include the edition:
- OCRE URI `ric.1(2).aug.15` → `"RIC I(2) Augustus 15"`
- CRRO URI `rrc.494/32` → `"RRC 494/32"` (canonical; `Crawford 494/32` is accepted as search input but output always uses `RRC`)

**Era note:** `inferEra(minYear: number, eraVocab: string[])` must accept the live vocabulary list at call time (queried from `dbService.getVocabularies('era', locale)`) rather than hardcoding strings. This ensures the suggested era always matches an existing vocabulary term. Provisional mapping against seeded English vocabulary:

| Year range | Suggested vocabulary value |
|---|---|
| ≤ −500 | `"Ancient"` |
| −500 – −508 CE (Roman Republic dates) | `"Roman Republic"` |
| −27 – 476 CE | `"Roman Imperial"` |
| 27 BCE – 284 CE (Provincial overlap) | `"Roman Provincial"` (only for coins with `mint` data indicating provinces) |
| 476 – 1453 CE | `"Byzantine"` |
| 1054 – 1453 CE | `"High Medieval"` (best-effort; use `"Byzantine"` for Eastern Empire) |
| 1453 – 1799 | `"Medieval"` (late) |
| ≥ 1800 | `"Modern"` |

In practice, `inferEra` returns the first vocabulary term whose year range contains `minYear`. If the vocabulary has been customised by the collector, the seeded terms may differ — `inferEra` should return `null` rather than a non-vocabulary string if no match is found.

### 2.9 `useReferencePanel` Hook (`src/renderer/hooks/useReferencePanel.ts`)

```typescript
type PanelMode = 'idle' | 'searching' | 'results' | 'loading-detail' | 'staging' | 'error';

interface UseReferencePanelReturn {
  mode: PanelMode;
  source: 'numista' | 'ans';
  setSource: (s: 'numista' | 'ans') => void;
  query: string;
  setQuery: (q: string) => void;
  results: ReferenceSearchResult[];
  stagedResult: ReferenceLookupResult | null;
  checkedFields: Set<string>;
  errorMessage: string | null;
  search: () => Promise<void>;
  selectResult: (typeId: string) => Promise<void>;
  toggleField: (field: string) => void;
  applySelected: (updateField: (key: string, value: unknown) => void) => void;
  forceRefresh: () => Promise<void>;
  reset: () => void;
}
```

**Pre-check logic** in `selectResult`: after fetching a `ReferenceLookupResult`, iterate `suggestions`. For each suggestion, check whether the corresponding `formData` field is empty/null. Pre-check if empty; pre-uncheck if already has a value. This protects existing collector work by default.

`applySelected` iterates `checkedFields`, calls `updateField(field, value)` for each, then calls `reset()`. It does NOT call any IPC — it writes only into React form state (`useCoinForm`'s `formData`).

### 2.10 `ReferencePanel` Component (`src/renderer/components/ReferencePanel.tsx`)

Props:
```typescript
interface ReferencePanelProps {
  formData: CoinFormData;                              // for pre-check logic
  updateField: (key: string, value: unknown) => void;  // from useCoinForm
  isOpen: boolean;
  onClose: () => void;
}
```

The component calls `useReferencePanel`, passing `formData` to the hook for pre-check logic.

**Search view** (modes: `idle`, `searching`, `results`, `error`):
- `<input>` for query (catalog ref or title)
- Source toggle: two `<button>` tabs — "ANS Local" / "Numista"
- "Consultar" (`<button>`) — disabled during `searching`
- Results list: each row shows `title`, `catalogRef`, `yearRange`, `issuer`; clicking selects
- If `source === 'numista'` and no API key: shows inline "Configura tu clave API →" prompt
- If ANS unavailable: shows "Catálogo ANS no disponible" with setup instruction
- Attribution footer when source is numista: `Datos de Numista (CC BY-NC-SA)`

**Stage view** (mode: `staging`):
- Back button (returns to results)
- Result header: `title`, `catalogRef`
- Force-refresh icon (↻) if `fromCache === true`
- Per-field suggestion rows:
  - Checkbox + field label + current value (greyed, or "—" if empty) + proposed value
  - Rows with no proposed value are hidden
  - Rows where proposed value equals current value are shown but pre-unchecked
- "Aplicar seleccionados" button (calls `applySelected`)
- "Cancelar" button (calls `reset`)

### 2.11 Scriptorium Layout (`Scriptorium.tsx` + `index.css`)

**`Scriptorium.tsx`** changes:
```typescript
const [panelOpen, setPanelOpen] = useState(false);

// Keyboard shortcut
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
      const tag = (e.target as HTMLElement)?.tagName;
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault();
        setPanelOpen(prev => !prev);
      }
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);

// In JSX:
<div className={`ledger-layout${panelOpen ? ' ledger-layout--with-panel' : ''}`}>
  <PlateEditor ... />
  <LedgerForm ... />
  {panelOpen && (
    <ReferencePanel
      formData={formData}
      updateField={updateField}
      isOpen={panelOpen}
      onClose={() => setPanelOpen(false)}
    />
  )}
</div>
<button
  className="panel-toggle-tab"
  onClick={() => setPanelOpen(prev => !prev)}
  aria-expanded={panelOpen}
  aria-label={panelOpen ? t('reference.panel.close') : t('reference.panel.open')}
>
  {t('reference.panel.tabLabel')}
</button>
```

**CSS additions to `src/renderer/styles/index.css`**:
```css
/* Reference panel — 3-column layout */
@media (min-width: 1100px) {
  .ledger-layout--with-panel {
    grid-template-columns: 40% 1fr 320px;
  }
}

.panel-toggle-tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  transform-origin: right center;
  /* ... manuscript styling */
  min-height: 44px; /* touch target */
}

.reference-panel { /* 320px, flex column, overflow-y: auto */ }
.reference-panel__header { /* ... */ }
.reference-panel__suggestion-row { /* label + current + proposed + checkbox */ }
```

The tab handle is visible even when the panel is closed (it floats on the right edge of the Scriptorium). Below 1100 px, `.ledger-layout--with-panel` reverts to single-column stacking.

### 2.12 API Key Settings (`src/renderer/components/ApiKeySettings.tsx`)

A focused settings component rendered in a new route `/settings/reference` or as a modal sheet from the `Herramientas ▾` dropdown.

**Recommendation:** Add a `Herramientas ▾` item "Preferencias de referencia" that opens `ApiKeySettings` as an in-page overlay (following the existing `Personalizar` / field visibility pattern). This avoids adding a new route.

```typescript
interface ApiKeySettingsProps {
  onClose: () => void;
}
```

Internal state: `{ draftKey, testStatus: 'idle' | 'testing' | 'ok' | 'error', testError }`.

UI:
- `<input type="password">` for the API key (masked by default, reveal toggle)
- "Probar conexión" button — calls `window.electronAPI.refTestApiKey(draftKey)`, shows success badge or error message
- "Obtener clave →" `<a>` (opens `en.numista.com/api/doc/index.html` via `shell.openExternal`)
- "Guardar" button — calls `window.electronAPI.refSetApiKey(draftKey)`, closes
- Attribution: "Datos de Numista bajo licencia CC BY-NC-SA"

**`shell.openExternal`** must be invoked from Main (not renderer). Add an IPC handler `shell:openExternal` with a strict allowlist — only `https://en.numista.com/api/doc/index.html` is permitted. See Security section for details.

---

## 3. Verification Strategy

### Task-by-task checkpoints

- **T1 (schema):** `node scripts/extract_schema.cjs` shows `reference_cache` table.
- **T2 (IPC):** `npx tsc --noEmit` passes. Manual `ping`-style test in dev confirms handlers register.
- **T3 (ANS bundle):** `node scripts/build-ans-bundle.cjs` completes; `resources/ans-catalog.db` is ≤35 MB; `sqlite3 resources/ans-catalog.db "SELECT COUNT(*) FROM ans_types;"` returns ≥50,000.
- **T4 (reference service):** Unit tests for every field mapping case; cache read/write; `testApiKey` returns `{ ok: true }` with a real (developer) Numista key.
- **T5 (hook):** All state transitions covered; pre-check logic tested with filled and empty `formData`; `applySelected` calls `updateField` for checked fields only.
- **T6 (component):** Search view renders correctly; Stage view renders per-field rows; "Aplicar seleccionados" triggers `updateField` via mock.
- **T7 (layout):** Scriptorium renders with and without panel class; keyboard shortcut fires toggle; panel does not open when focus is in an input.
- **T8 (API key settings):** Test badge shows on success; error message shown on failure; key is masked by default.
- **T9 (i18n):** `npm test` — `translations.test.ts` passes with no missing keys in either locale.

### Coverage targets
- `reference-service.ts`: ≥90% function coverage (including all mapping branches)
- `useReferencePanel.ts`: ≥90% function coverage
- `ReferencePanel.tsx`: ≥80% statement coverage
- `ApiKeySettings.tsx`: ≥80% statement coverage
- New validation schemas: 100% branch coverage (extend existing `validation.test.ts`)

### Final gate
`npx tsc --noEmit` must pass with zero errors before the blueprint moves to Verification.

---

## 4. Architectural Oversight (`curating-blueprints`)

**Status:** Verified

### Audit Findings:
- **System Integrity:** Types for `ReferenceSuggestion`, `ReferenceSearchResult`, and `ReferenceLookupResult` are in `src/common/types.ts`, shared across processes. The renderer imports types but never constructs API URLs or issues network requests.
- **Abstraction:** All Numista → Patina field mapping is encapsulated in `ReferenceService.mapNumistaToSuggestions()`. The IPC handlers call service methods — they do not contain mapping logic. The renderer receives already-mapped `ReferenceSuggestion[]` objects.
- **Preference key expansion:** The `numista_api_key` preference is handled by dedicated `ref:getApiKey` / `ref:setApiKey` handlers with their own Zod schemas, preserving the integrity of the existing `PreferenceGetSchema` / `PreferenceSetSchema`.
- **State ownership:** `formData` is owned exclusively by `useCoinForm`. The reference panel writes to it via the `updateField` callback — never via direct DB access. This is consistent with the existing architecture.
- **ANS DB isolation:** The ANS catalog uses a separate `better-sqlite3` connection from the user's `patina.db`. It is opened read-only and lazily. The `AnsCatalogService` is a separate class from `DatabaseService`.

### Review Notes & Suggestions:
- The `shell.openExternal` IPC handler must use a strict URL allowlist (see Section 5 Security). This is the only outbound URL that the renderer is allowed to trigger indirectly.
- The `net.fetch` call in `ReferenceService` must set a reasonable timeout (e.g., 10 seconds) to prevent the IPC handler from hanging if Numista is slow.
- T3 (ANS bundle script) should be added to `package.json` as `"build:ans-catalog": "node scripts/build-ans-bundle.cjs"` and documented in the `Commands` section of `CLAUDE.md`.

---

## 5. Security Assessment (`securing-electron`)

**Status:** Verified

### Audit Findings:

#### 5.1 The Filter — IPC Handler Validation Coverage

All five new IPC handlers (`ref:search`, `ref:lookup`, `ref:getApiKey`, `ref:setApiKey`, `ref:testApiKey`) are proposed to use `validateIpc` with strict Zod schemas. The four schemas (`RefSearchSchema`, `RefLookupSchema`, `RefSetApiKeySchema`, `RefTestApiKeySchema`) are all `.strict()`, matching the established pattern in `src/common/validation.ts`. This is consistent with every existing handler in `src/main/index.ts` (lines 73–80 define `validateIpc`; all vocab, preference, and visibility handlers use it).

**Gap — `ref:getApiKey` has no validation:** The handler as proposed (blueprint §2.5, line 143) calls `dbService.getPreference('numista_api_key')` with no `data` argument and no `validateIpc` call. This is correct — there is no payload to validate. However, this means `ref:getApiKey` is the only handler in the new group with no schema guard. This is an intentional and acceptable exception, identical to the existing `prefs:getVisibility` handler (index.ts line 240), which also takes no arguments. No fix required; explicitly document the exception in the handler comment.

**Gap — `typeId` length bound:** `RefLookupSchema` sets `typeId` to `z.string().min(1).max(500)`. Numista N-numbers are at most 7 digits; ANS OCRE URIs are typically 30–60 characters. A 500-character ceiling is unnecessarily generous. Recommend tightening to `.max(100)` to limit the surface area of any downstream DB query or API call that embeds `typeId` directly.

**Gap — `query` sanitisation in `RefSearchSchema`:** The schema applies `.trim()` and a 200-character maximum, but no character-class restriction. Unlike `VocabAddSchema` (validation.ts line 122–126), which enforces `^[\p{L}\p{N}\s\-'().,:&]+$/u`, `RefSearchSchema` permits arbitrary Unicode, including control characters and SQL metacharacters. The query reaches `better-sqlite3` via FTS5 (ANS path) or `net.fetch` as a URL query parameter (Numista path). `better-sqlite3` parameterised queries are safe from SQL injection regardless, but a character restriction adds defence-in-depth and prevents control characters from reaching log output. Add: `.regex(/^[\p{L}\p{N}\s\-'().,:&#]+$/u, 'Query contains disallowed characters')`.

#### 5.2 `shell.openExternal` Risk

The blueprint proposes a `shell:openUrl` IPC handler invoked by `ApiKeySettings` for the "Obtener clave →" link (§2.12). The renderer must never call `shell.openExternal` directly — Electron's `shell` module is not exposed through the context bridge (`src/main/preload.ts` confirms it is absent). The handler must live in `src/main/index.ts`.

**Proposed single-URL allowlist is insufficient for long-term safety.** A URL-equality check (`url === 'https://en.numista.com/api/doc/index.html'`) is fragile — if the blueprint is later extended (e.g., an ANS record link, a PCGS lookup, forum reference), developers will be tempted to add raw strings to an ad-hoc list. Instead, implement a structured URL allowlist with origin + path-prefix validation:

```typescript
const ALLOWED_EXTERNAL_URLS: ReadonlySet<string> = new Set([
  'https://en.numista.com/api/doc/index.html',
]);

ipcMain.handle('shell:openUrl', (_, data: unknown) => {
  const { url } = validateIpc(ShellOpenUrlSchema, data);
  if (!ALLOWED_EXTERNAL_URLS.has(url)) {
    throw new Error('URL not in allowlist');
  }
  shell.openExternal(url);
});
```

Add `ShellOpenUrlSchema` to `src/common/validation.ts`:

```typescript
export const ShellOpenUrlSchema = z.object({
  url: z.string().url().startsWith('https://'),
}).strict();
```

The `.startsWith('https://')` refinement on top of `.url()` ensures `javascript:`, `file:`, and `data:` URIs are rejected even if a future programmer adds a non-HTTPS entry to the allowlist by mistake.

**For future ANS record links:** The ANS detail URL pattern is `https://numismatics.org/ocre/id/<fragment>` and `https://numismatics.org/crro/id/<fragment>`. If these are added, the allowlist check must compare URL origins and path prefixes — not just full URL equality — because the `<fragment>` is dynamic. At that point, replace the `Set` with a function that checks `new URL(url).origin` against an allowlist of origins and, where needed, `pathname.startsWith()` against permitted path prefixes. Do not add this complexity now; note it for the Phase 2 scope decision.

**The `ApiKeySettings` "Obtener clave →" element** must be an `<a href="#">` whose click handler calls `window.electronAPI.shellOpenUrl(...)`, not an `<a href="https://...">` — the latter would attempt navigation, which is blocked by the `will-navigate` handler in `index.ts` (lines 50–64).

#### 5.3 API Key Storage in `preferences` Table

Storing the Numista API key in the `preferences` SQLite table (`patina.db`) is acceptable for the threat model (local desktop app, single-user, no cloud sync). The key is a personal API credential with no financial value; the worst-case exposure is exhaustion of the collector's Numista daily quota.

**Specific risks with the current `getPreference`/`setPreference` pattern:**

1. **No key-allowlist at the DB layer.** The `preferences` table accepts any string key. Unlike the `pref:get` / `pref:set` handlers (validation.ts lines 140–147), which use `z.literal('language')` to lock the key to a single permitted value, the new `ref:setApiKey` handler bypasses these schemas entirely and calls `dbService.setPreference('numista_api_key', key)` with a hardcoded string in the handler itself. This is safe as written — the key is not renderer-supplied — but the pattern means the `preferences` table has effectively become an open-ended key-value store. Future handlers must not use `dbService.setPreference` with a renderer-supplied key string; ensure this is documented in `AGENTS.md`.

2. **Key returned to renderer in plaintext.** `ref:getApiKey` returns the raw key to the renderer for display in `ApiKeySettings`. This is necessary for UX but means the key briefly exists in the renderer's V8 heap. Because `contextIsolation: true` and `sandbox: true` are enforced (index.ts lines 35–36), no third-party renderer code can access the heap, so this is an acceptable exposure window. Mitigate display risk by returning only the last 4 characters for display (mask as `••••••••XXXX`) and returning the full key only when the user explicitly clicks "reveal" — handled entirely in the renderer without a second IPC round-trip, since the key is already in the component's local state at that point.

3. **Key never logged.** Verify that `dbService.setPreference` and `dbService.getPreference` implementations do not log their arguments. The audit has not read `src/main/db.ts` — implementors must confirm no `console.log(key, value)` patterns exist in those methods.

4. **No encryption at rest.** SQLite plaintext. Acceptable for the threat model (an attacker with filesystem access to `patina.db` has already compromised the machine). No change required.

#### 5.4 `net.fetch` in Main Process

Using `electron.net.fetch` is the correct approach: it stays in the Main process (the renderer never touches the network), respects the system proxy (relevant for collectors behind corporate proxies), and avoids the complexity of a separate `http` module. This is the Electron-idiomatic choice over Node's native `https` module.

**Mandatory: enforce a request timeout.** `net.fetch` does not have a built-in timeout parameter. Without one, a slow or unresponsive Numista server will cause the `ref:search` or `ref:lookup` IPC handler to hang indefinitely, blocking the renderer's IPC call. Use `AbortController` with a fixed timeout:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10 s
try {
  const response = await net.fetch(url, {
    signal: controller.signal,
    headers: { 'Numista-API-Key': apiKey },
  });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

10 seconds is appropriate for an API call over a typical home network. Expose this as a named constant (`NUMISTA_REQUEST_TIMEOUT_MS = 10_000`) in `reference-service.ts` for testability.

**SSL certificate validation:** `electron.net.fetch` validates SSL certificates by default (it uses Chromium's network stack). Do not pass any option that disables certificate verification. No action required; document this as a deliberate default.

**Response size limit:** The Numista API returns type records with embedded description text and image URL lists. Without a size guard, a malformed or adversarial response could allocate significant memory. After receiving the response, check `response.headers.get('content-length')` before calling `response.json()`. If `content-length` is present and exceeds 512 KB, abort. Also wrap `response.json()` in a try/catch — a non-JSON content type (e.g., a Numista maintenance page) must not propagate as an unhandled rejection.

#### 5.5 Rate-Limit DoS Protection

The blueprint proposes an in-memory per-session rate limit of 10 requests per minute for `ref:search` and `ref:lookup`. This is adequate for the threat model (a local bug or accidental rapid re-render triggering repeated IPC calls). The Numista free-tier daily quota is 1,000 requests/day; 10/min prevents a runaway loop from exhausting it within a few minutes.

**Recommended implementation** in `src/main/reference-service.ts`:

```typescript
private readonly rateLimitWindow = 60_000; // 1 minute in ms
private readonly rateLimitMax = 10;
private requestTimestamps: number[] = [];

private checkRateLimit(): void {
  const now = Date.now();
  this.requestTimestamps = this.requestTimestamps.filter(
    ts => now - ts < this.rateLimitWindow
  );
  if (this.requestTimestamps.length >= this.rateLimitMax) {
    throw new Error('rate_limit_exceeded');
  }
  this.requestTimestamps.push(now);
}
```

Call `this.checkRateLimit()` at the top of both `numistaSearch` and `numistaLookup` (Numista path only — the ANS path is local and need not be rate-limited). The renderer must handle the `rate_limit_exceeded` error string gracefully (display a brief cooldown message rather than a generic error).

**Note:** This is a session-scoped, in-process counter. It resets when the app restarts. That is acceptable — the goal is protecting against runaway loops in the current session, not enforcing a persistent daily budget. A persistent counter (persisted to SQLite with a rolling 24-hour window) would be a stronger control but is disproportionate for this threat model.

#### 5.6 Numista API Response Sanitisation

The blueprint mentions stripping `<` and `>` from description fields. **This is insufficient as stated, but the actual risk is low given the rendering path.**

**Why the risk is low:** React JSX escapes string content automatically. Any `ReferenceSuggestion.value` string rendered as `{suggestion.value}` in JSX is treated as a text node — `<script>` becomes `&lt;script&gt;` in the DOM. No `dangerouslySetInnerHTML` is proposed anywhere in `ReferencePanel.tsx` or `ApiKeySettings.tsx`. Therefore, raw HTML from the Numista API cannot execute in the renderer under any normal rendering path.

**Why the stated sanitiser is still insufficient for edge cases:** Stripping only `<` and `>` does not address:
- Unicode directional overrides (e.g., U+202E RIGHT-TO-LEFT OVERRIDE) that could visually misrepresent a field value in the Stage view.
- Null bytes (`\u0000`) that can cause truncation in SQLite TEXT columns when the sanitised value is written to `reference_cache.data`.
- JavaScript URL schemes (`javascript:...`) if any future code path uses the value in an `href`.

**Recommended sanitisation** in `ReferenceService.mapNumistaToSuggestions()`, applied to all string fields before constructing `ReferenceSuggestion` objects:

```typescript
function sanitiseText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control characters incl. null bytes
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '') // strip Unicode directional/invisible
    .trim();
}
```

HTML stripping (`<` / `>`) is unnecessary given JSX escaping, but add it as an explicit comment in the function for future maintainers: `// React JSX escapes these; strip defensively for cache storage and non-JSX paths`.

#### 5.7 ANS Local DB — Path Traversal and FTS5 Injection

**Path traversal:** The ANS catalog DB path is constructed at runtime using either `process.resourcesPath` (production) or `app.getAppPath()` (development), both of which are controlled by the Electron runtime, not by the renderer. The renderer cannot influence the path — it passes only the `typeId` string (validated by `RefLookupSchema`) and the `query` string (validated by `RefSearchSchema`). No path traversal risk exists in the file-open path.

**FTS5 query injection:** FTS5 accepts arbitrary query syntax including operators (`AND`, `OR`, `NOT`, `*`, `"..."`, `NEAR()`). A renderer-supplied query string passed directly to an FTS5 `MATCH` expression can cause unexpected query behaviour (e.g., `NOT *` matching nothing, or a syntax error crashing the query). This is not a security vulnerability in the traditional sense — the ANS DB is read-only and contains no sensitive data — but it is a reliability issue that manifests as an unhandled exception in the IPC handler.

**Fix:** Wrap FTS5 queries in a phrase search by double-quoting the input and escaping embedded double quotes, or use `better-sqlite3`'s parameterised query with an FTS5-safe wrapper:

```typescript
// Escape for FTS5 phrase query: wrap in quotes, escape internal quotes
function fts5Escape(query: string): string {
  return '"' + query.replace(/"/g, '""') + '"';
}
// Then: db.prepare('SELECT ... FROM ans_fts WHERE ans_fts MATCH ?').all(fts5Escape(query))
```

This coerces all queries to simple phrase searches, preventing FTS5 operator injection while preserving multi-word matching. Document in `AnsCatalogService.searchByText()` that advanced FTS5 operators are intentionally disabled.

**`lookupById` and `lookupByCatalogRef`:** These use exact-match `WHERE id = ?` and parameterised queries via `better-sqlite3`, which are safe from SQL injection by construction. No additional fix needed.

**ANS DB integrity:** Open the ANS DB with `{ readonly: true }` flag in `better-sqlite3`. If the DB file is absent or corrupt, `getDb()` must throw a descriptive error caught by the IPC handler — do not let a raw `better-sqlite3` error propagate to the renderer.

#### 5.8 API Key Masking and Clipboard Exposure

`<input type="password">` with a reveal toggle is the correct UX pattern. The following risks apply:

**Clipboard exposure on copy:** When the field is in `type="password"` mode, most browsers/Electron's WebContents prevent drag-to-select but still permit Ctrl+A/Ctrl+C. There is no reliable browser API to intercept clipboard writes from a standard input. This is acceptable — the key is stored locally, the clipboard is a user-controlled resource, and the threat model does not include clipboard sniffers. No fix required; document as a known acceptable exposure.

**Reveal toggle `aria-pressed` and state leakage:** The `<button aria-pressed="true/false">` toggle pattern (correctly specified in §7) toggles `type` between `"password"` and `"text"`. In `type="text"` mode, the value is visible in the DOM and accessible to any accessibility tool reading the DOM tree. This is expected behaviour for a password reveal toggle and matches the platform convention. No fix required.

**Auto-fill and password manager interaction:** Electron's WebContents may offer password manager integration for `<input type="password" name="...">` fields. To prevent the system password manager from prompting to save a Numista API key as a "password," add `autocomplete="off"` to the input. This does not prevent manual copy but suppresses the save prompt.

**Key retention in component state:** The `draftKey` state persists in the React component tree while `ApiKeySettings` is open. When the overlay is closed (via `onClose`), the component unmounts and `draftKey` is garbage-collected. This is acceptable. If the component is cached (e.g., rendered but hidden via CSS), the key remains in memory until the next unmount. Prefer conditional rendering (`panelOpen && <ApiKeySettings />`) over CSS visibility toggling to ensure the key is cleared from state when the overlay closes.

**Key not returned in `ref:testApiKey` response:** Confirmed — the handler returns only `{ ok: boolean; error?: string }`. The key is sent to the Main process for testing but never echoed back. Correct.

### Review Notes & Actionable Items:

1. **Tighten `RefLookupSchema.typeId` max length** from 500 to 100 characters in `src/common/validation.ts`.
2. **Add character-class restriction to `RefSearchSchema.query`** — use the same Unicode letter/number/whitespace/punctuation pattern as `VocabAddSchema`.
3. **`ShellOpenUrlSchema`** must be added to `src/common/validation.ts` with `z.string().url().startsWith('https://')`. The `shell:openUrl` handler must use `ALLOWED_EXTERNAL_URLS: ReadonlySet<string>` in `index.ts`.
4. **`net.fetch` timeout** — use `AbortController` with a 10-second timeout. Expose as `NUMISTA_REQUEST_TIMEOUT_MS` constant. Add response size guard (512 KB ceiling before calling `.json()`).
5. **Rate-limit implementation** — sliding-window `requestTimestamps: number[]` in `ReferenceService`. Apply to Numista network paths only. Expose `rate_limit_exceeded` error string for renderer to handle gracefully.
6. **Sanitise API response text** — strip control characters and Unicode directional overrides via `sanitiseText()` in `mapNumistaToSuggestions()`. HTML stripping is not necessary for XSS protection given JSX rendering, but strip for cache storage hygiene.
7. **FTS5 injection** — wrap all FTS5 queries with `fts5Escape()` (phrase-quote + double-quote escaping) in `AnsCatalogService.searchByText()`.
8. **ANS DB open flags** — always open with `{ readonly: true }` in `better-sqlite3`.
9. **API key display** — return masked version (last 4 chars) for initial display; only reveal full key on explicit toggle, using locally-held state rather than a second IPC round-trip.
10. **`autocomplete="off"`** on the `<input type="password">` in `ApiKeySettings.tsx` to suppress system password manager prompts.
11. **Confirm `dbService.setPreference` / `getPreference` do not log their arguments** — search `src/main/db.ts` for `console.log` calls touching `key` or `value` parameters before shipping.
12. **Document `preferences` table key hygiene** in `AGENTS.md` — future `setPreference` callers must hardcode the key string in the handler, never accept it from renderer-supplied data.

---

## 6. Quality Assessment (`assuring-quality`)

**Status:** Verified

### Audit Findings:

#### 6.1 Coverage Gap Analysis

The Section 3 targets (100% branch on validation schemas, 90% function on hooks and service, 80% statement on components) are achievable and sufficient. They match the project mandates in `docs/guides/testing_standards.md` Section 4 exactly. The risks below are the branches most likely to be missed without deliberate attention.

**`validation.ts` — 100% branch (4 new schemas, ~14 branches total):**

`RefSearchSchema`: query passes (min 1), query fails min (empty string `""`), query fails max (201-char string), source enum rejects an unknown value such as `"pcgs"`. `RefLookupSchema`: passes, `typeId` empty, `source` invalid. `RefSetApiKeySchema` / `RefTestApiKeySchema` share a shape: key passes, key empty, key over 500 chars, key fails the `^[\w\-]+$` regex (e.g. a value containing `"<script>"`). The regex branch is the most commonly missed — it must be explicitly covered with a test input containing a disallowed character. The four new schemas are not yet imported in `src/common/__tests__/validation.test.ts` — they must be added to the import list with a new `describe` block for each before the coverage run, or the 100% branch target will fail silently.

**`reference-service.ts` — 90% function (field-mapping branches are the primary risk):**

`mapNumistaToSuggestions` needs two fixture objects: one with every field present, one with minimal fields. The skip-if-absent branches for `obverse_legend` and `reverse_legend` (both null) and the `edge_desc` fallback to `edge.type` when `edge.description` is null must each be covered by a dedicated test. `inferEra` has 5 era buckets — all 5 plus the four boundary values (−500, 476, 1453, 1800) must be exercised. `mapOrientation` has 3 explicit values plus an implicit fallthrough for `"variable"` — all 4 must be covered. The `getCached` TTL branch (is `cached_at` within 30 days?) is time-dependent: use `vi.useFakeTimers()` and advance by `2_592_001_000` ms to force the stale path.

**`useReferencePanel.ts` — 90% function:**

The `applySelected` path where `checkedFields` is empty must be tested explicitly — confirm `updateField` is never called. The pre-check logic in `selectResult` has two branches per suggestion field: field is empty (pre-check) and field already has a value (pre-uncheck). At least one test must use a `formData` where some fields are populated and some are empty, asserting the resulting `checkedFields` set is exactly the expected subset.

**`ReferencePanel.tsx` and `ApiKeySettings.tsx` — 80% statement:**

The conditional renders for `mode === 'error'`, the "no API key" prompt (`source === 'numista'` and no key stored), the "ANS unavailable" message, and the `fromCache === true` force-refresh icon are the branches most likely to be omitted. Each must be triggered by a corresponding mock state.

#### 6.2 Colocation Compliance

All proposed test file locations conform to the Colocation Rule in `docs/guides/testing_standards.md` Section 4:

| Source file | Correct test location | Status |
|---|---|---|
| `src/renderer/hooks/useReferencePanel.ts` | `src/renderer/hooks/__tests__/useReferencePanel.test.ts` | Compliant |
| `src/renderer/components/ReferencePanel.tsx` | `src/renderer/components/ReferencePanel.test.tsx` | Compliant |
| `src/renderer/components/ApiKeySettings.tsx` | `src/renderer/components/ApiKeySettings.test.tsx` | Compliant |
| `src/main/reference-service.ts` | `src/main/__tests__/reference-service.test.ts` | Compliant — `src/main/__tests__/` does not yet exist; create the directory |
| `src/main/ans-catalog.ts` | `src/main/__tests__/ans-catalog.test.ts` | Compliant — same new directory |

`src/main/__tests__/` currently has no files. Creating it follows the established `src/renderer/hooks/__tests__/` sub-directory pattern. Both main-process test files belong there.

#### 6.3 `useReferencePanel` Async Safety

The hook's three public async methods — `search`, `selectResult`, and `forceRefresh` — each call `window.electronAPI` and then call `setState` on resolution. Two safety requirements apply.

**Unmount-during-fetch protection:** The hook must guard every `setState` call with a `mounted` ref. An `AbortController` is not applicable here because the abort signal cannot be threaded into `window.electronAPI.refSearch` — the IPC call is opaque from the renderer side. The correct pattern, consistent with the `useLens` hook:

```typescript
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

// Inside each async method, before every setState call:
const data = await window.electronAPI.refSearch(query, source);
if (!mountedRef.current) return;
setResults(data);
```

**Required `waitFor`/`findBy*` patterns:** Every test that calls `search`, `selectResult`, or `forceRefresh` must use `act(async () => { ... })` to trigger the call, then `waitFor` or `findBy*` to assert on the resulting state. Use `mockImplementation(() => new Promise(() => {}))` to hold the promise open when testing the in-flight `searching` / `loading-detail` states — this is the same pattern used in `useExport.test.ts` line 20.

Mandatory named test cases for `src/renderer/hooks/__tests__/useReferencePanel.test.ts`:

- `TC-URP-01: initialises in idle mode with empty results and no error`
- `TC-URP-02: transitions to searching mode while refSearch is in-flight`
- `TC-URP-03: transitions to results mode on successful search`
- `TC-URP-04: transitions to error mode when refSearch rejects`
- `TC-URP-05: setSource changes the active source`
- `TC-URP-06: selectResult pre-checks empty fields and pre-unchecks filled fields` — provide `formData` with `title = "Athens Owl"` (non-empty) and `metal = ""` (empty); assert `checkedFields` contains `"metal"` but not `"title"`
- `TC-URP-07: applySelected calls updateField for each checked field then calls reset`
- `TC-URP-08: applySelected is a no-op when checkedFields is empty`
- `TC-URP-09: forceRefresh re-fetches the staged result`
- `TC-URP-10: unmount during in-flight search produces no React state-update warning` — spy on `console.error`, start a search using a never-resolving promise mock, call `unmount()`, flush microtasks with `await act(async () => {})`, assert `consoleSpy` was not called

#### 6.4 Mock Completeness — `setupTests.ts` Additions

The following five entries must be appended inside the `window.electronAPI = { ... }` object in `src/renderer/setupTests.ts`. Default return values represent the cold "no API key configured" state:

```typescript
refSearch:     vi.fn().mockResolvedValue([]),
refLookup:     vi.fn().mockResolvedValue(null),
refGetApiKey:  vi.fn().mockResolvedValue(null),
refSetApiKey:  vi.fn().mockResolvedValue(undefined),
refTestApiKey: vi.fn().mockResolvedValue({ ok: false, error: 'no_api_key' }),
```

Individual tests override these in `beforeEach` using `vi.mocked(window.electronAPI.refSearch).mockResolvedValue(...)`. The canonical model is `useFieldVisibility.test.ts` (e.g., line 41: `vi.mocked(window.electronAPI.prefsGetVisibility).mockResolvedValue(...)`).

The TypeScript interface for `window.electronAPI` must also be extended with the five new method signatures before `npx tsc --noEmit` will pass. This is a Zero-Error Rule blocker — do not defer it.

#### 6.5 ANS Catalog Fixture — Minimum Viable Schema and Data

Tests for `AnsCatalogService` must not depend on the 35 MB production bundle. A fixture SQLite database should live at `src/main/__tests__/fixtures/ans-catalog-fixture.db`. The minimum viable schema mirrors Section 2.6 exactly:

```sql
CREATE TABLE ans_types (
  id             TEXT PRIMARY KEY,
  catalog_ref    TEXT,
  authority      TEXT,
  mint           TEXT,
  start_year     INTEGER,
  end_year       INTEGER,
  metal          TEXT,
  weight         REAL,
  diameter       REAL,
  obverse_desc   TEXT,
  obverse_legend TEXT,
  reverse_desc   TEXT,
  reverse_legend TEXT,
  full_title     TEXT
);

CREATE VIRTUAL TABLE ans_fts USING fts5 (
  full_title, authority, obverse_desc, reverse_desc,
  obverse_legend, reverse_legend,
  content=ans_types
);
```

Minimum data: 7 rows chosen to cover each test scenario:

| id | catalog_ref | authority | start_year | end_year | metal | purpose |
|---|---|---|---|---|---|---|
| `ric.1(2).aug.15` | `RIC I Augustus 15` | `Augustus` | -27 | 14 | `Silver` | RIC notation; ancient era |
| `ric.2.tra.147` | `RIC II Trajan 147` | `Trajan` | 98 | 117 | `Gold` | different RIC volume |
| `rrc.494/32` | `RRC 494/32` | `Roman Republic` | -48 | -48 | `Silver` | Crawford notation; single-year range |
| `ocre.byzan.const.1` | `DOC I 1a` | `Constantine I` | 306 | 337 | `Bronze` | medieval-boundary era |
| `ans.medieval.001` | `Medieval 1` | `Charlemagne` | 800 | 814 | `Silver` | medieval era |
| `ans.modern.001` | `KM# 169` | `Spain` | 1869 | 1870 | `Silver` | modern era |
| `ans.fts.special` | `FTS Test` | `Test Authority` | 1500 | 1600 | `Gold` | FTS match; `obverse_legend` populated, `reverse_legend` NULL — covers skip-if-absent branch |

The fixture must not be committed as a binary. Create `scripts/create-ans-fixture.cjs` that builds it from the SQL above using `better-sqlite3`, and add a Vitest `globalSetup` that runs the script if the file is absent. The script must be idempotent.

Mandatory test cases for `src/main/__tests__/ans-catalog.test.ts`:

- `TC-ACS-01: searchByText returns results matching an FTS query`
- `TC-ACS-02: searchByText returns empty array for a query with no matches`
- `TC-ACS-03: searchByText handles FTS special-syntax input without throwing (e.g. query string "NOT *")`
- `TC-ACS-04: lookupById returns the correct record by exact id`
- `TC-ACS-05: lookupById returns null for an unknown id`
- `TC-ACS-06: lookupByCatalogRef finds a record by RIC notation`
- `TC-ACS-07: lookupByCatalogRef finds a record by Crawford notation`
- `TC-ACS-08: isAvailable returns false when the DB file path does not exist` — inject a non-existent path via constructor argument or test-only factory

#### 6.6 `reference-service.ts` — Mocking `net.fetch`

`net.fetch` is imported from the `electron` package, which is unavailable in the Vitest/Node.js environment. Mock it at the module level using `vi.mock` placed before all other imports:

```typescript
// src/main/__tests__/reference-service.test.ts — before all imports
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  net: {
    fetch: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/patina-test'),
    getAppPath: vi.fn().mockReturnValue('/tmp/patina-test'),
  },
}));

import { net } from 'electron';
```

Per-test mock for a successful Numista search:

```typescript
vi.mocked(net.fetch).mockResolvedValueOnce({
  ok: true,
  headers: { get: (_: string) => '12000' },  // content-length under 512 KB
  json: async () => ({
    count: 1,
    types: [{
      id: 12345,
      title: 'Athenian Owl Tetradrachm',
      issuer: { name: 'Athens' },
      value: { text: 'Tetradrachm' },
      min_year: -480, max_year: -406,
      composition: { text: 'Silver' },
      weight: 17.2, diameter: 25,
      orientation: 'coin',
      obverse: { description: 'Helmeted Athena', lettering: 'AOE' },
      reverse: { description: 'Owl with olive sprig', lettering: null },
      edge: { description: null, type: 'plain' },
      references: [{ catalogue: { name: 'HGC' }, number: '4, 1597' }],
      mints: [{ name: 'Athens' }],
    }],
  }),
} as unknown as Response);
```

The `as unknown as Response` cast is necessary because `net.fetch` returns an Electron `Response`-like object; the mock must implement `json()` as an `async` function to match the real interface. Three `testApiKey` branches must be covered: `{ ok: true }` (valid key), `{ ok: false, status: 401 }` (bad key), and `mockRejectedValueOnce(new Error('Network error'))` (network failure).

#### 6.7 i18n Parity — New Key Count and Automatic Detection

**Estimated new key count:** Based on the UI specified in Sections 2.9, 2.10, 2.11, and 2.12, approximately 31 new keys are needed across a new `reference` namespace:

- `reference.panel.open`, `reference.panel.close`, `reference.panel.tabLabel` — 3 keys (cited explicitly in §2.11 JSX)
- `reference.search.placeholder`, `reference.search.submit`, `reference.search.sourceAns`, `reference.search.sourceNumista` — 4 keys
- `reference.search.noApiKey`, `reference.search.ansUnavailable`, `reference.search.ansUnavailableHint` — 3 keys
- `reference.results.empty`, `reference.results.attribution` — 2 keys
- `reference.stage.back`, `reference.stage.apply`, `reference.stage.cancel`, `reference.stage.forceRefresh`, `reference.stage.currentEmpty`, `reference.stage.proposedValue` — 6 keys
- `reference.apiKey.title`, `reference.apiKey.label`, `reference.apiKey.reveal`, `reference.apiKey.hide`, `reference.apiKey.test`, `reference.apiKey.testOk`, `reference.apiKey.testError`, `reference.apiKey.getKey`, `reference.apiKey.save`, `reference.apiKey.attribution` — 10 keys
- `reference.error.generic`, `reference.error.networkTimeout`, `reference.error.rateLimit` — 3 keys

The existing codebase has 195 total keys across `en.json` and `es.json`. This feature adds approximately 16% more keys. The actual count may be 28–35 as implementation proceeds.

**Automatic detection:** Yes. `src/renderer/i18n/__tests__/translations.test.ts` performs a strict bidirectional diff of all flattened keys. Any key present in one locale but absent from the other causes the test to fail with a diff list. No changes to the test file are needed — it automatically covers new keys. All new keys must be added to both `en.json` and `es.json` before committing.

**Known limitation:** The parity test checks key existence only, not value content. A key set to `"TODO"` in `es.json` will pass. The `reference.panel.tabLabel` key is particularly exposed — it appears on the always-visible fixed tab handle in Scriptorium. Spanish translations must be reviewed (not just stubbed) before the T9 gate is considered complete.

#### 6.8 Scriptorium Keyboard Shortcut — Test Strategy

The shortcut handler in §2.11 attaches to `document` via `addEventListener('keydown', handler)` inside a `useEffect` and inspects `e.target.tagName` to suppress the shortcut when focus is inside an `INPUT`, `TEXTAREA`, or `SELECT`.

**`userEvent.keyboard` is not sufficient alone.** `@testing-library/user-event`'s `keyboard` API dispatches events on the currently focused element, not on `document`. Use `fireEvent.keyDown(document, {...})` instead — the correct JSDOM approach for document-level handlers, consistent with the `GlossaryDrawer.test.tsx` pattern.

**Positive case (panel opens when body is focused):**

```typescript
import { fireEvent, waitFor } from '@testing-library/react';

document.body.focus(); // ensure no input is focused

fireEvent.keyDown(document, {
  key: 'L', code: 'KeyL',
  ctrlKey: true,  // JSDOM navigator.platform is '', isMac = false
  shiftKey: true,
  bubbles: true,
});

await waitFor(() => {
  expect(screen.getByRole('complementary')).toBeInTheDocument();
});
```

**Negative case (shortcut suppressed when an INPUT is focused):**

```typescript
const input = screen.getByPlaceholderText('Designation of the coin...');
input.focus();

fireEvent.keyDown(document, {
  key: 'L', code: 'KeyL', ctrlKey: true, shiftKey: true, bubbles: true,
});

expect(screen.queryByRole('complementary')).toBeNull();
```

**`navigator.platform` mock for the Mac branch:** JSDOM sets `navigator.platform` to `""` by default, making `isMac` always `false`. To exercise the `metaKey` path, override it before the test:

```typescript
Object.defineProperty(navigator, 'platform', {
  value: 'MacIntel', configurable: true, writable: true,
});
// Restore in afterEach:
Object.defineProperty(navigator, 'platform', { value: '', configurable: true, writable: true });
```

**Listener cleanup:** Spy on `document.removeEventListener` with `vi.spyOn(document, 'removeEventListener')` before rendering, call `unmount()`, and assert the spy was called with `'keydown'`.

Mandatory named test cases for `Scriptorium.test.tsx`:

- `TC-SCR-REF-01: renders panel-toggle-tab button with aria-expanded=false when panel is closed`
- `TC-SCR-REF-02: clicking panel-toggle-tab opens ReferencePanel and sets aria-expanded=true`
- `TC-SCR-REF-03: Ctrl+Shift+L opens the panel when document.body is focused (non-Mac)`
- `TC-SCR-REF-04: Ctrl+Shift+L is suppressed when an INPUT element is focused`
- `TC-SCR-REF-05: Meta+Shift+L opens the panel when navigator.platform is MacIntel`
- `TC-SCR-REF-06: keydown listener is removed from document on component unmount`

### Review Notes & Suggestions:

- **`validation.test.ts` import extension is the most likely first CI failure.** Add the four new schema imports and their `describe` blocks before any other testing work — the coverage gate will fail silently without them.

- **`src/main/__tests__/` does not yet exist.** Create it with the first test file committed. Verify that `tsconfig` glob patterns include `src/main/**/*.test.ts` — if currently scoped to only `src/renderer/`, the new tests will not be type-checked by `npx tsc --noEmit`.

- **ANS fixture must not be committed as binary.** Use `scripts/create-ans-fixture.cjs` with a Vitest `globalSetup` as described in §6.5. The script should be idempotent.

- **`forceRefresh` vs `selectResult` cache-bypass must be clarified before writing `TC-URP-09`.** If the `refLookup` IPC handler does not accept a bypass flag, the test must assert the observable re-fetch behaviour, not an assumed cache-bypass mechanism. Clarify this in the hook's implementation comment.

- **`ApiKeySettings.test.tsx` must explicitly test the password reveal toggle.** After clicking the reveal button, assert `input.getAttribute('type') === 'text'`; after clicking again, assert `'password'`. Do not rely on visual inspection or snapshots for this branch.

---

## 7. UI Assessment (`curating-ui`)

**Status:** Verified

### Audit Findings:

#### 1. Panel Aesthetic — "Marginalia Column" in Manuscript Hybrid

The marginalia metaphor translates directly into the Manuscript Hybrid palette. The panel column reads as a quieter companion to the LedgerForm, not a competing element. Concrete CSS values:

- **Background:** `var(--bg-manuscript)` (`#FCF9F2`) — same as the entire app; no tint. A tinted panel would create visual weight competing with the coin image.
- **Left border:** `1px solid var(--border-hairline)` (`#E0DCCD`) — the same hairline used by `.left-folio`'s right border at `@media (min-width: 1000px)`. This creates a three-column ledger with two vertical hairlines, consistent with the existing two-folio page metaphor.
- **Panel header typography:** `.meta-line` class (JetBrains Mono, `0.75rem`, `var(--accent-manuscript)`, uppercase, `letter-spacing: 1px`) for the panel title line (e.g., "REFERENCIAS"), mirroring the `.folio-header`'s `.meta-line` treatment. This grounds the panel visually as a section of the same ledger.
- **Body typography for field labels:** Reuse the `.metric-label` / `.section-label` pattern from `LedgerForm.tsx` — Montserrat, small caps, `var(--text-muted)` at rest. Label text in the panel reads identically to label text in the form, reinforcing that the two are in dialogue.
- **Numeric / catalog ref values:** JetBrains Mono (`var(--font-mono)`) for `catalogRef`, `yearRange`, weight, and diameter values — consistent with the "2-Decimal Rule" and "1-Decimal Rule" in the style guide.
- **Panel header border-bottom:** `2px solid var(--text-ink)` — matching `.folio-header`'s border-bottom weight. This anchors the panel header with the same visual authority as the LedgerForm header.
- **Internal section dividers:** `1px solid var(--border-hairline)` between Search area and Results list, and between Stage header and suggestion rows.
- **Elevation:** No box-shadow. Use the hairline left border only, consistent with the "no drop shadows" rule in the style guide.

#### 2. Tab Handle Design

The blueprint places `.panel-toggle-tab` as `position: fixed`, right edge, vertically centred, rotated 90° so text reads bottom-to-top. This is the correct approach for a persistent affordance that does not participate in document flow, but several details need tightening:

- **Background:** `var(--bg-manuscript)` with `1px solid var(--border-hairline)` border on the top, bottom, and left sides (right side hugs the viewport edge). This matches the feel of the `.btn-tools` dropdown trigger — restrained, hairline-bordered.
- **Typography:** Montserrat, `0.72rem`, uppercase, `letter-spacing: 1px`, `var(--text-muted)` at rest; transitions to `var(--text-ink)` on hover and when `aria-expanded="true"`. Do not use `var(--accent-manuscript)` at rest — that would make the collapsed tab compete with active form elements.
- **Active state (panel open):** Add a `4px` top border in `var(--accent-manuscript)` to the tab handle when `aria-expanded="true"` (top in the pre-rotation coordinate space, which becomes the left edge after rotation). This matches the `.filter-item-label` active-left-border convention already in the CSS, communicating "something is active here" without a colour flood.
- **Minimum touch target:** The tab handle's `min-height: 44px` (already in the blueprint) must be verified in the rotated axis. Because the element is rotated 90°, the pre-rotation height becomes the post-rotation width. Use `min-width: 44px` on the element before rotation as well, to guarantee a 44×44 px tap target in both axes. An alternative to `transform: rotate()` that avoids this ambiguity is `writing-mode: vertical-lr; text-orientation: mixed;`, which preserves the element's layout-box dimensions without coordinate-space confusion.
- **Conflict avoidance with Scriptorium:** The Scriptorium's `.app-container` padding is `clamp(3rem, 8vw, 4rem)`. A `position: fixed; right: 0` tab will sit within that padding zone. In the closed-panel state, the tab handle width (~2 rem) fits within the existing right padding without obscuring `.right-folio` content. In the open state the third grid column pushes the folio left, eliminating any overlap. No additional offset is required.

#### 3. Stage View — Checkbox Row Pattern

The checkbox-list approach (field label + current value + proposed value) is the correct interaction pattern for Patina's Archival Ledger philosophy. It is deliberate, reversible, and legible — consistent with how the field visibility settings work (`.fv-drawer` with per-field toggle rows). The inline-diff-in-form-field alternative is rejected: it would blur the boundary between "my record" and "reference data" and undermine the collector's sense of ownership over their own ledger.

Row anatomy and CSS values:

- **Row container:** `display: grid; grid-template-columns: 1.5rem 1fr; gap: 0.5rem; align-items: baseline; padding: 0.5rem 0; border-bottom: 1px solid var(--border-hairline);` — a two-column grid with the checkbox in a fixed narrow column and the field detail in the remaining space.
- **Field label:** Montserrat, `0.72rem`, uppercase, `letter-spacing: 1px`, `var(--text-muted)` — identical to `.metric-label .label-text` in `LedgerForm.tsx`. This reuses the collector's existing muscle memory from the form.
- **Current value:** JetBrains Mono, `0.75rem`, `var(--text-muted)`, italic — visually receded. Use `—` (em-dash) when the field is empty, exactly per the CLAUDE.md "Empty header fields" rule.
- **Proposed value:** JetBrains Mono, `0.8rem`, `var(--accent-manuscript)` (`#914E32`, Burnt Sienna) — the accent colour signals "this is a suggestion from a reference source." `var(--error-red)` must not be used; a suggestion is not an error. Burnt Sienna is already used for `.type-mono` catalog ref values elsewhere, so collectors already associate this colour with reference data.
- **Rows where proposed value equals current value:** Show the row but render the proposed value in `var(--text-muted)` rather than Burnt Sienna, and pre-uncheck the checkbox. Visual muting communicates "already have this" without hiding the information.
- **Checkbox:** Reuse the `.filter-checkbox` CSS pattern — native `<input type="checkbox">` visually hidden, custom 16×16 px ring (`1px solid var(--border-hairline)`, `border-radius: 50%`), checked state: accent fill with 8×8 px `var(--accent-manuscript)` dot. The wrapping `<label>` covers the entire row, making the whole row clickable while preserving screen reader semantics. Do not use the `.fv-toggle` pill pattern here — that pattern is for binary on/off persistent settings (field visibility), not for selection within a transient list.
- **Iron Gall for current values:** `var(--text-ink)` (`#2D2926`) is too heavy for the current-value display; `var(--text-muted)` (`#6A6764`) is the correct weight to visually recede it. Reserve Iron Gall for interactive labels and primary text only.

#### 4. Source Toggle — ANS Local / Numista

An existing two-state toggle pattern is present in the codebase: `.sort-dir-toggle` / `.dir-btn` used for the Asc/Desc direction selector in the sidebar (`src/renderer/styles/index.css` lines 383–418). This is a direct fit: two `<button>` elements inside a `border: 1px solid var(--border-hairline)` flex container, active segment filled by `var(--accent-manuscript)` background + white text, inactive segment using `var(--text-muted)` on transparent, transitioning to `var(--stone-pedestal)` on hover.

**Do not invent a new component.** Create `.ref-source-toggle` and `.ref-source-btn` aliasing the identical CSS rules rather than reusing the sort-direction class names directly (to keep the naming semantically accurate). Label text: "ANS Local" / "Numista" in `var(--font-mono)`, `0.7rem`, uppercase.

When ANS is unavailable (`isAvailable() === false`), disable the "ANS Local" button with `opacity: 0.4; cursor: not-allowed;` — matching the `.fv-toggle.locked` treatment (`index.css` line 2419). Add the inline config prompt (see item 6) below the toggle to explain the absence.

#### 5. Attribution Footer — "Datos de Numista (CC BY-NC-SA)"

The attribution footer should read as a page colophon — small, understated, and clearly non-interactive. Recommended treatment:

```css
.reference-panel__attribution {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-hairline);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  background: var(--stone-pedestal);
}
```

This mirrors `.fv-drawer-footer` exactly — same padding, same border-top, same Mono/muted/uppercase treatment (`index.css` lines 2434–2441). The `var(--stone-pedestal)` (`#F0EDE6`) background creates a subtle visual base that groups the attribution with the panel floor, not with the content above it. No link needed in the panel itself — the Numista URL link belongs only in `ApiKeySettings`.

#### 6. "No API Key Configured" Inline Prompt

Do not use `var(--error-red)` or the error-banner pattern (high-contrast, `4px` left border). The absence of an API key is a configuration state, not a runtime error. The correct visual register is a subdued informational note — consistent with the "Silent Archive" rule for empty states (style guide §4).

Recommended treatment:

```css
.reference-panel__config-prompt {
  padding: 1rem;
  background: var(--stone-pedestal);
  border: 1px solid var(--border-hairline);
  font-family: var(--font-serif);
  font-size: 0.9rem;
  font-style: italic;
  color: var(--text-muted);
}
```

The trigger element inside the prompt uses `.btn-minimal` styling (Mono, `0.75rem`, uppercase, `var(--accent-manuscript)`, underline bottom border). Prompt text: *"Configura tu clave de Numista para activar búsquedas en línea →"* — Serif italic, muted, with the "Configurar →" trigger in `.btn-minimal` Mono style. The arrow (→) is a manuscript cross-reference convention already used in `.filter-show-more`. This communicates "more is available" without alarm.

#### 7. Loading States — `searching` and `loading-detail` Modes

The existing `.loading-state` class (Cormorant Garamond italic, `1.5rem`, `var(--text-muted)`, centred, `50vh` height) is too heavy for a 320 px panel column. For the panel's loading modes, use a compact inline treatment:

- **Text:** A single centred line using Cormorant Garamond italic, `var(--text-muted)`, `1rem`. Text: *"Consultando…"* for `searching`, *"Cargando detalles…"* for `loading-detail`. No spinner is required; an italic serif ellipsis is tonally appropriate for Manuscript Hybrid.
- **If a spinner is desired:** `@keyframes ref-spin { to { transform: rotate(360deg) } }` with a 16×16 px element: `border: 2px solid var(--border-hairline); border-top-color: var(--accent-manuscript); border-radius: 50%; animation: ref-spin 0.8s linear infinite;`. Palette-consistent; no external library.
- **Results area during `searching`:** Retain the previous results list in view but apply `opacity: 0.4` to the results container. This signals "results are stale, new ones are coming" without a jarring content disappearance.
- **No shimmer/skeleton loaders:** The Manuscript Hybrid aesthetic avoids animated layout-shift placeholders. A single italic loading line is sufficient.

#### 8. Error States — Distinguishing Rate-Limited, Offline, and API Key Invalid

The style guide specifies high-contrast banners with `4px` left borders in `var(--error-red)` for error alerts. That is the base pattern — but the three error conditions carry different urgency and require different visual weight:

- **Rate-limited** (`error: 'rate_limited'`): `border-left: 4px solid var(--accent-manuscript)` (Burnt Sienna). Rate limiting is a recoverable, non-critical condition — the collector just needs to wait. Burnt Sienna signals "pause" not "broken." Text: *"Límite de consultas alcanzado. Intenta de nuevo en unos minutos."* Mono, `0.72rem`, `var(--text-ink)`.
- **Offline / network error** (`error: 'network_error'`): `border-left: 4px solid var(--text-muted)`. Network unavailability is environmental, not an application fault. Muted border signals "information" not "fault." Text: *"Sin conexión. Verifica tu red e intenta de nuevo."*
- **API key invalid** (`error: 'auth_error'`): `border-left: 4px solid var(--error-red)` — the one genuinely actionable error requiring collector intervention. Text: *"Clave API no válida."* followed by a `.btn-minimal`-styled link: *"Actualizar clave →"*. This is the only error state that uses `var(--error-red)`, consistent with the style guide's mandate that `var(--error-red)` appears only for critical/validation states and never at rest.
- **ANS catalog unavailable** (dev-only): `border-left: 4px solid var(--border-hairline)`. Text: *"Catálogo ANS no disponible. Ejecuta `npm run build:ans-catalog`."* Mono, `var(--text-muted)`. Environmental developer condition, not a runtime error.

All error containers share base styles: `padding: 0.75rem 1rem; margin: 1rem 0; font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px;` — matching `.type-meta` weight.

#### 9. Accessibility — Gaps in the Blueprint's aria Plan

The blueprint's existing aria coverage is mostly sound. The following gaps require attention before T6:

- **`aria-live` on results list:** When `mode` transitions from `searching` to `results`, the results list must be wrapped in an `aria-live="polite"` region so screen readers announce that new results have appeared. Use `"polite"` not `"assertive"` — results are not time-critical.
- **`aria-busy` on the panel during loading:** Add `aria-busy={mode === 'searching' || mode === 'loading-detail'}` to the panel container element. This is the correct companion to `aria-live`.
- **Suggestion checkbox `aria-label`:** Each checkbox's `aria-label` must encode both the field name and the proposed value, not just the field name. Example: `aria-label={t('reference.apply_field', { field: t('fields.' + s.field), value: String(s.value) })}`. A bare field-name label would leave a screen reader user unable to determine what value they are accepting.
- **Source toggle `aria-pressed`:** The `.dir-btn` pattern uses no `aria-pressed` (visual active state only). For the source toggle, add `aria-pressed={source === 'numista'}` to the Numista button and `aria-pressed={source === 'ans'}` to the ANS button — source selection is a persistent mode choice, not a momentary action. The style guide's Section 5 already specifies `aria-pressed` on `.sort-dir-toggle` direction buttons as the canonical pattern.
- **Focus management on open/close:** When the panel opens, focus must move to the query `<input>`. When the panel closes via "Cancelar" or the toggle handle, focus must return to `.panel-toggle-tab`. This round-trip focus management is absent from the current spec. Implement with a `queryInputRef` and a `toggleButtonRef`, driven by a `useEffect` watching `isOpen`.
- **`id` linkage:** The toggle button specifies `aria-controls="reference-panel"` but the panel element's `id="reference-panel"` is not explicit in the component spec. Add `id="reference-panel"` to the `.reference-panel` root `<div>`.
- **`role="complementary"` confirmed correct.** `aria-label` should use i18n key `reference.panel.ariaLabel` (e.g., "Panel de referencia numismática").
- **Screen reader DOM order confirmed:** Panel node must appear after `LedgerForm` in source order. Do not use CSS `order` to reposition. This is consistent with the existing `.fv-drawer` approach.

#### 10. Responsive Behaviour — Collapsed State at < 1100 px

- **Tab handle visibility at all widths:** `.panel-toggle-tab` uses `position: fixed` — it remains visible at all viewport widths regardless of grid state. This is correct and requires no responsive override.
- **Narrow-window open state:** When the user opens the panel at < 1100 px, the panel must render as a `position: fixed` overlay drawer rather than stacking as a column below the form. Use the existing `.fv-drawer.fv-drawer--right` pattern: `right: 0; width: 320px; height: 100%; border-left: 1px solid var(--border-hairline); transform: translateX(100%); transition: transform 0.2s ease; background: var(--bg-manuscript); z-index: 201;`. Apply the `.fv-overlay` backdrop (`rgba(45, 41, 38, 0.15)`) to keep the form partially visible and indicate the panel is a temporary layer.
- **Implementation approach:** In `Scriptorium.tsx`, use `window.matchMedia('(min-width: 1100px)')` with a listener to store a boolean `isWide`. When `panelOpen && !isWide`, add class `.reference-panel--overlay` to render the panel as a fixed drawer. When `panelOpen && isWide`, render as the third grid column (`.ledger-layout--with-panel`). No layout stacking at narrow widths.
- **Overlay UX trade-off is acceptable:** The panel is still reachable in one click at any viewport width, satisfying the Single-Click Rule. The overlay approach is an established pattern in the codebase (`.fv-drawer`, `.glossary-drawer`, `.qr-overlay`). No new pattern is introduced.
- **Breakpoint rationale:** 1100 px is the correct threshold. The existing two-column split activates at 1000 px (`@media (min-width: 1000px)` in `index.css` line 786). Adding a 320 px panel column at 1000 px would reduce the form column to ~370 px, breaking `.metrics-grid` and `.subtitle-stack` layouts. At 1100 px the form column retains ~440 px, which is sufficient.

### Review Notes & Suggestions:
- The `transform: rotate(90deg)` approach for the tab handle requires verifying that `min-height: 44px` applies to the correct axis post-rotation. Consider `writing-mode: vertical-lr; text-orientation: mixed;` as an alternative that preserves layout-box dimensions without coordinate-space ambiguity.
- The three-column grid (`grid-template-columns: 40% 1fr 320px`) should use `minmax(0, 1fr)` for the middle column rather than bare `1fr` to enforce the `min-width: 0` grid-child rule and prevent `.right-folio` text overflow.
- "Aplicar seleccionados" should use `.btn-solid` (Iron Gall fill, white text) — it is the affirmative terminal action of the panel workflow, equivalent in weight to the main form's "Guardar" button. "Cancelar" should use `.btn-minimal` (text-only, underline) in the primary/left position per WCAG 3.2.4 button-order rule.

---

## 8. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified

### Audit Findings:

#### 8.1 Era Heuristic — Critical Mismatch with Seeded Vocabulary

The blueprint proposes hardcoded era strings: `≤−500 → "Ancient Greek"`, `−500–476 CE → "Roman"`, `477–1453 → "Medieval"`, `1454–1799 → "Early Modern"`, `≥1800 → "Modern"`. **None of these strings match the seeded era vocabulary values in `db.ts`.**

Seeded English era values (`db.ts` lines 87–97):
- `Ancient`, `Roman Republic`, `Roman Imperial`, `Roman Provincial`, `Byzantine`, `Early Medieval`, `High Medieval`, `Late Medieval`, `Medieval`, `Islamic`, `Modern`

Problems with the proposed heuristic:
- `"Ancient Greek"` does not exist in the vocabulary — the seeded term is `"Ancient"`. The heuristic would produce a suggestion that fails to match any autocomplete entry.
- `"Roman"` does not exist — the vocabulary splits this into three distinct terms: `"Roman Republic"` (c. 509–27 BCE), `"Roman Imperial"` (27 BCE–476 CE), and `"Roman Provincial"`. A single date range cannot distinguish between these without issuer data.
- `"Byzantine"` (nominally 476–1453 CE) is a first-class seeded era with `usage_count: 30` but is entirely absent from the heuristic — coins dated 477–1453 CE would be incorrectly suggested as `"Medieval"`.
- `"Early Modern"` has no matching seeded term — the seed includes `"Modern"` but not `"Early Modern"`.
- `"Islamic"` coins span multiple centuries and are not addressed by any date-range bucket.

**Required change:** `ReferenceService.inferEra()` must not hardcode era strings. The method must accept the live era vocabulary list (loaded per-request from the `vocabularies` table) and use it for matching. A provisional fallback mapping until the vocabulary-query approach is implemented:

| Numista `min_year` range | Recommended seeded term |
|---|---|
| Any year, issuer context is Greek city-state or Hellenistic kingdom | `"Ancient"` |
| `−27` to `284` | `"Roman Imperial"` |
| `< −27` (Republican period) | `"Roman Republic"` |
| `285` to `476` | `"Roman Imperial"` (late period — same seeded era) |
| `477` to `1453` | `"Byzantine"` (prefer over `"Medieval"` for this range) |
| `1` to `1453` outside the Byzantine context | `"Medieval"` |
| `≥ 1454` | `"Modern"` (no `"Early Modern"` seeded; use `"Modern"` as fallback) |

The vocabulary-query approach is the correct long-term design: `inferEra` should accept the live `era` vocabulary list as a parameter so that per-collector customisations (e.g., a collector who adds `"Carolingian"`) work automatically without code changes.

#### 8.2 Die-Axis Mapping — Wrong Target Notation

The blueprint maps Numista's `orientation` field as `"coin" → "180°"` and `"medal" → "0°"`. **Neither `"180°"` nor `"0°"` exists in the seeded `die_axis` vocabulary.** The seeded values use exclusively clock-position notation (`1h` through `12h`, `db.ts` lines 111–122).

Correct mappings to seeded values:
- Numista `"coin"` orientation (obverse and reverse dies rotated 180° relative to each other) → `"6h"` (seeded `usage_count: 50`, the most common value — equivalent to 180°)
- Numista `"medal"` orientation (dies aligned, 0°/360° rotation) → `"12h"` (seeded `usage_count: 45` — equivalent to 0°)
- Numista `"variable"` → no direct seeded equivalent; omit the `die_axis` suggestion entirely rather than proposing a non-vocabulary value

The degree-notation values `"180°"` and `"0°"` would pass the loose `z.string().optional().nullable()` validation in `NewCoinSchema` but would not match any vocabulary autocomplete entry, producing orphaned values in the collector's data. The mapping in `mapOrientation` must target `"6h"` and `"12h"` respectively.

#### 8.3 Metal Mapping — Fuzzy Matching Required, Scope Clarification

Numista `composition.text` is free text (e.g., `"Copper-nickel"`, `"Silver 0.900"`, `"Billon"`, `"Bronze"`). The seeded English metal values (`db.ts` lines 18–28) are: `Gold`, `Silver`, `Bronze`, `Copper`, `Billon`, `Nickel`, `Electrum`, `Orichalcum`, `Potin`, `Tumbaga`, `Pewter`.

Exact case-insensitive matches exist for: `Silver`, `Bronze`, `Copper`, `Billon`, `Nickel`, `Gold`. No seeded term covers common Numista strings such as:
- `"Copper-nickel"` — a distinct alloy; no seeded term; do not map to either `"Copper"` or `"Nickel"`
- `"Silver 0.900"` — strip the fineness suffix and the metal token `"Silver"` matches a seeded value; the fineness belongs in the `fineness` field, not `metal`
- `"Copper-zinc"` (brass), `"Aluminium"`, `"Stainless steel"` — no seeded terms; pass raw value as suggestion with a UI indicator

Recommended approach for `mapNumistaToSuggestions`:
1. Normalise `composition.text` to lowercase; strip trailing fineness suffixes (regex: `/\s+\d[\d.]*$/`).
2. Attempt a case-insensitive exact match against seeded `metal` vocabulary values for the active locale.
3. If matched, propose the correctly-cased seeded value (e.g., `"Silver"`). If `composition.text` contained a fineness component, also suggest the stripped portion as the `fineness` field value.
4. If unmatched, include the raw `composition.text` as the suggestion value — do not silently drop it.

The `"Direct (fuzzy match in UI layer)"` note in the Section 2.8 mapping table is incorrect — matching logic must live in `mapNumistaToSuggestions` in the service layer (`src/main/reference-service.ts`), not in the renderer.

#### 8.4 RIC Notation — Edition Qualifier Required

The blueprint specifies `RIC I Augustus 15` as the display format. OCRE is based on the second edition of RIC Volume I (Mattingly & Sydenham, revised Sutherland, 1984). The correct scholarly citation for OCRE-sourced records is `RIC I(2) Augustus 15`. The `(2)` distinguishes the second edition from the first, which uses different numbering for many issues.

The OCRE URI pattern for Volume I is `ric.1(2).aug.15`. The correct parsing rule:
- `ric.{vol}({ed}).{authority}.{number}{variant}` → `RIC {VOL}({ed}) {Authority} {number}{variant}`
- Example: `ric.1(2).aug.15` → `RIC I(2) Augustus 15`
- Example: `ric.4(1).car.1` → `RIC IV(1) Caracalla 1`

For volumes without a named edition (Volumes II–X), the edition suffix is omitted: `ric.6.lon.1` → `RIC VI London 1`. The bare `RIC I Augustus 15` format without edition is ambiguous for Volume I and should not be used for OCRE-sourced records.

#### 8.5 Crawford (RRC) Notation — Canonical Form

`RRC 494/32` is the canonical display format, matching Crawford's published title "Roman Republican Coinage" (RRC). `Crawford 494/32` is used in older literature and auction catalogues but is non-standard in modern databases. CRRO's own URI scheme uses `rrc.494/32`, confirming `RRC` as the preferred prefix.

CRRO URI parsing rule: `rrc.{type}/{variant}` → `RRC {type}/{variant}`.

Both forms should be accepted in `AnsCatalogService.lookupByCatalogRef` search input (a collector may type either). All `catalogRef` output fields must use the `RRC` form exclusively.

#### 8.6 Mintage → Rarity — Vocabulary Gap and Inappropriate Thresholds

The seeded vocabulary in `db.ts` includes **no `rarity` values** — `rarity` is absent from `ALLOWED_VOCAB_FIELDS` (`validation.ts` lines 99–106) and has no seeded entries. The `rarity` coin field is a free-text string. Any suggested value (`"Scarce"`, `"Common"`, `"Very Common"`) would be unconstrained text with no vocabulary backing or autocomplete.

Beyond the vocabulary gap, the suggested thresholds have no grounding in a recognised numismatic rarity scale. Standard scales in actual use include the NGC Rarity Scale (R-1 through R-10) for ancient and world coins, and the PCGS Population Report for certified modern coins. The `< 10,000` threshold is arbitrary relative to any of these.

For ancient coins, Numista holds no mintage figures (none exist historically). For world coins, Numista's `mintage` data is frequently absent or unreliable for low-mintage issues — the exact range where rarity estimation would matter most.

**Decision required (Section 9 Q4):** Omit the mintage-to-rarity suggestion from the initial implementation. If added later, it must use a recognised scale, emit a suggestion only when `mintage` is explicitly non-null in the Numista response, and be labelled as a machine estimate in the UI. The `rarity` field should also be added to `ALLOWED_VOCAB_FIELDS` and seeded with scale values before this feature is built.

#### 8.7 Year Display — BCE Negative Integers and the Year-Zero Gap

Numista uses negative integers for BCE years (e.g., `-44` for 44 BCE, `-27` for 27 BCE). The Gregorian / proleptic Julian calendar used in all numismatic catalogues has **no year 0** — the sequence runs 2 BCE, 1 BCE, 1 CE, 2 CE. Astronomical year numbering uses 0 (= 1 BCE) but is never used in coin catalogues. Displaying a raw `-44` or `0` as a `year_display` string would be incorrect.

Required formatting logic in `mapNumistaToSuggestions`:

```
minYear < 0  →  `${Math.abs(minYear)} BCE`           // e.g., -44 → "44 BCE"
minYear === 0 →  treat as invalid; flag and skip year suggestion
                 (Numista should not emit 0; if it does, it is a data error)
minYear > 0  →  `${minYear} CE`  (or bare `${minYear}` per existing Patina year_display convention)
```

For ranges spanning the BCE/CE boundary (e.g., `minYear = -27`, `maxYear = 14`), display as `"27 BCE–14 CE"`, not `"-27–14"`. For single-year types where `minYear === maxYear`, display a single value without a range dash.

The `yearRange` string in `ReferenceSearchResult` (Section 2.2) must apply the same logic — the example `"27 BCE–14 CE"` shown in the type definition is correct in concept but the implementation must handle the sign conversion and year-zero exclusion explicitly.

#### 8.8 Additional Field Mapping Concerns

**`getPreference`/`setPreference` type incompatibility:** `dbService.getPreference` and `dbService.setPreference` in `db.ts` (lines 365–372) are typed with `key: 'language'` — a TypeScript literal. The blueprint's Section 2.5 calls `dbService.setPreference('numista_api_key', key)` and `dbService.getPreference('numista_api_key')`. These calls will fail `npx tsc --noEmit` — `'numista_api_key'` is not assignable to `'language'`. The key type must be widened before T2. Preferred approach: a discriminated union `'language' | 'numista_api_key' | 'vocab_seeded_version'` rather than a bare `string`, to keep the type checker meaningful.

**`mint` localisation:** Numista returns `mints[0].name` in the language requested via the API's `lang` parameter. Patina's `mint` vocabulary is locale-split (e.g., `"Rome"` in English, `"Roma"` in Spanish — `db.ts` lines 124–154). The `net.fetch` call must pass the active Patina locale as the Numista `lang` parameter so the returned mint name is more likely to match an existing vocabulary entry and avoid duplicates.

**`denomination` for ancient coins:** Numista's `value.text` for standard ancient denominations (`"Denarius"`, `"Sestertius"`, `"Follis"`) will match seeded vocabulary entries (`db.ts` lines 42–56) well. For world coins (`"50 centavos"`, `"10 Pfennig"`), no seeded term will match — the suggestion will create a new vocabulary entry on application. This is acceptable behaviour; document it in the Stage view with a visual indicator distinguishing vocabulary matches from new values.

**`catalog_ref` format — first reference only:** The blueprint maps `references[0]` as the primary `catalog_ref` suggestion. Numista lists references in order of its own editorial preference, which may not match the collector's preferred catalogue (e.g., a collector may prefer `Schön` over `KM`). The `allCatalogRefs` display in the Stage view (all cross-references) correctly addresses this — confirm it is implemented as specified in Section 2.2.

### Review Notes & Suggestions:
- `inferEra()` must accept the live vocabularies list as a parameter rather than querying the DB internally — this keeps the function testable without a DB fixture and respects the single-responsibility principle. The IPC handler or the `lookup` method loads the era vocabulary once per request and passes it in.
- The die-axis clock-position mapping (`"coin" → "6h"`, `"medal" → "12h"`) must be documented in a comment in `reference-service.ts` with explicit notation that `6h` = 180° and `12h` = 0°/360°, since the equivalence is non-obvious.
- Before implementing the ANS catalog parser (Section 2.6), verify OCRE URI structure against a live OCRE RDF dump sample — RPC Online (Roman Provincial Coinage) and RPC use different URI schemes that may not follow the `ric.{vol}({ed}).{authority}.{num}` pattern.
- The `getPreference`/`setPreference` type widening required for the API key preference should be completed as a discrete change before T2 work begins, to avoid a cascade of type errors mid-task.

---

## 9. User Consultation & Decisions

### Open Questions for User Review:

1. **`/curating-ui` for Stage view:** The blueprint specifies a checkbox-list approach for the Stage view. Should `/curating-ui` produce three interactive proposals for this interaction before T6 is built, or proceed directly with the checkbox approach?

2. **Era heuristic vs vocabulary lookup:** Section 8 (numismatic assessment) recommends deriving era suggestions from the existing `vocabularies` table rather than hardcoding strings. This adds a DB query in `ReferenceService` but ensures the suggested era always matches a valid vocabulary term. Preferred approach?

3. **`ApiKeySettings` placement:** The blueprint recommends a `Herramientas ▾` → "Preferencias de referencia" entry opening an overlay (consistent with the `Personalizar` pattern). Alternatively, it could be its own `/settings` route. Which fits the Single-Click Rule better given the existing navigation structure?

4. **`rarity` suggestion from mintage:** The numismatic assessment suggests deriving a rough rarity estimate from Numista's `mintage` field. This is speculative (mintage is incomplete in Numista's database). Include this suggestion or omit it?

5. **Phase scope for RPC Online:** The blueprint defers RPC Online (Roman Provincial) to Phase 2 of T3. Should Phase 2 be scoped into this blueprint as a deferred task, or left for a future blueprint?

### Final Decisions:
*(To be filled after user review)*

---

## 10. Post-Implementation Retrospective

**Date:** *(To be filled)*
**Outcome:** *(To be filled)*

### Summary of Work
*(To be filled)*

### Pain Points
*(To be filled)*

### Things to Consider
*(To be filled)*
- **Core Doc Revision:** Confirm if `AGENTS.md`, `style_guide.md`, and `CLAUDE.md` (Commands section) were updated to reflect the ANS bundle build command and the new `reference_cache` table pattern.
