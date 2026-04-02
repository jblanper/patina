# IPC API Reference

Complete reference for all Inter-Process Communication handlers exposed by Patina's main process.

## Database Handlers

### `db:getCoins`

Retrieves all coins from the archive.

```typescript
const coins = await window.electronAPI.getCoins();
```

**Returns:** `Coin[]`

---

### `db:getCoinById`

Retrieves a single coin by its ID.

```typescript
const coin = await window.electronAPI.getCoinById(id: number);
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | The unique coin ID |

**Returns:** `Coin | undefined`

---

### `db:addCoin`

Creates a new coin record.

```typescript
const newCoin = await window.electronAPI.addCoin(coin: NewCoin);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `coin` | `NewCoin` | Yes | The coin data (excludes `id` and `created_at`) |

**Returns:** `Coin`

---

### `db:updateCoin`

Updates an existing coin record.

```typescript
const updated = await window.electronAPI.updateCoin(id: number, changes: Partial<NewCoin>);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Yes | The unique coin ID |
| `changes` | `Partial<NewCoin>` | Yes | Fields to update |

**Returns:** `Coin`

---

### `db:deleteCoin`

Deletes a coin and its associated images.

```typescript
await window.electronAPI.deleteCoin(id: number);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Yes | The unique coin ID |

**Returns:** `void`

---

### `db:addImage`

Adds an image to a coin record.

```typescript
const image = await window.electronAPI.addImage(image: NewCoinImage);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | `NewCoinImage` | Yes | Image data with `coin_id`, `path`, `label` |

**Returns:** `CoinImage`

---

### `db:getImagesByCoinId`

Retrieves all images for a specific coin.

```typescript
const images = await window.electronAPI.getImagesByCoinId(coinId: number);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `coinId` | `number` | Yes | The unique coin ID |

**Returns:** `CoinImage[]`

---

### `db:deleteImage`

Deletes an image record (does not delete the file).

```typescript
await window.electronAPI.deleteImage(id: number);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Yes | The unique image ID |

**Returns:** `void`

---

### `image:importFromFile`

Opens a native file-picker dialog (Main process) and copies the selected image into `data/images/coins/`. Takes no renderer-supplied arguments — the dialog runs entirely in the Main process.

```typescript
const relativePath = await window.electronAPI.importImageFromFile();
```

**Returns:** `string | null` — relative path (`coins/<filename>`) on success, `null` if the user cancelled.

**Allowed extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`. SVG is explicitly blocked.

> The copied file is given a collision-safe name (`import-<timestamp>-<random>.<ext>`). If the user abandons the form without saving, the file becomes orphaned on disk — this is consistent with the Lens behaviour and is addressed by a future cleanup sweep.

---

## Lens Handlers

### `lens:start`

Starts the Lens wireless bridge server.

```typescript
const { url, status } = await window.electronAPI.startLens();
```

**Returns:** `{ url: string, status: 'active' }`

---

### `lens:stop`

Stops the Lens server and cleans up temporary files.

```typescript
await window.electronAPI.stopLens();
```

**Returns:** `void`

---

### `lens:get-status`

Checks the current status of the Lens server.

```typescript
const { status } = await window.electronAPI.getLensStatus();
```

**Returns:** `{ status: 'active' | 'inactive' }`

---

## Export Handlers

### `export:toZip`

Creates a ZIP archive of the entire collection.

```typescript
const { success, path } = await window.electronAPI.exportToZip(options?: ExportOptions);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `options.targetPath` | `string` | No | Absolute path for the output file |
| `options.includeImages` | `boolean` | No | Include images (default: `true`) |
| `options.includeCsv` | `boolean` | No | Include CSV export (default: `true`) |

**Returns:** `{ success: boolean, path: string }`

**Errors:**
- `ERR_EXPORT_FAILED`: Export operation failed
- `ERR_PERMISSION_DENIED`: Cannot write to destination

---

### `export:toPdf`

Generates a PDF catalog of the collection.

```typescript
const { success, path } = await window.electronAPI.exportToPdf();
```

**Returns:** `{ success: boolean, path: string }`

**Errors:**
- `ERR_PDF_GENERATION_FAILED`: PDF generation failed

---

## Vocabulary Handlers

### `vocab:get`

Retrieves all vocabulary values for a field, filtered by locale.

```typescript
const values = await window.electronAPI.getVocab(field: VocabField, locale?: 'en' | 'es');
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `field` | `VocabField` | Yes | One of the allowed vocab fields |
| `locale` | `'en' \| 'es'` | No | Filters results to the given locale. Defaults to all locales. |

