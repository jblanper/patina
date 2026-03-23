import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { z } from 'zod';
import { Coin, CoinImage, NewCoin, NewCoinImage, CoinWithPrimaryImage, Vocabulary, FieldVisibilityMap } from '../common/types';
import { NewCoinSchema, NewCoinImageSchema, ALLOWED_VOCAB_FIELDS, VocabField, ALLOWED_VISIBILITY_KEYS, DEFAULT_FIELD_VISIBILITY, VisibilityKey } from '../common/validation';

import { SCHEMA, generateSQL } from '../common/schema';

const idSchema = z.number().int().positive();

function getSeedEntries(): Array<{ field: string; value: string; locale: string; usage_count: number }> {
  const en = 'en';
  const es = 'es';
  return [
    // Metals (English)
    { field: 'metal', value: 'Gold', locale: en, usage_count: 40 },
    { field: 'metal', value: 'Silver', locale: en, usage_count: 80 },
    { field: 'metal', value: 'Bronze', locale: en, usage_count: 70 },
    { field: 'metal', value: 'Copper', locale: en, usage_count: 30 },
    { field: 'metal', value: 'Billon', locale: en, usage_count: 20 },
    { field: 'metal', value: 'Electrum', locale: en, usage_count: 15 },
    { field: 'metal', value: 'Orichalcum', locale: en, usage_count: 12 },
    { field: 'metal', value: 'Potin', locale: en, usage_count: 10 },
    { field: 'metal', value: 'Nickel', locale: en, usage_count: 8 },
    { field: 'metal', value: 'Tumbaga', locale: en, usage_count: 5 },
    { field: 'metal', value: 'Pewter', locale: en, usage_count: 4 },
    // Metals (Spanish)
    { field: 'metal', value: 'Oro', locale: es, usage_count: 40 },
    { field: 'metal', value: 'Plata', locale: es, usage_count: 80 },
    { field: 'metal', value: 'Bronce', locale: es, usage_count: 70 },
    { field: 'metal', value: 'Cobre', locale: es, usage_count: 30 },
    { field: 'metal', value: 'Billon', locale: es, usage_count: 20 },
    { field: 'metal', value: 'Electro', locale: es, usage_count: 15 },
    { field: 'metal', value: 'Oricalco', locale: es, usage_count: 12 },
    { field: 'metal', value: 'Potín', locale: es, usage_count: 10 },
    { field: 'metal', value: 'Níquel', locale: es, usage_count: 8 },
    { field: 'metal', value: 'Tumbaga', locale: es, usage_count: 5 },
    { field: 'metal', value: 'Peltre', locale: es, usage_count: 4 },
    // Denominations
    { field: 'denomination', value: 'Aureus', locale: en, usage_count: 40 },
    { field: 'denomination', value: 'Denarius', locale: en, usage_count: 80 },
    { field: 'denomination', value: 'Antoninianus', locale: en, usage_count: 60 },
    { field: 'denomination', value: 'Sestertius', locale: en, usage_count: 50 },
    { field: 'denomination', value: 'Dupondius', locale: en, usage_count: 20 },
    { field: 'denomination', value: 'As', locale: en, usage_count: 35 },
    { field: 'denomination', value: 'Semis', locale: en, usage_count: 10 },
    { field: 'denomination', value: 'Triens', locale: en, usage_count: 8 },
    { field: 'denomination', value: 'Quadrans', locale: en, usage_count: 12 },
    { field: 'denomination', value: 'Uncia', locale: en, usage_count: 6 },
    { field: 'denomination', value: 'Quinarius', locale: en, usage_count: 15 },
    { field: 'denomination', value: 'Miliarense', locale: en, usage_count: 12 },
    { field: 'denomination', value: 'Siliqua', locale: en, usage_count: 18 },
    { field: 'denomination', value: 'Follis', locale: en, usage_count: 30 },
    { field: 'denomination', value: 'Nummus', locale: en, usage_count: 20 },
    // Grades
    { field: 'grade', value: 'MS-70', locale: en, usage_count: 2 },
    { field: 'grade', value: 'MS-69', locale: en, usage_count: 3 },
    { field: 'grade', value: 'MS-68', locale: en, usage_count: 5 },
    { field: 'grade', value: 'MS-67', locale: en, usage_count: 8 },
    { field: 'grade', value: 'MS-66', locale: en, usage_count: 12 },
    { field: 'grade', value: 'MS-65', locale: en, usage_count: 20 },
    { field: 'grade', value: 'MS-64', locale: en, usage_count: 18 },
    { field: 'grade', value: 'MS-63', locale: en, usage_count: 16 },
    { field: 'grade', value: 'MS-62', locale: en, usage_count: 10 },
    { field: 'grade', value: 'MS-61', locale: en, usage_count: 6 },
    { field: 'grade', value: 'MS-60', locale: en, usage_count: 8 },
    { field: 'grade', value: 'AU-58', locale: en, usage_count: 25 },
    { field: 'grade', value: 'AU-55', locale: en, usage_count: 20 },
    { field: 'grade', value: 'AU-50', locale: en, usage_count: 15 },
    { field: 'grade', value: 'EF-45', locale: en, usage_count: 30 },
    { field: 'grade', value: 'EF-40', locale: en, usage_count: 35 },
    { field: 'grade', value: 'VF-35', locale: en, usage_count: 28 },
    { field: 'grade', value: 'VF-30', locale: en, usage_count: 32 },
    { field: 'grade', value: 'VF-25', locale: en, usage_count: 25 },
    { field: 'grade', value: 'VF-20', locale: en, usage_count: 30 },
    { field: 'grade', value: 'F-15', locale: en, usage_count: 20 },
    { field: 'grade', value: 'F-12', locale: en, usage_count: 22 },
    { field: 'grade', value: 'VG-10', locale: en, usage_count: 15 },
    { field: 'grade', value: 'VG-8', locale: en, usage_count: 18 },
    { field: 'grade', value: 'G-6', locale: en, usage_count: 10 },
    { field: 'grade', value: 'G-4', locale: en, usage_count: 8 },
    { field: 'grade', value: 'AG-3', locale: en, usage_count: 6 },
    { field: 'grade', value: 'FR-2', locale: en, usage_count: 4 },
    // Eras (English)
    { field: 'era', value: 'Ancient', locale: en, usage_count: 30 },
    { field: 'era', value: 'Roman Republic', locale: en, usage_count: 40 },
    { field: 'era', value: 'Roman Imperial', locale: en, usage_count: 80 },
    { field: 'era', value: 'Roman Provincial', locale: en, usage_count: 25 },
    { field: 'era', value: 'Byzantine', locale: en, usage_count: 30 },
    { field: 'era', value: 'Early Medieval', locale: en, usage_count: 15 },
    { field: 'era', value: 'High Medieval', locale: en, usage_count: 20 },
    { field: 'era', value: 'Late Medieval', locale: en, usage_count: 15 },
    { field: 'era', value: 'Medieval', locale: en, usage_count: 10 },
    { field: 'era', value: 'Islamic', locale: en, usage_count: 12 },
    { field: 'era', value: 'Modern', locale: en, usage_count: 20 },
    // Eras (Spanish)
    { field: 'era', value: 'Antiguo', locale: es, usage_count: 30 },
    { field: 'era', value: 'República Romana', locale: es, usage_count: 40 },
    { field: 'era', value: 'Imperio Romano', locale: es, usage_count: 80 },
    { field: 'era', value: 'Provincial Romano', locale: es, usage_count: 25 },
    { field: 'era', value: 'Bizantino', locale: es, usage_count: 30 },
    { field: 'era', value: 'Alta Edad Media', locale: es, usage_count: 15 },
    { field: 'era', value: 'Plena Edad Media', locale: es, usage_count: 20 },
    { field: 'era', value: 'Baja Edad Media', locale: es, usage_count: 15 },
    { field: 'era', value: 'Medieval', locale: es, usage_count: 10 },
    { field: 'era', value: 'Islámico', locale: es, usage_count: 12 },
    { field: 'era', value: 'Moderno', locale: es, usage_count: 20 },
    // Die Axis
    { field: 'die_axis', value: '1h', locale: en, usage_count: 5 },
    { field: 'die_axis', value: '2h', locale: en, usage_count: 5 },
    { field: 'die_axis', value: '3h', locale: en, usage_count: 15 },
    { field: 'die_axis', value: '4h', locale: en, usage_count: 8 },
    { field: 'die_axis', value: '5h', locale: en, usage_count: 8 },
    { field: 'die_axis', value: '6h', locale: en, usage_count: 50 },
    { field: 'die_axis', value: '7h', locale: en, usage_count: 8 },
    { field: 'die_axis', value: '8h', locale: en, usage_count: 8 },
    { field: 'die_axis', value: '9h', locale: en, usage_count: 15 },
    { field: 'die_axis', value: '10h', locale: en, usage_count: 6 },
    { field: 'die_axis', value: '11h', locale: en, usage_count: 5 },
    { field: 'die_axis', value: '12h', locale: en, usage_count: 45 },
    // Mints
    { field: 'mint', value: 'Rome', locale: en, usage_count: 100 },
    { field: 'mint', value: 'Constantinople', locale: en, usage_count: 60 },
    { field: 'mint', value: 'Antioch', locale: en, usage_count: 45 },
    { field: 'mint', value: 'Alexandria', locale: en, usage_count: 40 },
    { field: 'mint', value: 'Lugdunum', locale: en, usage_count: 30 },
    { field: 'mint', value: 'Siscia', locale: en, usage_count: 25 },
    { field: 'mint', value: 'Mediolanum', locale: en, usage_count: 22 },
    { field: 'mint', value: 'Thessalonica', locale: en, usage_count: 20 },
    { field: 'mint', value: 'Nicomedia', locale: en, usage_count: 20 },
    { field: 'mint', value: 'Athens', locale: en, usage_count: 20 },
    { field: 'mint', value: 'Cyzicus', locale: en, usage_count: 18 },
    { field: 'mint', value: 'Ticinum', locale: en, usage_count: 15 },
    { field: 'mint', value: 'Aquileia', locale: en, usage_count: 15 },
    { field: 'mint', value: 'Carthage', locale: en, usage_count: 12 },
    { field: 'mint', value: 'Ephesus', locale: en, usage_count: 12 },

    { field: 'mint', value: 'Roma', locale: es, usage_count: 100 },
    { field: 'mint', value: 'Constantinopla', locale: es, usage_count: 60 },
    { field: 'mint', value: 'Antioquía', locale: es, usage_count: 45 },
    { field: 'mint', value: 'Alejandría', locale: es, usage_count: 40 },
    { field: 'mint', value: 'Lugdunum', locale: es, usage_count: 30 },
    { field: 'mint', value: 'Siscia', locale: es, usage_count: 25 },
    { field: 'mint', value: 'Mediolanum', locale: es, usage_count: 22 },
    { field: 'mint', value: 'Tesalónica', locale: es, usage_count: 20 },
    { field: 'mint', value: 'Nicomedia', locale: es, usage_count: 20 },
    { field: 'mint', value: 'Atenas', locale: es, usage_count: 20 },
    { field: 'mint', value: 'Cízico', locale: es, usage_count: 18 },
    { field: 'mint', value: 'Ticinum', locale: es, usage_count: 15 },
    { field: 'mint', value: 'Aquileya', locale: es, usage_count: 15 },
    { field: 'mint', value: 'Cartago', locale: es, usage_count: 12 },
    { field: 'mint', value: 'Éfeso', locale: es, usage_count: 12 },
  ];
}

