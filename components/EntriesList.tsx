'use client';

import Image from 'next/image';
import { ShoeEntry, SUPPLIER_CODES } from '@/lib/categories';
import VoiceNote from './VoiceNote';

interface Props {
  entries: ShoeEntry[];
  loading: boolean;
  onEntryClick: (entry: ShoeEntry) => void;
  onDelete: (id: string) => void;
  onEntryUpdate?: (entry: ShoeEntry) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function EntriesList({ entries, loading, onEntryClick, onDelete, onEntryUpdate, selectMode, selectedIds, onToggleSelect }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full"
          style={{ width: 24, height: 24, border: '2px solid var(--border-mid)', borderTopColor: 'var(--red)' }}
        />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-xl"
        style={{ border: '1.5px dashed var(--border-mid)', background: 'var(--bg-card)' }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-3" style={{ opacity: 0.3 }}>
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="var(--text-mid)" strokeWidth="1.5"/>
          <path d="M8 7h8M8 11h6M8 15h4" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className="text-sm tracking-widest" style={{ color: 'var(--text-muted)' }}>NO ENTRIES YET</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          Tap &quot;NEW ENTRY&quot; or the Kin&apos;s logo to start
        </p>
      </div>
    );
  }

  // Group entries by supplier
  const grouped = new Map<string, ShoeEntry[]>();
  for (const entry of entries) {
    const supplier = entry.supplier_name?.trim() || '— No Supplier —';
    if (!grouped.has(supplier)) grouped.set(supplier, []);
    grouped.get(supplier)!.push(entry);
  }

  const renderCard = (entry: ShoeEntry) => {
    const title = entry.article_no || entry.category || entry.department || '—';
    const picture = entry.picture || (entry as unknown as Record<string, string>).photo_url || '';
    const isSupabaseUrl = picture.startsWith('https://wsaqdgflkghaepknnsvc.supabase.co');

    let variantColors: string[] = [];
    try {
      const vv = JSON.parse(entry.color_variants || '[]');
      variantColors = vv.map((v: { color?: string }) => v.color).filter(Boolean);
    } catch { variantColors = entry.color ? [entry.color] : []; }

    const supplierCode = entry.supplier_name ? SUPPLIER_CODES[entry.supplier_name.trim()] : undefined;
    const imageLabel = supplierCode && entry.article_no
      ? `${supplierCode}-${entry.article_no}`
      : supplierCode || (entry.article_no || '');

    const tags = [entry.department, entry.sub_category, entry.heels, entry.season, entry.section].filter(Boolean) as string[];
    const isSelected = !!(selectMode && entry.id && selectedIds?.has(entry.id));

    return (
      <div
        key={entry.id}
        className="entry-card flex items-stretch overflow-hidden"
        role="button"
        tabIndex={0}
        onClick={() => selectMode ? onToggleSelect?.(entry.id!) : onEntryClick(entry)}
        onKeyDown={(e) => e.key === 'Enter' && (selectMode ? onToggleSelect?.(entry.id!) : onEntryClick(entry))}
        style={{ position: 'relative', ...(isSelected ? { outline: '2px solid var(--red)', outlineOffset: '-2px' } : {}) }}
      >
        {selectMode && (
          <div style={{
            position: 'absolute', top: 8, left: 8, zIndex: 1,
            width: 20, height: 20, borderRadius: 4, flexShrink: 0,
            background: isSelected ? 'var(--red)' : 'white',
            border: `2px solid ${isSelected ? 'var(--red)' : 'var(--border-mid)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {isSelected && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )}

        {/* Photo */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{
          width: 72, position: 'relative',
          background: picture ? undefined : 'linear-gradient(135deg, #f7f0e4, #ede3cf)',
          borderRight: '1px solid var(--border)',
        }}>
          {picture ? (
            isSupabaseUrl ? (
              <Image
                src={picture}
                alt=""
                fill
                sizes="72px"
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : (
            <span className="font-display italic font-bold" style={{ fontSize: '1.5rem', color: 'var(--red)', opacity: 0.35 }}>K</span>
          )}
          {picture && imageLabel && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.55)',
              padding: '2px 3px',
              textAlign: 'center',
              zIndex: 1,
            }}>
              <span style={{
                color: '#fff',
                fontSize: '0.42rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}>{imageLabel}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display italic font-semibold leading-tight" style={{ fontSize: '1.1rem', color: 'var(--red)' }}>
              {title}
            </p>
            <span className="flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginTop: 3 }}>
              {entry.created_at
                ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                : ''}
            </span>
          </div>

          {(tags.length > 0 || variantColors.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {variantColors.map((c, i) => (
                <span key={`color-${i}`} className="px-2 py-0.5 rounded-full" style={{
                  background: 'rgba(196,21,21,0.07)', color: '#c41515',
                  fontSize: '0.58rem', letterSpacing: '0.08em', fontWeight: 600,
                  border: '1px solid rgba(196,21,21,0.2)',
                }}>{c}</span>
              ))}
              {tags.slice(0, 4).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full" style={{
                  background: 'var(--gold-faint2)', color: 'var(--gold)',
                  fontSize: '0.58rem', letterSpacing: '0.08em', fontWeight: 500,
                }}>{tag}</span>
              ))}
            </div>
          )}

          {entry.notes && (
            <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {entry.notes}
            </p>
          )}

          {entry.id && (
            <VoiceNote
              entry={entry}
              onUpdated={(updated) => onEntryUpdate?.(updated)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-2 px-3 flex-shrink-0"
          style={{ borderLeft: '1px solid var(--border)', background: 'rgba(247,242,234,0.5)' }}>
          <button
            title="View / Edit"
            onClick={(e) => { e.stopPropagation(); onEntryClick(entry); }}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 32, height: 32, background: 'var(--gold-faint2)', color: 'var(--gold)', border: '1px solid var(--border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            title="Move to trash"
            onClick={(e) => { e.stopPropagation(); if (confirm(`Move "${title}" to trash?`)) onDelete(entry.id!); }}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 32, height: 32, background: 'rgba(196,21,21,0.06)', color: 'var(--red)', border: '1px solid rgba(196,21,21,0.15)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {Array.from(grouped.entries()).map(([supplier, supplierEntries]) => (
        <div key={supplier}>
          {/* Supplier header */}
          <div className="flex items-center gap-3 mb-2">
            <div style={{ flex: 1, height: 1, background: 'var(--border-mid)' }} />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
              background: 'var(--gold-faint2)', border: '1px solid var(--border-mid)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '0.6rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em' }}>
                {supplier.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                {supplierEntries.length}
              </span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--border-mid)' }} />
          </div>

          <div className="flex flex-col gap-3">
            {supplierEntries.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
}
