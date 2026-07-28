'use client';

import { ShoeEntry } from './categories';

const BLUE_DARK: [number, number, number] = [14, 57, 112];
const BLUE_MID: [number, number, number] = [68, 114, 196];
const YELLOW: [number, number, number] = [255, 255, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [200, 0, 0];
const SIZES = [35, 36, 37, 38, 39, 40, 41, 42];

async function toDataURL(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

async function buildPODoc(entries: ShoeEntry[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const M = 8;

  // Pre-load all photos
  const imageMap: Record<string, string> = {};
  await Promise.all(
    entries
      .filter(e => e.id && e.picture)
      .map(async e => { imageMap[e.id!] = await toDataURL(e.picture); })
  );

  // ── HEADER ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BLUE_DARK);
  doc.text('KETIMPORTA IMPEX PVT. LTD.', M, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('A-35, RAMA ROAD NAJAFGARH ROAD IND.', M, 17);
  doc.text('AREA, NEW DELHI - 110015', M, 21);

  if (entries[0]?.logo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...RED);
    doc.text(`Logo - ${entries[0].logo}`, M, 25);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...BLUE_MID);
  doc.text('Purchase Order', pageW - M, 13, { align: 'right' });

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '-');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BLUE_MID);
  doc.text(`Date - ${dateStr}`, pageW - M, 20, { align: 'right' });

  const deliveryDays = Number(entries[0]?.delivery_date || 0);
  if (deliveryDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + deliveryDays);
    const lastDeliveryStr = d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).replace(/ /g, '-');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text(`Last Delivery Date - ${lastDeliveryStr}`, pageW - M, 25, { align: 'right' });
  }

  // ── SUPPLIER & SHIP TO ──
  const infoY = 29;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(M, infoY, 90, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Supplier:', M + 2, infoY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(entries[0]?.supplier_name || '', M + 22, infoY + 4);

  const shipX = M + 95;
  doc.rect(shipX, infoY, pageW - shipX - M, 12);
  doc.setFont('helvetica', 'bold');
  doc.text('Ship To:', shipX + 2, infoY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('KETIMPORTA IMPEX PVT. LTD.', shipX + 20, infoY + 4);
  doc.text('A-35, RAMA ROAD NAJAFGARH ROAD, IND. AREA, NEW DELHI - 110015', shipX + 20, infoY + 9);

  // ── BUILD TABLE ROWS ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[][] = [];
  const rowImages: (string | null)[] = [];
  let grandTotalSets = 0;
  let grandTotalPairs = 0;

  for (const entry of entries) {
    let variants: Record<string, string>[] = [];
    try { variants = JSON.parse(entry.color_variants || '[]'); } catch { variants = []; }
    if (!variants.length) continue;

    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi];
      const totalQty = SIZES.reduce((s, n) => s + (Number(v[`qty_${n}`] || 0)), 0);
      const setQty = Number(v.set_qty || 0);
      const totalPair = totalQty * setQty;
      grandTotalSets += setQty;
      grandTotalPairs += totalPair;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any[] = [];

      if (vi === 0) {
        row.push({ content: entry.article_no || '', rowSpan: variants.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
        row.push({ content: '', rowSpan: variants.length, styles: { valign: 'middle', halign: 'center' } });
        row.push({ content: entry.pur_price || '', rowSpan: variants.length, styles: { valign: 'middle', halign: 'center' } });
        row.push({ content: '', rowSpan: variants.length, styles: { fillColor: YELLOW, valign: 'middle' } });
        rowImages.push(entry.id ? (imageMap[entry.id] || null) : null);
      } else {
        rowImages.push(null);
      }

      row.push({ content: v.color || '', styles: { halign: 'center', valign: 'middle' } });
      SIZES.forEach(n => {
        const qty = Number(v[`qty_${n}`] || 0);
        row.push({ content: qty > 0 ? String(qty) : '', styles: { halign: 'center', valign: 'middle', fontSize: 8 } });
      });
      row.push({ content: setQty > 0 ? String(setQty) : '', styles: { halign: 'center', valign: 'middle' } });
      row.push({ content: setQty > 0 ? '1' : '', styles: { halign: 'center', valign: 'middle' } });
      row.push({ content: totalPair > 0 ? String(totalPair) : '', styles: { halign: 'center', valign: 'middle' } });

      body.push(row);
    }
  }

  // Grand total row
  body.push([
    { content: 'Grand Total', colSpan: 13, styles: { fontStyle: 'bold', fillColor: BLUE_DARK, textColor: WHITE, halign: 'right', valign: 'middle' } },
    { content: String(grandTotalSets), styles: { fontStyle: 'bold', fillColor: BLUE_DARK, textColor: WHITE, halign: 'center', valign: 'middle' } },
    { content: '', styles: { fillColor: BLUE_DARK } },
    { content: String(grandTotalPairs), styles: { fontStyle: 'bold', fillColor: BLUE_DARK, textColor: WHITE, halign: 'center', valign: 'middle' } },
  ]);

  autoTable(doc, {
    startY: infoY + 14,
    head: [
      [
        { content: 'Article',          rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Image',            rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Price',            rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Remarks/Changes',  rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: YELLOW, textColor: RED, fontStyle: 'bold', fontSize: 10 } },
        { content: 'Colour',           rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Size',             colSpan: 8, styles: { halign: 'center' } },
        { content: 'Each Set Qty',     rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Total Set',        rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Total Pair',       rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      ['35','36','37','38','39','40','41','42'].map(s => ({ content: s, styles: { halign: 'center' as const } })),
    ],
    body,
    theme: 'grid',
    headStyles: { fillColor: BLUE_DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 2 },
    columnStyles: {
      0:  { cellWidth: 22 },
      1:  { cellWidth: 26 },
      2:  { cellWidth: 15 },
      3:  { cellWidth: 36 },
      4:  { cellWidth: 16 },
      5:  { cellWidth: 9 },
      6:  { cellWidth: 9 },
      7:  { cellWidth: 9 },
      8:  { cellWidth: 9 },
      9:  { cellWidth: 9 },
      10: { cellWidth: 9 },
      11: { cellWidth: 9 },
      12: { cellWidth: 9 },
      13: { cellWidth: 20 },
      14: { cellWidth: 17 },
      15: { cellWidth: 17 },
    },
    bodyStyles: { fontSize: 8, cellPadding: 2, minCellHeight: 22 },
    margin: { left: M, right: M },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const img = rowImages[data.row.index];
        if (img) {
          try {
            doc.addImage(img, 'JPEG',
              data.cell.x + 2, data.cell.y + 2,
              data.cell.width - 4, data.cell.height - 4,
            );
          } catch { /* ignore */ }
        }
      }
    },
  });

  return doc;
}

export async function exportToPDF(entries: ShoeEntry[]) {
  const doc = await buildPODoc(entries);
  doc.save(`Sample_PO_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function buildPOPdfFile(entries: ShoeEntry[]): Promise<File> {
  const doc = await buildPODoc(entries);
  const blob = doc.output('blob');
  return new File([blob], `Sample_PO_${new Date().toISOString().slice(0, 10)}.pdf`, { type: 'application/pdf' });
}