**Returns:** `Promise<string[]>`

> Always pass the current locale to avoid cross-locale stale hits. See the [Vocabulary System reference](./vocabulary-system.md).

---

### `vocab:add`

Adds a new custom vocabulary entry.

```typescript
await window.electronAPI.addVocabEntry(field: VocabField, value: string);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `field` | `VocabField` | Yes | One of the allowed vocab fields |
| `value` | `string` | Yes | The new value (max 200 characters) |

**Returns:** `Promise<void>`

---

### `vocab:search`

Searches vocabulary values for a field matching a query string.

```typescript
const results = await window.electronAPI.searchVocab(field: VocabField, query: string, locale?: 'en' | 'es');
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `field` | `VocabField` | Yes | One of the allowed vocab fields |
| `query` | `string` | Yes | Search string (prefix match) |
| `locale` | `'en' \| 'es'` | No | Filters results to the given locale |

**Returns:** `Promise<string[]>`

---

### `vocab:increment-usage`

Increments the usage counter for a vocabulary entry. **Fire-and-forget** — do not `await` or handle rejections in the UI.

```typescript
window.electronAPI.incrementVocabUsage(field: VocabField, value: string);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `field` | `VocabField` | Yes | One of the allowed vocab fields |
| `value` | `string` | Yes | The value whose counter to increment |

**Returns:** `Promise<void>` (not awaited in UI)

---

### `vocab:reset`

Resets vocabulary entries to built-in defaults for a field, or all fields if omitted.

```typescript
await window.electronAPI.resetVocab(field?: VocabField);
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `field` | `VocabField` | No | If omitted, resets all vocab fields |

**Returns:** `Promise<void>`

---

## Preference Handlers

### `pref:get`

Retrieves a stored application preference.

```typescript
const lang = await window.electronAPI.getPreference('language');
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `key` | `'language'` | Yes | The only whitelisted preference key |

**Returns:** `Promise<string | null>`

---

### `pref:set`

Persists an application preference.

```typescript
await window.electronAPI.setPreference('language', 'es');
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `key` | `'language'` | Yes | The only whitelisted preference key |
| `value` | `'en' \| 'es'` | Yes | The locale to persist |

**Returns:** `Promise<void>`

---

## Type Definitions

```typescript
interface Coin {
  id: number;
  title: string;
  issuer?: string;
  denomination?: string;
  year_display?: string;
  year_numeric?: number;
  era: 'Ancient' | 'Medieval' | 'Modern';
  mint?: string;
  metal?: string;
  fineness?: string;
  weight?: number;
  diameter?: number;
  die_axis?: string;
  obverse_legend?: string;
  obverse_desc?: string;
  reverse_legend?: string;
  reverse_desc?: string;
  edge_desc?: string;
  catalog_ref?: string;
  rarity?: string;
  grade?: string;
  provenance?: string;
  story?: string;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
  created_at: string;
}

type NewCoin = Omit<Coin, 'id' | 'created_at'>;

interface CoinImage {
  id: number;
  coin_id: number;
  path: string;
  label?: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

type NewCoinImage = Omit<CoinImage, 'id' | 'created_at'>;

interface ExportOptions {
  targetPath?: string;
  includeImages?: boolean;
  includeCsv?: boolean;
}

type VocabField = 'metal' | 'denomination' | 'grade' | 'era' | 'die_axis' | 'mint';

interface Vocabulary {
  id: number;
  field: VocabField;
  value: string;
  locale: 'en' | 'es';
  is_builtin: boolean;
  usage_count: number;
  created_at: string;
}
```
