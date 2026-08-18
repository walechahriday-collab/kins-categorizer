'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, DEPT_SIZES, SEASONS, LOGO_OPTIONS,
  KIDS_SIZES, KIDS_SIZE_RANGES, SUPPLIER_NAMES, SUPPLIER_CODES,
  DELIVERY_DATE_OPTIONS, getAllSupplierNames, addCustomSupplier,
  ColorVariant, emptyVariant,
  ShoeEntry, emptyEntry,
} from '@/lib/categories';
import { saveEntry, updateEntry, uploadPhoto, uploadVoiceNote } from '@/lib/storage';
import LabeledPhoto from './LabeledPhoto';
import type { SketchHandle } from './SketchCanvas';

const SketchCanvas = dynamicImport(() => import('./SketchCanvas'), { ssr: false });

interface ColDef {
  key: string; label: string; width: number;
  type: 'photo' | 'select' | 'dynamic-select' | 'text' | 'calc' | 'variant-select' | 'variant-text' | 'variant-calc';
  options?: readonly string[];
  isShared?: boolean;
}

const SHARED_COLS: ColDef[] = [
  { key: 'picture',      label: 'Picture',     type: 'photo',          width: 100, isShared: true },
  { key: 'department',    label: 'Department',     type: 'select',   width: 155, options: DEPARTMENTS,  isShared: true },
  { key: 'category',      label: 'Category',       type: 'dynamic-select', width: 155,                  isShared: true },
  { key: 'sub_category',  label: 'SubCategory',    type: 'select',   width: 125, options: SUB_CATEGORIES, isShared: true },
  { key: 'article_no',    label: 'ArticleNo',      type: 'text',     width: 115, isShared: true },
  { key: 'heels',         label: 'Heels',          type: 'dynamic-select', width: 140, isShared: true },
  { key: 'section',       label: 'Section',        type: 'dynamic-select', width: 110, isShared: true },
  { key: 'season',        label: 'Season',         type: 'select',   width: 95,  options: SEASONS, isShared: true },
  { key: 'pur_price',     label: 'Pur Price',      type: 'text',     width: 95,  isShared: true },
  { key: 'logo',          label: 'Logo',           type: 'select',   width: 150, options: LOGO_OPTIONS, isShared: true },
  { key: 'supplier_name', label: 'Supplier',       type: 'select',   width: 200, options: SUPPLIER_NAMES, isShared: true },
];

const TRAILING_COLS: ColDef[] = [
  { key: 'delivery_date', label: 'Delivery Date', type: 'select', width: 130, options: DELIVERY_DATE_OPTIONS, isShared: true },
];

const VARIANT_ACCENT = [
  '#c41515', '#155ac4', '#159650', '#c86400', '#8215c4', '#008ca0',
];

const ADD_NEW_SUPPLIER = '__add_new_supplier__';

interface Props {
  open: boolean; onClose: () => void; onSaved: () => void;
  initialEntry?: ShoeEntry | null;
  stickySupplier?: string;
}

