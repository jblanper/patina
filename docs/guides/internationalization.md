# How to Add or Modify UI Translations

This guide explains how to add new translation keys, switch languages in code, and keep the vocabulary system locale-aware.

## Prerequisites

- Familiarity with the project's i18n setup: `react-i18next`, static JSON locale files at `src/renderer/i18n/locales/`.
- The key-parity test (`src/renderer/i18n/__tests__/translations.test.ts`) runs on every `npm test`. It will fail if any key is present in one locale file but missing from the other.

---

## Steps

### 1. Add a new translation key

Open **both** locale files and add the key to each:

```bash
# English
src/renderer/i18n/locales/en.json

# Spanish
src/renderer/i18n/locales/es.json
```

Both files must be updated in the same commit. The key-parity test enforces this:

```json
// en.json
{
  "cabinet": {
    "emptyState": "No coins indexed yet."
  }
}

// es.json
{
  "cabinet": {
    "emptyState": "Aún no hay monedas indexadas."
  }
}
```

Use the existing namespace structure (`common`, `cabinet`, `detail`, `ledger`, `plateEditor`, `autocomplete`, `lens`). Add a new namespace only when the string group is genuinely distinct from all existing namespaces.

---

### 2. Use translations in a component

Use the `useTranslation` hook with the appropriate namespace:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('cabinet');

return <p>{t('emptyState')}</p>;
```

Never hardcode English (or Spanish) strings. All UI text must go through `t()`.

**Empty display fields:** Use the `'—'` character (em dash), not a translation key, for fields with no recorded value. This keeps the Ledger uncluttered without proliferating "not recorded" keys across locales.

---

### 3. Change the application language

Use the `useLanguage` hook — never call `i18n.changeLanguage` directly:

```typescript
import { useLanguage } from '../hooks/useLanguage';

const { language, setLanguage } = useLanguage();

// Switch to English
setLanguage('en');
```

`useLanguage` persists the choice to the `preferences` table via IPC and updates the i18n instance. Calling `i18n.changeLanguage` directly bypasses persistence.

The default language is **Spanish** (`'es'`). New users see the UI in Spanish unless they explicitly switch.

---

### 4. Pass locale to vocabulary calls

Vocabulary values are locale-specific. Always pass the current locale:

```typescript
const { language } = useLanguage();
const { values } = useVocabularies('metal', language);
```

Omitting the locale returns values from all locales mixed together. The composite cache key `"${field}:${locale}"` (e.g., `"metal:es"`) ensures locale switches fetch fresh data rather than returning the previous locale's cached list.

---

### 5. Update tests for vocab-backed components

When testing any component that uses `useVocabularies` or `AutocompleteField`, clear the vocabulary cache in `beforeEach`:

```typescript
import { clearVocabCache } from '../../hooks/useVocabularies';

beforeEach(() => {
  vi.clearAllMocks();
  clearVocabCache();
});
```

Without this, a test that mocks `getVocab` for Spanish may see stale English results from a prior test.

---

## Troubleshooting

- **Key-parity test fails:** A key is in one locale file but not the other. The test output lists the missing key path. Add it to the missing file.
- **Component shows translation key instead of text (e.g., `cabinet.emptyState`):** The key is missing from the active locale's JSON file, or there is a namespace mismatch in the `useTranslation` call.
- **Vocabulary dropdown shows wrong language after language switch:** `clearVocabCache()` was not called. In production code, language switches invalidate the cache automatically via `useLanguage`. In tests, call `clearVocabCache()` manually.
- **Lens mobile UI still shows English after switching to Spanish:** The Lens server reads the language preference at session start. Stop and restart the Lens session after changing the language.

## Related resources

- [Vocabulary System reference](../reference/vocabulary-system.md)
- [IPC API reference](../reference/ipc_api.md) — `pref:get`, `pref:set`, `vocab:get`
- `src/renderer/i18n/locales/en.json` and `es.json` — locale files
- `src/renderer/i18n/__tests__/translations.test.ts` — key-parity test
