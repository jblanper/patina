import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { app, nativeImage } from 'electron';
import { dbService } from '../db';
import { Coin, CoinImage } from '../../common/types';

const isDev = !app.isPackaged;
const imageRoot = isDev
  ? path.join(process.cwd(), 'data', 'images')
  : path.join(app.getPath('userData'), 'images');

const fontRoot = isDev
  ? path.join(process.cwd(), 'assets', 'fonts')
  : path.join(process.resourcesPath, 'fonts');

// Brand palette — Manuscript Hybrid v3.3
const PARCHMENT    = '#FCF9F2';
const IRON_GALL    = '#2D2926';
const BURNT_SIENNA = '#914E32';
const RULE_COLOR   = '#D4C9B0';

// Layout constants
const MARGIN      = 20;
const CONTENT_W   = 170;  // 210 - 2×20
const IMG_COL_W   = 68;   // left column: images
const META_COL_W  = 98;   // right column: metadata (4mm gap between cols)
const IMG_SIZE    = 35;   // obverse/reverse image box (mm)

type Locale = 'en' | 'es';

type TranslationKey =
  | 'specifications' | 'obverse' | 'reverse'
  | 'metal' | 'grade' | 'mint' | 'weight'
  | 'diameter' | 'dieAxis' | 'fineness'
  | 'catalogRef' | 'provenance'
  | 'story' | 'acquisition'
  | 'tableOfContents' | 'collectionStatistics'
  | 'page' | 'generated' | 'totalCoins'
  | 'inscriptions' | 'denomination'
  | 'byMetal' | 'byEra' | 'byGrade'
  | 'totalValue' | 'imageUnavailable'
  | 'era' | 'rarity' | 'edge';

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    specifications: 'Specifications', obverse: 'Obverse', reverse: 'Reverse',
    metal: 'Metal', grade: 'Grade', mint: 'Mint', weight: 'Weight',
    diameter: 'Diameter', dieAxis: 'Die Axis', fineness: 'Fineness',
    catalogRef: 'Catalog Reference', provenance: 'Provenance',
    story: 'Story', acquisition: 'Acquisition',
    tableOfContents: 'Table of Contents',
    collectionStatistics: 'Collection Statistics',
    page: 'Page', generated: 'Generated', totalCoins: 'Total Coins',
    inscriptions: 'Inscriptions', denomination: 'Denomination',
    byMetal: 'By Metal', byEra: 'By Era', byGrade: 'By Grade',
    totalValue: 'Total Value', imageUnavailable: '[Image unavailable]',
    era: 'Era', rarity: 'Rarity', edge: 'Edge',
  },
  es: {
    specifications: 'Especificaciones', obverse: 'Anverso', reverse: 'Reverso',
    metal: 'Metal', grade: 'Grado', mint: 'Ceca', weight: 'Peso',
    diameter: 'Diámetro', dieAxis: 'Eje de Cuño', fineness: 'Ley',
    catalogRef: 'Referencia de Catálogo', provenance: 'Procedencia',
    story: 'Nota del Curador', acquisition: 'Adquisición',
    tableOfContents: 'Índice de Contenidos',
    collectionStatistics: 'Estadísticas de la Colección',
    page: 'Página', generated: 'Generado', totalCoins: 'Total de Monedas',
    inscriptions: 'Inscripciones', denomination: 'Denominación',
    byMetal: 'Por Metal', byEra: 'Por Época', byGrade: 'Por Grado',
    totalValue: 'Valor Total', imageUnavailable: '[Imagen no disponible]',
    era: 'Época', rarity: 'Rareza', edge: 'Canto',
  },
};

function t(locale: Locale, key: TranslationKey): string {
  return TRANSLATIONS[locale][key];
}

interface Fonts {
  heading: string;
  body: string;
}

interface FontDef {
  file: string;
  name: string;
  style: string;
}

const FONT_DEFS: FontDef[] = [
  { file: 'CormorantGaramond-Regular.ttf', name: 'CormorantGaramond', style: 'normal' },
  { file: 'CormorantGaramond-Bold.ttf',    name: 'CormorantGaramond', style: 'bold'   },
  { file: 'CormorantGaramond-Italic.ttf',  name: 'CormorantGaramond', style: 'italic' },
  { file: 'Montserrat-Regular.ttf',        name: 'Montserrat',        style: 'normal' },
  { file: 'Montserrat-Bold.ttf',           name: 'Montserrat',        style: 'bold'   },
  { file: 'Montserrat-Italic.ttf',         name: 'Montserrat',        style: 'italic' },
];

