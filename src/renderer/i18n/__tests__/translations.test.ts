import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import es from '../locales/es.json';

type NestedObject = { [key: string]: string | NestedObject };

function getAllKeys(obj: NestedObject, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getAllKeys(value as NestedObject, fullKey);
    }
    return [fullKey];
  });
}

describe('Translation completeness', () => {
  it('every key in en.json exists in es.json', () => {
    const enKeys = getAllKeys(en as unknown as NestedObject);
    const esKeys = new Set(getAllKeys(es as unknown as NestedObject));

    const missing = enKeys.filter(k => !esKeys.has(k));
    expect(missing, `Missing keys in es.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('every key in es.json exists in en.json', () => {
    const esKeys = getAllKeys(es as unknown as NestedObject);
    const enKeys = new Set(getAllKeys(en as unknown as NestedObject));

    const extra = esKeys.filter(k => !enKeys.has(k));
    expect(extra, `Extra keys in es.json not in en.json: ${extra.join(', ')}`).toHaveLength(0);
  });
});
