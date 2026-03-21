# Implementation Blueprint: Phase 6b.2 – i18n Defect Patch

**Date:** 2026-03-21
**Status:** Completed
**Reference:** `docs/blueprints/archive/2026-03-19-phase-6b-internationalization.md`

---

## 1. Objective

Fix nine defects discovered post-completion of Phase 6b that leave visible English strings in the Spanish locale, expose a vocabulary locale gap, a Spanish grammar error, and leave the entire Lens mobile interface (served HTML page + JavaScript) untranslated.

---

## 2. Defect Register

| ID | Severity | Location | Symptom |
|----|----------|----------|---------|
| D-01 | High | `es.json:26` | `"EL VITRINA"` — wrong grammatical gender; should be `"LA VITRINA"` |
| D-02 | High | `CoinDetail.tsx:123` | `"Entry #"` and `"Unknown Issuer"` hardcoded in meta-line above denomination |
| D-03 | High | `LedgerForm.tsx:28` | `"ENTRY"` and `"ANCIENT"` hardcoded in meta-line above designation input |
| D-04 | High | `PlateEditor.tsx` | Entire left-folio (Scriptorium) untranslated — slot labels, button text, plate captions, QR hint, `aria-label` |
| D-05 | Critical | `useVocabularies.ts:39` | `getVocab(field)` called without `locale` — vocabulary options always served in English regardless of active language |
| D-06 | Medium | `AutocompleteField.tsx:246,261` | `"Add «…»"` and `"Reset to defaults"` hardcoded in English |
| D-07 | High | `server.ts`, `lens-mobile.ts` | Lens mobile interface entirely in English — HTML page (title, subtitle, button, status messages) and client JS (status messages, error strings) all hardcoded |
| D-08 | Medium | `QRCodeDisplay.tsx:36` | `"Scan with your mobile device / to capture an image."` hardcoded in English |
| D-09 | Low | `PlateEditor.tsx:93` | `aria-label="Close QR code"` hardcoded in English |

---

## 3. User Decisions

| Question | Decision |
|----------|----------|
| "Establish Wireless Bridge" → Spanish phrasing | **"Activar Conexión"** |
| Disabled "Import" button `title="Coming soon"` | Translate to **`title="Próximamente"`** |

---

## 4. Technical Strategy

### D-01 — Grammar Fix (es.json)

```json
// BEFORE
"tagline": "Archivo v1.0 // EL VITRINA"
// AFTER
"tagline": "Archivo v1.0 // LA VITRINA"
```

---

### D-02 & D-03 — Meta-line Translation Keys

Add to both locale files under existing namespaces:

```json
// en.json additions
"detail": {
  "entryLabel": "Entry",
  "unknownIssuer": "Unknown Issuer"
},
"ledger": {
  "entryLabel": "ENTRY",
  "fallbackEra": "ANCIENT"
}
```

```json
// es.json additions
"detail": {
  "entryLabel": "Entrada",
  "unknownIssuer": "Emisor Desconocido"
},
"ledger": {
  "entryLabel": "ENTRADA",
  "fallbackEra": "ANTIGUO"
}
```

**CoinDetail.tsx:123**:
```tsx
{t('detail.entryLabel')} #{String(coin.id).padStart(3, '0')} // {coin.era} // {coin.issuer || t('detail.unknownIssuer')}
```

**LedgerForm.tsx:28**:
```tsx
{t('ledger.entryLabel')} {entryLabel} // {formData.era?.toUpperCase() || t('ledger.fallbackEra')} // {formData.metal?.toUpperCase() || '—'}
```

---

### D-04 — PlateEditor Translation

Add a `plateEditor` namespace to both locale files:

```json
// en.json
"plateEditor": {
  "slots": {
    "obverse": "Obverse (Primary)",
    "reverse": "Reverse",
    "edge": "Edge"
  },
  "replace": "Replace",
  "establishBridge": "Activate Connection",
  "importArchive": "Import from Digital Archive",
  "plateCaption": {
    "obverse": "PLATE I",
    "reverse": "PLATE II",
    "edge": "PLATE III"
  },
  "scanHint": "Scan with mobile to capture {{slot}}",
  "closeQr": "Close QR code"
}
```

