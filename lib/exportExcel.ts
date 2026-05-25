import * as XLSX from 'xlsx';
import { ShoeEntry } from './categories';

export function exportToExcel(entries: ShoeEntry[]) {
  const rows = entries.map((e) => {
    const pic = e.picture || (e as unknown as Record<string, string>).photo_url || '';
    return {
      'Picture':      pic ? '[photo attached]' : '',
      'Department':   e.department || '',
      'Category':     e.category || '',
      'SubCategory':  e.sub_category || '',
      'ArticleNo':    e.article_no || '',
      'Heels':        e.heels || '',
      'Color':        e.color || '',
      'Section':      e.section || '',
      'Season':       e.season || '',
      'Set Qty':      e.set_qty || '',
      'Size Set':     e.size_set || '',
      'Pur Price':    e.pur_price || '',
      'Notes':        e.notes || '',
      'Date':         e.created_at
        ? new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 14 }, // Picture
    { wch: 18 }, // Department
    { wch: 18 }, // Category
    { wch: 14 }, // SubCategory
    { wch: 14 }, // ArticleNo
    { wch: 16 }, // Heels
    { wch: 10 }, // Color
    { wch: 12 }, // Section
    { wch: 10 }, // Season
    { wch: 10 }, // Set Qty
    { wch: 12 }, // Size Set
    { wch: 12 }, // Pur Price
    { wch: 30 }, // Notes
    { wch: 14 }, // Date
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kins Footwear');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Kins_Footwear_${today}.xlsx`);
}
