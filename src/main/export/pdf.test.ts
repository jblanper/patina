import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsMod from 'fs';
import { exportToPdf } from './pdf';
import { PdfExportOptionsSchema } from '../../common/validation';
import { Coin } from '../../common/types';

const mockDocInstance = {
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  setLineDashPattern: vi.fn(),
  setPage: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  addImage: vi.fn(),
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  getNumberOfPages: vi.fn().mockReturnValue(5),
  getTextWidth: vi.fn().mockReturnValue(50),
  splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
  output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
  lastAutoTable: { finalY: 100 },
};

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: vi.fn().mockReturnValue('/tmp') },
  nativeImage: {
    createFromBuffer: vi.fn().mockReturnValue({
      toJPEG: vi.fn().mockReturnValue(Buffer.from('fake-jpeg')),
    }),
  },
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockDocInstance),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync:    vi.fn().mockReturnValue(true),
  readFileSync:  vi.fn().mockReturnValue(Buffer.from('fake-data')),
  writeFileSync: vi.fn(),
  statSync:      vi.fn().mockReturnValue({ size: 1000 }),
}));

const mockGetCoins = vi.fn();
const mockGetImagesByCoinId = vi.fn();

vi.mock('../db', () => ({
  dbService: {
    getCoins: mockGetCoins,
    getImagesByCoinId: mockGetImagesByCoinId,
  },
}));

const baseCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 1,
  title: 'Athenian Owl',
  issuer: 'Athens',
  denomination: 'Tetradrachm',
  era: 'Ancient',
  year_numeric: -454,
  year_display: '454 BC',
  metal: 'Silver',
  weight: 17.2,
  diameter: 25,
  fineness: '0.93',
  die_axis: '12',
  obverse_legend: 'ΑΘΕ',
  reverse_legend: 'ΑΘΕΝΑΙΩΝ',
  grade: 'EF',
  rarity: 'Common',
  catalog_ref: 'SNG Munich 123',
  provenance: 'Private Collection',
  story: 'Classic Athenian silver.',
  purchase_price: 500,
  purchase_date: '2022-01-15',
  purchase_source: 'Coin Shop NYC',
  created_at: '2023-01-01',
  ...overrides,
});

