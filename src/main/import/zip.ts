import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { dbService } from '../db';
import { processCsvImport } from './csv';
import type { ZipExecuteOptions } from '../../common/validation';
import type { DuplicateInfo, RowError } from './csv';

export type { DuplicateInfo, RowError };

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ZipPreviewResult {
  coinCount: number;
  hasImages: boolean;
  exportDate: string;
  appVersion: string;
}

export interface ZipImportResult {
  imported: number;
  skipped: number;
  duplicates: DuplicateInfo[];
  errors: RowError[];
}

interface PatinaManifest {
  version: string;
  app: string;
  exportDate: string;
  coinCount: number;
  type?: string;
}

/**
 * Opens a ZIP archive and reads its manifest to return a preview summary.
 * Returns `{ error }` when the file is not a valid Patina archive.
 */
export async function previewZip(
  filePath: string
): Promise<ZipPreviewResult | { error: string }> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(filePath);
  } catch {
    return { error: 'invalid_archive' };
  }

  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    return { error: 'invalid_archive' };
  }

  let manifest: PatinaManifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf-8')) as PatinaManifest;
  } catch {
    return { error: 'invalid_archive' };
  }

  if (manifest.app !== 'Patina') {
    return { error: 'invalid_archive' };
  }

  const entries = zip.getEntries();
  const hasImages = entries.some(e => {
    const ext = path.extname(e.entryName).toLowerCase();
    return e.entryName.startsWith('images/') && ALLOWED_IMAGE_EXTS.has(ext);
  });

  return {
    coinCount: manifest.coinCount ?? 0,
    hasImages,
    exportDate: manifest.exportDate ?? '',
    appVersion: manifest.version ?? '',
  };
}

/**
 * Processes a full ZIP import: validates entries, extracts images, imports coins.
 * Rejects the entire import if any path-traversal entry is detected.
 * Pure async function — called by the IPC handler with the staged file path.
 */
