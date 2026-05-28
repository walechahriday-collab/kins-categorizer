import * as XLSX from 'xlsx';
import { ShoeEntry, ColorVariant, DEPT_SIZES } from './categories';

const HEADERS = [
  'Picture', 'Department', 'Category', 'SubCategory', 'ArticleNo',
  'CodingType', 'UOMName', 'Description', 'ExtDescription',
  'Color', 'Size', 'Style', 'Brand', 'HSNCode', 'Supplier',
  'ItemCode', 'PurPrice', 'ItemMrp', 'ItemVsp', 'Quantity',
  'InvoiceNo', 'InvoiceOt', 'PORowId', 'PurOrderId',
  'ATTR_Set_Qty', 'ATTR_Size_Set', 'ATTR_Season', 'ATTR_Saection',
] as const;

export function exportToExcelV2(entries: ShoeEntry[]) {
  const rows: Record<string, string>[] = [];

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

    // Only include http URLs — skip base64 data URLs (too large for a cell)
    const pic = (e.picture || '').startsWith('http') ? e.picture : '';

    for (const v of variants) {
      const vMap = v as unknown as Record<string, string>;

      const sizesWithQty = sizes.filter(n => Number(vMap[`qty_${n}`] || 0) > 0);

      const makeRow = (size: string, qty: string): Record<string, string> => {
        const row: Record<string, string> = {};
        for (const h of HEADERS) row[h] = '';
        row['Picture']       = pic;
        row['Department']    = e.department || '';
        row['Category']      = e.category || '';
        row['SubCategory']   = e.sub_category || '';
        row['ArticleNo']     = e.article_no || '';
        row['Color']         = v.color || '';
        row['Size']          = size;
        row['Style']         = e.heels || '';
        row['PurPrice']      = e.pur_price || '';
        row['Quantity']      = qty;
        row['ATTR_Set_Qty']  = v.set_qty || '';
        row['ATTR_Size_Set'] = v.size_set || '';
        row['ATTR_Season']   = e.season || '';
        row['ATTR_Saection'] = e.section || '';
        return row;
      };

      if (sizesWithQty.length > 0) {
        for (const n of sizesWithQty) {
          rows.push(makeRow(String(n), vMap[`qty_${n}`] || ''));
        }
      } else {
        // No individual size quantities — one row per variant
        rows.push(makeRow(v.size_set || '', v.set_qty || ''));
      }
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kins Footwear');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Kins_Footwear_ERP_${today}.xlsx`);
}