```json
// es.json
"plateEditor": {
  "slots": {
    "obverse": "Anverso (Principal)",
    "reverse": "Reverso",
    "edge": "Bordura"
  },
  "replace": "Reemplazar",
  "establishBridge": "Activar Conexión",
  "importArchive": "Importar del Archivo Digital",
  "plateCaption": {
    "obverse": "LÁMINA I",
    "reverse": "LÁMINA II",
    "edge": "LÁMINA III"
  },
  "scanHint": "Escanea con el móvil para capturar {{slot}}",
  "closeQr": "Cerrar código QR"
}
```

**PlateEditor.tsx** — add `useTranslation`. Drop the `label` field from the `slots` array (labels derived via `t()`):
```tsx
const { t } = useTranslation();

const slots: Array<{ id: 'obverse' | 'reverse' | 'edge' }> = [
  { id: 'obverse' }, { id: 'reverse' }, { id: 'edge' }
];

// slot label:     t(`plateEditor.slots.${slot.id}`)
// plate caption:  `${t(`plateEditor.plateCaption.${slot.id}`)} // ${t(`plateEditor.slots.${slot.id}`).toUpperCase()}`
// replace btn:    t('plateEditor.replace')
// bridge btn:     t('plateEditor.establishBridge')
// import btn:     t('plateEditor.importArchive')  (title: t('plateEditor.importArchive') → already handled by disabled attr)
// QR hint:        t('plateEditor.scanHint', { slot: t(`plateEditor.slots.${activeSlot}`).toUpperCase() })
// close btn:      aria-label={t('plateEditor.closeQr')}
```

The disabled import button `title` attribute: add `title={t('common.comingSoon')}` (see D-06 for `common` namespace addition).

---

### D-05 — Vocabulary Locale Gap (useVocabularies)

**Root cause:** `useVocabularies.ts:39` calls `getVocab(field)` without locale. The backend already supports locale filtering (`getVocab(field, locale?)` in preload + `getVocabularies(field, locale = 'en')` in db.ts). The hook was supposed to use it per the Phase 6b blueprint.

**Fix — update `useVocabularies.ts`:**

1. Import `useLanguage`; read active `language`.
2. Change module-level cache key from `VocabField` to composite `string` (`"${field}:${locale}"`).
3. Pass `language` to `getVocab(field, language)`.
4. Include `language` in the `useEffect` dependency array.

```typescript
// Module-level cache — composite key prevents stale locale entries
const cache = new Map<string, string[]>();

