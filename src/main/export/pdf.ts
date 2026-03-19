import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { dbService } from '../db';

const isDev = !app.isPackaged;
const imageRoot = isDev
  ? path.join(process.cwd(), 'data', 'images')
  : path.join(app.getPath('userData'), 'images');

const BLACK = '#000000';
const GRAY = '#666666';
const LIGHT_GRAY = '#CCCCCC';

interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

function loadImageAsBase64(imagePath: string): string | null {
  try {
    const fullPath = path.join(imageRoot, imagePath);
    if (!fs.existsSync(fullPath)) return null;
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function exportToPdf(targetPath: string): Promise<ExportResult> {
  try {
    const coins = dbService.getCoins();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    const totalCoins = coins.length;
    let currentPage = 1;

    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(BLACK);
    doc.text('Patina Collection Catalog', margin, 40);

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(GRAY);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 52);
    doc.text(`Total Coins: ${totalCoins}`, margin, 60);

    if (totalCoins > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(BLACK);
      doc.text('Contents', margin, 80);

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(GRAY);
      let tocY = 90;
      coins.forEach((coin, index) => {
        if (tocY > 270) {
          doc.addPage();
          currentPage++;
          tocY = 25;
        }
        doc.text(`${index + 1}. ${coin.title}`, margin + 5, tocY);
        tocY += 7;
      });
    }

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const images = dbService.getImagesByCoinId(coin.id);
      const obverseImg = images.find(img => img.label === 'Obverse' || (!img.label && img.is_primary));
      const reverseImg = images.find(img => img.label === 'Reverse');

      doc.addPage();
      currentPage++;

      let yPos = 25;

      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(BLACK);
      doc.text(coin.title, margin, yPos);
      yPos += 8;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(GRAY);
      const subtitle = [coin.issuer, coin.year_display, coin.era, coin.mint].filter(Boolean).join(' · ');
      doc.text(subtitle, margin, yPos);
      yPos += 10;

      doc.setDrawColor(LIGHT_GRAY);
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      const singleImgWidth = contentWidth * 0.45;
      const imgBoxHeight = 55;

      if (obverseImg || reverseImg) {
        if (obverseImg) {
          const imgData = loadImageAsBase64(obverseImg.path);
          if (imgData) {
            try {
              doc.addImage(imgData, 'JPEG', margin, yPos, singleImgWidth, imgBoxHeight);
              doc.setDrawColor(LIGHT_GRAY);
              doc.setLineWidth(0.3);
              doc.rect(margin, yPos, singleImgWidth, imgBoxHeight);
              doc.setFont('times', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(GRAY);
              doc.text('Obverse', margin + singleImgWidth / 2, yPos + imgBoxHeight + 4, { align: 'center' });
            } catch {
              doc.setFont('times', 'normal');
              doc.setFontSize(8);
              doc.text('[Image unavailable]', margin + singleImgWidth / 2, yPos + imgBoxHeight / 2, { align: 'center' });
            }
          }
        }

        if (reverseImg) {
          const imgData = loadImageAsBase64(reverseImg.path);
          const offsetX = margin + singleImgWidth + 10;
          if (imgData) {
            try {
              doc.addImage(imgData, 'JPEG', offsetX, yPos, singleImgWidth, imgBoxHeight);
              doc.setDrawColor(LIGHT_GRAY);
              doc.setLineWidth(0.3);
              doc.rect(offsetX, yPos, singleImgWidth, imgBoxHeight);
              doc.setFont('times', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(GRAY);
              doc.text('Reverse', offsetX + singleImgWidth / 2, yPos + imgBoxHeight + 4, { align: 'center' });
            } catch {
              doc.setFont('times', 'normal');
              doc.setFontSize(8);
              doc.text('[Image unavailable]', offsetX + singleImgWidth / 2, yPos + imgBoxHeight / 2, { align: 'center' });
            }
          }
        }

        yPos += imgBoxHeight + 12;
      }

      doc.setDrawColor(LIGHT_GRAY);
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(BLACK);
      doc.text('Specifications', margin, yPos);
      yPos += 8;

      const specsTable = [
        ['Denomination', coin.denomination || '—', 'Metal', coin.metal || '—'],
        ['Weight', coin.weight ? `${Number(coin.weight).toFixed(2)}g` : '—', 'Diameter', coin.diameter ? `${Number(coin.diameter).toFixed(1)}mm` : '—'],
        ['Fineness', coin.fineness || '—', 'Mint', coin.mint || '—'],
        ['Die Axis', coin.die_axis ? `${coin.die_axis}h` : '—', 'Grade', coin.grade || '—'],
      ];

      autoTable(doc, {
        startY: yPos,
        body: specsTable,
        theme: 'plain',
        styles: {
          font: 'times',
          fontSize: 9,
          textColor: BLACK,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
          1: { cellWidth: 45, halign: 'left' },
          2: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
          3: { cellWidth: 55, halign: 'left' },
        },
        margin: { left: margin, right: margin },
      });

      const specsTableEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      yPos = specsTableEnd + 10;

      if (coin.rarity) {
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(GRAY);
        doc.text(`Rarity: ${coin.rarity}`, margin, yPos);
        yPos += 8;
      }

      const inscriptions = [];
      if (coin.obverse_legend) inscriptions.push(['Obverse', coin.obverse_legend]);
      if (coin.obverse_desc) inscriptions.push(['Obverse Desc.', coin.obverse_desc]);
      if (coin.reverse_legend) inscriptions.push(['Reverse', coin.reverse_legend]);
      if (coin.reverse_desc) inscriptions.push(['Reverse Desc.', coin.reverse_desc]);
      if (coin.edge_desc) inscriptions.push(['Edge', coin.edge_desc]);

      if (inscriptions.length > 0) {
        doc.setDrawColor(LIGHT_GRAY);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(BLACK);
        doc.text('Inscriptions', margin, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          body: inscriptions,
          theme: 'plain',
          styles: {
            font: 'times',
            fontSize: 8,
            textColor: BLACK,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
            1: { cellWidth: contentWidth - 35, halign: 'left' },
          },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      const additional = [];
      if (coin.catalog_ref) additional.push(['Catalog Ref.', coin.catalog_ref]);
      if (coin.provenance) additional.push(['Provenance', coin.provenance]);
      if (coin.story) additional.push(['Story', coin.story]);

      if (additional.length > 0) {
        doc.setDrawColor(LIGHT_GRAY);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          body: additional,
          theme: 'plain',
          styles: {
            font: 'times',
            fontSize: 8,
            textColor: BLACK,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
            1: { cellWidth: contentWidth - 35, halign: 'left' },
          },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      const acquisitionInfo = [];
      if (coin.purchase_price !== undefined) acquisitionInfo.push(['Price', `$${coin.purchase_price}`]);
      if (coin.purchase_date) acquisitionInfo.push(['Date', coin.purchase_date]);
      if (coin.purchase_source) acquisitionInfo.push(['Source', coin.purchase_source]);

      if (acquisitionInfo.length > 0) {
        doc.setDrawColor(LIGHT_GRAY);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(GRAY);
        const acqLabel = acquisitionInfo.map(([, val]) => val).join('  ·  ');
        doc.text(acqLabel, margin, yPos);
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(GRAY);
      doc.text(`Page ${currentPage}`, 105, 290, { align: 'center' });
    }

    const finalBuffer = doc.output('arraybuffer');
    fs.writeFileSync(targetPath, Buffer.from(finalBuffer));

    return { success: true, path: targetPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}