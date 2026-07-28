import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ShoeEntry, SUPPLIER_CODES } from './categories';

const SIZES = [35, 36, 37, 38, 39, 40, 41, 42];
const SIZE_COLS = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const CAL = 'Calibri';

async function fetchImageWithLabel(url: string, label: string): Promise<{ base64: string; ext: 'jpeg' | 'png' } | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const composited = await new Promise<string>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        if (label) {
          const fontSize = Math.max(12, Math.round(w * 0.07));
          ctx.font = `bold ${fontSize}px monospace`;
          const padding = Math.round(fontSize * 0.4);
          const textWidth = ctx.measureText(label).width;
          const barHeight = fontSize + padding * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(0, h - barHeight, w, barHeight);
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, (w - textWidth) / 2, h - barHeight / 2);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

    return { base64: composited.split(',')[1], ext: 'jpeg' };
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function solidFill(argb: string): any {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bd(style: 'thin' | 'medium' = 'thin'): any {
  const s = { style };
  return { top: s, bottom: s, left: s, right: s };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTableHeader(cell: any, yellow = false) {
  if (yellow) {
    cell.fill = solidFill('FFFFFF00');
    cell.font = { name: CAL, bold: true, color: { argb: 'FFCC0000' }, size: 20 };
  } else {
    cell.fill = solidFill('FF0E3970');
    cell.font = { name: CAL, bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  }
  cell.border = bd('thin');
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dataCell(cell: any) {
  cell.font = { name: CAL, bold: true, size: 14 };
  cell.border = bd('thin');
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

export async function exportToPO(entries: ShoeEntry[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Purchase Order', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // Pre-load images in batches of 5, with label burned in
  const imageMap: Record<string, { base64: string; ext: 'jpeg' | 'png' } | null> = {};
  const withPhoto = entries.filter(e => e.id && e.picture);
  for (let i = 0; i < withPhoto.length; i += 5) {
    await Promise.all(withPhoto.slice(i, i + 5).map(async (e) => {
      const supplierCode = e.supplier_name ? SUPPLIER_CODES[e.supplier_name.trim()] : '';
      const label = supplierCode && e.article_no
        ? `${supplierCode}-${e.article_no}`
        : supplierCode || e.article_no || '';
      imageMap[e.id!] = await fetchImageWithLabel(e.picture, label);
    }));
  }

  // 16 columns A–P
  sheet.columns = [
    { width: 20 },  // A — Article
    { width: 20 },  // B — Image (wider)
    { width: 12 },  // C — Price
    { width: 32 },  // D — Remarks/Changes
    { width: 12 },  // E — Colour
    { width: 7  },  // F — 35
    { width: 7  },  // G — 36
    { width: 7  },  // H — 37
    { width: 7  },  // I — 38
    { width: 7  },  // J — 39
    { width: 7  },  // K — 40
    { width: 7  },  // L — 41
    { width: 7  },  // M — 42
    { width: 14 },  // N — Each Set Qty
    { width: 12 },  // O — Total Set
    { width: 14 },  // P — Total Pair
  ];

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '-');

  const deliveryDays = Number(entries[0]?.delivery_date || 0);
  let lastDeliveryStr = '';
  if (deliveryDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + deliveryDays);
    lastDeliveryStr = d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).replace(/ /g, '-');
  }

  // ── ROW 1: Company name | Last Delivery Date | Purchase Order ──
  sheet.getRow(1).height = 30;

  const compCell = sheet.getCell('A1');
  compCell.value = 'KETIMPORTA IMPEX PVT. LTD.';
  compCell.font = { name: CAL, bold: true, color: { argb: 'FF0E3970' }, size: 18 };
  compCell.alignment = { vertical: 'middle' };
  compCell.border = bd('thin');
  sheet.mergeCells('A1:C1');

  const lddCell = sheet.getCell('D1');
  lddCell.value = lastDeliveryStr ? `Last Delivery Date - ${lastDeliveryStr}` : 'Last Delivery Date -';
  lddCell.font = { name: CAL, bold: true, color: { argb: 'FFc41515' }, size: 18 };
  lddCell.alignment = { horizontal: 'center', vertical: 'middle' };
  lddCell.border = bd('thin');
  sheet.mergeCells('D1:M1');

  const poCell = sheet.getCell('N1');
  poCell.value = 'Purchase Order';
  poCell.font = { name: CAL, bold: true, color: { argb: 'FF4472C4' }, size: 26 };
  poCell.alignment = { horizontal: 'right', vertical: 'middle' };
  poCell.border = bd('thin');
  sheet.mergeCells('N1:P1');

  // ── ROW 2: Address line 1 | Logo (D:M) | # doc date (N:P) ──
  sheet.getRow(2).height = 38;

  const addr1Cell = sheet.getCell('A2');
  addr1Cell.value = 'A-35, RAMA ROAD NAJAFGARH ROAD IND.';
  addr1Cell.font = { name: CAL, bold: true, size: 14, color: { argb: 'FF000000' } };
  addr1Cell.alignment = { vertical: 'middle' };
  addr1Cell.border = bd('thin');
  sheet.mergeCells('A2:C2');

  const logoCell = sheet.getCell('D2');
  logoCell.value = entries[0]?.logo ? `Logo - ${entries[0].logo}` : 'Logo -';
  logoCell.fill = solidFill('FF000000');
  logoCell.font = { name: CAL, bold: true, color: { argb: 'FFFFFF00' }, size: 36 };
  logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  logoCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.mergeCells('D2:M2');

  const dateCell = sheet.getCell('N2');
  dateCell.value = `# 0000001 Dt. ${dateStr}`;
  dateCell.font = { name: CAL, bold: true, color: { argb: 'FF1F4E79' }, size: 14 };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  dateCell.border = bd('thin');
  sheet.mergeCells('N2:P2');

  // ── ROW 3: Address line 2 | Logo bottom (D:M) | Document No (N:P) ──
  sheet.getRow(3).height = 38;

  const addr2Cell = sheet.getCell('A3');
  addr2Cell.value = 'AREA, NEW DELHI - 110015';
  addr2Cell.font = { name: CAL, bold: true, size: 14, color: { argb: 'FF000000' } };
  addr2Cell.alignment = { vertical: 'middle' };
  addr2Cell.border = bd('thin');
  sheet.mergeCells('A3:C3');

  const logoCellR3 = sheet.getCell('D3');
  logoCellR3.fill = solidFill('FF000000');
  logoCellR3.border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
  sheet.mergeCells('D3:M3');

  const docLabel = sheet.getCell('N3');
  docLabel.value = 'Document No:';
  docLabel.font = { name: CAL, bold: true, color: { argb: 'FF4472C4' }, size: 14 };
  docLabel.alignment = { vertical: 'middle' };
  docLabel.border = bd('thin');
  sheet.mergeCells('N3:P3');

  // ── ROW 4: Supplier label | Ship To + Lot + empty (D:M) | POM (N:P) ──
  sheet.getRow(4).height = 22;

  const supLabelCell = sheet.getCell('A4');
  supLabelCell.value = 'Supplier:';
  supLabelCell.font = { name: CAL, bold: true, size: 14 };
  supLabelCell.alignment = { vertical: 'middle' };
  supLabelCell.border = bd('thin');
  sheet.mergeCells('A4:C4');

  const shipToHdr = sheet.getCell('D4');
  shipToHdr.value = 'Ship To:';
  shipToHdr.font = { name: CAL, bold: true, size: 14 };
  shipToHdr.alignment = { vertical: 'middle' };
  shipToHdr.border = bd('thin');
  sheet.mergeCells('D4:G4');

  const lotCell = sheet.getCell('H4');
  lotCell.value = 'Lot-1';
  lotCell.font = { name: CAL, bold: true, size: 14 };
  lotCell.alignment = { horizontal: 'center', vertical: 'middle' };
  lotCell.border = bd('thin');
  sheet.mergeCells('H4:M4');

  const pomCell = sheet.getCell('N4');
  pomCell.value = 'POM/101/1FY26-27/0000001';
  pomCell.font = { name: CAL, bold: true, color: { argb: 'FF4472C4' }, size: 14 };
  pomCell.alignment = { horizontal: 'right', vertical: 'middle' };
  pomCell.border = bd('thin');
  sheet.mergeCells('N4:P4');

  // ── ROW 5: Supplier name (spans 5-7) | Ship To company (D:M) | GSTIN label (N:P) ──
  sheet.getRow(5).height = 30;

  const supNameCell = sheet.getCell('A5');
  supNameCell.value = entries[0]?.supplier_name || '';
  supNameCell.font = { name: CAL, bold: true, size: 24, color: { argb: 'FF000000' } };
  supNameCell.alignment = { vertical: 'middle', wrapText: true };
  supNameCell.border = bd('thin');
  sheet.mergeCells('A5:C7');

  const shipCo = sheet.getCell('D5');
  shipCo.value = 'KETIMPORTA IMPEX PVT. LTD.';
  shipCo.font = { name: CAL, bold: true, size: 14 };
  shipCo.alignment = { vertical: 'middle' };
  shipCo.border = bd('thin');
  sheet.mergeCells('D5:M5');

  const gstinLabel = sheet.getCell('N5');
  gstinLabel.value = 'GSTIN/UIN:';
  gstinLabel.font = { name: CAL, bold: true, size: 14 };
  gstinLabel.alignment = { vertical: 'middle' };
  gstinLabel.border = bd('thin');
  sheet.mergeCells('N5:P5');

  // ── ROW 6: (supplier merged) | Ship To address (D:M) | GSTIN value (N:P) ──
  sheet.getRow(6).height = 26;

  const shipAddr = sheet.getCell('D6');
  shipAddr.value = 'A-35, RAMA ROAD NAJAFGARH ROAD, IND. AREA, NEW DELHI -';
  shipAddr.font = { name: CAL, bold: true, size: 14 };
  shipAddr.alignment = { vertical: 'middle' };
  shipAddr.border = bd('thin');
  sheet.mergeCells('D6:M6');

  const gstinVal = sheet.getCell('N6');
  gstinVal.value = '07AAGCK7725H1ZC';
  gstinVal.font = { name: CAL, bold: true, size: 14 };
  gstinVal.alignment = { horizontal: 'right', vertical: 'middle' };
  gstinVal.border = bd('thin');
  sheet.mergeCells('N6:P6');

  // ── ROW 7: (supplier merged) | Ship To pincode (D:M) | empty (N:P) ──
  sheet.getRow(7).height = 26;

  const shipPin = sheet.getCell('D7');
  shipPin.value = '110015';
  shipPin.font = { name: CAL, bold: true, size: 14 };
  shipPin.alignment = { vertical: 'middle' };
  shipPin.border = bd('thin');
  sheet.mergeCells('D7:M7');

  const n7 = sheet.getCell('N7');
  n7.border = bd('thin');
  sheet.mergeCells('N7:P7');

  // ── ROW 8: Table header row 1 ──
  sheet.getRow(8).height = 28;
  const h7 = [
    { addr: 'A8', label: 'Article',          merge: 'A8:A9' },
    { addr: 'B8', label: 'Image',            merge: 'B8:B9' },
    { addr: 'C8', label: 'Price',            merge: 'C8:C9' },
    { addr: 'D8', label: 'Remarks/Changes',  merge: 'D8:D9', yellow: true },
    { addr: 'E8', label: 'Colour',           merge: 'E8:E9' },
    { addr: 'F8', label: 'Size',             merge: 'F8:M8' },
    { addr: 'N8', label: 'Each Set Qty',     merge: 'N8:N9' },
    { addr: 'O8', label: 'Total Set',        merge: 'O8:O9' },
    { addr: 'P8', label: 'Total Pair',       merge: 'P8:P9' },
  ];
  for (const { addr, label, merge, yellow } of h7) {
    const c = sheet.getCell(addr);
    c.value = label;
    applyTableHeader(c, yellow);
    sheet.mergeCells(merge);
  }

  // ── ROW 9: Size sub-headers ──
  sheet.getRow(9).height = 20;
  SIZES.forEach((size, idx) => {
    const c = sheet.getCell(`${SIZE_COLS[idx]}9`);
    c.value = size;
    applyTableHeader(c);
  });

  // ── DATA ROWS (start at row 10) ──
  let currentRow = 10;

  for (const entry of entries) {
    let variants: Record<string, string>[] = [];
    try { variants = JSON.parse(entry.color_variants || '[]'); } catch { variants = []; }
    if (!variants.length) continue;

    const count = variants.length;
    const startRow = currentRow;
    const endRow = currentRow + count - 1;

    for (let r = startRow; r <= endRow; r++) {
      sheet.getRow(r).height = count === 1 ? 72 : 60;
    }

    if (count > 1) {
      sheet.mergeCells(`A${startRow}:A${endRow}`);
      sheet.mergeCells(`B${startRow}:B${endRow}`);
      sheet.mergeCells(`C${startRow}:C${endRow}`);
      sheet.mergeCells(`D${startRow}:D${endRow}`);
    }

    // Article
    const ca = sheet.getCell(`A${startRow}`);
    ca.value = entry.article_no || '';
    ca.font = { name: CAL, bold: true, size: 14 };
    ca.border = bd('thin');
    ca.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Image cell — twoCell so it moves and sizes with the column
    const cb = sheet.getCell(`B${startRow}`);
    cb.border = bd('thin');
    cb.alignment = { horizontal: 'center', vertical: 'middle' };

    if (entry.id && imageMap[entry.id]) {
      const imgData = imageMap[entry.id]!;
      const imgId = workbook.addImage({ base64: imgData.base64, extension: imgData.ext });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sheet.addImage(imgId, { tl: { col: 1, row: startRow - 1 } as any, br: { col: 2, row: endRow } as any, editAs: 'twoCell' });
    }

    // Price
    const cc = sheet.getCell(`C${startRow}`);
    cc.value = entry.pur_price || '';
    cc.font = { name: CAL, bold: true, size: 14 };
    cc.border = bd('thin');
    cc.alignment = { horizontal: 'center', vertical: 'middle' };

    // Remarks (yellow, FS14)
    const cd = sheet.getCell(`D${startRow}`);
    cd.value = entry.notes || '';
    cd.font = { name: CAL, bold: true, size: 14 };
    cd.fill = solidFill('FFFFFF00');
    cd.border = bd('thin');
    cd.alignment = { vertical: 'top', wrapText: true };

    // Variant rows
    for (let vi = 0; vi < count; vi++) {
      const v = variants[vi];
      const row = startRow + vi;
      const setQty = Number(v.set_qty || 0);

      const ce = sheet.getCell(`E${row}`);
      ce.value = v.color || '';
      dataCell(ce);

      SIZE_COLS.forEach((col, idx) => {
        const qty = Number(v[`qty_${SIZES[idx]}`] || 0);
        const cs = sheet.getCell(`${col}${row}`);
        cs.value = qty > 0 ? qty : '';
        dataCell(cs);
      });

      // Each Set Qty — formula: sum of size columns
      const cn = sheet.getCell(`N${row}`);
      cn.value = { formula: `SUM(F${row}:M${row})` };
      dataCell(cn);

      // Total Set — entered value
      const co = sheet.getCell(`O${row}`);
      co.value = setQty > 0 ? setQty : '';
      dataCell(co);

      // Total Pair — formula: Each Set Qty × Total Set
      const cp = sheet.getCell(`P${row}`);
      cp.value = { formula: `N${row}*O${row}` };
      dataCell(cp);
    }

    currentRow = endRow + 1;
  }

  // ── GRAND TOTAL ROW ──
  const gtRow = currentRow;
  const firstDataRow = 10;
  const lastDataRow = gtRow - 1;
  sheet.getRow(gtRow).height = 26;

  const gtLabel = sheet.getCell(`A${gtRow}`);
  gtLabel.value = 'Grand Total';
  gtLabel.font = { name: CAL, bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  gtLabel.fill = solidFill('FF0E3970');
  gtLabel.border = bd('medium');
  gtLabel.alignment = { vertical: 'middle' };
  sheet.mergeCells(`A${gtRow}:D${gtRow}`);

  for (const col of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']) {
    const c = sheet.getCell(`${col}${gtRow}`);
    c.fill = solidFill('FF0E3970');
    c.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  const gtO = sheet.getCell(`O${gtRow}`);
  gtO.value = { formula: `SUM(O${firstDataRow}:O${lastDataRow})` };
  gtO.font = { name: CAL, bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  gtO.fill = solidFill('FF0E3970');
  gtO.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  gtO.alignment = { horizontal: 'center', vertical: 'middle' };

  const gtP = sheet.getCell(`P${gtRow}`);
  gtP.value = { formula: `SUM(P${firstDataRow}:P${lastDataRow})` };
  gtP.font = { name: CAL, bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  gtP.fill = solidFill('FF0E3970');
  gtP.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'medium' } };
  gtP.alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Sample_PO_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
