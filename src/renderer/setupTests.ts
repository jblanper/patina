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
};