describe('PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCoins.mockReturnValue([baseCoin()]);
    mockGetImagesByCoinId.mockReturnValue([]);
    // Reset doc mock state
    mockDocInstance.addPage.mockClear();
    mockDocInstance.setPage.mockClear();
    mockDocInstance.text.mockClear();
    mockDocInstance.getNumberOfPages.mockReturnValue(5);
  });

  // ── 1. Spanish locale output ──────────────────────────────────────────────
  it('should output Spanish labels when locale is "es"', async () => {
    const result = await exportToPdf('/tmp/catalog.pdf', 'es');

    expect(result.success).toBe(true);
    const textCalls = mockDocInstance.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(v => String(v).includes('Especificaciones') || String(v).includes('Estadísticas'))).toBe(true);
  });

  // ── 2. English locale output ──────────────────────────────────────────────
  it('should output English labels when locale is "en"', async () => {
    const result = await exportToPdf('/tmp/catalog.pdf', 'en');

    expect(result.success).toBe(true);
    const textCalls = mockDocInstance.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(v => String(v).includes('Collection Statistics'))).toBe(true);
  });

  // ── 3. Font load failure → graceful fallback ──────────────────────────────
  it('should succeed with fallback fonts when readFileSync throws for TTF', async () => {
    vi.mocked(fsMod.readFileSync).mockImplementationOnce(() => {
      throw new Error('ENOENT: no such file');
    });

    const result = await exportToPdf('/tmp/catalog.pdf', 'es');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ── 4. 2 coins → correct addPage + setPage call counts ───────────────────
  it('should call addPage correctly for 2 coins (1 toc + 1 stats + 2 content)', async () => {
    mockGetCoins.mockReturnValue([baseCoin({ id: 1 }), baseCoin({ id: 2, title: 'Roman Denarius' })]);
    mockGetImagesByCoinId.mockReturnValue([]);

    await exportToPdf('/tmp/catalog.pdf', 'es');

    // 1 TOC + 1 stats + 2 content pages (1 coin per page)
    expect(mockDocInstance.addPage).toHaveBeenCalledTimes(4);
    // setPage called for TOC back-fill + stats back-fill
    expect(mockDocInstance.setPage).toHaveBeenCalledTimes(2);
  });

  // ── 5. 3 coins → 3 content pages ─────────────────────────────────────────
  it('should produce 3 content pages for 3 coins', async () => {
    mockGetCoins.mockReturnValue([
      baseCoin({ id: 1 }),
      baseCoin({ id: 2, title: 'Roman Denarius' }),
      baseCoin({ id: 3, title: 'Byzantine Solidus' }),
    ]);
    mockGetImagesByCoinId.mockReturnValue([]);

    await exportToPdf('/tmp/catalog.pdf', 'es');

    // 1 TOC + 1 stats + 3 content pages = 5 addPage calls
    expect(mockDocInstance.addPage).toHaveBeenCalledTimes(5);
  });

  // ── 6. Each coin gets its own page ────────────────────────────────────────
  it('should give each coin its own page regardless of content length', async () => {
    const longStory = 'x'.repeat(2000);
    mockGetCoins.mockReturnValue([
      baseCoin({ id: 1, story: longStory }),
      baseCoin({ id: 2, title: 'Roman Denarius' }),
    ]);
    mockGetImagesByCoinId.mockReturnValue([]);

    await exportToPdf('/tmp/catalog.pdf', 'es');

    // 1 TOC + 1 stats + 2 content pages = 4 addPage calls
    expect(mockDocInstance.addPage).toHaveBeenCalledTimes(4);
  });

  // ── 7. Empty collection ───────────────────────────────────────────────────
  it('should succeed for an empty collection without coin content pages', async () => {
    mockGetCoins.mockReturnValue([]);
    mockGetImagesByCoinId.mockReturnValue([]);

    const result = await exportToPdf('/tmp/catalog.pdf', 'es');

    expect(result.success).toBe(true);
    // Only 1 TOC + 1 stats placeholder; no coin pages
    expect(mockDocInstance.addPage).toHaveBeenCalledTimes(2);
  });

  // ── 8. PdfExportOptionsSchema validation ──────────────────────────────────
  describe('PdfExportOptionsSchema', () => {
    it('should accept locale "en"', () => {
      expect(PdfExportOptionsSchema.safeParse({ locale: 'en' }).success).toBe(true);
    });

    it('should accept locale "es"', () => {
      expect(PdfExportOptionsSchema.safeParse({ locale: 'es' }).success).toBe(true);
    });

    it('should default locale to "es" when omitted', () => {
      const result = PdfExportOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.locale).toBe('es');
    });

    it('should reject an invalid locale value', () => {
      expect(PdfExportOptionsSchema.safeParse({ locale: 'fr' }).success).toBe(false);
    });
  });

  // ── 9. TOC page boundary: 14 coins → 1 TOC page, 15 coins → 2 TOC pages ─
  it('should use exactly 1 TOC page for 14 coins', async () => {
    const coins = Array.from({ length: 14 }, (_, i) =>
      baseCoin({ id: i + 1, title: `Coin ${i + 1}`, era: 'Ancient' }),
    );
    mockGetCoins.mockReturnValue(coins);
    mockGetImagesByCoinId.mockReturnValue([]);

    await exportToPdf('/tmp/catalog.pdf', 'es');

    // setPage called: 1 (TOC back-fill) + 1 (stats back-fill) = 2
    expect(mockDocInstance.setPage).toHaveBeenCalledTimes(2);
  });

  it('should use exactly 2 TOC pages for 15 coins', async () => {
    const coins = Array.from({ length: 15 }, (_, i) =>
      baseCoin({ id: i + 1, title: `Coin ${i + 1}`, era: 'Ancient' }),
    );
    mockGetCoins.mockReturnValue(coins);
    mockGetImagesByCoinId.mockReturnValue([]);

    await exportToPdf('/tmp/catalog.pdf', 'es');

    // setPage called: 2 (TOC back-fill) + 1 (stats back-fill) = 3
    expect(mockDocInstance.setPage).toHaveBeenCalledTimes(3);
  });

  // ── Legacy tests (updated signatures) ────────────────────────────────────
  it('should return success result with target path', async () => {
    const result = await exportToPdf('/tmp/test-catalog.pdf', 'es');

    expect(result.success).toBe(true);
    expect(result.path).toBe('/tmp/test-catalog.pdf');
    expect(result.error).toBeUndefined();
  });

  it('should query all coins from database', async () => {
    await exportToPdf('/tmp/test-catalog.pdf', 'es');

    expect(mockGetCoins).toHaveBeenCalledTimes(1);
  });

  it('should fetch images for each coin', async () => {
    mockGetImagesByCoinId.mockReturnValue([
      { id: 1, coin_id: 1, path: 'coin1_obv.jpg', label: 'Obverse', is_primary: true, sort_order: 1, created_at: '2023-01-01' },
    ]);

    await exportToPdf('/tmp/test-catalog.pdf', 'es');

    expect(mockGetImagesByCoinId).toHaveBeenCalledWith(1);
  });

  it('should handle coins missing optional fields', async () => {
    mockGetCoins.mockReturnValue([baseCoin({ id: 2, title: 'Minimal Coin', issuer: undefined, denomination: undefined })]);

    const result = await exportToPdf('/tmp/test-catalog.pdf', 'es');

    expect(result.success).toBe(true);
  });

  it('should handle fs.writeFileSync errors gracefully', async () => {
    vi.mocked(fsMod.writeFileSync).mockImplementationOnce(() => {
      throw new Error('Write permission denied');
    });

    const result = await exportToPdf('/tmp/test-catalog.pdf', 'es');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Write permission denied');
  });
});
