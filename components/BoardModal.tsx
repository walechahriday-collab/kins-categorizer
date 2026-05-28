'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, DEPT_SIZES, SEASONS,
  KIDS_SIZES, KIDS_SIZE_RANGES,
  ColorVariant, emptyVariant,
  ShoeEntry, emptyEntry,
} from '@/lib/categories';
import { saveEntry, updateEntry, uploadPhoto } from '@/lib/storage';
import type { SketchHandle } from './SketchCanvas';

type SR = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};
type SREvent = { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };

const SketchCanvas = dynamicImport(() => import('./SketchCanvas'), { ssr: false });

interface ColDef {
  key: string; label: string; width: number;
  type: 'photo' | 'select' | 'dynamic-select' | 'text' | 'calc' | 'variant-select' | 'variant-text' | 'variant-calc';
  options?: readonly string[];
  isShared?: boolean;
}

const SHARED_COLS: ColDef[] = [
  { key: 'picture',      label: 'Picture',     type: 'photo',          width: 100, isShared: true },
  { key: 'department',   label: 'Department',  type: 'select',         width: 155, options: DEPARTMENTS, isShared: true },
  { key: 'category',     label: 'Category',    type: 'dynamic-select', width: 155, isShared: true },
  { key: 'sub_category', label: 'SubCategory', type: 'select',         width: 125, options: SUB_CATEGORIES, isShared: true },
  { key: 'article_no',   label: 'ArticleNo',   type: 'text',           width: 115, isShared: true },
  { key: 'heels',        label: 'Heels',       type: 'dynamic-select', width: 140, isShared: true },
  { key: 'section',      label: 'Section',     type: 'dynamic-select', width: 110, isShared: true },
  { key: 'season',       label: 'Season',      type: 'select',         width: 95,  options: SEASONS, isShared: true },
  { key: 'pur_price',    label: 'Pur Price',   type: 'text',           width: 95,  isShared: true },
];

const VARIANT_ACCENT = [
  '#c41515', '#155ac4', '#159650', '#c86400', '#8215c4', '#008ca0',
];

interface Props {
  open: boolean; onClose: () => void; onSaved: () => void;
  initialEntry?: ShoeEntry | null;
}

