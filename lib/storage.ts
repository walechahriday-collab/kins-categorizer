import { supabase } from './supabase';
import { ShoeEntry } from './categories';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_CONFIGURED =
  !!SUPABASE_URL && SUPABASE_URL !== 'https://placeholder.supabase.co';

export async function uploadPhoto(file: File): Promise<string> {
  if (!SUPABASE_CONFIGURED) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string ?? '');
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('photos').upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
  return publicUrl;
}

function migrateEntry(e: Record<string, string>): ShoeEntry {
  const qtyFields: Record<string, string> = {};
  for (let i = 15; i <= 47; i++) {
    qtyFields[`qty_${i}`] = e[`qty_${i}`] || '';
  }

  // Build color_variants from flat fields if not present
  let color_variants = e.color_variants || '';
  if (!color_variants) {
    const v: Record<string, string> = {
      color: e.color || '',
      size_set: e.size_set || e.attr_size_set || '',
      set_qty: e.set_qty || e.attr_set_qty || '',
      ...qtyFields,
    };
    color_variants = JSON.stringify([v]);
  }

  return {
    id: e.id,
    created_at: e.created_at,
    picture: e.picture || '',
    department: e.department || '',
    category: e.category || '',
    sub_category: e.sub_category || '',
    article_no: e.article_no || '',
    heels: e.heels || e.style_heel || '',
    color: e.color || '',
    section: e.section || e.attr_section || '',
    season: e.season || e.attr_season || '',
    pur_price: e.pur_price || '',
    size_set: e.size_set || e.attr_size_set || '',
    set_qty: e.set_qty || e.attr_set_qty || '',
    kids_size: e.kids_size || '',
    ...qtyFields,
    color_variants,
    notes: e.notes || '',
    sketch_data: e.sketch_data || '',
  } as ShoeEntry;
}

function localEntries(): ShoeEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem('kins_entries') ?? '[]') as Record<string, string>[];
    return raw.map(migrateEntry);
  } catch {
    return [];
  }
}

function writeLocal(entries: ShoeEntry[]) {
  try {
    window.localStorage.setItem('kins_entries', JSON.stringify(entries));
  } catch {
    // storage quota or access denied — silently ignore
  }
}

export async function saveEntry(entry: Omit<ShoeEntry, 'id' | 'created_at'>): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('shoe_categorizations').insert(entry);
    if (error) throw error;
    return;
  }
  const all = localEntries();
  const newEntry: ShoeEntry = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  writeLocal([newEntry, ...all]);
}

export async function fetchEntries(): Promise<ShoeEntry[]> {
  if (SUPABASE_CONFIGURED) {
    const { data } = await supabase
      .from('shoe_categorizations')
      .select('*')
      .order('created_at', { ascending: false });
    return (data as ShoeEntry[]) ?? [];
  }
  return localEntries();
}

export async function deleteEntry(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('shoe_categorizations').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocal(localEntries().filter((e) => e.id !== id));
}

export async function clearAllEntries(): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('shoe_categorizations').delete().not('id', 'is', null);
    if (error) throw error;
    return;
  }
  writeLocal([]);
}

export async function updateEntry(
  id: string,
  entry: Omit<ShoeEntry, 'id' | 'created_at'>
): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    await supabase.from('shoe_categorizations').update(entry).eq('id', id);
    return;
  }
  const all = localEntries().map((e) =>
    e.id === id ? { ...e, ...entry } : e
  );
  writeLocal(all);
}
