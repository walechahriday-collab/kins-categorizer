'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import dynamicImport from 'next/dynamic';
import {
  DEPARTMENTS, DEPT_CATEGORIES, SUB_CATEGORIES, COLORS,
  DEPT_HEELS, DEPT_SECTIONS, SEASONS,
  ShoeEntry, emptyEntry,
} from '@/lib/categories';
import { saveEntry, updateEntry } from '@/lib/storage';
import type { SketchHandle } from './SketchCanvas';

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onend:    (() => void) | null;
  onerror:  (() => void) | null;
  start: () => void;
  stop:  () => void;
};
type SREvent = {
  resultIndex: number;
  results: { isFinal: boolean; 0: { transcript: string } }[];
};

const SketchCanvas = dynamicImport(() => import('./SketchCanvas'), { ssr: false });

interface ColDef {
  key: string;
  label: string;
  width: number;
  type: 'photo' | 'select' | 'text' | 'dynamic-select';
  options?: readonly string[];
}

const COLUMNS: ColDef[] = [
  { key: 'picture',      label: 'Picture',     type: 'photo',          width: 110 },
  { key: 'department',   label: 'Department',  type: 'select',         width: 160, options: DEPARTMENTS },
  { key: 'category',     label: 'Category',    type: 'dynamic-select', width: 160 },
  { key: 'sub_category', label: 'SubCategory', type: 'select',         width: 130, options: SUB_CATEGORIES },
  { key: 'article_no',   label: 'ArticleNo',   type: 'text',           width: 120 },
  { key: 'heels',        label: 'Heels',       type: 'dynamic-select', width: 150 },
  { key: 'color',        label: 'Color',       type: 'select',         width: 110, options: COLORS },
  { key: 'section',      label: 'Section',     type: 'dynamic-select', width: 120 },
  { key: 'season',       label: 'Season',      type: 'select',         width: 100, options: SEASONS },
  { key: 'set_qty',      label: 'Set Qty',     type: 'text',           width: 90  },
  { key: 'size_set',     label: 'Size Set',    type: 'text',           width: 110 },
  { key: 'pur_price',    label: 'Pur Price',   type: 'text',           width: 100 },
];

const TOTAL_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialEntry?: ShoeEntry | null;
}