export default function BoardModal({ open, onClose, onSaved, initialEntry, stickySupplier }: Props) {
  const isEdit = !!initialEntry;
  const [entry, setEntry] = useState<Omit<ShoeEntry, 'id' | 'created_at'>>(emptyEntry());
  const [variants, setVariants] = useState<ColorVariant[]>([emptyVariant()]);
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchColor, setSketchColor] = useState('#c41515');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sketchRef = useRef<SketchHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  // Voice memo (saved with entry)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const voiceMediaRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceBlobUrlRef = useRef<string>('');

  // Notes sketch state
  const [notesMode, setNotesMode] = useState<'text' | 'sketch'>('text');
  const [notesColor, setNotesColor] = useState('#c41515');
  const [notesEraser, setNotesEraser] = useState(false);
  const notesCanvasRef = useRef<HTMLCanvasElement>(null);
  const notesDrawing = useRef(false);
  const notesLast = useRef<{ x: number; y: number } | null>(null);
  const notesHistory = useRef<ImageData[]>([]);
  const notesCanvasSized = useRef(false);
  const pendingSketchData = useRef('');
  const originalSketchRef = useRef('');
  const originalSheetSketchRef = useRef('');

  const initNotesCanvas = useCallback(() => {
    const c = notesCanvasRef.current;
    if (!c || notesCanvasSized.current) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    notesCanvasSized.current = true;
    if (pendingSketchData.current) {
      const img = new Image();
      const cssW = r.width, cssH = r.height;
      img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
      img.src = pendingSketchData.current;
      pendingSketchData.current = '';
    }
  }, []);

  useEffect(() => {
    if (notesMode === 'sketch') setTimeout(initNotesCanvas, 50);
  }, [notesMode, initNotesCanvas]);

  const notesPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = notesCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const notesOnDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    notesDrawing.current = true;
    notesLast.current = notesPos(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const notesOnMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!notesDrawing.current || !notesLast.current) return;
    const c = notesCanvasRef.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const p = notesPos(e);
    ctx.save();
    if (notesEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 18;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = notesColor;
      ctx.lineWidth = 3;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(notesLast.current.x, notesLast.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    notesLast.current = p;
  };
  const notesOnUp = () => {
    if (notesDrawing.current) {
      const c = notesCanvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) notesHistory.current = [...notesHistory.current, ctx.getImageData(0, 0, c.width, c.height)];
      }
    }
    notesDrawing.current = false;
    notesLast.current = null;
  };
  const notesUndo = useCallback(() => {
    const c = notesCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const next = notesHistory.current.slice(0, -1);
    notesHistory.current = next;
    if (next.length > 0) ctx.putImageData(next[next.length - 1], 0, 0);
    else ctx.clearRect(0, 0, c.width, c.height);
  }, []);

  useEffect(() => {
    if (open) {
      if (initialEntry) {
        const { id: _id, created_at: _ca, ...rest } = initialEntry;
        setEntry(rest as Omit<ShoeEntry, 'id' | 'created_at'>);
        try {
          const parsed: ColorVariant[] = JSON.parse(initialEntry.color_variants || '[]');
          setVariants(parsed.length > 0 ? parsed : [emptyVariant()]);
        } catch {
          const v = emptyVariant();
          v.color = initialEntry.color || '';
          v.size_set = initialEntry.size_set || '';
          v.set_qty = initialEntry.set_qty || '';
          for (let i = 15; i <= 47; i++)
            (v as Record<string, string>)[`qty_${i}`] = (initialEntry as unknown as Record<string, string>)[`qty_${i}`] || '';
          setVariants([v]);
        }
      } else {
        const blank = emptyEntry();
        if (stickySupplier) blank.supplier_name = stickySupplier;
        setEntry(blank);
        setVariants([emptyVariant()]);
      }
      // Reset voice memo state
      voiceMediaRef.current?.stop(); voiceMediaRef.current = null;
      voiceAudioRef.current?.pause(); voiceAudioRef.current = null;
      if (voiceBlobUrlRef.current) { URL.revokeObjectURL(voiceBlobUrlRef.current); voiceBlobUrlRef.current = ''; }
      setVoiceBlob(null); setVoiceRecording(false); setVoicePlaying(false);
      setSketchMode(false); setSaved(false);
      setPhotoMenuOpen(false);
      setNotesMode('text'); setNotesEraser(false);
      notesCanvasSized.current = false;
      notesHistory.current = [];
      originalSketchRef.current = initialEntry?.sketch_data || '';
      pendingSketchData.current = initialEntry?.sketch_data || '';
      originalSheetSketchRef.current = initialEntry?.sheet_sketch_data || '';
      if (notesCanvasRef.current) {
        const ctx = notesCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, notesCanvasRef.current.width, notesCanvasRef.current.height);
      }
    }
  }, [open, initialEntry]);

  const set = useCallback((field: string, value: string) => {
    setEntry(prev => {
      const next = { ...prev, [field]: value } as Omit<ShoeEntry, 'id' | 'created_at'>;
      if (field === 'department') {
        next.category = ''; next.heels = '';
        next.section = value === 'Kids Footwears' ? 'MB' : '';
        next.kids_size = '';
      }
      return next;
    });
    if (field === 'department') {
      setVariants(prev => prev.map(v => {
        const c = { ...v };
        for (let i = 15; i <= 47; i++) (c as Record<string, string>)[`qty_${i}`] = '';
        return c;
      }));
    }
    if (field === 'kids_size') {
      setVariants(prev => prev.map(v => {
        const c = { ...v };
        for (let i = 15; i <= 42; i++) (c as Record<string, string>)[`qty_${i}`] = '';
        return c;
      }));
    }
  }, []);

  const activeSizes = useMemo(() => {
    if (entry.department === 'Kids Footwears')
      return entry.kids_size ? (KIDS_SIZE_RANGES[entry.kids_size] ?? []) : [];
    return entry.department ? (DEPT_SIZES[entry.department] ?? []) : [];
  }, [entry.department, entry.kids_size]);

  const isKids = entry.department === 'Kids Footwears';

  const computeSizeSet = useCallback((v: ColorVariant, sizes: number[]): string => {
    const sizesWithQty = sizes.filter(s => Number((v as unknown as Record<string, string>)[`qty_${s}`] || 0) > 0);
    if (sizesWithQty.length === 0) return '';
    const min = sizesWithQty[0];
    const max = sizesWithQty[sizesWithQty.length - 1];
    const range = sizes.filter(s => s >= min && s <= max);
    const qtys = range.map(s => (v as unknown as Record<string, string>)[`qty_${s}`] || '0').join('');
    return `${min}-${max}_${qtys}`;
  }, []);

  const SET_TYPE_A = { qty_36: '1', qty_37: '1', qty_38: '2', qty_39: '2', qty_40: '1', qty_41: '1' };
  const SET_TYPE_B = { qty_36: '1', qty_37: '1', qty_38: '1', qty_39: '1', qty_40: '1', qty_41: '1' };

  const setVariantField = useCallback((n: number, field: string, value: string) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== n) return v;
      let updated = { ...v, [field]: value };
      if (field === 'set_type') {
        if (value === 'A') updated = { ...updated, ...SET_TYPE_A };
        else if (value === 'B') updated = { ...updated, ...SET_TYPE_B };
      }
      if (field.startsWith('qty_') || field === 'set_type') {
        updated.size_set = computeSizeSet(updated, activeSizes);
      }
      return updated;
    }));
  }, [activeSizes, computeSizeSet]);

  const addVariant = useCallback(() => {
    setVariants(prev => prev.length < 6 ? [...prev, emptyVariant()] : prev);
  }, []);

  const removeVariant = useCallback((n: number) => {
    setVariants(prev => prev.length > 1 ? prev.filter((_, i) => i !== n) : prev);
  }, []);

  const sharedCols = useMemo((): ColDef[] => {
    const kidsSizeCol: ColDef[] = isKids ? [{ key: 'kids_size', label: 'Size', type: 'select', width: 80, options: KIDS_SIZES, isShared: true }] : [];
    return [...SHARED_COLS, ...kidsSizeCol];
  }, [isKids]);

  const variantCols = useMemo((): ColDef[] => {
    const sizeCols: ColDef[] = activeSizes.map(n => ({
      key: `qty_${n}`, label: String(n), type: 'variant-select' as const, width: 58, options: ['0','1','2','3'],
    }));
    const calcCols: ColDef[] = activeSizes.length > 0 ? [
      { key: 'total_qty', label: 'Total Qty', type: 'variant-calc' as const, width: 90 },
      { key: 'multiply',  label: 'Multiply',  type: 'variant-calc' as const, width: 90 },
    ] : [];
    const [totalQtyCol, multiplyCol] = calcCols.length === 2 ? calcCols : [calcCols[0], calcCols[1]];
    return [
      { key: 'color',    label: 'Color',    type: 'variant-select', width: 105, options: COLORS },
      ...(entry.department === 'Ladies Footwears' ? [{ key: 'set_type', label: 'Set Type', type: 'variant-select' as const, width: 85, options: ['A', 'B'] }] : []),
      { key: 'size_set', label: 'Size Set', type: 'variant-text',   width: 130 },
      ...sizeCols,
      ...(calcCols.length === 2 ? [
        totalQtyCol,
        { key: 'set_qty', label: 'Set Qty', type: 'variant-text' as const, width: 85 },
        multiplyCol,
      ] : [
        ...calcCols,
        { key: 'set_qty', label: 'Set Qty', type: 'variant-text' as const, width: 85 },
      ]),
    ];
  }, [activeSizes, entry.department]);

  const allCols = useMemo(() => [...sharedCols, ...variantCols, ...TRAILING_COLS], [sharedCols, variantCols]);
  const totalWidth = useMemo(() => allCols.reduce((s, c) => s + c.width, 0) + 36, [allCols]);

  const getDynamicOptions = useCallback((key: string): readonly string[] => {
    if (key === 'category') return entry.department ? (DEPT_CATEGORIES[entry.department] ?? []) : [];
    if (key === 'heels')    return entry.department ? (DEPT_HEELS[entry.department] ?? []) : [];
    if (key === 'section')  return entry.department ? (DEPT_SECTIONS[entry.department] ?? []) : [];
    return [];
  }, [entry.department]);

  const variantTotal = useCallback((v: ColorVariant) => {
    return activeSizes.reduce((sum, s) => {
      const val = Number((v as unknown as Record<string, string>)[`qty_${s}`] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [activeSizes]);

  const handlePhotoFile = async (file: File) => {
    try {
      const url = await uploadPhoto(file);
      set('picture', url);
    } catch {
      set('picture', URL.createObjectURL(file));
    }
  };

  const startVoiceMemo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(voiceChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setVoiceBlob(blob);
        setVoiceRecording(false);
      };
      mr.start();
      voiceMediaRef.current = mr;
      setVoiceRecording(true);
    } catch { alert('Microphone access denied.'); }
  };

  const stopVoiceMemo = () => {
    voiceMediaRef.current?.stop();
    voiceMediaRef.current = null;
    setVoiceRecording(false);
  };

  const toggleVoicePlay = () => {
    if (!voiceBlob) return;
    if (voicePlaying) {
      voiceAudioRef.current?.pause();
      setVoicePlaying(false);
      return;
    }
    if (voiceBlobUrlRef.current) URL.revokeObjectURL(voiceBlobUrlRef.current);
    const url = URL.createObjectURL(voiceBlob);
    voiceBlobUrlRef.current = url;
    voiceAudioRef.current = new Audio(url);
    voiceAudioRef.current.onended = () => setVoicePlaying(false);
    voiceAudioRef.current.play().catch(() => setVoicePlaying(false));
    setVoicePlaying(true);
  };

  const deleteVoiceMemo = () => {
    voiceAudioRef.current?.pause(); voiceAudioRef.current = null;
    if (voiceBlobUrlRef.current) { URL.revokeObjectURL(voiceBlobUrlRef.current); voiceBlobUrlRef.current = ''; }
    setVoiceBlob(null); setVoicePlaying(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let sketchData = '';
      if (notesCanvasSized.current && notesCanvasRef.current) {
        if (notesHistory.current.length > 0) {
          // User drew new strokes — export current canvas state
          sketchData = notesCanvasRef.current.toDataURL('image/png');
        } else {
          // Canvas was opened to view but no new strokes — preserve original
          sketchData = originalSketchRef.current;
        }
      } else {
        // User never opened the sketch tab — preserve original sketch unchanged
        sketchData = originalSketchRef.current;
      }
      // Spreadsheet-overlay sketch (TYPE/SKETCH toggle) — export only if the
      // user actually drew/cleared something this session, otherwise keep
      // whatever was already saved.
      const sheetSketchData = sketchRef.current?.hasChanges()
        ? await (sketchRef.current?.exportPaths() ?? Promise.resolve(''))
        : originalSheetSketchRef.current;
      // Upload voice memo if recorded in modal
      let voiceNoteUrl = (entry as unknown as Record<string, string>).voice_note_url || '';
      if (voiceBlob) {
        try { voiceNoteUrl = await uploadVoiceNote(voiceBlob, `modal-${Date.now()}`); }
        catch (e) { console.error('Voice memo upload failed:', e); }
      }
      const v0 = variants[0] || emptyVariant();
      const v0qty: Record<string, string> = {};
      for (let i = 15; i <= 47; i++) v0qty[`qty_${i}`] = (v0 as Record<string, string>)[`qty_${i}`] || '';
      const payload = {
        ...entry, color: v0.color, size_set: v0.size_set, set_qty: v0.set_qty,
        ...v0qty, color_variants: JSON.stringify(variants), sketch_data: sketchData,
        sheet_sketch_data: sheetSketchData,
        voice_note_url: voiceNoteUrl,
      };
      if (isEdit && initialEntry?.id) await updateEntry(initialEntry.id, payload);
      else await saveEntry(payload);
      setSaved(true);
      setTimeout(() => {
        setSaved(false); setEntry(emptyEntry()); setVariants([emptyVariant()]);
        sketchRef.current?.clear(); onSaved(); onClose();
      }, 1000);
    } catch (err) { console.error('Save failed:', err); }
    finally { setSaving(false); }
  };

  const ROW_H = 90;

  const renderSharedCell = (col: ColDef): React.ReactNode => {
    const baseInput: React.CSSProperties = {
      width: '100%', height: '100%', padding: '6px 8px', border: 'none', outline: 'none',
      background: 'transparent', fontSize: '0.72rem', color: 'var(--text)',
      fontFamily: 'DM Mono, monospace', letterSpacing: '0.02em', boxSizing: 'border-box',
    };
    if (col.type === 'photo') {
      const val = entry.picture || '';
      const supplierCode = entry.supplier_name ? SUPPLIER_CODES[entry.supplier_name.trim()] : undefined;
      const imageLabel = supplierCode && entry.article_no
        ? `${supplierCode}-${entry.article_no}`
        : supplierCode || (entry.article_no || '');
      return (
        <div onClick={() => !sketchMode && setPhotoMenuOpen(true)}
          style={{ width: '100%', height: '100%', cursor: sketchMode ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            position: 'relative', background: val ? 'transparent' : 'var(--bg)' }}>
          {val
            ? (val && imageLabel
                ? <LabeledPhoto src={val} label={imageLabel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : // eslint-disable-next-line @next/next/no-img-element
                  <img src={val} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
            : <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 4px', display: 'block' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="var(--red)" strokeWidth="1.5"/>
                </svg>
                <p style={{ fontSize: '0.48rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ADD PHOTO</p>
              </div>}
        </div>
      );
    }
    if (col.type === 'select' || col.type === 'dynamic-select') {
      const val = ((entry as unknown) as Record<string, string>)[col.key] ?? '';
      const isSupplier = col.key === 'supplier_name';
      const options = col.type === 'dynamic-select'
        ? getDynamicOptions(col.key)
        : isSupplier ? getAllSupplierNames() : (col.options ?? []);
      const isLocked = col.type === 'dynamic-select' && !entry.department;
      return (
        <select value={val} onChange={e => {
            const v = e.target.value;
            if (isSupplier && v === ADD_NEW_SUPPLIER) {
              const name = window.prompt('New supplier name:')?.trim();
              if (name) { addCustomSupplier(name); set(col.key, name); }
              return;
            }
            set(col.key, v);
          }}
          disabled={sketchMode || isLocked}
          style={{ ...baseInput, cursor: (sketchMode || isLocked) ? 'default' : 'pointer', appearance: 'auto', opacity: isLocked ? 0.4 : 1 }}>
          <option value="">{isLocked ? '— pick dept —' : '[None]'}</option>
          {isSupplier && <option value={ADD_NEW_SUPPLIER}>+ Add new supplier…</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    const val = ((entry as unknown) as Record<string, string>)[col.key] ?? '';
    return <input type="text" value={val} onChange={e => set(col.key, e.target.value)} disabled={sketchMode} style={baseInput} />;
  };

  const renderVariantCell = (col: ColDef, n: number, accent: string): React.ReactNode => {
    const baseInput: React.CSSProperties = {
      width: '100%', height: '100%', padding: '6px 8px', border: 'none', outline: 'none',
      background: 'transparent', fontSize: '0.72rem', color: 'var(--text)',
      fontFamily: 'DM Mono, monospace', letterSpacing: '0.02em', boxSizing: 'border-box',
    };
    const v = variants[n] || emptyVariant();
    const vMap = v as unknown as Record<string, string>;

    if (col.type === 'variant-calc') {
      const tot = variantTotal(v);
      const calcVal = col.key === 'total_qty' ? tot : tot * (Number(v.set_qty || 0) || 0);
      return (
        <div style={{ ...baseInput, display: 'flex', alignItems: 'center',
          background: `${accent}14`, color: accent, fontWeight: 700, fontSize: '0.8rem', userSelect: 'none' }}>
          {calcVal > 0 ? calcVal : '—'}
        </div>
      );
    }
    if (col.type === 'variant-select') {
      const val = vMap[col.key] || '';
      return (
        <select value={val} onChange={e => setVariantField(n, col.key, e.target.value)}
          disabled={sketchMode}
          style={{ ...baseInput, cursor: sketchMode ? 'default' : 'pointer', appearance: 'auto',
            background: val ? `${accent}0d` : 'transparent' }}>
          <option value="">[None]</option>
          {(col.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    // variant-text
    const val = vMap[col.key] || '';
    return <input type="text" value={val} onChange={e => setVariantField(n, col.key, e.target.value)} disabled={sketchMode} style={baseInput} />;
  };

  if (!open) return null;
  const displayTitle = initialEntry?.category || initialEntry?.department || '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(26,19,16,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }} />

      <div className="slide-up w-full flex flex-col"
        style={{ background: 'var(--bg-modal)', borderTop: '2px solid var(--border-mid)',
          borderRadius: '16px 16px 0 0', height: '100vh', boxShadow: '0 -8px 40px rgba(26,19,16,0.18)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-display text-xl italic font-bold" style={{ color: 'var(--red)', lineHeight: 1 }}>
              {isEdit ? `Edit — ${displayTitle}` : `Kin's`}
            </p>
            <p className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
              KINS ARTICLE BOARD
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-mid)' }}>
              {(['TYPE', 'SKETCH'] as const).map(mode => {
                const isActive = (mode === 'SKETCH') === sketchMode;
                return (
                  <button key={mode} onClick={() => setSketchMode(mode === 'SKETCH')}
                    className="px-3 py-1.5 tracking-widest transition-all flex items-center gap-1"
                    style={{ background: isActive ? 'var(--red)' : '#fff', color: isActive ? '#fff' : 'var(--text-mid)',
                      borderRight: mode === 'TYPE' ? '1px solid var(--border-mid)' : 'none', fontSize: '0.62rem' }}>
                    {mode === 'TYPE'
                      ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h10M4 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>TYPE</>
                      : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>SKETCH</>}
                  </button>
                );
              })}
            </div>
            {sketchMode && (
              <div className="flex gap-1">
                {['#c41515','#1a6ac4','#1a8a3c','#1a1310'].map(c => (
                  <button key={c} onClick={() => setSketchColor(c)} className="rounded-full transition-transform hover:scale-110"
                    style={{ width: 18, height: 18, background: c, border: sketchColor === c ? '2.5px solid var(--text)' : '2px solid transparent' }} />
                ))}
              </div>
            )}
            {sketchMode && (
              <button onClick={() => sketchRef.current?.clear()}
                className="flex items-center gap-1 rounded-lg transition-colors"
                style={{ padding: '5px 10px', fontSize: '0.6rem', fontWeight: 600,
                  background: 'rgba(26,19,16,0.06)', color: 'var(--text-mid)',
                  border: '1px solid var(--border-mid)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M20 20H7L3 16l10-10 7 7-1.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m6.5 17.5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                CLEAR SKETCH
              </button>
            )}
            <button onClick={() => { setEntry(emptyEntry()); setVariants([emptyVariant()]); sketchRef.current?.clear(); }}
              className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.6rem' }}>RESET</button>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Spreadsheet */}
        <div className="flex-shrink-0 relative" style={{ overflow: 'hidden', maxHeight: '52vh' }}>
          <SketchCanvas ref={sketchRef} active={sketchMode} color={sketchColor} strokeWidth={3}
            initialData={initialEntry?.sheet_sketch_data || ''} />
          <div
            style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '52vh', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <table style={{ minWidth: totalWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <colgroup>
                {allCols.map(col => <col key={col.key} style={{ width: col.width }} />)}
                <col style={{ width: 36 }} />
              </colgroup>
              <thead>
                <tr>
                  {sharedCols.map(col => (
                    <th key={col.key} style={{
                      position: 'sticky', top: 0, zIndex: 10, padding: '7px 6px', textAlign: 'left',
                      background: 'var(--gold-faint2)', color: 'var(--gold)', border: '1px solid var(--border)',
                      fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.07em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: 'DM Mono, monospace',
                    }}>{col.label}</th>
                  ))}
                  {variantCols.map(col => (
                    <th key={col.key} style={{
                      position: 'sticky', top: 0, zIndex: 10, padding: '7px 6px', textAlign: 'left',
                      background: 'rgba(196,21,21,0.07)', color: 'var(--red)', border: '1px solid var(--border)',
                      fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.07em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: 'DM Mono, monospace',
                    }}>{col.label}</th>
                  ))}
                  {TRAILING_COLS.map(col => (
                    <th key={col.key} style={{
                      position: 'sticky', top: 0, zIndex: 10, padding: '7px 6px', textAlign: 'left',
                      background: 'var(--gold-faint2)', color: 'var(--gold)', border: '1px solid var(--border)',
                      fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.07em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: 'DM Mono, monospace',
                    }}>{col.label}</th>
                  ))}
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--gold-faint2)', border: '1px solid var(--border)', width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {variants.map((_, n) => {
                  const accent = VARIANT_ACCENT[n % VARIANT_ACCENT.length];
                  return (
                    <tr key={n} style={{ borderLeft: `3px solid ${accent}` }}>
                      {/* Shared cells — only in row 0, rowSpan covers all variant rows */}
                      {n === 0 && sharedCols.map(col => (
                        <td key={col.key} rowSpan={variants.length}
                          style={{ height: ROW_H * variants.length, padding: 0,
                            border: '1px solid var(--border)', background: '#ffffff',
                            verticalAlign: 'top', position: 'relative' }}
                          onFocus={e => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--red)'; (e.currentTarget as HTMLElement).style.outlineOffset = '-2px'; }}
                          onBlur={e => { (e.currentTarget as HTMLElement).style.outline = ''; }}>
                          {renderSharedCell(col)}
                        </td>
                      ))}

                      {/* Variant cells */}
                      {variantCols.map(col => (
                        <td key={col.key}
                          style={{ height: ROW_H, padding: 0,
                            border: '1px solid var(--border)',
                            background: col.type === 'variant-calc' ? `${accent}0d` : '#ffffff',
                            verticalAlign: 'middle', position: 'relative' }}
                          onFocus={e => { (e.currentTarget as HTMLElement).style.outline = `2px solid ${accent}`; (e.currentTarget as HTMLElement).style.outlineOffset = '-2px'; }}
                          onBlur={e => { (e.currentTarget as HTMLElement).style.outline = ''; }}>
                          {renderVariantCell(col, n, accent)}
                        </td>
                      ))}

                      {/* Trailing shared cells — only in row 0, rowSpan covers all variant rows */}
                      {n === 0 && TRAILING_COLS.map(col => (
                        <td key={col.key} rowSpan={variants.length}
                          style={{ height: ROW_H * variants.length, padding: 0,
                            border: '1px solid var(--border)', background: '#ffffff',
                            verticalAlign: 'top', position: 'relative' }}
                          onFocus={e => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--red)'; (e.currentTarget as HTMLElement).style.outlineOffset = '-2px'; }}
                          onBlur={e => { (e.currentTarget as HTMLElement).style.outline = ''; }}>
                          {renderSharedCell(col)}
                        </td>
                      ))}

                      {/* Row actions */}
                      <td style={{ height: ROW_H, width: 36, padding: 0, border: '1px solid var(--border)',
                        background: variants.length > 1 ? `${accent}08` : '#ffffff',
                        verticalAlign: 'middle', textAlign: 'center' }}>
                        {variants.length > 1 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeVariant(n); }}
                            title={`Remove Color ${n + 1}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: '100%', height: ROW_H, padding: 0,
                              background: 'none', border: 'none', cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>C1</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Add Color row */}
                {variants.length < 6 && (
                  <tr>
                    <td colSpan={allCols.length + 1}
                      style={{ height: 40, border: '1px dashed var(--border-mid)', background: 'rgba(30,150,80,0.03)', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button onClick={addVariant}
                        style={{ fontSize: '0.65rem', color: 'rgb(30,150,80)', fontWeight: 700,
                          background: 'none', border: '1px dashed rgba(30,150,80,0.4)',
                          borderRadius: 6, padding: '4px 16px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                        + ADD COLOR {variants.length + 1}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes + Sketch + Save */}
        <div className="px-5 pt-3 pb-4 flex-1 min-h-0 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>

          {/* Tab bar + Save button */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-mid)' }}>
              {(['text', 'sketch'] as const).map(m => (
                <button key={m} onClick={() => setNotesMode(m)}
                  className="px-3 py-1.5 tracking-widest transition-all"
                  style={{ fontSize: '0.6rem', fontWeight: 600,
                    background: notesMode === m ? 'var(--red)' : '#fff',
                    color: notesMode === m ? '#fff' : 'var(--text-mid)',
                    borderRight: m === 'text' ? '1px solid var(--border-mid)' : 'none' }}>
                  {m === 'text' ? 'NOTES' : 'SKETCH'}
                </button>
              ))}
            </div>

            {isEdit && notesMode === 'text' && (
              <div className="flex items-center gap-1" style={{ padding: '4px 8px', borderRadius: 6,
                background: 'rgba(196,21,21,0.06)', border: '1px solid rgba(196,21,21,0.2)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--red)" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--red)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '0.58rem', color: 'var(--red)', fontWeight: 600, letterSpacing: '0.08em' }}>LOCKED</span>
              </div>
            )}

            {notesMode === 'sketch' && (
              <>
                <button onClick={notesUndo}
                  className="flex items-center gap-1 rounded-lg transition-colors"
                  style={{ padding: '5px 10px', fontSize: '0.6rem', fontWeight: 600,
                    background: 'rgba(26,19,16,0.06)', color: 'var(--text-mid)',
                    border: '1px solid var(--border-mid)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M3 7v6h6M3 13C4.67 8.94 8.5 6 13 6c5.52 0 10 4.48 10 10s-4.48 10-10 10a10 10 0 0 1-9.95-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  UNDO
                </button>
                <button onClick={() => setNotesEraser(p => !p)}
                  className="flex items-center gap-1 rounded-lg transition-colors"
                  style={{ padding: '5px 10px', fontSize: '0.6rem', fontWeight: 600,
                    background: notesEraser ? 'var(--text-mid)' : 'rgba(26,19,16,0.06)',
                    color: notesEraser ? '#fff' : 'var(--text-mid)',
                    border: '1px solid var(--border-mid)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M20 20H7L3 16l10-10 7 7-1.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="m6.5 17.5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  ERASER
                </button>
                <div className="flex gap-1.5 items-center">
                  {(['#c41515','#1a6ac4','#1a8a3c','#1a1310'] as const).map(c => (
                    <button key={c} onClick={() => { setNotesColor(c); setNotesEraser(false); }}
                      className="rounded-full transition-transform hover:scale-110"
                      style={{ width: 18, height: 18, background: c, flexShrink: 0,
                        border: notesColor === c && !notesEraser ? '2.5px solid var(--text)' : '2px solid transparent' }} />
                  ))}
                </div>
              </>
            )}

            {/* Save button — beside tabs */}
            <button onClick={handleSave} disabled={saving} className="btn ml-auto"
              style={{ background: saved ? 'rgba(30,150,80,0.12)' : 'var(--red)',
                color: saved ? 'rgb(30,150,80)' : '#fff',
                border: saved ? '1px solid rgba(30,150,80,0.3)' : 'none',
                padding: '10px 24px', fontSize: '0.7rem', letterSpacing: '0.12em',
                minWidth: 140, justifyContent: 'center', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>SAVING…</>
                : saved
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>SAVED!</>
                : isEdit ? 'UPDATE ENTRY' : 'SAVE ENTRY'}
            </button>
          </div>

          {/* Content — fills all remaining space */}
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={entry.notes} onChange={e => !isEdit && set('notes', e.target.value)}
              readOnly={isEdit}
              placeholder={isEdit ? '' : 'Add notes about this item...'}
              className="w-full h-full px-3 py-2.5 rounded-lg outline-none resize-none"
              style={{ display: notesMode === 'text' ? 'block' : 'none',
                background: isEdit ? 'var(--bg-card)' : 'var(--bg)',
                border: '1.5px solid var(--border-mid)',
                color: 'var(--text)', fontFamily: 'DM Mono, monospace', fontSize: '0.75rem',
                boxSizing: 'border-box', cursor: isEdit ? 'default' : undefined }}
              onFocus={e => { if (!isEdit) e.target.style.borderColor = 'var(--red)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-mid)'; }} />
            <canvas ref={notesCanvasRef}
              style={{ display: notesMode === 'sketch' ? 'block' : 'none',
                width: '100%', height: '100%',
                cursor: notesEraser ? 'cell' : 'crosshair',
                touchAction: 'none',
                background: 'white', borderRadius: 8,
                border: '1.5px solid var(--border-mid)', boxSizing: 'border-box' }}
              onPointerDown={notesOnDown} onPointerMove={notesOnMove}
              onPointerUp={notesOnUp} onPointerLeave={notesOnUp} />
          </div>

          {/* Voice Memo strip */}
          {notesMode === 'text' && (
            <div className="flex items-center gap-2 flex-shrink-0" style={{ padding: '4px 2px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em', flexShrink: 0 }}>
                VOICE MEMO
              </span>
              {voiceBlob ? (
                <>
                  <span style={{ fontSize: '0.58rem', color: '#1a8a3c', fontWeight: 700, letterSpacing: '0.04em' }}>
                    ● READY
                  </span>
                  <button
                    onClick={toggleVoicePlay}
                    title={voicePlaying ? 'Stop preview' : 'Preview recording'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer',
                      background: voicePlaying ? 'rgba(196,21,21,0.1)' : 'rgba(26,138,60,0.1)',
                      color: voicePlaying ? 'var(--red)' : '#1a8a3c' }}
                  >
                    {voicePlaying
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>}
                  </button>
                  <button
                    onClick={deleteVoiceMemo}
                    title="Remove recording"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer',
                      background: 'rgba(196,21,21,0.06)', color: 'var(--red)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                  <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>saves with entry</span>
                </>
              ) : voiceRecording ? (
                <>
                  <button
                    onClick={stopVoiceMemo}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 5,
                      border: '1px solid rgba(196,21,21,0.4)', cursor: 'pointer',
                      background: 'rgba(196,21,21,0.08)', color: 'var(--red)',
                      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    STOP
                  </button>
                  <span style={{ fontSize: '0.58rem', color: 'var(--red)', letterSpacing: '0.06em',
                    animation: 'pulse 1s infinite' }}>● REC</span>
                </>
              ) : (
                <button
                  onClick={startVoiceMemo}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 5,
                    border: '1px solid var(--border-mid)', cursor: 'pointer',
                    background: 'var(--gold-faint2)', color: 'var(--gold)',
                    fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.06em' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/>
                  </svg>
                  RECORD
                </button>
              )}
            </div>
          )}

          {/* Entry summary */}
          <div className="flex-shrink-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {entry.category
                ? <><span style={{ color: 'var(--red)', fontWeight: 700 }}>{entry.category}</span>
                    {entry.department ? ` · ${entry.department}` : ''}
                    {variants.length > 1 ? ` · ${variants.length} colors` : ''}</>
                : <span>Fill in the fields above and save</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Photo source choice — Camera vs Gallery */}
      {photoMenuOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 1000, background: 'rgba(26,19,16,0.4)' }}
          onClick={() => setPhotoMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', width: 220,
              boxShadow: '0 8px 32px rgba(26,19,16,0.2)' }}>
            <button onClick={() => { setPhotoMenuOpen(false); cameraInputRef.current?.click(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 16px',
                fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="var(--red)" strokeWidth="1.5"/></svg>
              TAKE PHOTO
            </button>
            <button onClick={() => { setPhotoMenuOpen(false); fileInputRef.current?.click(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 16px',
                fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', background: 'none', border: 'none',
                cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--gold)" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke="var(--gold)" strokeWidth="1.5"/><path d="m21 15-5-5L5 21" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              CHOOSE FROM GALLERY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
