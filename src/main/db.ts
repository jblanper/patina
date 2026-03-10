import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Coin, CoinImage, NewCoin, NewCoinImage } from '../common/types';

import { SCHEMA, generateSQL } from '../common/schema';

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

// Initialize tables
db.exec(generateSQL(SCHEMA));

export const dbService = {
  getCoins: (): Coin[] => {
    return db.prepare('SELECT * FROM coins ORDER BY created_at DESC').all() as Coin[];
  },

  getCoinById: (id: number): { coin: Coin; images: CoinImage[] } | null => {
    const coin = db.prepare('SELECT * FROM coins WHERE id = ?').get(id) as Coin | undefined;
    if (!coin) return null;
    const images = db.prepare('SELECT * FROM images WHERE coin_id = ? ORDER BY sort_order ASC').all(id) as CoinImage[];
    return { coin, images };
  },

  addCoin: (coin: NewCoin): number => {
    const columns = Object.keys(coin).join(', ');
    const placeholders = Object.keys(coin).map(() => '?').join(', ');
    const values = Object.values(coin);
    
    const info = db.prepare(`INSERT INTO coins (${columns}) VALUES (${placeholders})`).run(...values);
    return info.lastInsertRowid as number;
  },

  updateCoin: (id: number, coin: Partial<NewCoin>): boolean => {
    const updates = Object.keys(coin).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(coin), id];
    
    const info = db.prepare(`UPDATE coins SET ${updates} WHERE id = ?`).run(...values);
    return info.changes > 0;
  },

  deleteCoin: (id: number): boolean => {
    const info = db.prepare('DELETE FROM coins WHERE id = ?').run(id);
    return info.changes > 0;
  },

  addImage: (image: NewCoinImage): number => {
    const info = db.prepare(
      'INSERT INTO images (coin_id, path, label, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(image.coin_id, image.path, image.label, image.is_primary ? 1 : 0, image.sort_order);
    return info.lastInsertRowid as number;
  },

  getImagesByCoinId: (coinId: number): CoinImage[] => {
    return db.prepare('SELECT * FROM images WHERE coin_id = ? ORDER BY sort_order ASC').all(coinId) as CoinImage[];
  },

  deleteImage: (id: number): boolean => {
    const info = db.prepare('DELETE FROM images WHERE id = ?').run(id);
    return info.changes > 0;
  }
};
