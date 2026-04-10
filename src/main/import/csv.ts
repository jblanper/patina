import fs from 'fs';
import { dbService } from '../db';
import { NewCoinSchema, VocabAddSchema } from '../../common/validation';

export interface CsvExecuteOptions {
  fieldMap: Record<string, string>;
  locale: 'en' | 'es';
  skipDuplicates: boolean;
}
import { CSV_FIELD_ALIASES } from '../../common/csv';
import type { NewCoin } from '../../common/types';

export interface DuplicateInfo {
  rowIndex: number;
  title: string;
  existingId: number;
}

export interface RowError {
  rowIndex: number;
  message: string;
}

export interface CsvPreviewResult {
  headers: string[];
  preview: string[][];
  rowCount: number;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  duplicates: DuplicateInfo[];
  errors: RowError[];
  /** True when image columns were mapped but produced no imports (CSV-only path). */
  hadImageColumns: boolean;
  /** Maps 1-based CSV row index → newly inserted coin ID. Used by ZIP importer for image attachment. */
  insertedRowIds: Map<number, number>;
}

const IMAGE_COLUMNS = new Set(['obverse_image', 'reverse_image', 'edge_image']);

/**
 * Minimal RFC-4180-compatible CSV line parser.
 * Handles double-quote escaping and quoted fields containing commas/newlines.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ',') i++;
    } else {
      // Unquoted field — read until comma
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i).trimEnd());
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  // Trailing comma produces one empty field
  if (line.endsWith(',')) fields.push('');
  return fields;
}

/**
 * Splits raw CSV text into lines, respecting double-quoted fields that may
 * contain embedded newlines. Returns an array of complete line strings.
 */
export function splitCsvLines(raw: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  // Normalise \r\n → \n first
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Opens a CSV file, parses the header row and the first 10 data rows,
 * and counts the total number of data rows.
 */
export async function previewCsv(filePath: string): Promise<CsvPreviewResult> {
  const raw = await fs.promises.readFile(filePath, 'utf-8');
  // Strip BOM if present
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
  const lines = splitCsvLines(text).filter(l => l.trim() !== '');

  if (lines.length === 0) {
    return { headers: [], preview: [], rowCount: 0 };
  }

  const headers = parseCsvLine(lines[0]);
  const dataLines = lines.slice(1);
  const preview = dataLines.slice(0, 10).map(l => parseCsvLine(l));

  return { headers, preview, rowCount: dataLines.length };
}

/**
 * Builds auto-detection mapping: CSV header → Patina field name.
 * Checks exact (case-insensitive) match first, then falls back to CSV_FIELD_ALIASES.
 */
export function autoDetectMapping(
  headers: string[],
  importableFields: readonly string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    // Exact match
    const exact = importableFields.find(f => f.toLowerCase() === lower);
    if (exact) {
      map[header] = exact;
      continue;
    }
    // Alias match
    if (CSV_FIELD_ALIASES[lower]) {
      map[header] = CSV_FIELD_ALIASES[lower];
    }
  }
  return map;
}

/**
 * Processes a full CSV import using the curator's field mapping decisions.
 * Pure async function — called by the IPC handler with the staged file path.
 */
