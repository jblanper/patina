import { z } from 'zod';
import path from 'path';

/**
 * Numismatic Precision Refiners
 */
const weightSchema = z.number().min(0).nullable().optional()
  .refine(val => val === null || val === undefined || Number(val.toFixed(2)) === val, {
    message: "Weight must have at most 2 decimal places (grams)."
  });

const diameterSchema = z.number().min(0).nullable().optional()
  .refine(val => val === null || val === undefined || Number(val.toFixed(1)) === val, {
    message: "Diameter must have at most 1 decimal place (mm)."
  });

/**
 * Base Coin Schema (for validation of existing records)
 */
export const CoinSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  issuer: z.string().optional().nullable(),
  denomination: z.string().optional().nullable(),
  year_display: z.string().optional().nullable(),
  year_numeric: z.number().int().optional().nullable(),
  era: z.string().min(1),
  mint: z.string().optional().nullable(),
  metal: z.string().optional().nullable(),
  fineness: z.string().optional().nullable(),
  weight: weightSchema,
  diameter: diameterSchema,
  die_axis: z.string().optional().nullable(),
  obverse_legend: z.string().optional().nullable(),
  obverse_desc: z.string().optional().nullable(),
  reverse_legend: z.string().optional().nullable(),
  reverse_desc: z.string().optional().nullable(),
  edge_desc: z.string().optional().nullable(),
  catalog_ref: z.string().optional().nullable(),
  rarity: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  provenance: z.string().optional().nullable(),
  story: z.string().optional().nullable(),
  purchase_price: z.number().min(0).optional().nullable(),
  purchase_date: z.string().optional().nullable(), // Could be YYYY-MM-DD regex but optional
  purchase_source: z.string().optional().nullable(),
  created_at: z.string()
});

/**
 * NewCoin Schema (Strict for security)
 * Omit 'id' and 'created_at' as they are managed by the DB.
 */
export const NewCoinSchema = CoinSchema.omit({ 
  id: true, 
  created_at: true 
}).strict();

/**
 * FilterState Schema
 */
export const FilterStateSchema = z.object({
  era: z.array(z.string()),
  metal: z.array(z.string()),
  grade: z.array(z.string()),
  searchTerm: z.string(),
  sortBy: z.string().nullable(),
  sortAsc: z.boolean()
});

export type FilterState = z.infer<typeof FilterStateSchema>;

/**
 * NewCoinImage Schema (Strict for image validation)
 */
export const NewCoinImageSchema = z.object({
  coin_id: z.number().int().positive(),
  path: z.string().min(1),
  label: z.enum(['Obverse', 'Reverse', 'Edge']).optional(),
  is_primary: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0)
}).strict();

/**
 * Export Options Schema for ZIP export
 */
export const ExportOptionsSchema = z.object({
  targetPath: z.string()
    .optional()
    .refine(val => !val || !val.includes('..'), "Path traversal forbidden")
    .refine(val => !val || path.isAbsolute(val), "Must be absolute path"),
  includeImages: z.boolean().default(true),
  includeCsv: z.boolean().default(true),
  coinIds: z.array(z.number().int().positive()).max(5000).optional(),
}).strict();

/**
 * Vocabulary Schemas
 */
export const ALLOWED_VOCAB_FIELDS = [
  'metal',
  'denomination',
  'grade',
  'era',
  'die_axis',
  'mint',
  'rarity',
] as const;

export type VocabField = typeof ALLOWED_VOCAB_FIELDS[number];

export const VocabGetSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  locale: z.enum(['en', 'es']).optional(),
}).strict();

export const VocabAddSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  value: z
    .string()
    .trim()
    .min(1, 'Vocabulary value cannot be empty')
    .max(200, 'Vocabulary value must be 200 characters or fewer')
    .regex(
      /^[\p{L}\p{N}\s\-'().,:&/]+$/u,
      'Value contains disallowed characters',
    ),
  locale: z.string().length(2).regex(/^[a-z]{2}$/).optional().default('en'),
}).strict();