// All fonts must load together or all fall back — never mix custom and system fonts
function loadFonts(doc: jsPDF): boolean {
  try {
    for (const def of FONT_DEFS) {
      const filePath = path.join(fontRoot, def.file);
      const data = fs.readFileSync(filePath).toString('base64');
      doc.addFileToVFS(def.file, data);
      doc.addFont(def.file, def.name, def.style);
    }
    return true;
  } catch {
    return false;
  }
}

interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

function loadImageAsBase64(imagePath: string): string | null {
  const fullPath = path.join(imageRoot, imagePath);
  try {
    if (!fs.existsSync(fullPath)) return null;
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    if (ext === '.png') {
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }

    // nativeImage decodes via Chromium's native stack, producing baseline JPEG.
    // Fixes jsPDF misreading progressive JPEG (SOF2) dimensions as 1px tall.
    const jpegBuffer = nativeImage.createFromBuffer(buffer).toJPEG(92);
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function getImageFormat(dataUri: string): 'JPEG' | 'PNG' | null {
  if (dataUri.startsWith('data:image/png')) return 'PNG';
  if (dataUri.startsWith('data:image/jpeg')) return 'JPEG';
  return null;
}

function applyPageBackground(doc: jsPDF): void {
  doc.setFillColor(PARCHMENT);
  doc.rect(0, 0, 210, 297, 'F');
}

function drawHorizontalRule(doc: jsPDF, y: number, color: string = RULE_COLOR): void {
  doc.setDrawColor(color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
}

function drawSectionHeader(doc: jsPDF, label: string, x: number, y: number, fonts: Fonts): number {
  doc.setFont(fonts.heading, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(BURNT_SIENNA);
  doc.text(label, x, y);
  return y + 7;
}

function drawPageFooter(doc: jsPDF, pageNum: number, total: number, locale: Locale, fonts: Fonts): void {
  doc.setFont(fonts.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(IRON_GALL);
  doc.text(`${t(locale, 'page')} ${pageNum} / ${total}`, 105, 287, { align: 'center' });
}

function drawCoinSlot(
  doc: jsPDF,
  coin: Coin,
  images: CoinImage[],
  slotY: number,
  locale: Locale,
  fonts: Fonts,
): number {
  // 1. Title
  doc.setFont(fonts.heading, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(IRON_GALL);
  doc.text(coin.title, MARGIN, slotY);
  slotY += 6;

  // 2. Subtitle: issuer · year · era · mint (falsy values filtered)
  const subtitleParts = [coin.issuer, coin.year_display, coin.era, coin.mint].filter(Boolean);
  doc.setFont(fonts.body, 'italic');
  doc.setFontSize(9);
  doc.setTextColor(BURNT_SIENNA);
  if (subtitleParts.length > 0) {
    doc.text(subtitleParts.join(' · '), MARGIN, slotY);
  }
  slotY += 5;

  // 3. Rule
  drawHorizontalRule(doc, slotY);
  slotY += 5;

  const obverseImg = images.find(img => img.label === 'Obverse' || img.is_primary);
  const reverseImg = images.find(img => img.label === 'Reverse');
  const hasImages = !!(obverseImg || reverseImg);

  // 4. Left column: stacked images
  if (hasImages) {
    const imgX = MARGIN;

    if (obverseImg) {
      const imgData = loadImageAsBase64(obverseImg.path);
      const fmt = imgData ? getImageFormat(imgData) : null;
      doc.setDrawColor(RULE_COLOR);
      doc.setLineWidth(0.3);
      doc.rect(imgX, slotY, IMG_SIZE, IMG_SIZE);
      if (imgData && fmt) {
        try {
          doc.addImage(imgData, fmt, imgX, slotY, IMG_SIZE, IMG_SIZE);
        } catch {
          // border drawn; image skipped silently
        }
      }
      doc.setFont(fonts.body, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(IRON_GALL);
      doc.text(t(locale, 'obverse'), imgX + IMG_SIZE / 2, slotY + IMG_SIZE + 4, { align: 'center' });
    }

    if (reverseImg) {
      const revY = slotY + IMG_SIZE + 10;
      const imgData = loadImageAsBase64(reverseImg.path);
      const fmt = imgData ? getImageFormat(imgData) : null;
      doc.setDrawColor(RULE_COLOR);
      doc.setLineWidth(0.3);
      doc.rect(imgX, revY, IMG_SIZE, IMG_SIZE);
      if (imgData && fmt) {
        try {
          doc.addImage(imgData, fmt, imgX, revY, IMG_SIZE, IMG_SIZE);
        } catch {
          // border drawn; image skipped silently
        }
      }
      doc.setFont(fonts.body, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(IRON_GALL);
      doc.text(t(locale, 'reverse'), imgX + IMG_SIZE / 2, revY + IMG_SIZE + 4, { align: 'center' });
    }
  }

  // 5. Right column: all metadata via autoTable
  const metaX = MARGIN + IMG_COL_W + 4;

  const metaRows: string[][] = [
    [t(locale, 'denomination'), coin.denomination || '—'],
    [t(locale, 'metal'),        coin.metal || '—'],
    [t(locale, 'weight'),       coin.weight != null ? `${Number(coin.weight).toFixed(2)}g` : '—'],
    [t(locale, 'diameter'),     coin.diameter != null ? `${Number(coin.diameter).toFixed(1)}mm` : '—'],
    [t(locale, 'fineness'),     coin.fineness || '—'],
    [t(locale, 'dieAxis'),      coin.die_axis || '—'],
    [t(locale, 'grade'),        coin.grade || '—'],
    [t(locale, 'mint'),         coin.mint || '—'],
    [t(locale, 'catalogRef'),   coin.catalog_ref || '—'],
    [t(locale, 'rarity'),       coin.rarity || '—'],
  ];

  if (coin.obverse_legend) metaRows.push([t(locale, 'obverse'), coin.obverse_legend]);
  if (coin.obverse_desc)   metaRows.push([`${t(locale, 'obverse')} Desc.`, coin.obverse_desc]);
  if (coin.reverse_legend) metaRows.push([t(locale, 'reverse'), coin.reverse_legend]);
  if (coin.reverse_desc)   metaRows.push([`${t(locale, 'reverse')} Desc.`, coin.reverse_desc]);
  if (coin.edge_desc)      metaRows.push([t(locale, 'edge'), coin.edge_desc]);
  if (coin.provenance)     metaRows.push([t(locale, 'provenance'), coin.provenance]);
  if (coin.story)          metaRows.push([t(locale, 'story'), coin.story]);

  const acquisitionParts: string[] = [];
  if (coin.purchase_price != null) acquisitionParts.push(`$${coin.purchase_price}`);
  if (coin.purchase_date)          acquisitionParts.push(coin.purchase_date);
  if (coin.purchase_source)        acquisitionParts.push(coin.purchase_source);
  if (acquisitionParts.length > 0) {
    metaRows.push([t(locale, 'acquisition'), acquisitionParts.join(' · ')]);
  }

  autoTable(doc, {
    startY: slotY,
    body: metaRows,
    theme: 'plain',
    styles: {
      font: fonts.body,
      fontSize: 9,
      textColor: IRON_GALL,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold', halign: 'left', textColor: BURNT_SIENNA },
      1: { cellWidth: META_COL_W - 30, halign: 'left' },
    },
    margin: { left: metaX, right: MARGIN },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function drawStatsList(
  doc: jsPDF,
  data: Record<string, number>,
  x: number,
  y: number,
  fonts: Fonts,
): number {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  for (const [label, count] of entries) {
    doc.setFont(fonts.body, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(IRON_GALL);
    doc.text(`${label}: ${count}`, x, y);
    y += 7;
  }
  return y;
}

function drawStatsPage(doc: jsPDF, coins: Coin[], locale: Locale, fonts: Fonts): void {
  let y = MARGIN;
  y = drawSectionHeader(doc, t(locale, 'collectionStatistics'), MARGIN, y, fonts);
  y += 5;

  const byMetal: Record<string, number> = {};
  const byEra: Record<string, number>   = {};
  const byGrade: Record<string, number> = {};
  for (const coin of coins) {
    if (coin.metal) byMetal[coin.metal] = (byMetal[coin.metal] || 0) + 1;
    if (coin.era)   byEra[coin.era]     = (byEra[coin.era] || 0) + 1;
    if (coin.grade) byGrade[coin.grade] = (byGrade[coin.grade] || 0) + 1;
  }

  doc.setFont(fonts.heading, 'italic');
  doc.setFontSize(11);
  doc.setTextColor(BURNT_SIENNA);
  doc.text(t(locale, 'byMetal'), MARGIN, y);
  y += 6;
  y = drawStatsList(doc, byMetal, MARGIN, y, fonts);
  y += 5;

  doc.setFont(fonts.heading, 'italic');
  doc.setFontSize(11);
  doc.setTextColor(BURNT_SIENNA);
  doc.text(t(locale, 'byEra'), MARGIN, y);
  y += 6;
  y = drawStatsList(doc, byEra, MARGIN, y, fonts);
  y += 5;

  doc.setFont(fonts.heading, 'italic');
  doc.setFontSize(11);
  doc.setTextColor(BURNT_SIENNA);
  doc.text(t(locale, 'byGrade'), MARGIN, y);
  y += 6;
  y = drawStatsList(doc, byGrade, MARGIN, y, fonts);

  if (coins.some(c => c.purchase_price != null)) {
    const totalValue = coins.reduce((sum, c) => sum + (c.purchase_price ?? 0), 0);
    y += 8;
    doc.setFont(fonts.body, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(IRON_GALL);
    doc.text(`${t(locale, 'totalValue')}: $${totalValue.toFixed(2)}`, MARGIN, y);
  }
}

function drawCoverPage(
  doc: jsPDF,
  coins: Coin[],
  allImages: Map<number, CoinImage[]>,
  locale: Locale,
  fonts: Fonts,
  scoped = false,
): void {
  // Featured coin: largest image file by size
  let featuredImgData: string | null = null;
  let maxSize = 0;
  for (const coin of coins) {
    const imgs = allImages.get(coin.id) ?? [];
    const primary = imgs.find(img => img.is_primary) ?? imgs[0];
    if (!primary) continue;
    const fullPath = path.join(imageRoot, primary.path);
    try {
      const { size } = fs.statSync(fullPath);
      if (size > maxSize) {
        maxSize = size;
        featuredImgData = loadImageAsBase64(primary.path);
      }
    } catch {
      // skip inaccessible files
    }
  }

  // Featured image hero — 100×100mm centered, 1pt Burnt Sienna frame
  if (featuredImgData) {
    const fmt = getImageFormat(featuredImgData);
    if (fmt) {
      try {
        doc.addImage(featuredImgData, fmt, 55, 50, 100, 100);
      } catch {
        // skip
      }
    }
    doc.setDrawColor(BURNT_SIENNA);
    doc.setLineWidth(1);
    doc.rect(55, 50, 100, 100);
  }

  // Collection title
  doc.setFont(fonts.heading, 'bold');
  doc.setFontSize(36);
  doc.setTextColor(IRON_GALL);
  doc.text(scoped ? 'Selection Catalog' : 'Patina', 105, 168, { align: 'center' });

  // Subtitle line
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const date = `${day}/${month}/${year}`;
  doc.setFont(fonts.body, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(IRON_GALL);
  doc.text(
    `${t(locale, 'generated')}: ${date}  ·  ${coins.length} ${t(locale, 'totalCoins')}`,
    105, 179, { align: 'center' },
  );

  // Thin hairline rule above stats
  doc.setDrawColor(RULE_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 197, MARGIN + CONTENT_W, 197);

  // Inline manuscript footer
  if (coins.length > 0) {
    const years = coins.map(c => c.year_numeric).filter((y): y is number => y != null);
    const yearRange = years.length > 0
      ? `${Math.min(...years)} – ${Math.max(...years)}`
      : '—';
    const metalCounts: Record<string, number> = {};
    for (const coin of coins) {
      if (coin.metal) metalCounts[coin.metal] = (metalCounts[coin.metal] || 0) + 1;
    }
    const topMetalEntry = Object.entries(metalCounts).sort((a, b) => b[1] - a[1])[0];
    const topMetal = topMetalEntry ? `${topMetalEntry[0]} (${topMetalEntry[1]})` : null;

    const statsLine = [yearRange, topMetal].filter(Boolean).join('  ·  ');
    doc.setFont(fonts.body, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(IRON_GALL);
    doc.text(statsLine, 105, 205, { align: 'center' });
  }
}

interface TocEntry {
  coin: Coin;
  pageNum: number;
  obverseImg: CoinImage | undefined;
}

function groupAndSortByEra(coins: Coin[]): Coin[] {
  return [...coins].sort((a, b) => {
    const eraA = a.era ?? '';
    const eraB = b.era ?? '';
    if (eraA !== eraB) return eraA.localeCompare(eraB);
    return a.title.localeCompare(b.title);
  });
}

function renderTocEntries(
  doc: jsPDF,
  entries: TocEntry[],
  locale: Locale,
  fonts: Fonts,
): void {
  let y = MARGIN + 14;
  let lastEra = '';

  for (const entry of entries) {
    if (entry.coin.era && entry.coin.era !== lastEra) {
      lastEra = entry.coin.era;
      doc.setFont(fonts.heading, 'italic');
      doc.setFontSize(11);
      doc.setTextColor(BURNT_SIENNA);
      doc.text(entry.coin.era, MARGIN, y);
      y += 6;
    }

    // Thumbnail
    if (entry.obverseImg) {
      const imgData = loadImageAsBase64(entry.obverseImg.path);
      const fmt = imgData ? getImageFormat(imgData) : null;
      if (imgData && fmt) {
        try {
          doc.addImage(imgData, fmt, MARGIN, y - 3, 15, 15);
        } catch {
          // skip
        }
      }
    }

    // Title
    doc.setFont(fonts.body, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(IRON_GALL);
    doc.text(entry.coin.title, MARGIN + 18, y + 5);

    // Dot leader — terminates 3–4mm before page number
    const titleWidth = doc.getTextWidth(entry.coin.title);
    const titleEndX  = MARGIN + 18 + titleWidth;
    const pageNumX   = 190;
    const leaderEndX = pageNumX - 4;
    if (titleEndX < leaderEndX) {
      doc.setLineDashPattern([0.5, 2], 0);
      doc.setDrawColor(IRON_GALL);
      doc.setLineWidth(0.3);
      doc.line(titleEndX + 2, y + 4, leaderEndX, y + 4);
      doc.setLineDashPattern([], 0);
    }

    // Page number right-aligned
    doc.text(String(entry.pageNum), pageNumX, y + 5, { align: 'right' });

    y += 20;
  }
}

export async function exportToPdf(targetPath: string, locale: Locale = 'es', coinIds?: number[]): Promise<ExportResult> {
  try {
    // 1. Set up document and fonts
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fontsLoaded = loadFonts(doc);
    const fonts: Fonts = {
      heading: fontsLoaded ? 'CormorantGaramond' : 'times',
      body:    fontsLoaded ? 'Montserrat'        : 'helvetica',
    };

    // 2. Load all data
    const allCoins = dbService.getCoins();
    const coins = coinIds ? allCoins.filter(c => c.id !== undefined && coinIds.includes(c.id)) : allCoins;
    const scoped = !!coinIds;
    const allImages = new Map<number, CoinImage[]>();
    for (const coin of coins) {
      const imgs = dbService.getImagesByCoinId(coin.id);
      allImages.set(coin.id, imgs);
    }

    // 3. Cover page (page 1)
    applyPageBackground(doc);
    drawCoverPage(doc, coins, allImages, locale, fonts, scoped);

    // 4. Compute pagePlan: one coin per page (dense metadata makes pairing impractical)
    const pagePlan: { coins: Coin[] }[] = coins.map(coin => ({ coins: [coin] }));

    // 5. TOC placeholder pages (two-pass: insert, then back-fill after coin pages are rendered)
    const tocPageCount = Math.ceil(Math.max(coins.length, 1) / 14);
    const tocPageNums: number[] = [];
    for (let tp = 0; tp < tocPageCount; tp++) {
      doc.addPage();
      applyPageBackground(doc);
      tocPageNums.push(doc.getNumberOfPages());
    }

    // 6. Stats placeholder page
    doc.addPage();
    applyPageBackground(doc);
    const statsPageNum = doc.getNumberOfPages();

    // 7. Render coin pages
    const coinPageMap = new Map<number, number>();
    for (const plan of pagePlan) {
      doc.addPage();
      applyPageBackground(doc);
      const docPage = doc.getNumberOfPages();
      plan.coins.forEach(c => coinPageMap.set(c.id, docPage));

      const yPos = MARGIN;
      drawCoinSlot(doc, plan.coins[0], allImages.get(plan.coins[0].id) ?? [], yPos, locale, fonts);

      drawPageFooter(doc, docPage, doc.getNumberOfPages(), locale, fonts);
    }

    // 8. Back-fill TOC (grouped by era, alphabetical)
    const sortedCoins = groupAndSortByEra(coins);
    const tocEntries: TocEntry[] = sortedCoins.map(c => ({
      coin: c,
      pageNum: coinPageMap.get(c.id) ?? 0,
      obverseImg: allImages.get(c.id)?.find(img => img.label === 'Obverse' || img.is_primary),
    }));

    for (let tp = 0; tp < tocPageNums.length; tp++) {
      doc.setPage(tocPageNums[tp]);
      applyPageBackground(doc);
      drawSectionHeader(doc, t(locale, 'tableOfContents'), MARGIN, MARGIN, fonts);
      const entries = tocEntries.slice(tp * 14, (tp + 1) * 14);
      renderTocEntries(doc, entries, locale, fonts);
    }

    // 9. Back-fill stats page
    doc.setPage(statsPageNum);
    applyPageBackground(doc);
    drawStatsPage(doc, coins, locale, fonts);
    drawPageFooter(doc, statsPageNum, doc.getNumberOfPages(), locale, fonts);

    // 10. Write to disk
    const buf = doc.output('arraybuffer');
    fs.writeFileSync(targetPath, Buffer.from(buf));
    return { success: true, path: targetPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
