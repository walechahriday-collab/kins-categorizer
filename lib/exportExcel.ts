import * as XLSX from 'xlsx';
import { ShoeEntry, ColorVariant, DEPT_SIZES } from './categories';

export function exportToExcel(entries: ShoeEntry[]) {
  const rows = entries.map((e) => {
    const pic = e.picture || (e as unknown as Record<string, string>).photo_url || '';
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

    const sharedData: Record<string, string> = {
      'Picture':     pic ? '[photo attached]' : '',
      'Department':  e.department || '',
      'Category':    e.category || '',
      'SubCategory': e.sub_category || '',
      'ArticleNo':   e.article_no || '',
      'Heels':       e.heels || '',
      'Section':     e.section || '',
      'Season':      e.season || '',
      'Pur Price':   e.pur_price || '',
      'Notes':       e.notes || '',
      'Date':        e.created_at
        ? new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
    };

    const variantData: Record<string, string> = {};
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const vMap = v as unknown as Record<string, string>;
      const p = `C${i + 1}`;

      variantData[`${p} Color`]    = v.color || '';
      variantData[`${p} Size Set`] = v.size_set || '';
      variantData[`${p} Set Qty`]  = v.set_qty || '';

      let totalQty = 0;
      for (const n of sizes) {
        const qty = Number(vMap[`qty_${n}`] || 0);
        variantData[`${p} ${n}`] = qty > 0 ? String(qty) : '';
        totalQty += isNaN(qty) ? 0 : qty;
      }

      const multiply = (Number(v.set_qty || 0) || 0) * totalQty;
      variantData[`${p} Total Qty`] = totalQty > 0 ? String(totalQty) : '';
      variantData[`${p} Multiply`]  = multiply > 0 ? String(multiply) : '';
    }

    return { ...sharedData, ...variantData };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kins Footwear');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Kins_Footwear_${today}.xlsx`);
}