export const VocabSearchSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  query: z
    .string()
    .max(100, 'Search query must be 100 characters or fewer'),
  locale: z.enum(['en', 'es']).optional(),
}).strict();

/**
 * Preference Schemas
 */
export const PreferenceGetSchema = z.object({
  key: z.literal('language'),
}).strict();

export const PreferenceSetSchema = z.object({
  key: z.literal('language'),
  value: z.enum(['en', 'es']),
}).strict();

export const VocabIncrementSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS),
  value: z.string().min(1).max(200),
}).strict();

export const VocabResetSchema = z.object({
  field: z.enum(ALLOWED_VOCAB_FIELDS).optional(),
}).strict();

/**
 * Field Visibility Schemas
 */
export const ALLOWED_VISIBILITY_KEYS = [
  'ledger.title', 'ledger.issuer', 'ledger.denomination', 'ledger.year',
  'ledger.era', 'ledger.mint', 'ledger.metal', 'ledger.weight',
  'ledger.diameter', 'ledger.die_axis', 'ledger.fineness', 'ledger.grade',
  'ledger.obverse_legend', 'ledger.obverse_desc', 'ledger.reverse_legend',
  'ledger.reverse_desc', 'ledger.edge_desc', 'ledger.catalog_ref',
  'ledger.rarity', 'ledger.provenance', 'ledger.story', 'ledger.acquisition',
  'card.metal', 'card.year', 'card.grade', 'card.weight',
] as const;

export type VisibilityKey = typeof ALLOWED_VISIBILITY_KEYS[number];

export const SetVisibilitySchema = z.object({
  key:     z.enum(ALLOWED_VISIBILITY_KEYS),
  visible: z.boolean(),
}).strict();

export const LOCKED_VISIBILITY_KEYS: ReadonlySet<VisibilityKey> = new Set([
  'ledger.title', 'ledger.weight', 'ledger.diameter',
  'card.metal', 'card.year',
]);

export const DEFAULT_FIELD_VISIBILITY: Record<VisibilityKey, boolean> = {
  // ── Identity ────────────────────────────────────
  'ledger.title':        true,
  'ledger.issuer':       true,
  'ledger.denomination': true,
  'ledger.year':         true,
  'ledger.era':          true,
  'ledger.mint':         true,
  // ── Physical Metrics ────────────────────────────
  'ledger.metal':        true,
  'ledger.weight':       true,
  'ledger.diameter':     true,
  'ledger.die_axis':     false,
  'ledger.fineness':     false,
  'ledger.grade':        true,
  // ── Numismatic Data ─────────────────────────────
  'ledger.obverse_legend': true,
  'ledger.obverse_desc':   true,
  'ledger.reverse_legend': true,
  'ledger.reverse_desc':   true,
  'ledger.edge_desc':      false,
  'ledger.catalog_ref':    true,
  'ledger.rarity':         true,
  // ── Narrative ───────────────────────────────────
  'ledger.story':        true,
  'ledger.provenance':   false,
  // ── Acquisition ─────────────────────────────────
  'ledger.acquisition':  false,
  // ── Gallery Card ────────────────────────────────
  'card.metal':          true,
  'card.year':           true,
  'card.grade':          true,
  'card.weight':         true,
};

/**
 * PDF Export Options Schema
 */
export const PdfExportOptionsSchema = z.object({
  locale: z.enum(['en', 'es']).default('es'),
  coinIds: z.array(z.number().int().positive()).max(5000).optional(),
}).strict();
export type PdfExportOptions = z.infer<typeof PdfExportOptionsSchema>;

/**
 * Import Schemas
 */
export const ZipExecuteSchema = z.object({
  locale: z.enum(['en', 'es']).default('es'),
  skipDuplicates: z.boolean().default(false),
}).strict();

export type ZipExecuteOptions = z.infer<typeof ZipExecuteSchema>;

/**
 * CSV field escaping to prevent formula injection
 * Prefixes formula characters with apostrophe
 */
export function exportCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r\n]/.test(str)) {
    return "'" + str;
  }
  return str;
}