export async function processCsvImport(
  filePath: string,
  options: CsvExecuteOptions,
  /** When true (Patina-origin ZIP re-imports), skip VocabAddSchema character validation.
   *  Values from the Patina DB were already validated when originally stored. */
  trustVocabValues = false
): Promise<CsvImportResult> {
  const { fieldMap, locale, skipDuplicates } = options;

  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
  const lines = splitCsvLines(text).filter(l => l.trim() !== '');

  if (lines.length < 2) {
    return { imported: 0, skipped: 0, duplicates: [], errors: [], hadImageColumns: false, insertedRowIds: new Map() };
  }

  const headers = parseCsvLine(lines[0]);
  const dataLines = lines.slice(1);

  // Determine if any image columns are mapped (for advisory message)
  const hadImageColumns = Object.values(fieldMap).some(f => IMAGE_COLUMNS.has(f));

  // Invert fieldMap: patinaField → array of csvColumn indices (last one wins)
  const colIndexByField = new Map<string, number>();
  for (const [csvCol, patinaField] of Object.entries(fieldMap)) {
    if (!patinaField) continue; // skip → empty string
    if (IMAGE_COLUMNS.has(patinaField)) continue; // silently skip image cols in CSV-only
    const idx = headers.indexOf(csvCol);
    if (idx !== -1) {
      colIndexByField.set(patinaField, idx);
    }
  }

  // Check if a "Year" column maps to year_display so we can auto-split to year_numeric
  // Only applies when year_numeric is not already explicitly mapped.
  const yearDisplayIdx = colIndexByField.get('year_display');
  const yearNumericAlreadyMapped = colIndexByField.has('year_numeric');

  // Build duplicate fingerprint set from existing coins
  const existingCoins = dbService.getCoins();
  const fingerprintMap = new Map<string, number>(); // fingerprint → coin id
  for (const c of existingCoins) {
    const fp = buildFingerprint(c.title, c.year_numeric ?? null, c.issuer ?? null, c.mint ?? null);
    fingerprintMap.set(fp, c.id);
  }

  // Collect unique (field, value) pairs for vocab enrichment
  const vocabQueue = new Map<string, Set<string>>();
  const VOCAB_FIELDS = new Set(['metal', 'denomination', 'grade', 'era', 'die_axis', 'mint', 'rarity']);

  const imported: number[] = [];
  const insertedRowIds = new Map<number, number>();
  const skippedCount = { n: 0 };
  const duplicates: DuplicateInfo[] = [];
  const errors: RowError[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowIndex = i + 1; // 1-based
    const row = parseCsvLine(dataLines[i]);

    // Build raw field values from mapping
    const raw: Record<string, unknown> = {};
    for (const [field, colIdx] of colIndexByField.entries()) {
      const val = row[colIdx]?.trim() ?? '';
      raw[field] = val === '' ? undefined : val;
    }

    // Auto-split "Year" → year_numeric when not already mapped
    if (yearDisplayIdx !== undefined && !yearNumericAlreadyMapped) {
      const yearVal = row[yearDisplayIdx]?.trim() ?? '';
      const parsed = parseInt(yearVal, 10);
      raw['year_numeric'] = isNaN(parsed) ? null : parsed;
    }

    // Coerce numeric fields
    for (const numField of ['year_numeric', 'weight', 'diameter', 'purchase_price'] as const) {
      const v = raw[numField];
      if (typeof v === 'string' && v !== '') {
        const n = Number(v);
        raw[numField] = isNaN(n) ? null : n;
      }
    }

    // Validate via NewCoinSchema.partial() — title is required for a full import
    const parseResult = NewCoinSchema.partial().safeParse(raw);
    if (!parseResult.success) {
      const msg = parseResult.error.issues.map(e => e.message).join('; ');
      errors.push({ rowIndex, message: msg });
      continue;
    }

    const candidate = parseResult.data as Partial<NewCoin>;

    if (!candidate.title) {
      errors.push({ rowIndex, message: 'Title is required' });
      continue;
    }

    // Vocab validation.
    // For foreign CSVs (trustVocabValues=false): validate against VocabAddSchema; reject the row
    // on failure so the curator is informed of bad values.
    // For Patina-origin ZIPs (trustVocabValues=true): skip the character-allowlist check —
    // values already passed validation when originally stored (e.g. "1/2 Obol" contains '/'
    // which VocabAddSchema disallows, but it is a valid numismatic denomination).
    let vocabRejected = false;
    for (const field of VOCAB_FIELDS) {
      const value = candidate[field as keyof typeof candidate];
      if (typeof value !== 'string' || !value) continue;
      if (!trustVocabValues) {
        const vocabCheck = VocabAddSchema.safeParse({ field, value });
        if (!vocabCheck.success) {
          errors.push({ rowIndex, message: `Invalid vocab value for "${field}": ${value}` });
          vocabRejected = true;
          continue;
        }
      }
      if (!vocabQueue.has(field)) vocabQueue.set(field, new Set());
      vocabQueue.get(field)!.add(value);
    }
    if (vocabRejected) continue;

    // Duplicate detection
    const fp = buildFingerprint(
      candidate.title,
      candidate.year_numeric ?? null,
      candidate.issuer ?? null,
      candidate.mint ?? null
    );
    const existingId = fingerprintMap.get(fp);
    if (existingId !== undefined) {
      duplicates.push({ rowIndex, title: candidate.title, existingId });
      if (skipDuplicates) {
        skippedCount.n++;
        continue;
      }
    }

    // Insert — use undefined (not null) to match the NewCoin type shape.
    // better-sqlite3 converts undefined → NULL, so the DB result is identical.
    const newCoin: NewCoin = {
      title: candidate.title,
      issuer: candidate.issuer ?? undefined,
      denomination: candidate.denomination ?? undefined,
      year_display: candidate.year_display ?? undefined,
      year_numeric: candidate.year_numeric ?? undefined,
      era: candidate.era ?? 'Unknown',
      mint: candidate.mint ?? undefined,
      metal: candidate.metal ?? undefined,
      fineness: candidate.fineness ?? undefined,
      weight: candidate.weight ?? undefined,
      diameter: candidate.diameter ?? undefined,
      die_axis: candidate.die_axis ?? undefined,
      obverse_legend: candidate.obverse_legend ?? undefined,
      obverse_desc: candidate.obverse_desc ?? undefined,
      reverse_legend: candidate.reverse_legend ?? undefined,
      reverse_desc: candidate.reverse_desc ?? undefined,
      edge_desc: candidate.edge_desc ?? undefined,
      catalog_ref: candidate.catalog_ref ?? undefined,
      rarity: candidate.rarity ?? undefined,
      grade: candidate.grade ?? undefined,
      provenance: candidate.provenance ?? undefined,
      story: candidate.story ?? undefined,
      purchase_price: candidate.purchase_price ?? undefined,
      purchase_date: candidate.purchase_date ?? undefined,
      purchase_source: candidate.purchase_source ?? undefined,
    };

    let newId: number;
    try {
      newId = dbService.addCoin(newCoin);
    } catch (err) {
      errors.push({ rowIndex, message: err instanceof Error ? err.message : 'Failed to insert coin' });
      continue;
    }
    imported.push(rowIndex);
    insertedRowIds.set(rowIndex, newId);

    // Update in-memory fingerprint so subsequent rows detect self-duplicates
    fingerprintMap.set(fp, -1);
  }

  // Vocab enrichment — deduplicated per (field, value) pair
  for (const [field, values] of vocabQueue.entries()) {
    for (const value of values) {
      try {
        dbService.addVocabulary(field as Parameters<typeof dbService.addVocabulary>[0], value, locale);
      } catch {
        // Ignore duplicate-key errors from the UNIQUE constraint — vocab already present
      }
    }
  }

  return {
    imported: imported.length,
    skipped: skippedCount.n,
    duplicates,
    errors,
    hadImageColumns,
    insertedRowIds,
  };
}

function buildFingerprint(
  title: string,
  yearNumeric: number | null,
  issuer: string | null,
  mint: string | null
): string {
  return [
    title.toLowerCase(),
    String(yearNumeric ?? ''),
    (issuer ?? '').toLowerCase(),
    (mint ?? '').toLowerCase(),
  ].join('|');
}
