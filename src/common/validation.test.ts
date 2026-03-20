import { describe, it, expect } from 'vitest';
import {
  VocabGetSchema,
  VocabAddSchema,
  VocabSearchSchema,
  VocabIncrementSchema,
  VocabResetSchema,
  ALLOWED_VOCAB_FIELDS,
} from './validation';

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
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('field');
    }
  });

  it('TC-VS-04: missing field property rejected', () => {
    expect(VocabGetSchema.safeParse({}).success).toBe(false);
  });

  it('TC-VS-05: extra properties rejected with unrecognized_keys', () => {
    const result = VocabGetSchema.safeParse({ field: 'metal', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
    }
  });
});

describe('VocabAddSchema', () => {
  it('TC-VS-06: valid { field, value } passes', () => {
    expect(VocabAddSchema.safeParse({ field: 'metal', value: 'Silver' }).success).toBe(true);
  });

  it('TC-VS-07: empty value string rejected with issue path [value]', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('value');
    }
  });

  it('TC-VS-08: value at exactly 200 chars passes', () => {
    const value = 'A'.repeat(200);
    expect(VocabAddSchema.safeParse({ field: 'metal', value }).success).toBe(true);
  });

  it('TC-VS-09: value at 201 chars rejected with issue path [value]', () => {
    const value = 'A'.repeat(201);
    const result = VocabAddSchema.safeParse({ field: 'metal', value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('value');
    }
  });

  it('TC-VS-10: invalid field name rejected with issue path [field]', () => {
    const result = VocabAddSchema.safeParse({ field: 'unknown', value: 'Silver' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('field');
    }
  });

  it('TC-VS-11: extra properties rejected with unrecognized_keys', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: 'Silver', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
    }
  });

  it('TC-VS-12: whitespace-only value rejected — trim reduces to empty string', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('value');
    }
  });

  it('TC-VS-13: value with leading/trailing spaces is accepted and output is trimmed', () => {
    const result = VocabAddSchema.safeParse({ field: 'metal', value: '  Silver  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe('Silver');
    }
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
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('query');
    }
  });

  it('TC-VS-18: invalid field name rejected', () => {
    expect(VocabSearchSchema.safeParse({ field: 'unknown', query: '' }).success).toBe(false);
  });

  it('TC-VS-19: extra properties rejected with unrecognized_keys', () => {
    const result = VocabSearchSchema.safeParse({ field: 'grade', query: '', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
    }
  });
});

describe('VocabIncrementSchema', () => {
  it('TC-VS-20: valid { field, value } passes', () => {
    expect(VocabIncrementSchema.safeParse({ field: 'grade', value: 'EF-40' }).success).toBe(true);
  });

  it('TC-VS-21: invalid field name rejected with issue path [field]', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'unknown', value: 'EF-40' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('field');
    }
  });

  it('TC-VS-22: empty value string rejected with issue path [value]', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'grade', value: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('value');
    }
  });

  it('TC-VS-23: extra properties rejected with unrecognized_keys', () => {
    const result = VocabIncrementSchema.safeParse({ field: 'grade', value: 'EF-40', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
    }
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
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('field');
    }
  });

  it('TC-VS-27: extra properties rejected with unrecognized_keys', () => {
    const result = VocabResetSchema.safeParse({ field: 'metal', extra: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === 'unrecognized_keys')).toBe(true);
    }
  });
});
