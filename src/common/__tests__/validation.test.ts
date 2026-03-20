import { describe, it, expect } from 'vitest';
import {
  CoinSchema,
  NewCoinSchema,
  FilterStateSchema,
  NewCoinImageSchema,
  ExportOptionsSchema,
  exportCsvField
} from '../validation';

describe('validation.ts', () => {
  describe('CoinSchema', () => {
    it('should validate a complete coin', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test Coin',
        era: 'Ancient',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        era: 'Ancient',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: '',
        era: 'Ancient',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid era', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Invalid',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid eras', () => {
      ['Ancient', 'Medieval', 'Modern'].forEach(era => {
        const result = CoinSchema.safeParse({
          id: 1,
          title: 'Test',
          era,
          created_at: '2026-01-01'
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept optional fields as null', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        issuer: null,
        denomination: null,
        weight: null,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative weight', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        weight: -5,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative diameter', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        diameter: -10,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should accept weight with 2 decimal places', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        weight: 17.25,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(true);
    });

    it('should reject weight with 3 decimal places', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        weight: 17.256,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should accept diameter with 1 decimal place', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        diameter: 25.5,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(true);
    });

    it('should reject diameter with 2 decimal places', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        diameter: 25.55,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative purchase_price', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        purchase_price: -100,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should accept zero purchase_price', () => {
      const result = CoinSchema.safeParse({
        id: 1,
        title: 'Test',
        era: 'Ancient',
        purchase_price: 0,
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive id', () => {
      const result = CoinSchema.safeParse({
        id: 0,
        title: 'Test',
        era: 'Ancient',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer id', () => {
      const result = CoinSchema.safeParse({
        id: 1.5,
        title: 'Test',
        era: 'Ancient',
        created_at: '2026-01-01'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('NewCoinSchema', () => {
    it('should validate a new coin', () => {
      const result = NewCoinSchema.safeParse({
        title: 'Test Coin',
        era: 'Ancient'
      });
      expect(result.success).toBe(true);
    });

    it('should reject unknown properties (strict mode)', () => {
      const result = NewCoinSchema.safeParse({
        title: 'Test',
        era: 'Ancient',
        unknownField: 'value'
      });
      expect(result.success).toBe(false);
    });

    it('should omit id and created_at', () => {
      const result = NewCoinSchema.safeParse({
        title: 'Test',
        era: 'Ancient'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('created_at');
      }
    });
  });

  describe('FilterStateSchema', () => {
    it('should validate filter state', () => {
      const result = FilterStateSchema.safeParse({
        era: ['Ancient'],
        metal: ['Silver'],
        searchTerm: 'test',
        sortBy: 'year_numeric',
        sortAsc: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty arrays', () => {
      const result = FilterStateSchema.safeParse({
        era: [],
        metal: [],
        searchTerm: '',
        sortBy: null,
        sortAsc: true
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid era value', () => {
      const result = FilterStateSchema.safeParse({
        era: ['Invalid'],
        metal: [],
        searchTerm: '',
        sortBy: null,
        sortAsc: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = FilterStateSchema.safeParse({
        era: ['Ancient']
      });
      expect(result.success).toBe(false);
    });
  });

  describe('NewCoinImageSchema', () => {
    it('should validate image with all fields', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: 'images/test.jpg',
        label: 'Obverse',
        is_primary: true,
        sort_order: 0
      });
      expect(result.success).toBe(true);
    });

    it('should validate image with minimal fields', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: 'images/test.jpg'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid label', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: 'images/test.jpg',
        label: 'Invalid'
      });
      expect(result.success).toBe(false);
    });

    it('should reject unknown properties (strict mode)', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: 'images/test.jpg',
        unknownField: 'value'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty path', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive coin_id', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 0,
        path: 'images/test.jpg'
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative sort_order', () => {
      const result = NewCoinImageSchema.safeParse({
        coin_id: 1,
        path: 'images/test.jpg',
        sort_order: -1
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid labels', () => {
      ['Obverse', 'Reverse', 'Edge'].forEach(label => {
        const result = NewCoinImageSchema.safeParse({
          coin_id: 1,
          path: 'images/test.jpg',
          label
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ExportOptionsSchema', () => {
    it('should validate with all fields', () => {
      const result = ExportOptionsSchema.safeParse({
        targetPath: '/absolute/path',
        includeImages: true,
        includeCsv: true
      });
      expect(result.success).toBe(true);
    });

    it('should validate with minimal fields (defaults)', () => {
      const result = ExportOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject path traversal', () => {
      const result = ExportOptionsSchema.safeParse({
        targetPath: '../relative/path'
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative path', () => {
      const result = ExportOptionsSchema.safeParse({
        targetPath: 'relative/path'
      });
      expect(result.success).toBe(false);
    });

    it('should reject unknown properties (strict mode)', () => {
      const result = ExportOptionsSchema.safeParse({
        targetPath: '/absolute/path',
        unknownField: 'value'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('exportCsvField', () => {
    it('should return empty string for null', () => {
      expect(exportCsvField(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(exportCsvField(undefined)).toBe('');
    });

    it('should return string as-is for normal values', () => {
      expect(exportCsvField('Normal text')).toBe('Normal text');
      expect(exportCsvField('123')).toBe('123');
      expect(exportCsvField('Hello World')).toBe('Hello World');
    });

    it('should prefix formula-starting characters', () => {
      expect(exportCsvField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(exportCsvField('+formula')).toBe("'+formula");
      expect(exportCsvField('-formula')).toBe("'-formula");
      expect(exportCsvField('@formula')).toBe("'@formula");
    });

    it('should prefix tab and newline characters', () => {
      expect(exportCsvField('\tindented')).toBe("'\tindented");
      expect(exportCsvField('\nnewline')).toBe("'\nnewline");
      expect(exportCsvField('\rCR')).toBe("'\rCR");
    });

    it('should handle numbers', () => {
      expect(exportCsvField(42)).toBe('42');
      expect(exportCsvField(3.14)).toBe('3.14');
    });

    it('should handle boolean values', () => {
      expect(exportCsvField(true)).toBe('true');
      expect(exportCsvField(false)).toBe('false');
    });

    it('should handle objects via String()', () => {
      expect(exportCsvField({})).toBe('[object Object]');
      expect(exportCsvField({ toString: () => 'custom' })).toBe('custom');
    });
  });
});