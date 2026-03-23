import '@testing-library/jest-dom';
import { vi } from 'vitest';
import en from './i18n/locales/en.json';
import { DEFAULT_FIELD_VISIBILITY } from '../common/validation';

// Helper to resolve nested translation keys from the en.json object
function resolveKey(key: string, opts?: Record<string, unknown>): string {
  const parts = key.split('.');
  let current: unknown = en;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  let val = typeof current === 'string' ? current : key;
  if (opts) {
    val = val.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
  }
  return val;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => resolveKey(key, opts),
    i18n: { changeLanguage: vi.fn().mockResolvedValue(undefined), language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

// Mock electronAPI
window.electronAPI = {
  ping: vi.fn(),
  getCoins: vi.fn(),
  getCoinById: vi.fn(),
  addCoin: vi.fn(),
  updateCoin: vi.fn(),
  deleteCoin: vi.fn(),
  addImage: vi.fn(),
  getImagesByCoinId: vi.fn(),
  deleteImage: vi.fn(),
  startLens: vi.fn(),
  stopLens: vi.fn(),
  onLensImageReceived: vi.fn(),
  removeLensListeners: vi.fn(),
  exportToZip: vi.fn(),
  exportToPdf: vi.fn(),
  getVocab: vi.fn().mockResolvedValue([]),
  addVocabEntry: vi.fn().mockResolvedValue(undefined),
  searchVocab: vi.fn().mockResolvedValue([]),
  incrementVocabUsage: vi.fn().mockResolvedValue(undefined),
  resetVocab: vi.fn().mockResolvedValue(undefined),
  getPreference: vi.fn().mockResolvedValue('es'),
  setPreference: vi.fn().mockResolvedValue(undefined),
  prefsGetVisibility: vi.fn().mockResolvedValue({ ...DEFAULT_FIELD_VISIBILITY }),
  prefsSetVisibility: vi.fn().mockResolvedValue(undefined),
  prefsResetVisibility: vi.fn().mockResolvedValue({ ...DEFAULT_FIELD_VISIBILITY }),
};
