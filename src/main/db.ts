import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { z } from 'zod';
import { Coin, CoinImage, NewCoin, NewCoinImage, CoinWithPrimaryImage } from '../common/types';
import { NewCoinSchema, NewCoinImageSchema } from '../common/validation';

import { SCHEMA, generateSQL } from '../common/schema';

const idSchema = z.number().int().positive();

const isDev = !app.isPackaged;
const dbPath = isDev 
  ? path.join(process.cwd(), 'data', 'patina.db')
  : path.join(app.getPath('userData'), 'patina.db');

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
    const info = db.prepare('DELETE FROM coins WHERE id = ?').run(id);
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
  }
};

