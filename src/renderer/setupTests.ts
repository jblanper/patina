import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
};
