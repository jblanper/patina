import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToPdf } from './pdf';
import { Coin } from '../../common/types';

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addImage: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
    lastAutoTable: { finalY: 100 },
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-image-data')),
  writeFileSync: vi.fn(),
}));

const mockGetCoins = vi.fn();
const mockGetImagesByCoinId = vi.fn();

vi.mock('../db', () => ({
  dbService: {
    getCoins: mockGetCoins,
    getImagesByCoinId: mockGetImagesByCoinId,
  },
}));

describe('PDF Export', () => {
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
      weight: 17.2,
      diameter: 25,
      fineness: '0.93',
      die_axis: '180',
      obverse_legend: 'ΑΘΕ',
      reverse_legend: 'ΑΘΕΝΑΙΩΝ',
      grade: 'EF',
      rarity: 'Common',
      catalog_ref: 'SNG Munich 123',
      provenance: 'Private Collection',
      story: 'Classic example of Athenian silver.',
      purchase_price: 500,
      purchase_date: '2022-01-15',
      purchase_source: 'Coin Shop NYC',
      created_at: '2023-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCoins.mockReturnValue(mockCoins);
    mockGetImagesByCoinId.mockReturnValue([]);
  });

  it('should return success result with target path', async () => {
    const result = await exportToPdf('/tmp/test-catalog.pdf');

    expect(result.success).toBe(true);
    expect(result.path).toBe('/tmp/test-catalog.pdf');
    expect(result.error).toBeUndefined();
  });

  it('should query all coins from database', async () => {
    await exportToPdf('/tmp/test-catalog.pdf');

    expect(mockGetCoins).toHaveBeenCalledTimes(1);
    expect(mockGetCoins).toHaveReturnedWith(mockCoins);
  });

  it('should fetch images for each coin', async () => {
    mockGetImagesByCoinId.mockReturnValueOnce([
      { id: 1, coin_id: 1, path: 'coin1_obv.jpg', label: 'Obverse', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
    ]);

    await exportToPdf('/tmp/test-catalog.pdf');

    expect(mockGetImagesByCoinId).toHaveBeenCalledWith(1);
  });

  it('should handle empty collection', async () => {
    mockGetCoins.mockReturnValueOnce([]);

    const result = await exportToPdf('/tmp/test-catalog.pdf');

    expect(result.success).toBe(true);
    expect(mockGetImagesByCoinId).not.toHaveBeenCalled();
  });

  it('should handle coins with complete metadata', async () => {
    const result = await exportToPdf('/tmp/test-catalog.pdf');

    expect(result.success).toBe(true);
    expect(mockGetCoins).toHaveBeenCalledWith();
  });

  it('should handle coins missing optional fields', async () => {
    const incompleteCoin: Coin = {
      id: 2,
      title: 'Incomplete Coin',
      issuer: 'Unknown',
      era: 'Modern',
      created_at: '2023-03-01',
    };
    mockGetCoins.mockReturnValueOnce([incompleteCoin]);

    const result = await exportToPdf('/tmp/test-catalog.pdf');

    expect(result.success).toBe(true);
  });

  it('should handle fs.writeFileSync errors gracefully', async () => {
    const { fs } = require('fs');
    fs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Write permission denied');
    });

    const result = await exportToPdf('/tmp/test-catalog.pdf');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Write permission denied');
  });
});
