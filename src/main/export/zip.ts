import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Coin, CoinImage } from '../../common/types';
import { dbService } from '../db';
import { exportCsvField } from '../../common/validation';

const isDev = !app.isPackaged;
const imageRoot = isDev
  ? path.join(process.cwd(), 'data', 'images')
  : path.join(app.getPath('userData'), 'images');

const dbPath = isDev
  ? path.join(process.cwd(), 'data', 'patina.db')
  : path.join(app.getPath('userData'), 'patina.db');

interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

const CSV_HEADERS = [
  'id', 'title', 'issuer', 'denomination', 'year_display', 'year_numeric', 'era', 'mint', 'metal',
  'fineness', 'weight', 'diameter', 'die_axis', 'obverse_legend', 'obverse_desc', 'reverse_legend',
  'reverse_desc', 'edge_desc', 'catalog_ref', 'rarity', 'grade', 'provenance', 'story',
  'purchase_price', 'purchase_date', 'purchase_source', 'created_at', 'obverse_image', 'reverse_image', 'edge_image'
];

interface CoinImages {
  obverse?: string;
  reverse?: string;
  edge?: string;
}

function generateCsv(coins: Coin[], imagesMap: Map<number, CoinImages>): string {
  const header = CSV_HEADERS.join(',');
  const rows = coins.map(coin => {
    const coinImages = imagesMap.get(coin.id) || {};
    return CSV_HEADERS.map(field => {
      if (field === 'obverse_image') return exportCsvField(coinImages.obverse || '');
      if (field === 'reverse_image') return exportCsvField(coinImages.reverse || '');
      if (field === 'edge_image') return exportCsvField(coinImages.edge || '');
      const value = coin[field as keyof Coin];
      return exportCsvField(value);
    }).join(',');
  });
  
  const bom = '\uFEFF';
  return bom + header + '\n' + rows.join('\n');
}

function generateManifest(coinCount: number): string {
  return JSON.stringify({
    version: '1.0.0',
    app: 'Patina',
    exportDate: new Date().toISOString(),
    coinCount,
    type: 'full-archive'
  }, null, 2);
}

export async function exportToZip(targetPath: string, includeImages = true, includeCsv = true): Promise<ExportResult> {
  return new Promise((resolve) => {
    try {
      const coins = dbService.getCoins();
      const imagesMap = new Map<number, CoinImages>();
      const allImages: CoinImage[] = [];
      
      const coinIds = coins.map(c => c.id).filter((id): id is number => id !== undefined);
      if (coinIds.length > 0) {
        const placeholders = coinIds.map(() => '?').join(',');
        const Database = require('better-sqlite3');
        const database = new Database(dbPath);
        const rows = database.prepare(`SELECT * FROM images WHERE coin_id IN (${placeholders})`).all(...coinIds) as CoinImage[];
        database.close();
        
        rows.forEach(img => {
          allImages.push(img);
          if (!imagesMap.has(img.coin_id)) {
            imagesMap.set(img.coin_id, {});
          }
          const coinImages = imagesMap.get(img.coin_id)!;
          const relativePath = `images/${path.basename(img.path)}`;
          if (img.label === 'Obverse' || (!img.label && img.is_primary)) {
            coinImages.obverse = relativePath;
          } else if (img.label === 'Reverse') {
            coinImages.reverse = relativePath;
          } else if (img.label === 'Edge') {
            coinImages.edge = relativePath;
          }
        });
      }

      const output = fs.createWriteStream(targetPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve({ success: true, path: targetPath });
      });

      archive.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      archive.pipe(output);

      archive.append(generateManifest(coins.length), { name: 'manifest.json' });

      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'coins.db' });
      }

      if (includeCsv) {
        const csv = generateCsv(coins, imagesMap);
        archive.append(csv, { name: 'coins.csv' });
      }

      if (includeImages) {
        allImages.forEach(img => {
          const fullPath = path.join(imageRoot, img.path);
          if (fs.existsSync(fullPath)) {
            archive.file(fullPath, { name: `images/${path.basename(img.path)}` });
          }
        });
      }

      archive.finalize();
    } catch (error) {
      resolve({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}