export async function processZipImport(
  filePath: string,
  options: ZipExecuteOptions,
  imageRoot: string
): Promise<ZipImportResult> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(filePath);
  } catch {
    return {
      imported: 0,
      skipped: 0,
      duplicates: [],
      errors: [{ rowIndex: 0, message: 'Could not open ZIP archive' }],
    };
  }

  const entries = zip.getEntries();
  const coinsDir = path.join(imageRoot, 'coins');

  // ── Security pass: validate ALL entries before writing anything to disk ──────
  for (const entry of entries) {
    // Null byte check must come before path.normalize()
    if (entry.entryName.includes('\0')) {
      return {
        imported: 0, skipped: 0, duplicates: [],
        errors: [{ rowIndex: 0, message: 'Archive contains invalid entry names' }],
      };
    }

    const normalized = path.normalize(entry.entryName);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      return {
        imported: 0, skipped: 0, duplicates: [],
        errors: [{ rowIndex: 0, message: 'Archive contains path traversal entries' }],
      };
    }

    // Only validate image entries (files under images/)
    if (!entry.isDirectory && entry.entryName.startsWith('images/')) {
      const ext = path.extname(entry.entryName).toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.has(ext)) {
        return {
          imported: 0, skipped: 0, duplicates: [],
          errors: [{ rowIndex: 0, message: `Disallowed image type: ${ext}` }],
        };
      }
      const size = entry.header.size;
      if (size > MAX_IMAGE_BYTES) {
        return {
          imported: 0, skipped: 0, duplicates: [],
          errors: [{ rowIndex: 0, message: `Image exceeds 10 MB limit: ${entry.entryName}` }],
        };
      }
    }
  }

  // ── Extract images to collision-safe filenames ───────────────────────────────
  await fs.promises.mkdir(coinsDir, { recursive: true });

  // Map original ZIP image path → new relative path stored in DB
  const imagePathMap = new Map<string, string>();

  for (const entry of entries) {
    if (entry.isDirectory || !entry.entryName.startsWith('images/')) continue;
    const ext = path.extname(entry.entryName).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;

    const uniqueName = `import-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const destPath = path.join(coinsDir, uniqueName);

    // Final boundary check after normalization
    if (!destPath.startsWith(coinsDir)) {
      return {
        imported: 0, skipped: 0, duplicates: [],
        errors: [{ rowIndex: 0, message: 'Archive contains path traversal entries' }],
      };
    }

    const data = entry.getData();
    await fs.promises.writeFile(destPath, data);
    imagePathMap.set(entry.entryName, path.join('coins', uniqueName));
  }

  // ── Extract and parse coins.csv ──────────────────────────────────────────────
  const csvEntry = zip.getEntry('coins.csv');
  if (!csvEntry) {
    return {
      imported: 0, skipped: 0, duplicates: [],
      errors: [{ rowIndex: 0, message: 'Archive does not contain coins.csv' }],
    };
  }

  // Write CSV to a temp file so processCsvImport can read it
  const tmpCsvPath = path.join(imageRoot, `_import_tmp_${Date.now()}.csv`);
  await fs.promises.writeFile(tmpCsvPath, csvEntry.getData());

  // Build a complete identity fieldMap for Patina-origin CSVs (all columns mapped to themselves)
  const { previewCsv } = await import('./csv');
  const preview = await previewCsv(tmpCsvPath);

  // For Patina-origin CSVs, map every header to itself (ignoring non-coin columns like id, created_at)
  const importableFields = new Set([
    'title', 'issuer', 'denomination', 'year_display', 'year_numeric', 'era', 'mint', 'metal',
    'fineness', 'weight', 'diameter', 'die_axis', 'obverse_legend', 'obverse_desc',
    'reverse_legend', 'reverse_desc', 'edge_desc', 'catalog_ref', 'rarity', 'grade',
    'provenance', 'story', 'purchase_price', 'purchase_date', 'purchase_source',
    'obverse_image', 'reverse_image', 'edge_image',
  ]);

  const fieldMap: Record<string, string> = {};
  for (const header of preview.headers) {
    if (importableFields.has(header)) {
      fieldMap[header] = header;
    }
  }

  let csvResult;
  try {
    csvResult = await processCsvImport(tmpCsvPath, {
      fieldMap,
      locale: options.locale,
      skipDuplicates: options.skipDuplicates,
    }, true /* trustVocabValues — Patina-origin archive */);
  } finally {
    await fs.promises.unlink(tmpCsvPath).catch(() => undefined);
  }

  // ── Associate extracted images with imported coins ───────────────────────────
  if (imagePathMap.size > 0 && csvResult.insertedRowIds.size > 0) {
    await attachImagesFromCsv(zip, imagePathMap, csvResult.insertedRowIds);
  }

  return {
    imported: csvResult.imported,
    skipped: csvResult.skipped,
    duplicates: csvResult.duplicates,
    errors: csvResult.errors,
  };
}

/**
 * Reads the coins.csv from the ZIP to correlate image columns with the coins
 * that were just inserted. Uses the exact coin IDs returned by processCsvImport
 * (keyed by 1-based CSV row index) to avoid ambiguous title lookups.
 */
async function attachImagesFromCsv(
  zip: AdmZip,
  imagePathMap: Map<string, string>,
  insertedRowIds: Map<number, number>
): Promise<void> {
  const csvEntry = zip.getEntry('coins.csv');
  if (!csvEntry) return;

  const { parseCsvLine, splitCsvLines } = await import('./csv');
  const text = csvEntry.getData().toString('utf-8').replace(/^\uFEFF/, '');
  const lines = splitCsvLines(text).filter(l => l.trim());
  if (lines.length < 2) return;

  const headers = parseCsvLine(lines[0]);
  const obverseIdx = headers.indexOf('obverse_image');
  const reverseIdx = headers.indexOf('reverse_image');
  const edgeIdx = headers.indexOf('edge_image');

  // If the CSV has no image columns at all there's nothing to attach
  if (obverseIdx === -1 && reverseIdx === -1 && edgeIdx === -1) return;

  const imageSlotDefs: Array<{ idx: number; label: 'Obverse' | 'Reverse' | 'Edge'; isPrimary: boolean }> = [
    { idx: obverseIdx, label: 'Obverse', isPrimary: true },
    { idx: reverseIdx, label: 'Reverse', isPrimary: false },
    { idx: edgeIdx, label: 'Edge', isPrimary: false },
  ];

  for (let i = 1; i < lines.length; i++) {
    const rowIndex = i; // 1-based, matches processCsvImport rowIndex
    const coinId = insertedRowIds.get(rowIndex);
    if (coinId === undefined) continue; // row was skipped or errored — no coin to attach to

    const row = parseCsvLine(lines[i]);
    let sortOrder = 0;
    let hasPrimary = false;

    for (const slot of imageSlotDefs) {
      if (slot.idx === -1) continue;
      const origPath = row[slot.idx]?.trim() ?? '';
      if (!origPath) continue;

      const newPath = imagePathMap.get(origPath);
      if (!newPath) continue;

      const isPrimary = slot.isPrimary && !hasPrimary;
      if (isPrimary) hasPrimary = true;

      try {
        dbService.addImage({
          coin_id: coinId,
          path: newPath,
          label: slot.label,
          is_primary: isPrimary,
          sort_order: sortOrder++,
        });
      } catch {
        // Non-fatal: image association failure doesn't invalidate the coin import
      }
    }
  }
}