export default function BoardModal({ open, onClose, onSaved, initialEntry }: Props) {
  const isEdit = !!initialEntry;
  const [entry, setEntry] = useState<Omit<ShoeEntry, 'id' | 'created_at'>>(emptyEntry());
  const [variants, setVariants] = useState<ColorVariant[]>([emptyVariant()]);
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchColor, setSketchColor] = useState('#c41515');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sketchRef = useRef<SketchHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [showFilled, setShowFilled] = useState(false);
  const recogRef = useRef<SR | null>(null);
  const manualStopRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SRAPIRef = useRef<any>(null);
  const fullTranscriptRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryRef = useRef(entry);
  useEffect(() => { entryRef.current = entry; }, [entry]);

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

  const variantsRef = useRef(variants);
  useEffect(() => { variantsRef.current = variants; }, [variants]);

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

  const sendToClaude = useCallback((transcript: string) => {
    const existingColors = variantsRef.current
      .map((v, i) => v.color ? `color ${i + 1}=${v.color}` : null)
      .filter(Boolean);
    fetch('/api/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        department: entryRef.current.department,
        existingColors: existingColors.length ? existingColors : undefined,
      }),
    })
      .then(r => r.json())
      .then(({ fields }) => {
        if (!fields || !Object.keys(fields).length) return;
        const sharedFields: Record<string, string> = {};
        const variantUpdates: Record<number, Record<string, string>> = {};
        for (const [key, value] of Object.entries(fields as Record<string, string>)) {
          const vm = key.match(/^v(\d+)_(.+)$/);
          if (vm) {
            const n = parseInt(vm[1]);
            if (!variantUpdates[n]) variantUpdates[n] = {};
            variantUpdates[n][vm[2]] = value;
          } else {
            sharedFields[key] = value;
          }
        }
        if (Object.keys(sharedFields).length) setEntry(prev => ({ ...prev, ...sharedFields }));
        if (Object.keys(variantUpdates).length) {
          setVariants(prev => {
            const next = [...prev];
            for (const [nStr, vf] of Object.entries(variantUpdates)) {
              const n = parseInt(nStr);
              while (next.length <= n) next.push(emptyVariant());
              next[n] = { ...next[n], ...vf };
            }
            return next.slice(0, 6);
          });
        }
        const labels = [...new Set(Object.keys(fields).map(k =>
          k.replace(/^v\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        ))];
        setFilledFields(labels);
        setShowFilled(true);
        setTimeout(() => setShowFilled(false), 4000);
      })
      .catch(() => {});
  }, []);

  const stopVoice = useCallback(() => {
    manualStopRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fullTranscriptRef.current = '';
    recogRef.current?.stop();
    setListening(false); setLiveText('');
  }, []);

  const startVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRAPI) { alert('Voice input requires Chrome or Edge.'); return; }
    SRAPIRef.current = SRAPI;
    manualStopRef.current = false;
    fullTranscriptRef.current = '';
    const makeRecog = () => {
      const recog: SR = new SRAPI();
      recog.continuous = true; recog.interimResults = true; recog.lang = 'en-IN';
      recog.onresult = (e: SREvent) => {
        let newFinal = '', interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) newFinal += e.results[i][0].transcript + ' ';
          else interim += e.results[i][0].transcript;
        }
        if (newFinal.trim()) fullTranscriptRef.current = (fullTranscriptRef.current + ' ' + newFinal).trim();
        setLiveText(interim || fullTranscriptRef.current);
        if (newFinal.trim()) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => sendToClaude(fullTranscriptRef.current), 1500);
        }
      };
      recog.onend = () => {
        if (!manualStopRef.current && SRAPIRef.current) {
          try { const r = makeRecog(); recogRef.current = r; r.start(); }
          catch { setListening(false); setLiveText(''); }
        } else { setListening(false); setLiveText(''); }
      };
      recog.onerror = () => {
        if (!manualStopRef.current) { try { recogRef.current?.stop(); } catch { /* ignore */ } }
        else { setListening(false); setLiveText(''); }
      };
      return recog;
    };
    const recog = makeRecog(); recogRef.current = recog; recog.start(); setListening(true);
  }, [sendToClaude]);

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
        setEntry(emptyEntry());
        setVariants([emptyVariant()]);
      }
      setSketchMode(false); setSaved(false);
      setNotesMode('text'); setNotesEraser(false);
      notesCanvasSized.current = false;
      notesHistory.current = [];
      pendingSketchData.current = initialEntry?.sketch_data || '';
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

  const setVariantField = useCallback((n: number, field: string, value: string) => {
    setVariants(prev => prev.map((v, i) => i === n ? { ...v, [field]: value } : v));
  }, []);

  const addVariant = useCallback(() => {
    setVariants(prev => prev.length < 6 ? [...prev, emptyVariant()] : prev);
  }, []);

  const removeVariant = useCallback((n: number) => {
    setVariants(prev => prev.length > 1 ? prev.filter((_, i) => i !== n) : prev);
  }, []);

  const activeSizes = useMemo(() => {
    if (entry.department === 'Kids Footwears')
      return entry.kids_size ? (KIDS_SIZE_RANGES[entry.kids_size] ?? []) : [];
    return entry.department ? (DEPT_SIZES[entry.department] ?? []) : [];
  }, [entry.department, entry.kids_size]);

  const isKids = entry.department === 'Kids Footwears';

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
      { key: 'size_set', label: 'Size Set', type: 'variant-text',   width: 105 },
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
  }, [activeSizes]);

  const allCols = useMemo(() => [...sharedCols, ...variantCols], [sharedCols, variantCols]);
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
      // fallback to local object URL on upload failure
      set('picture', URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let sketchData = '';
      if (notesCanvasSized.current && notesCanvasRef.current && notesHistory.current.length > 0) {
        sketchData = notesCanvasRef.current.toDataURL('image/png');
      } else if (sketchRef.current) {
        sketchData = await sketchRef.current.exportPaths();
      }
      const v0 = variants[0] || emptyVariant();
      const v0qty: Record<string, string> = {};
      for (let i = 15; i <= 47; i++) v0qty[`qty_${i}`] = (v0 as Record<string, string>)[`qty_${i}`] || '';
      const payload = {
        ...entry, color: v0.color, size_set: v0.size_set, set_qty: v0.set_qty,
        ...v0qty, color_variants: JSON.stringify(variants), sketch_data: sketchData,
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
      return (
        <div onClick={() => !sketchMode && fileInputRef.current?.click()}
          style={{ width: '100%', height: '100%', cursor: sketchMode ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: val ? 'transparent' : 'var(--bg)' }}>
          {val
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={val} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      const options = col.type === 'dynamic-select' ? getDynamicOptions(col.key) : (col.options ?? []);
      const isLocked = col.type === 'dynamic-select' && !entry.department;
      return (
        <select value={val} onChange={e => set(col.key, e.target.value)}
          disabled={sketchMode || isLocked}
          style={{ ...baseInput, cursor: (sketchMode || isLocked) ? 'default' : 'pointer', appearance: 'auto', opacity: isLocked ? 0.4 : 1 }}>
          <option value="">{isLocked ? '— pick dept —' : ''}</option>
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
          <option value=""></option>
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
              LADIES ARTICLE BOARD
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
            <button onClick={() => { setEntry(emptyEntry()); setVariants([emptyVariant()]); sketchRef.current?.clear(); }}
              className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.6rem' }}>RESET</button>
            <button onClick={listening ? stopVoice : startVoice}
              className="flex items-center gap-1.5 rounded-lg transition-all"
              style={{ padding: '6px 12px', fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 600,
                background: listening ? 'var(--red)' : 'rgba(196,21,21,0.08)',
                color: listening ? '#fff' : 'var(--red)',
                border: `1px solid ${listening ? 'var(--red)' : 'rgba(196,21,21,0.25)'}`,
                animation: listening ? 'pulse-mic 1.2s ease-in-out infinite' : 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" fill={listening ? '#fff' : 'var(--red)'}/>
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" stroke={listening ? '#fff' : 'var(--red)'} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {listening ? 'STOP' : 'VOICE'}
            </button>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Voice banner */}
        {listening && (
          <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2"
            style={{ background: 'rgba(196,21,21,0.06)', borderBottom: '1px solid rgba(196,21,21,0.15)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-mic 1s ease-in-out infinite', flexShrink: 0 }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: 'DM Mono, monospace', flex: 1, minWidth: 0 }}>
              {liveText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Listening…</span>}
            </p>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              e.g. "ladies sandal color 1 black set qty 8, color 2 red set qty 6"
            </p>
          </div>
        )}

        {/* Filled toast */}
        {showFilled && (
          <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2"
            style={{ background: 'rgba(30,150,80,0.08)', borderBottom: '1px solid rgba(30,150,80,0.2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5 9-9" stroke="rgb(30,150,80)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: '0.68rem', color: 'rgb(30,150,80)', fontFamily: 'DM Mono, monospace' }}>
              Filled: {filledFields.join(', ')}
            </p>
          </div>
        )}

        {/* Spreadsheet */}
        <div className="flex-shrink-0 relative" style={{ overflow: 'hidden', maxHeight: '52vh' }}>
          <SketchCanvas ref={sketchRef} active={sketchMode} color={sketchColor} strokeWidth={3} />
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '52vh', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--gold-faint2)', border: '1px solid var(--border)', width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, n) => {
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

          {/* Tab bar */}
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
          </div>

          {/* Content — fills all remaining space */}
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={entry.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Add notes about this item..."
              className="w-full h-full px-3 py-2.5 rounded-lg outline-none resize-none"
              style={{ display: notesMode === 'text' ? 'block' : 'none',
                background: 'var(--bg)', border: '1.5px solid var(--border-mid)',
                color: 'var(--text)', fontFamily: 'DM Mono, monospace', fontSize: '0.75rem',
                boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = 'var(--red)'; }}
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

          {/* Save row */}
          <div className="flex items-center justify-between gap-3 flex-shrink-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {entry.category
                ? <><span style={{ color: 'var(--red)', fontWeight: 700 }}>{entry.category}</span>
                    {entry.department ? ` · ${entry.department}` : ''}
                    {variants.length > 1 ? ` · ${variants.length} colors` : ''}</>
                : <span>Fill in the fields above and save</span>}
            </p>
            <button onClick={handleSave} disabled={saving} className="btn"
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
        </div>
      </div>
    </div>
  );
}
