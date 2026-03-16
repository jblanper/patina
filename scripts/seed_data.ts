import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'patina.db');

interface Coin {
  title: string;
  issuer: string;
  denomination: string;
  year_display: string;
  year_numeric: number;
  era: 'Ancient' | 'Medieval' | 'Modern';
  mint: string;
  metal: string;
  fineness: string;
  weight: number;
  diameter: number;
  die_axis: string;
  obverse_legend: string;
  obverse_desc: string;
  reverse_legend: string;
  reverse_desc: string;
  edge_desc: string;
  catalog_ref: string;
  rarity: string;
  grade: string;
  provenance?: string;
  story?: string;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
}

const sampleCoins: Coin[] = [
  {
    title: 'Athens Tetradrachm',
    issuer: 'Athens',
    denomination: 'Tetradrachm',
    year_display: '440 BC',
    year_numeric: -440,
    era: 'Ancient',
    mint: 'Athens',
    metal: 'Silver',
    fineness: '.999',
    weight: 17.20,
    diameter: 24.5,
    die_axis: '9h',
    obverse_legend: '',
    obverse_desc: 'Head of Athena right, wearing crested Attic helmet decorated with three olive leaves and spiral palmette.',
    reverse_legend: 'AΘE',
    reverse_desc: 'Owl standing right, head facing; olive sprig and crescent to left; all within incuse square.',
    edge_desc: 'Plain',
    catalog_ref: 'HGC 4, 1597',
    rarity: 'Common',
    grade: 'Choice XF',
    provenance: 'Ex. Stack\'s Bowers, Jan 2024',
    story: 'The classic "Owl of Athens", widely circulated throughout the ancient Mediterranean world.',
    purchase_price: 1200.00,
    purchase_date: '2024-01-15',
    purchase_source: 'Stack\'s Bowers'
  },
  {
    title: 'Edward I Penny',
    issuer: 'Edward I',
    denomination: 'Penny',
    year_display: '1279',
    year_numeric: 1279,
    era: 'Medieval',
    mint: 'London',
    metal: 'Silver',
    fineness: '.925',
    weight: 1.43,
    diameter: 18.0,
    die_axis: '12h',
    obverse_legend: 'EDW R ANGL DNS HYB',
    obverse_desc: 'Crowned facing bust within inner circle.',
    reverse_legend: 'CIVITAS LONDON',
    reverse_desc: 'Long cross pattée with three pellets in each angle.',
    edge_desc: 'Plain',
    catalog_ref: 'Spink 1380',
    rarity: 'Common',
    grade: 'VF',
    provenance: 'Found in Suffolk, 2023',
    story: 'Part of the New Coinage of 1279, establishing the long cross design to prevent clipping.',
    purchase_price: 85.00,
    purchase_date: '2023-11-20',
    purchase_source: 'Local Dealer'
  },
  {
    title: 'Morgan Dollar 1881-S',
    issuer: 'United States',
    denomination: 'Dollar',
    year_display: '1881',
    year_numeric: 1881,
    era: 'Modern',
    mint: 'San Francisco',
    metal: 'Silver',
    fineness: '.900',
    weight: 26.73,
    diameter: 38.1,
    die_axis: '6h',
    obverse_legend: 'E PLURIBUS UNUM',
    obverse_desc: 'Liberty head left wearing Phrygian cap with LIBERTY on headband.',
    reverse_legend: 'UNITED STATES OF AMERICA',
    reverse_desc: 'Eagle with wings spread holding arrows and olive branch within wreath.',
    edge_desc: 'Reeded',
    catalog_ref: 'KM 110',
    rarity: 'Common',
    grade: 'MS65',
    provenance: 'Inherited from grandfather',
    story: 'Known for its sharp strike and lustrous surfaces typical of the San Francisco mint in the early 1880s.',
    purchase_price: 0,
    purchase_date: '2020-05-10',
    purchase_source: 'Inheritance'
  }
];

function seed() {
  console.log(`Connecting to database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);
  
  // Create table if it doesn't exist (using the extended schema)
  // Note: We are manually defining this here for the script to be standalone, 
  // mirroring src/common/schema.ts
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
  `);

  const insertStmt = db.prepare(`
    INSERT INTO coins (
      title, issuer, denomination, year_display, year_numeric, era, mint, metal, fineness,
      weight, diameter, die_axis, obverse_legend, obverse_desc, reverse_legend, reverse_desc, edge_desc,
      catalog_ref, rarity, grade, provenance, story, purchase_price, purchase_date, purchase_source
    ) VALUES (
      @title, @issuer, @denomination, @year_display, @year_numeric, @era, @mint, @metal, @fineness,
      @weight, @diameter, @die_axis, @obverse_legend, @obverse_desc, @reverse_legend, @reverse_desc, @edge_desc,
      @catalog_ref, @rarity, @grade, @provenance, @story, @purchase_price, @purchase_date, @purchase_source
    )
  `);

  const checkStmt = db.prepare('SELECT count(*) as count FROM coins WHERE title = ?');

  let addedCount = 0;

  db.transaction(() => {
    for (const coin of sampleCoins) {
      const existing = checkStmt.get(coin.title) as { count: number };
      if (existing.count === 0) {
        insertStmt.run(coin);
        console.log(`Added: ${coin.title}`);
        addedCount++;
      } else {
        // Optional: Update existing to ensure new fields are populated if missing
        // For now, we just skip to avoid duplicates, but we might want a 'forced' mode later.
        console.log(`Skipped (already exists): ${coin.title}`);
      }
    }
  })();

  console.log(`\nDatabase seeding complete. Added ${addedCount} coins.`);
  db.close();
  process.exit(0);
}

try {
  seed();
} catch (error) {
  console.error('Seeding failed:', error);
  process.exit(1);
}
