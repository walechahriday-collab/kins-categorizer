import { supabase } from './supabase';
import { ShoeEntry, OrderPlan, OrderPlanDetail } from './categories';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_CONFIGURED =
  !!SUPABASE_URL && SUPABASE_URL !== 'https://placeholder.supabase.co';

async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadPhoto(file: File): Promise<string> {
  if (!SUPABASE_CONFIGURED) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string ?? '');
      reader.readAsDataURL(file);
    });
  }
  const compressed = await compressImage(file);
  const ext = compressed.type.includes('png') ? 'png' : compressed.type.includes('webp') ? 'webp' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('photos').upload(path, compressed, {
    contentType: compressed.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
  return publicUrl;
}

export async function uploadVoiceNote(blob: Blob, entryId: string): Promise<string> {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const path = `voice/${entryId}-${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: blob.type,
    upsert: true,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
  return publicUrl;
}

export async function saveVoiceNoteUrl(entryId: string, url: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase.from('shoe_categorizations').update({ voice_note_url: url }).eq('id', entryId);
}

export async function removeVoiceNote(entryId: string, url: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const path = photoPathFromUrl(url);
  if (path) await supabase.storage.from('photos').remove([path]);
  await supabase.from('shoe_categorizations').update({ voice_note_url: '' }).eq('id', entryId);
}

function migrateEntry(e: Record<string, string>): ShoeEntry {
  const qtyFields: Record<string, string> = {};
  for (let i = 15; i <= 47; i++) {
    qtyFields[`qty_${i}`] = e[`qty_${i}`] || '';
  }

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
    voice_note_url: e.voice_note_url || '',
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
    logo: e.logo || '',
    supplier_name: e.supplier_name || '',
    delivery_date: e.delivery_date || '',
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

export async function saveEntry(entry: Omit<ShoeEntry, 'id' | 'created_at' | 'deleted_at'>): Promise<void> {
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    return (data as ShoeEntry[]) ?? [];
  }
  return localEntries();
}

export async function fetchTrashedEntries(): Promise<ShoeEntry[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('shoe_categorizations')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', fifteenDaysAgo)
    .order('deleted_at', { ascending: false });
  return (data as ShoeEntry[]) ?? [];
}

export async function restoreEntry(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase.from('shoe_categorizations').update({ deleted_at: null }).eq('id', id);
}

function photoPathFromUrl(url: string): string | null {
  const marker = '/object/public/photos/';
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}

export async function deleteEntry(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    // Soft delete — moves to trash for 15 days
    const { error } = await supabase
      .from('shoe_categorizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocal(localEntries().filter((e) => e.id !== id));
}

export async function permanentlyDeleteEntry(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const { data } = await supabase
    .from('shoe_categorizations')
    .select('picture, voice_note_url')
    .eq('id', id)
    .single();
  const { error } = await supabase.from('shoe_categorizations').delete().eq('id', id);
  if (error) throw error;
  if (data?.picture) {
    const path = photoPathFromUrl(data.picture);
    if (path) await supabase.storage.from('photos').remove([path]);
  }
  if (data?.voice_note_url) {
    const path = photoPathFromUrl(data.voice_note_url);
    if (path) await supabase.storage.from('photos').remove([path]);
  }
}

export async function purgeOldTrash(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('shoe_categorizations')
    .select('id, picture, voice_note_url')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', fifteenDaysAgo);

  if (!data || data.length === 0) return;

  const photoPaths = data
    .map((e: { picture: string }) => e.picture ? photoPathFromUrl(e.picture) : null)
    .filter((p): p is string => !!p);
  const voicePaths = data
    .map((e: { voice_note_url: string }) => e.voice_note_url ? photoPathFromUrl(e.voice_note_url) : null)
    .filter((p): p is string => !!p);

  if (photoPaths.length) await supabase.storage.from('photos').remove(photoPaths);
  if (voicePaths.length) await supabase.storage.from('photos').remove(voicePaths);

  const ids = data.map((e: { id: string }) => e.id);
  await supabase.from('shoe_categorizations').delete().in('id', ids);
}

export async function clearAllEntries(): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    // Soft-delete all active entries so they go to trash for 15 days
    const { error } = await supabase
      .from('shoe_categorizations')
      .update({ deleted_at: new Date().toISOString() })
      .is('deleted_at', null);
    if (error) throw error;
    return;
  }
  writeLocal([]);
}

export async function updateEntry(
  id: string,
  entry: Omit<ShoeEntry, 'id' | 'created_at' | 'deleted_at'>
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

// ─── Order planning ───────────────────────────────────────────────────────────

export type OrderProgress = { department: string; category: string; ordered_qty: number };
export type DeptSubcategoryTotal = { department: string; sub_category: string; ordered_qty: number };
export type OrderProgressDetail = { department: string; category: string; sub_category: string; heels: string; ordered_qty: number };

export async function fetchOrderPlans(): Promise<OrderPlan[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.from('order_plans').select('*');
  if (error) throw error;
  return (data as OrderPlan[]) ?? [];
}

export async function fetchOrderProgress(): Promise<OrderProgress[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.rpc('get_order_progress');
  if (error) throw error;
  return (data as OrderProgress[]) ?? [];
}

export async function fetchDeptSubcategoryTotals(): Promise<DeptSubcategoryTotal[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.rpc('get_department_subcategory_totals');
  if (error) throw error;
  return (data as DeptSubcategoryTotal[]) ?? [];
}

export async function fetchOrderPlanDetails(): Promise<OrderPlanDetail[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.from('order_plan_details').select('*');
  if (error) throw error;
  return (data as OrderPlanDetail[]) ?? [];
}

export async function fetchOrderProgressDetail(): Promise<OrderProgressDetail[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.rpc('get_order_progress_detail');
  if (error) throw error;
  return (data as OrderProgressDetail[]) ?? [];
}

export async function upsertPlannedQty(department: string, category: string, plannedQty: number): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase
    .from('order_plans')
    .upsert({ department, category, planned_qty: plannedQty }, { onConflict: 'department,category' });
}

export async function setPeriodStart(department: string, category: string, periodStart: string | null): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase
    .from('order_plans')
    .upsert(
      { department, category, period_start: periodStart },
      { onConflict: 'department,category', ignoreDuplicates: false }
    );
}

export async function resetOrderPlan(department: string, category: string): Promise<void> {
  await setPeriodStart(department, category, new Date().toISOString());
}

export async function resetAllOrderPlans(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase
    .from('order_plans')
    .update({ period_start: new Date().toISOString() })
    .not('id', 'is', null);
}
