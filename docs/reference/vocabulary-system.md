# Vocabulary System

The Vocabulary System provides controlled, locale-aware value lists for structured coin fields. It backs the `AutocompleteField` component and prevents free-text inconsistencies in numismatic data.

---

## Allowed Fields

Only fields in `ALLOWED_VOCAB_FIELDS` may be used with vocabulary IPC handlers. Any other field name is rejected by Zod validation before reaching the database.

| Field | Description |
| :--- | :--- |
| `metal` | Alloy composition (e.g., `AV`, `AR`, `AE`) |
| `denomination` | Coin type name (e.g., `Denarius`, `Aureus`, `Penny`) |
| `grade` | Condition grade (NGC adjectival or Sheldon 70-point scale) |
| `era` | Broad historical period (e.g., `Ancient`, `Medieval`, `Modern`) |
| `die_axis` | Rotational alignment in clock-hour notation (e.g., `12h`, `6h`) |
| `mint` | Place of issue (e.g., `Rome`, `London`, `Philadelphia`) |
| `rarity` | Scarcity designation (e.g., `C`, `R`, `RR`, `RRRR`) |

---

## Database Schema

### `vocabularies` table

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY | |
| `field` | TEXT NOT NULL | Must be an `ALLOWED_VOCAB_FIELDS` value |
| `value` | TEXT NOT NULL | The vocabulary term |
| `locale` | TEXT DEFAULT `'en'` | `'en'` or `'es'` |
| `is_builtin` | INTEGER DEFAULT `0` | `1` for seed-loaded entries |
| `usage_count` | INTEGER DEFAULT `0` | Incremented on each use |
| `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | |

**Unique constraint:** `UNIQUE(field, value, locale)` — duplicate entries are silently ignored on insert.

### `preferences` table

| Column | Type | Notes |
| :--- | :--- | :--- |
| `key` | TEXT PRIMARY KEY | Only `'language'` is used |
| `value` | TEXT NOT NULL | `'en'` or `'es'` |

---

## IPC API

See [ipc_api.md](./ipc_api.md) for full parameter and return type documentation.

| Method | Channel | Description |
| :--- | :--- | :--- |
| `getVocab(field, locale?)` | `vocab:get` | Returns all values for a field, filtered by locale |
| `addVocabEntry(field, value)` | `vocab:add` | Adds a new custom entry |
| `searchVocab(field, query, locale?)` | `vocab:search` | Returns prefix-matched values |
| `incrementVocabUsage(field, value)` | `vocab:increment-usage` | Increments usage counter (fire-and-forget) |
| `resetVocab(field?)` | `vocab:reset` | Resets to built-in defaults |

---

## Seed Data

Built-in vocabulary entries are loaded by `npm run db:seed`. The seed script checks `CURRENT_SEED_VERSION` in `src/common/schema.ts`. To add or change built-in entries:

1. Add or modify entries in the seed script (`scripts/seed_data.ts`).
2. Bump `CURRENT_SEED_VERSION` by one integer.
3. Run `npm run db:seed` — existing user-added entries are preserved; only built-in entries are refreshed.

> **Important:** Always run the seed script via `npm run db:seed` (uses the Electron binary). Running it with `node` will fail due to a `better-sqlite3` ABI mismatch.

---

## Component Pattern

Vocabulary fields in forms use `AutocompleteField` backed by the `useVocabularies` hook. `LedgerForm` is the canonical example — it wires all seven vocab fields following the same pattern:

```typescript
import { AutocompleteField } from '../components/AutocompleteField';
import { useVocabularies } from '../hooks/useVocabularies';

// One hook instance per field — no locale argument needed (language is
// read from the i18n context inside the hook)
const metalVocab = useVocabularies('metal');

<AutocompleteField
  field="metal"
  value={formData.metal || ''}
  onChange={(v) => updateField('metal', v)}
  onAddNew={(v) => { metalVocab.addVocabulary(v); updateField('metal', v); }}
  onIncrementUsage={metalVocab.incrementUsage}
  options={metalVocab.options}
  placeholder="e.g. Silver"
  onReset={metalVocab.resetVocabularies}
  hasUserValues={false}
/>
```

`useVocabularies` returns `{ options, isLoading, error, addVocabulary, incrementUsage, resetVocabularies }`.

**`onIncrementUsage` is the canonical increment wiring.** `AutocompleteField` does not call `incrementVocabUsage` on its own — the parent must pass `onIncrementUsage={vocabHook.incrementUsage}` explicitly. The call fires only when an **existing** option is selected via `selectOption`; it does not fire when a new value is added via `handleAddNew` (new entries start at `usage_count = 0`). The prop is optional: any `AutocompleteField` usage outside of `LedgerForm` silently skips the increment.

---

## Cache Key Convention

`useVocabularies` caches results in memory using a composite key:

```
"${field}:${locale}"
```

For example: `"metal:es"`, `"grade:en"`.

A bare `field` key (e.g., `"metal"`) is **not** used. Using a bare key causes cross-locale stale hits when the user switches language mid-session.

In tests, call `clearVocabCache()` in `beforeEach` to reset the cache between test cases.

---

## Fire-and-Forget Pattern

`incrementVocabUsage` must not be awaited in UI code, and errors must not be surfaced to the user:

```typescript
// Correct — fire and forget
window.electronAPI.incrementVocabUsage('metal', selectedValue);

// Incorrect — do not await
await window.electronAPI.incrementVocabUsage('metal', selectedValue);
```

Usage count is a UX optimisation (sorting frequent values higher in the dropdown). A failure to increment is inconsequential and should never disrupt the curator's workflow.
