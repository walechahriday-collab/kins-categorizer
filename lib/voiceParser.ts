import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, SEASONS,
} from './categories';

const allCategories = [...new Set(Object.values(DEPT_CATEGORIES).flat())] as string[];
const allHeels = [...new Set(Object.values(DEPT_HEELS).flat())] as string[];
const allSections = [...new Set(Object.values(DEPT_SECTIONS).flat())] as string[];

interface FieldDef {
  field: string;
  keywords: string[];
  type: 'select' | 'text';
  options?: readonly string[];
}

const FIELD_DEFS: FieldDef[] = [
  { field: 'department',   keywords: ['department', 'dept'],                   type: 'select', options: DEPARTMENTS },
  { field: 'category',     keywords: ['category', 'cat'],                      type: 'select', options: allCategories },
  { field: 'sub_category', keywords: ['subcategory', 'sub category', 'sub'],   type: 'select', options: SUB_CATEGORIES },
  { field: 'article_no',   keywords: ['article no', 'article number', 'article'], type: 'text' },
  { field: 'heels',        keywords: ['heels', 'heel', 'style'],               type: 'select', options: allHeels },
  { field: 'color',        keywords: ['color', 'colour'],                      type: 'select', options: COLORS },
  { field: 'section',      keywords: ['section'],                              type: 'select', options: allSections },
  { field: 'season',       keywords: ['season'],                               type: 'select', options: SEASONS },
  { field: 'set_qty',      keywords: ['set qty', 'set quantity'],               type: 'text' },
  { field: 'size_set',     keywords: ['size set'],                             type: 'text' },
  { field: 'pur_price',    keywords: ['purchase price', 'pur price', 'price'], type: 'text' },
  { field: 'notes',        keywords: ['notes', 'note'],                        type: 'text' },
];

function findBestMatch(spoken: string, options: readonly string[]): string | null {
  const s = spoken.toLowerCase().trim();
  if (!s) return null;
  const exact = options.find(o => o.toLowerCase() === s);
  if (exact) return exact;
  const contains = options.find(o => o.toLowerCase().includes(s));
  if (contains) return contains;
  const spokenContains = options.find(o => s.includes(o.toLowerCase()));
  if (spokenContains) return spokenContains;
  return null;
}

export function parseVoiceCommand(transcript: string): Record<string, string> {
  const text = transcript
    .toLowerCase()
    .replace(/\b(um|uh|hmm|er|ah|okay|ok|and|the|a|an|is|are|with|fill|set|put)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const allKeywords = FIELD_DEFS.flatMap(f =>
    f.keywords.map(k => ({ keyword: k, field: f.field, type: f.type, options: f.options }))
  ).sort((a, b) => b.keyword.length - a.keyword.length);

  const matches: Array<{ pos: number; end: number; field: string; type: string; options?: readonly string[] }> = [];

  for (const kw of allKeywords) {
    const idx = text.indexOf(kw.keyword);
    if (idx === -1) continue;
    const alreadyCovered = matches.some(m => idx >= m.pos && idx < m.end);
    if (!alreadyCovered) {
      matches.push({ pos: idx, end: idx + kw.keyword.length, field: kw.field, type: kw.type, options: kw.options });
    }
  }

  matches.sort((a, b) => a.pos - b.pos);
  const seen = new Set<string>();
  const unique = matches.filter(m => {
    if (seen.has(m.field)) return false;
    seen.add(m.field);
    return true;
  });

  const result: Record<string, string> = {};
  for (let i = 0; i < unique.length; i++) {
    const curr = unique[i];
    const next = unique[i + 1];
    const rawValue = text.slice(curr.end, next ? next.pos : text.length)
      .replace(/^[\s,]+|[\s,]+$/g, '').trim();
    if (!rawValue) continue;
    if (curr.type === 'select' && curr.options) {
      const matched = findBestMatch(rawValue, curr.options);
      if (matched) result[curr.field] = matched;
    } else {
      result[curr.field] = rawValue;
    }
  }
  return result;
}