export default function BoardModal({ open, onClose, onSaved, initialEntry }: Props) {
  const isEdit = !!initialEntry;
  const [entry, setEntry] = useState<Omit<ShoeEntry, 'id' | 'created_at'>>(emptyEntry());
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchColor, setSketchColor] = useState('#c41515');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sketchRef = useRef<SketchHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Voice ── */
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [showFilled, setShowFilled] = useState(false);
  const recogRef = useRef<SR | null>(null);

  const stopVoice = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
    setLiveText('');
  }, []);

  const startVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRAPI) {
      alert('Voice input requires Chrome or Edge. Safari is not supported.');
      return;
    }
    const recog: SR = new SRAPI();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-IN';

    recog.onresult = (e: SREvent) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setLiveText(interim || finalText.trim());

      if (finalText.trim()) {
        fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: finalText }),
        })
          .then(r => r.json())
          .then(({ fields }) => {
            if (fields && Object.keys(fields).length > 0) {
              setEntry(prev => ({ ...prev, ...fields }));
              const labels = Object.keys(fields).map(k =>
                k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              );
              setFilledFields(labels);
              setShowFilled(true);
              setTimeout(() => setShowFilled(false), 3000);
            }
          })
          .catch(() => {});
      }
    };

    recog.onend = () => { setListening(false); setLiveText(''); };
    recog.onerror = () => { setListening(false); setLiveText(''); };

    recogRef.current = recog;
    recog.start();
    setListening(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (initialEntry) {
        const { id: _id, created_at: _ca, ...rest } = initialEntry;
        setEntry(rest as Omit<ShoeEntry, 'id' | 'created_at'>);
      } else {
        setEntry(emptyEntry());
      }
      setSketchMode(false);
      setSaved(false);
    }
  }, [open, initialEntry]);

  const set = useCallback((field: string, value: string) => {
    setEntry(prev => {
      const next = { ...prev, [field]: value } as Omit<ShoeEntry, 'id' | 'created_at'>;
      if (field === 'department') {
        next.category = '';
        next.heels = '';
        next.section = '';
      }
      return next;
    });
  }, []);

  const getDynamicOptions = useCallback((key: string): readonly string[] => {
    if (key === 'category') return entry.department ? (DEPT_CATEGORIES[entry.department] ?? []) : [];
    if (key === 'heels')    return entry.department ? (DEPT_HEELS[entry.department] ?? []) : [];
    if (key === 'section')  return entry.department ? (DEPT_SECTIONS[entry.department] ?? []) : [];
    return [];
  }, [entry.department]);

  const handlePhotoFile = (file: File) => {
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = (e) => set('picture', e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      set('picture', URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sketchData = sketchRef.current ? await sketchRef.current.exportPaths() : '';
      const payload = { ...entry, sketch_data: sketchData };
      if (isEdit && initialEntry?.id) {
        await updateEntry(initialEntry.id, payload);
      } else {
        await saveEntry(payload);
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setEntry(emptyEntry());
        sketchRef.current?.clear();
        onSaved();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (col: ColDef): React.ReactNode => {
    const val = ((entry as unknown) as Record<string, string>)[col.key] ?? '';

    const baseInput: React.CSSProperties = {
      width: '100%',
      height: '100%',
      minHeight: 120,
      padding: '6px 8px',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: '0.72rem',
      color: 'var(--text)',
      fontFamily: 'DM Mono, monospace',
      letterSpacing: '0.02em',
      boxSizing: 'border-box',
    };

    if (col.type === 'photo') {
      return (
        <div
          onClick={() => !sketchMode && fileInputRef.current?.click()}
          style={{
            width: '100%',
            height: 120,
            cursor: sketchMode ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: val ? 'transparent' : 'var(--bg)',
          }}
        >
          {val ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={val} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', pointerEvents: 'none', opacity: 0.5 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 4px', display: 'block' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="var(--red)" strokeWidth="1.5"/>
              </svg>
              <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ADD PHOTO</p>
            </div>
          )}
        </div>
      );
    }

    if (col.type === 'select' || col.type === 'dynamic-select') {
      const options = col.type === 'dynamic-select' ? getDynamicOptions(col.key) : (col.options ?? []);
      const isLocked = col.type === 'dynamic-select' && !entry.department && col.key !== 'section';
      return (
        <select
          value={val}
          onChange={(e) => set(col.key, e.target.value)}
          disabled={sketchMode || isLocked}
          style={{
            ...baseInput,
            cursor: (sketchMode || isLocked) ? 'default' : 'pointer',
            appearance: 'auto',
            opacity: isLocked ? 0.4 : 1,
          }}
        >
          <option value="">{isLocked ? '— pick dept first —' : ''}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={val}
        onChange={(e) => set(col.key, e.target.value)}
        disabled={sketchMode}
        style={baseInput}
      />
    );
  };

  if (!open) return null;

  const displayTitle = initialEntry?.category || initialEntry?.department || '';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(26,19,16,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePhotoFile(f);
          e.target.value = '';
        }}
      />

      <div
        className="slide-up w-full flex flex-col"
        style={{
          background: 'var(--bg-modal)',
          borderTop: '2px solid var(--border-mid)',
          borderRadius: '16px 16px 0 0',
          height: '100vh',
          boxShadow: '0 -8px 40px rgba(26,19,16,0.18)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <p className="font-display text-xl italic font-bold" style={{ color: 'var(--red)', lineHeight: 1 }}>
              {isEdit ? `Edit — ${displayTitle}` : `Kin's`}
            </p>
            <p className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
              LADIES ARTICLE BOARD
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Type / Sketch toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-mid)' }}>
              {(['TYPE', 'SKETCH'] as const).map((mode) => {
                const isActive = (mode === 'SKETCH') === sketchMode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSketchMode(mode === 'SKETCH')}
                    className="px-3 py-1.5 tracking-widest transition-all flex items-center gap-1"
                    style={{
                      background: isActive ? 'var(--red)' : '#fff',
                      color: isActive ? '#fff' : 'var(--text-mid)',
                      borderRight: mode === 'TYPE' ? '1px solid var(--border-mid)' : 'none',
                      fontSize: '0.62rem',
                    }}
                  >
                    {mode === 'TYPE' ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M4 7h16M4 12h10M4 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        TYPE
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                        </svg>
                        SKETCH
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {sketchMode && (
              <div className="flex gap-1">
                {['#c41515', '#1a6ac4', '#1a8a3c', '#1a1310'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSketchColor(c)}
                    className="rounded-full transition-transform hover:scale-110"
                    style={{
                      width: 18, height: 18,
                      background: c,
                      border: sketchColor === c ? '2.5px solid var(--text)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => { setEntry(emptyEntry()); sketchRef.current?.clear(); }}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.6rem' }}
            >
              RESET
            </button>

            {/* Mic button */}
            <button
              onClick={listening ? stopVoice : startVoice}
              title={listening ? 'Stop voice input' : 'Start voice input'}
              className="flex items-center gap-1.5 rounded-lg transition-all"
              style={{
                padding: '6px 12px',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                fontWeight: 600,
                background: listening ? 'var(--red)' : 'rgba(196,21,21,0.08)',
                color: listening ? '#fff' : 'var(--red)',
                border: `1px solid ${listening ? 'var(--red)' : 'rgba(196,21,21,0.25)'}`,
                animation: listening ? 'pulse-mic 1.2s ease-in-out infinite' : 'none',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3"
                  fill={listening ? '#fff' : 'var(--red)'} />
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"
                  stroke={listening ? '#fff' : 'var(--red)'} strokeWidth="2" strokeLinecap="round"/>
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

        {/* ── Voice live banner ── */}
        {listening && (
          <div
            className="flex-shrink-0 flex items-center gap-3 px-5 py-2"
            style={{ background: 'rgba(196,21,21,0.06)', borderBottom: '1px solid rgba(196,21,21,0.15)' }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--red)',
              animation: 'pulse-mic 1s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontFamily: 'DM Mono, monospace', flex: 1, minWidth: 0 }}>
              {liveText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Listening… speak naturally</span>}
            </p>
            <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              e.g. "ladies footwear, red pumps, flat, premium"
            </p>
          </div>
        )}

        {/* ── Voice filled toast ── */}
        {showFilled && (
          <div
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2"
            style={{ background: 'rgba(30,150,80,0.08)', borderBottom: '1px solid rgba(30,150,80,0.2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5 9-9" stroke="rgb(30,150,80)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: '0.68rem', color: 'rgb(30,150,80)', fontFamily: 'DM Mono, monospace' }}>
              Filled: {filledFields.join(', ')}
            </p>
          </div>
        )}

        {/* ── Spreadsheet ── */}
        <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
          <SketchCanvas ref={sketchRef} active={sketchMode} color={sketchColor} strokeWidth={3} />

          <div
            className="h-full"
            style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <table
              style={{
                minWidth: TOTAL_WIDTH,
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
              }}
            >
              <colgroup>
                {COLUMNS.map(col => (
                  <col key={col.key} style={{ width: col.width }} />
                ))}
              </colgroup>

              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        padding: '7px 6px',
                        textAlign: 'left',
                        background: 'var(--gold-faint2)',
                        color: 'var(--gold)',
                        border: '1px solid var(--border)',
                        fontSize: '0.56rem',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  {COLUMNS.map(col => (
                    <td
                      key={col.key}
                      style={{
                        height: 120,
                        padding: 0,
                        border: '1px solid var(--border)',
                        background: '#ffffff',
                        verticalAlign: 'middle',
                        position: 'relative',
                      }}
                      onFocus={(e) => {
                        (e.currentTarget as HTMLElement).style.outline = '2px solid var(--red)';
                        (e.currentTarget as HTMLElement).style.outlineOffset = '-2px';
                      }}
                      onBlur={(e) => {
                        (e.currentTarget as HTMLElement).style.outline = '';
                      }}
                    >
                      {renderCell(col)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Notes + Save ── */}
        <div
          className="px-5 pt-3 pb-5 flex-shrink-0 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}
        >
          <div>
            <label
              className="block text-xs tracking-widest mb-1.5 font-semibold"
              style={{ color: 'var(--text-mid)', letterSpacing: '0.15em' }}
            >
              NOTES
            </label>
            <textarea
              value={entry.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Add notes about this item..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg outline-none transition-all resize-none"
              style={{
                background: 'var(--bg)',
                border: '1.5px solid var(--border-mid)',
                color: 'var(--text)',
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.75rem',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--red)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-mid)'; }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {entry.category
                ? <><span style={{ color: 'var(--red)', fontWeight: 700 }}>{entry.category}</span>{entry.department ? ` · ${entry.department}` : ''}</>
                : <span>Fill in the fields above and save</span>}
            </p>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn"
              style={{
                background: saved ? 'rgba(30,150,80,0.12)' : 'var(--red)',
                color: saved ? 'rgb(30,150,80)' : '#fff',
                border: saved ? '1px solid rgba(30,150,80,0.3)' : 'none',
                padding: '10px 24px',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                minWidth: 140,
                justifyContent: 'center',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                  SAVING…
                </>
              ) : saved ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  SAVED!
                </>
              ) : isEdit ? 'UPDATE ENTRY' : 'SAVE ENTRY'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