export function clearVocabCache(field?: VocabField) {
  if (field) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${field}:`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

export function useVocabularies(field: VocabField): UseVocabulariesReturn {
  const { language } = useLanguage();
  const cacheKey = `${field}:${language}`;

  const [options, setOptions] = useState<string[]>(() => cache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(!cache.has(cacheKey));

  const fetchOptions = useCallback(async () => {
    const result = await window.electronAPI.getVocab(field, language);
    cache.set(cacheKey, result);
    setOptions(result);
  }, [field, language, cacheKey]);

  useEffect(() => {
    if (!cache.has(cacheKey)) {
      fetchOptions();
    } else {
      setOptions(cache.get(cacheKey)!);
      setIsLoading(false);
    }
  }, [field, language, cacheKey, fetchOptions]);

  // addVocabulary, incrementUsage, resetVocabularies unchanged except clearVocabCache(field) now clears all locale variants
}
```

> When language switches, `cacheKey` changes, a fresh fetch fires automatically, and the previous locale's entries remain cached for instant switch-back.

---

### D-06 — AutocompleteField + common.comingSoon

Add to both locale files:

```json
// en.json
"autocomplete": {
  "addNew": "Add \u201C{{value}}\u201D",
  "resetToDefaults": "Reset to defaults"
},
"common": {
  "comingSoon": "Coming soon"
}
```

```json
// es.json
"autocomplete": {
  "addNew": "Agregar \u201C{{value}}\u201D",
  "resetToDefaults": "Restablecer valores"
},
"common": {
  "comingSoon": "Próximamente"
}
```

**AutocompleteField.tsx** — add `useTranslation`:
```tsx
const { t } = useTranslation();
// Line 246: {t('autocomplete.addNew', { value: inputValue.trim() })}
// Line 261: {t('autocomplete.resetToDefaults')}
```

---

### D-07 — Lens Mobile Interface (server.ts + lens-mobile.ts)

This is the most architecturally complex defect. The Lens server runs in the **Main process** with no access to i18next. All user-visible strings in the served HTML page and client-side JavaScript must be localized server-side.

#### Architecture

**Approach: Locale injected at server start, strings passed via `data-` attribute.**

The `lens:start` IPC handler in `index.ts` reads the active language from `dbService.getPreference('language')` (defaulting to `'es'`) and passes it to `createLensServer()` via the config. The server uses this locale for all HTML and error responses. For the client-side JavaScript, strings are embedded in the HTML as a JSON `data-strings` attribute on `<body>`, which `lens-mobile.ts` reads at runtime.

**Why `data-` attribute, not inline `<script>`:**
The current CSP header sets `script-src 'self'`, which blocks inline `<script>` tags without a nonce. Adding `window.LENS_STRINGS = {...}` as a bare inline script would violate the CSP. Using a `data-` attribute on `<body>` is CSP-safe and avoids adding nonce complexity.

#### Changes to `server.ts`

1. Add `locale?: 'en' | 'es'` to `ServerConfig`.
2. Define `LensStrings` interface and two static dictionaries `EN_STRINGS`, `ES_STRINGS`.
3. Select strings based on `config.locale ?? 'es'`.
4. Apply strings to the HTML template and HTTP response strings.
5. Serialize `clientStrings` (the subset needed by JS) as JSON into `<body data-strings='...'>`.
6. Update `<html lang="...">` to use the active locale.

```typescript
interface LensStrings {
  // HTML
  subtitle: string;
  captureBtn: string;
  // Client JS (also used in error responses)
  uploading: string;
  success: string;
  scriptError: string;
  // HTTP responses
  invalidSession: string;
  noFile: string;
  uploadOk: string;
  mimeError: string;
}

const EN_STRINGS: LensStrings = {
  subtitle: 'Transfer to Ledger',
  captureBtn: 'Capture Image',
  uploading: 'Uploading...',
  success: 'Added to Ledger.',
  scriptError: 'Script failed to load. Refresh and try again.',
  invalidSession: 'Invalid or expired session.',
  noFile: 'No file uploaded.',
  uploadOk: 'Upload successful',
  mimeError: 'Only JPEG, PNG, and WebP images are accepted.',
};

const ES_STRINGS: LensStrings = {
  subtitle: 'Transferir al Registro',
  captureBtn: 'Capturar Imagen',
  uploading: 'Subiendo...',
  success: 'Añadido al Registro.',
  scriptError: 'Error al cargar el script. Recarga e inténtalo de nuevo.',
  invalidSession: 'Sesión inválida o expirada.',
  noFile: 'No se ha subido ningún archivo.',
  uploadOk: 'Subida exitosa',
  mimeError: 'Solo se aceptan imágenes JPEG, PNG y WebP.',
};
```

The `data-strings` attribute:
```typescript
const clientStrings = { uploading: s.uploading, success: s.success, scriptError: s.scriptError };
// Single-quotes wrap the attribute; JSON.stringify always produces double-quoted keys/values — no escaping needed
// for our static strings, but defensively replace any stray single quotes:
const stringsAttr = JSON.stringify(clientStrings).replace(/'/g, '&#39;');
// In HTML:
<body data-strings='${stringsAttr}'>
```

#### Changes to `lens-mobile.ts`

Add a `LensStrings` type declaration and read from `document.body.dataset.strings`:

```typescript
interface LensStrings {
  uploading: string;
  success: string;
  scriptError: string;
}

function getLensStrings(): LensStrings {
  try {
    const raw = document.body.dataset.strings;
    if (raw) return JSON.parse(raw) as LensStrings;
  } catch { /* fall through */ }
  // Fallback to Spanish (app default) if attribute missing or unparseable
  return {
    uploading: 'Subiendo...',
    success: 'Añadido al Registro.',
    scriptError: 'Error al cargar el script. Recarga e inténtalo de nuevo.',
  };
}

const STRINGS = getLensStrings();
// Replace all hardcoded string literals with STRINGS.uploading, STRINGS.success, STRINGS.scriptError
```

#### Changes to `index.ts` (`lens:start` handler)

```typescript
ipcMain.handle('lens:start', async () => {
  if (lensServer) lensServer.stop();

  const locale = (dbService.getPreference('language') ?? 'es') as 'en' | 'es';

  lensServer = createLensServer({
    locale,
    onUpload: (filePath) => { /* unchanged */ }
  });

  const { port, token } = await lensServer.start();
  const ip = getLocalIp();
  const url = `http://${ip}:${port}/lens/${token}`;
  return { url, status: 'active' };
});
```

> No changes to `preload.ts`, `electron.d.ts`, or validation schemas. The locale is an internal server-side concern; the IPC surface is unchanged.

---

### D-08 — QRCodeDisplay Translation

```json
// en.json
"lens": {
  "scanPrompt": "Scan with your mobile device\nto capture an image."
}
```

```json
// es.json
"lens": {
  "scanPrompt": "Escanea con tu móvil\npara capturar una imagen."
}
```

**QRCodeDisplay.tsx** — add `useTranslation`. Split on `\n` for the line break:
```tsx
const { t } = useTranslation();
const [line1, line2] = t('lens.scanPrompt').split('\n');
// <p>...<br/>{line1}<br/>{line2}</p>
// or use CSS white-space: pre-line and a single element
```

---

## 5. Complete Translation Key Additions Summary

| Namespace | New Keys |
|-----------|----------|
| `detail` | `entryLabel`, `unknownIssuer` |
| `ledger` | `entryLabel`, `fallbackEra` |
| `plateEditor` | `slots.obverse`, `slots.reverse`, `slots.edge`, `replace`, `establishBridge`, `importArchive`, `plateCaption.obverse`, `plateCaption.reverse`, `plateCaption.edge`, `scanHint`, `closeQr` |
| `autocomplete` | `addNew`, `resetToDefaults` |
| `common` | `comingSoon` |
| `lens` | `scanPrompt` |

All keys must be present in both `en.json` and `es.json`. The existing `translations.test.ts` bidirectional completeness test will catch any omission.

---

## 6. Implementation Steps

1. Fix `es.json` D-01 grammar error
2. Add all new translation keys to `en.json` and `es.json`
3. Update `CoinDetail.tsx` meta-line (D-02)
4. Update `LedgerForm.tsx` meta-line (D-03)
5. Update `PlateEditor.tsx` with `useTranslation` (D-04, D-09)
6. Update `AutocompleteField.tsx` with `useTranslation` (D-06)
7. Update `QRCodeDisplay.tsx` with `useTranslation` (D-08)
8. Update `useVocabularies.ts` — composite cache key + locale-aware `getVocab` (D-05)
9. Update `server.ts` — `LensStrings` dictionaries, locale-aware HTML, `data-strings` attribute (D-07)
10. Update `lens-mobile.ts` — read from `STRINGS` constant (D-07)
11. Update `index.ts` `lens:start` — read preference and pass `locale` to server (D-07)
12. Run `npx tsc --noEmit`
13. Run `npm test` — all existing tests must pass

---

## 7. Security Assessment (`securing-electron`)
**Status:** Verified with one note

### Findings:

**D-01 to D-06, D-08, D-09 (renderer changes):**
No IPC handlers modified. The Filter unchanged. ✓

**D-05 (locale in getVocab):**
`getVocab(field, locale)` already validated via `validateIpc()` with `VocabGetSchema` containing `z.enum(['en', 'es']).optional()`. No new attack surface. ✓

**D-07 (Lens server locale):**
- The locale is read from `dbService.getPreference('language')` — a trusted source with strict schema validation at write time. The value is always `'en' | 'es'`. No renderer input reaches the server string selection logic. ✓
- `data-strings` attribute: the JSON is built from static server-side string constants only (not user data). `JSON.stringify` of a plain string-value object produces well-formed JSON with no injection risk. Single-quote escaping (`&#39;`) is applied as belt-and-suspenders. ✓
- The `<html lang="...">` attribute is populated from `config.locale` which is always `'en' | 'es'`. No injection risk. ✓
- **No change to CSP headers required.** The `data-` attribute approach is fully CSP-compliant — no inline scripts, no nonce needed.

