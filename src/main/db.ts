import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Coin, CoinImage, NewCoin, NewCoinImage } from '../common/types';

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
db.exec(`
  CREATE TABLE IF NOT EXISTS coins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    issuer TEXT,
    denomination TEXT,
    year_display TEXT,
    year_numeric INTEGER,
    era TEXT DEFAULT 'Modern',
    mint TEXT,
    metal TEXT,
    fineness TEXT,
    weight REAL,
    diameter REAL,
    die_axis TEXT,
    obverse_legend TEXT,
    obverse_desc TEXT,
    reverse_legend TEXT,
    reverse_desc TEXT,
    edge_desc TEXT,
    catalog_ref TEXT,
    rarity TEXT,
    grade TEXT,
    provenance TEXT,
    story TEXT,
    purchase_price REAL,
    purchase_date TEXT,
    purchase_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coin_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    label TEXT,
    is_primary INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE
  );
`);

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
