import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ShoeEntry, ColorVariant, DEPT_SIZES } from './categories';

const HEADERS = [
  'Picture', 'Department', 'Category', 'SubCategory', 'ArticleNo',
  'CodingType', 'UOMName', 'Description', 'ExtDescription',
  'Color', 'Size', 'Style', 'Brand', 'HSNCode', 'Supplier',
  'ItemCode', 'ItemId', 'PurPrice', 'ItemMrp', 'ItemWsp', 'Quantity',
  'InvoiceNo', 'InvoiceDt', 'PORowId', 'PurOrderId',
  'ATTR_Set_Qty', 'ATTR_Size_Set', 'ATTR_Season', 'ATTR_Saction',
] as const;

const SECTION_LABEL: Record<string, string> = {
  'MB': 'Meena Bazar',
  'SB': 'Shoe Bazar',
};

export async function exportToExcelV2(entries: ShoeEntry[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kins Footwear');

  // Header row — bold
  const headerRow = sheet.addRow([...HEADERS]);
  headerRow.eachCell(cell => { cell.font = { bold: true }; });

  // Force InvoiceNo column to text so "001" is preserved
  const invoiceNoColIdx = HEADERS.indexOf('InvoiceNo') + 1;
  sheet.getColumn(invoiceNoColIdx).numFmt = '@';

  for (const e of entries) {
    const sizes = DEPT_SIZES[e.department] ?? [];

    let variants: ColorVariant[] = [];
    try {
      variants = e.color_variants ? JSON.parse(e.color_variants) : [];
    } catch { variants = []; }

    if (variants.length === 0) {
      const v: Record<string, string> = {
        color: e.color || '', size_set: e.size_set || '', set_qty: e.set_qty || '',
      };
      for (const n of sizes) v[`qty_${n}`] = (e as unknown as Record<string, string>)[`qty_${n}`] || '';
      variants = [v as ColorVariant];
    }

    const pic = (e.picture || '').startsWith('http') ? e.picture : '';
    const sectionLabel = SECTION_LABEL[e.section] ?? e.section ?? '';
    const entryDate = e.created_at ? new Date(e.created_at) : new Date();

    for (const v of variants) {
      const vMap = v as unknown as Record<string, string>;
      const sizesWithQty = sizes.filter(n => Number(vMap[`qty_${n}`] || 0) > 0);

      const makeRow = (size: string): (string | number | Date)[] => {
        const articlePart = (e.article_no || '').toUpperCase();
        const colorPart = (v.color || '').toUpperCase();
        const itemCode = articlePart
          ? `${articlePart}_${colorPart}_${size}`
          : `_${colorPart}_${size}`;

        const toNum = (val: string) => { const n = Number(val); return val !== '' && !isNaN(n) ? n : (val || ''); };

        return HEADERS.map(h => {
          switch (h) {
            case 'Picture':       return pic;
            case 'Department':    return e.department || '';
            case 'Category':      return e.category || '';
            case 'SubCategory':   return e.sub_category || '';
            case 'ArticleNo':     return e.article_no || '';
            case 'CodingType':    return 1;
            case 'UOMName':       return 'PRS';
            case 'Color':         return v.color || '';
            case 'Size':          return toNum(size);
            case 'Style':         return e.heels || '';
            case 'Brand':         return 'Ket';
            case 'ItemCode':      return itemCode;
            case 'PurPrice':      return toNum(e.pur_price || '');
            case 'ItemMrp':       return 1.00;
            case 'ItemWsp':       return 0.00;
            case 'Quantity':      return '';
            case 'InvoiceNo':     return '001';
            case 'InvoiceDt':     return entryDate;
            case 'ATTR_Set_Qty':  return toNum(v.set_qty || '');
            case 'ATTR_Size_Set': return toNum(v.size_set || '');
            case 'ATTR_Season':   return e.season || '';
            case 'ATTR_Saction':  return sectionLabel;
            default:              return '';
          }
        });
      };

      if (sizesWithQty.length > 0) {
        for (const n of sizesWithQty) sheet.addRow(makeRow(String(n)));
      } else {
        sheet.addRow(makeRow(v.size_set || ''));
      }
    }
  }

  // Format columns
  sheet.getColumn(HEADERS.indexOf('InvoiceDt') + 1).numFmt = 'dd/mm/yyyy';
  sheet.getColumn(HEADERS.indexOf('ItemMrp') + 1).numFmt = '0.00';
  sheet.getColumn(HEADERS.indexOf('ItemWsp') + 1).numFmt = '0.00';

  // Auto-width columns
  sheet.columns.forEach((col, i) => {
    col.width = Math.max(HEADERS[i]?.length ?? 10, 12);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Kins_Footwear_ERP_${today}.xlsx`);
}
