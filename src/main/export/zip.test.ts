import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToZip } from './zip';
import { Coin } from '../../common/types';

vi.mock('archiver', () => ({
  default: vi.fn().mockImplementation(() => ({
    pipe: vi.fn(),
    append: vi.fn(),
    file: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, cb: (arg?: unknown) => void) => {
      if (event === 'close') setTimeout(() => cb(), 0);
      if (event === 'error') return vi.fn();
      return vi.fn();
    }),
  })),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  createWriteStream: vi.fn(() => ({
    on: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  })),
}));

vi.mock('../../common/validation', () => ({
  exportCsvField: vi.fn((val: unknown) => String(val ?? '')),
}));

const mockGetCoins = vi.fn();
const mockGetImagesByCoinId = vi.fn();

vi.mock('../db', () => ({
  dbService: {
    getCoins: mockGetCoins,
    getImagesByCoinId: mockGetImagesByCoinId,
  },
}));

describe('ZIP Export', () => {
  const mockCoins: Coin[] = [
    {
      id: 1,
      title: 'Athenian Owl',
      issuer: 'Athens',
      denomination: 'Tetrachalkon',
      era: 'Ancient',
      year_numeric: -454,
      year_display: '454 BC',
      metal: 'Silver',
      created_at: '2023-01-01',
    },
    {
      id: 2,
      title: 'Roman Denarius',
      issuer: 'Roman Empire',
      denomination: 'Denarius',
      era: 'Medieval',
      year_numeric: 73,
      year_display: 'AD 73',
      metal: 'Silver',
      created_at: '2023-02-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCoins.mockReturnValue(mockCoins);
    mockGetImagesByCoinId.mockReturnValue([]);
  });

  it('should return success result with target path', async () => {
    const result = await exportToZip('/tmp/test-export.zip');

    expect(result.success).toBe(true);
    expect(result.path).toBe('/tmp/test-export.zip');
    expect(result.error).toBeUndefined();
  });

  it('should query all coins from database', async () => {
    await exportToZip('/tmp/test-export.zip');

    expect(mockGetCoins).toHaveBeenCalledTimes(1);
    expect(mockGetCoins).toHaveReturnedWith(mockCoins);
  });

  it('should fetch images for each coin', async () => {
    await exportToZip('/tmp/test-export.zip');

    expect(mockGetImagesByCoinId).toHaveBeenCalledTimes(2);
    expect(mockGetImagesByCoinId).toHaveBeenCalledWith(1);
    expect(mockGetImagesByCoinId).toHaveBeenCalledWith(2);
  });

  it('should handle coins with images', async () => {
    mockGetImagesByCoinId.mockReturnValueOnce([
      { id: 1, coin_id: 1, path: 'coin1_obv.jpg', label: 'Obverse', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
      { id: 2, coin_id: 1, path: 'coin1_rev.jpg', label: 'Reverse', is_primary: false, sort_order: 2, created_at: '2023-01-01' },
    ]);

    const result = await exportToZip('/tmp/test-export.zip');

    expect(result.success).toBe(true);
    expect(mockGetImagesByCoinId).toHaveBeenCalledWith(1);
  });

  it('should respect includeImages option', async () => {
    await exportToZip('/tmp/test-export.zip', false, true);

    expect(mockGetCoins).toHaveBeenCalled();
  });

  it('should respect includeCsv option', async () => {
    await exportToZip('/tmp/test-export.zip', true, false);

    expect(mockGetCoins).toHaveBeenCalled();
  });

  it('should handle empty collection', async () => {
    mockGetCoins.mockReturnValueOnce([]);

    const result = await exportToZip('/tmp/test-export.zip');

    expect(result.success).toBe(true);
    expect(mockGetImagesByCoinId).not.toHaveBeenCalled();
  });
});
