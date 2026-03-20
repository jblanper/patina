import { describe, it, expect } from 'vitest';
import {
  CoinSchema,
  NewCoinSchema,
  FilterStateSchema,
  NewCoinImageSchema,
  ExportOptionsSchema,
  exportCsvField,
  VocabGetSchema,
  VocabAddSchema,
  VocabSearchSchema,
  VocabIncrementSchema,
  VocabResetSchema,
  ALLOWED_VOCAB_FIELDS,
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
        grade: ['XF'],
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
        grade: [],
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
        grade: [],
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

    it('should reject object missing grade field', () => {
      const result = FilterStateSchema.safeParse({
        era: [],
        metal: [],
        searchTerm: '',
        sortBy: null,
        sortAsc: true
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple grade values in grade array', () => {
      const result = FilterStateSchema.safeParse({
        era: [],
        metal: [],
        grade: ['XF', 'Choice VF', 'MS-63'],
        searchTerm: '',
        sortBy: null,
        sortAsc: true
      });
      expect(result.success).toBe(true);
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

// ── Vocabulary Schemas (Phase 6a) ────────────────────────────────────────────

describe('VocabGetSchema', () => {
  it('TC-VS-01: valid field name passes', () => {
    expect(VocabGetSchema.safeParse({ field: 'metal' }).success).toBe(true);
  });

  it.each(ALLOWED_VOCAB_FIELDS)('TC-VS-02: allowed field "%s" passes', (field) => {
    expect(VocabGetSchema.safeParse({ field }).success).toBe(true);
  });

  it('TC-VS-03: invalid field name rejected with issue path [field]', () => {
    const result = VocabGetSchema.safeParse({ field: 'unknown' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('field');
  });

  it('TC-VS-04: missing field property rejected', () => {
    expect(VocabGetSchema.safeParse({}).success).toBe(false);
  });

  it('TC-VS-05: extra properties rejected with unrecognized_keys', () => {
    const result = VocabGetSchema.safeParse({ field: 'metal', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });
});

describe('VocabAddSchema', () => {
  it('TC-VS-06: valid { field, value } passes', () => {
    expect(VocabAddSchema.safeParse({ field: 'metal', value: 'Silver' }).success).toBe(true);
  });

  it('TC-VS-07: empty value string rejected with issue path [value]', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('value');
  });

  it('TC-VS-08: value at exactly 200 chars passes', () => {
    expect(VocabAddSchema.safeParse({ field: 'metal', value: 'A'.repeat(200) }).success).toBe(true);
  });

  it('TC-VS-09: value at 201 chars rejected with issue path [value]', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: 'A'.repeat(201) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('value');
  });

  it('TC-VS-10: invalid field name rejected with issue path [field]', () => {
    const result = VocabAddSchema.safeParse({ field: 'unknown', value: 'Silver' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('field');
  });

  it('TC-VS-11: extra properties rejected with unrecognized_keys', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: 'Silver', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });

  it('TC-VS-12: whitespace-only value rejected after trim', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('value');
  });

  it('TC-VS-13: leading/trailing spaces accepted; output is trimmed', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '  Silver  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.value).toBe('Silver');
  });
});

describe('VocabSearchSchema', () => {
  it('TC-VS-14: valid { field, query } passes', () => {
    expect(VocabSearchSchema.safeParse({ field: 'grade', query: 'EF' }).success).toBe(true);
  });

  it('TC-VS-15: empty query string passes', () => {
    expect(VocabSearchSchema.safeParse({ field: 'grade', query: '' }).success).toBe(true);
  });

  it('TC-VS-16: query at exactly 100 chars passes', () => {
    expect(VocabSearchSchema.safeParse({ field: 'grade', query: 'A'.repeat(100) }).success).toBe(true);
  });

  it('TC-VS-17: query at 101 chars rejected with issue path [query]', () => {
    const result = VocabSearchSchema.safeParse({ field: 'grade', query: 'A'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('query');
  });

  it('TC-VS-18: invalid field name rejected', () => {
    expect(VocabSearchSchema.safeParse({ field: 'unknown', query: '' }).success).toBe(false);
  });

  it('TC-VS-19: extra properties rejected with unrecognized_keys', () => {
    const result = VocabSearchSchema.safeParse({ field: 'grade', query: '', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });
});

describe('VocabIncrementSchema', () => {
  it('TC-VS-20: valid { field, value } passes', () => {
    expect(VocabIncrementSchema.safeParse({ field: 'grade', value: 'EF-40' }).success).toBe(true);
  });

  it('TC-VS-21: invalid field name rejected with issue path [field]', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'unknown', value: 'EF-40' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('field');
  });

  it('TC-VS-22: empty value string rejected with issue path [value]', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'grade', value: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('value');
  });

  it('TC-VS-23: extra properties rejected with unrecognized_keys', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'grade', value: 'EF-40', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });
});

describe('VocabResetSchema', () => {
  it('TC-VS-24: {} passes (full reset)', () => {
    expect(VocabResetSchema.safeParse({}).success).toBe(true);
  });

  it('TC-VS-25: valid { field } passes (scoped reset)', () => {
    expect(VocabResetSchema.safeParse({ field: 'metal' }).success).toBe(true);
  });

  it('TC-VS-26: invalid field name rejected with issue path [field]', () => {
    const result = VocabResetSchema.safeParse({ field: 'unknown' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('field');
  });

  it('TC-VS-27: extra properties rejected with unrecognized_keys', () => {
    const result = VocabResetSchema.safeParse({ field: 'metal', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
  });
});