---

## 8. Quality Assessment (`assuring-quality`)
**Status:** Issues Found — Action Required

### Findings:

**Existing completeness test** (`translations.test.ts`): covers all new `en.json` ↔ `es.json` keys automatically. ✓

**Test files requiring mock updates:**
- `PlateEditor.test.tsx` — must add standard `react-i18next` mock after `useTranslation` is added
- `AutocompleteField.test.tsx` — same
- `QRCodeDisplay.test.tsx` — same (if test file exists; create if absent per Colocation Rule)

**`useVocabularies.test.ts` — updates required:**
- `clearVocabCache(field)` tests: verify field-prefix loop correctly clears `"era:en"` and `"era:es"` when called with `'era'`
- Mock `window.electronAPI.getVocab` assertions: verify the locale argument is now passed
- Mock `useLanguage` in test setup (module mock for `../useLanguage`)

**`server.ts` tests (`src/__tests__/integration/server.test.ts`):**
- Add test: `GET /lens/{token}` with default locale returns `<html lang="es">` and Spanish strings
- Add test: server created with `locale: 'en'` returns English strings
- Add test: `data-strings` attribute is present and parseable JSON with correct keys

**Coverage targets unchanged:**
- `PlateEditor.tsx`, `AutocompleteField.tsx`, `QRCodeDisplay.tsx`: 80% statement
- `useVocabularies.ts`: 90% function

