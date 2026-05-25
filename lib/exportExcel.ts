import * as XLSX from 'xlsx';
import { ShoeEntry, DEPT_SIZES } from './categories';

export function exportToExcel(entries: ShoeEntry[]) {
  const rows = entries.map((e) => {
    const pic = e.picture || (e as unknown as Record<string, string>).photo_url || '';
    const sizes = DEPT_SIZES[e.department] ?? [];
    const entryMap = e as unknown as Record<string, string>;

    const totalQty = sizes.reduce((sum, n) => {
      const v = Number(entryMap[`qty_${n}`] || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const multiply = (Number(e.set_qty || 0) || 0) * totalQty;

    const sizeData: Record<string, string> = {};
    for (const n of sizes) {
      sizeData[String(n)] = entryMap[`qty_${n}`] || '';
    }

    return {
      'Picture':     pic ? '[photo attached]' : '',
      'Department':  e.department || '',
      'Category':    e.category || '',
      'SubCategory': e.sub_category || '',
      'ArticleNo':   e.article_no || '',
      'Heels':       e.heels || '',
      'Color':       e.color || '',
      'Section':     e.section || '',
      'Season':      e.season || '',
      'Pur Price':   e.pur_price || '',
      'Size Set':    e.size_set || '',
      'Set Qty':     e.set_qty || '',
      ...sizeData,
      'Total Qty':   totalQty > 0 ? String(totalQty) : '',
      'Multiply':    multiply > 0 ? String(multiply) : '',
      'Notes':       e.notes || '',
      'Date':        e.created_at
        ? new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kins Footwear');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Kins_Footwear_${today}.xlsx`);
}