const isDev = !app.isPackaged;
const dbPath = isDev 
  ? path.join(process.cwd(), 'data', 'patina.db')
  : path.join(app.getPath('userData'), 'patina.db');

const imageRoot = isDev
  ? path.join(process.cwd(), 'data', 'images')
  : path.join(app.getPath('userData'), 'images');

// Ensure directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(generateSQL(SCHEMA));

// Migration: Add UNIQUE constraint on images(coin_id, path) if not exists
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_images_coin_path ON images(coin_id, path)');
} catch (e) {
  // Index may already exist in some SQLite versions
}

/**
 * Validation Helper
 */
function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue: z.ZodIssue) => issue.message).join(', ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
}

export const dbService = {
  getCoins: (): CoinWithPrimaryImage[] => {
    return db.prepare(`
      SELECT c.*, i.path as primary_image_path 
      FROM coins c 
      LEFT JOIN images i ON c.id = i.coin_id AND i.is_primary = 1
      ORDER BY c.created_at DESC
    `).all() as CoinWithPrimaryImage[];
  },

  getCoinById: (id: number): { coin: Coin; images: CoinImage[] } | null => {
    validate(idSchema, id);
    const coin = db.prepare('SELECT * FROM coins WHERE id = ?').get(id) as Coin | undefined;
    if (!coin) return null;
    const images = db.prepare('SELECT * FROM images WHERE coin_id = ? ORDER BY sort_order ASC').all(id) as CoinImage[];
    return { coin, images };
  },

  addCoin: (coin: NewCoin): number => {
    const validated = validate(NewCoinSchema, coin);
    const columns = Object.keys(validated).join(', ');
    const placeholders = Object.keys(validated).map(() => '?').join(', ');
    const values = Object.values(validated);
    
    const info = db.prepare(`INSERT INTO coins (${columns}) VALUES (${placeholders})`).run(...values);
    return info.lastInsertRowid as number;
  },

  updateCoin: (id: number, coin: Partial<NewCoin>): boolean => {
    validate(idSchema, id);
    // Use partial schema for updates
    const validated = validate(NewCoinSchema.partial(), coin);
    
    if (Object.keys(validated).length === 0) return false;

    const updates = Object.keys(validated).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(validated), id];
    
    const info = db.prepare(`UPDATE coins SET ${updates} WHERE id = ?`).run(...values);
    return info.changes > 0;
  },

  deleteCoin: (id: number): boolean => {
    validate(idSchema, id);
    
    const images = db.prepare('SELECT path FROM images WHERE coin_id = ?').all(id) as { path: string }[];
    
    const info = db.prepare('DELETE FROM coins WHERE id = ?').run(id);
    
    if (info.changes > 0) {
      images.forEach(img => {
        const fullPath = path.join(imageRoot, img.path);
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error(`Failed to delete image file: ${fullPath}`, err);
        }
      });
    }
    
    return info.changes > 0;
  },

  addImage: (image: NewCoinImage): number => {
    validate(NewCoinImageSchema, image);
    const info = db.prepare(
      'INSERT OR IGNORE INTO images (coin_id, path, label, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(image.coin_id, image.path, image.label, image.is_primary ? 1 : 0, image.sort_order);
    if (info.changes === 0) {
      const existing = db.prepare('SELECT id FROM images WHERE coin_id = ? AND path = ?').get(image.coin_id, image.path) as { id: number } | undefined;
      return existing?.id ?? 0;
    }
    return info.lastInsertRowid as number;
  },

  getImagesByCoinId: (coinId: number): CoinImage[] => {
    validate(idSchema, coinId);
    return db.prepare('SELECT * FROM images WHERE coin_id = ? ORDER BY sort_order ASC').all(coinId) as CoinImage[];
  },

  deleteImage: (id: number): boolean => {
    validate(idSchema, id);
    const info = db.prepare('DELETE FROM images WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Vocabulary service methods
  getVocabularies: (field: VocabField, locale = 'en'): string[] => {
    if (!ALLOWED_VOCAB_FIELDS.includes(field)) {
      throw new Error(`Invalid vocabulary field: ${field}`);
    }
    const stmt = db.prepare(
      'SELECT value FROM vocabularies WHERE field = ? AND locale = ? ORDER BY usage_count DESC, value ASC'
    );
    const rows = stmt.all(field, locale) as { value: string }[];
    if (rows.length === 0 && locale !== 'en') {
      // Field has no locale-specific entries — fall back to English
      const fallback = stmt.all(field, 'en') as { value: string }[];
      return fallback.map(r => r.value);
    }
    return rows.map(r => r.value);
  },

  addVocabulary: (field: VocabField, value: string, locale = 'en'): void => {
    if (!ALLOWED_VOCAB_FIELDS.includes(field)) {
      throw new Error(`Invalid vocabulary field: ${field}`);
    }
    db.prepare(
      'INSERT OR IGNORE INTO vocabularies (field, value, locale, is_builtin, usage_count) VALUES (?, ?, ?, 0, 0)'
    ).run(field, value, locale);
  },

  searchVocabularies: (field: VocabField, query: string, locale = 'en'): string[] => {
    if (!ALLOWED_VOCAB_FIELDS.includes(field)) {
      throw new Error(`Invalid vocabulary field: ${field}`);
    }
    const resolvedLocale = ((): 'en' | 'es' => {
      if (locale === 'en') return 'en';
      // Check whether this field has any locale-specific entries
      const probe = db.prepare(
        'SELECT 1 FROM vocabularies WHERE field = ? AND locale = ? LIMIT 1'
      ).get(field, locale);
      return probe ? locale as 'en' | 'es' : 'en';
    })();
    if (!query) {
      const rows = db.prepare(
        'SELECT value FROM vocabularies WHERE field = ? AND locale = ? ORDER BY usage_count DESC, value ASC'
      ).all(field, resolvedLocale) as { value: string }[];
      return rows.map(r => r.value);
    }
    const rows = db.prepare(
      "SELECT value FROM vocabularies WHERE field = ? AND locale = ? AND value LIKE ? ESCAPE '\\' ORDER BY usage_count DESC, value ASC"
    ).all(field, resolvedLocale, `%${query.replace(/[%_\\]/g, '\\$&')}%`) as { value: string }[];
    return rows.map(r => r.value);
  },

  incrementVocabularyUsage: (field: VocabField, value: string): void => {
    if (!ALLOWED_VOCAB_FIELDS.includes(field)) {
      throw new Error(`Invalid vocabulary field: ${field}`);
    }
    db.prepare(
      'UPDATE vocabularies SET usage_count = usage_count + 1 WHERE field = ? AND value = ?'
    ).run(field, value);
  },

  resetVocabularies: (field?: VocabField): void => {
    if (field !== undefined && !ALLOWED_VOCAB_FIELDS.includes(field)) {
      throw new Error(`Invalid vocabulary field: ${field}`);
    }
    if (field) {
      db.prepare('DELETE FROM vocabularies WHERE field = ? AND is_builtin = 0').run(field);
    } else {
      db.prepare('DELETE FROM vocabularies WHERE is_builtin = 0').run();
    }
    // Restore seeded usage_count values
    const seedEntries = getSeedEntries();
    const filtered = field ? seedEntries.filter(e => e.field === field) : seedEntries;
    const stmt = db.prepare(
      'UPDATE vocabularies SET usage_count = ? WHERE field = ? AND value = ? AND locale = ?'
    );
    for (const entry of filtered) {
      stmt.run(entry.usage_count, entry.field, entry.value, entry.locale);
    }
  },

  getPreference: (key: 'language'): string | null => {
    const row = db.prepare('SELECT value FROM preferences WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  setPreference: (key: 'language', value: string): void => {
    db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)').run(key, value);
  },

  seedFieldVisibility: (): void => {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO field_visibility (key, visible) VALUES (?, ?)`
    );
    const insertAll = db.transaction(() => {
      for (const [key, visible] of Object.entries(DEFAULT_FIELD_VISIBILITY)) {
        insert.run(key, visible ? 1 : 0);
      }
    });
    insertAll();
  },

  getFieldVisibility: (): FieldVisibilityMap => {
    const rows = db
      .prepare('SELECT key, visible FROM field_visibility')
      .all() as { key: string; visible: number }[];

    const result = { ...DEFAULT_FIELD_VISIBILITY };
    for (const { key, visible } of rows) {
      if ((ALLOWED_VISIBILITY_KEYS as readonly string[]).includes(key)) {
        result[key as VisibilityKey] = visible === 1;
      }
    }
    return result;
  },

  setFieldVisibility: (key: VisibilityKey, visible: boolean): void => {
    db
      .prepare(
        `INSERT INTO field_visibility (key, visible) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET visible = excluded.visible`
      )
      .run(key, visible ? 1 : 0);
  },

  resetFieldVisibility: (): FieldVisibilityMap => {
    db.prepare('DELETE FROM field_visibility').run();
    dbService.seedFieldVisibility();
    return dbService.getFieldVisibility();
  },

  seedVocabularies: (): void => {
    const CURRENT_SEED_VERSION = '6c.1';
    const row = db.prepare('SELECT value FROM preferences WHERE key = ?').get('vocab_seeded_version') as { value: string } | undefined;
    if (row?.value === CURRENT_SEED_VERSION) return;

    const insert = db.prepare(
      'INSERT OR IGNORE INTO vocabularies (field, value, locale, is_builtin, usage_count) VALUES (?, ?, ?, 1, ?)'
    );
    const insertMany = db.transaction((entries: Array<{ field: string; value: string; locale: string; usage_count: number }>) => {
      for (const entry of entries) {
        insert.run(entry.field, entry.value, entry.locale, entry.usage_count);
      }
    });
    insertMany(getSeedEntries());

    db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)').run('vocab_seeded_version', CURRENT_SEED_VERSION);
  }
};