---

## 9. UI Assessment (`curating-ui`)
**Status:** Verified

### Findings:

**PlateEditor button lengths:**
| English | Spanish | Risk |
|---------|---------|------|
| "Activate Connection" (20) | "Activar Conexión" (17) | None |
| "Replace" (7) | "Reemplazar" (10) | None |
| "Import from Digital Archive" (27) | "Importar del Archivo Digital" (28) | Low — disabled, full-width |

**Lens mobile page:**
All strings render in Cormorant Garamond. Spanish strings are marginally longer but the `.file-upload-btn` is `max-width: 320px` block-level. No overflow risk. `"Capturar Imagen"` is actually shorter than `"Capture Image"`. ✓

**"LÁMINA" plate caption:** marginally longer than "PLATE" but full-width block element. ✓

---

## 10. Numismatic Assessment (`curating-coins`)
**Status:** Verified

### Findings:

- `"Anverso (Principal)"` — correct. "Principal" is the standard modifier in Spanish numismatic catalogs. ✓
- `"Lámina I/II/III"` — correct archival term for a reference plate. Used by Real Academia de la Historia. ✓
- `"Transferir al Registro"` (Lens subtitle) — correct. "Registro" is the established term for the ledger in this app. ✓
- `"Añadido al Registro."` (success message) — correct. ✓
- `"Emisor Desconocido"` — correct numismatic terminology for unknown issuer. ✓

---

## 11. Post-Implementation Retrospective

**Completion date:** 2026-03-21

All 9 defects resolved. TypeScript type-check: clean. Test suite: 138/138 passing.

**Notable divergence from blueprint:**
- `PlateEditor.test.tsx` mock path corrected: `'./Lens/QRCodeDisplay'` → `'../Lens/QRCodeDisplay'` (the blueprint assumed a path relative to the component; tests live in `__tests__/` subdirectory).
- `QRCodeDisplay.test.tsx` scan-prompt assertion uses `p.textContent` inspection instead of `getByText` because the two text nodes are siblings of a `<br/>` inside the same `<p>` element — `getByText` cannot match a partial text node in that context.
- `lens-mobile.ts`: `document.body.dataset.strings` typed via intersection cast to avoid a non-existent `HTMLBodyElement.dataset` typings issue in the tsconfig target.
- `Scriptorium.test.tsx` was also referencing the old "Establish Wireless Bridge" string and required updating.

**Patterns confirmed for AGENTS.md / style guide:**
- Lens server locale pattern: read `dbService.getPreference('language')` in the IPC handler, cast to `'en' | 'es'`, pass into `createLensServer({ locale })`. Strings are static dictionaries in `server.ts`; client strings are embedded as `data-strings` JSON attribute on `<body>`.
- Vocabulary cache key convention: always composite `"${field}:${locale}"` to prevent cross-locale stale hits.
