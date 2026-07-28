'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import BoardModal from '@/components/BoardModal';
import EntriesList from '@/components/EntriesList';
import PinGate from '@/components/PinGate';
import PlanningBoard from '@/components/PlanningBoard';
import { ShoeEntry, SUPPLIER_NAMES } from '@/lib/categories';
import {
  fetchEntries, fetchTrashedEntries, deleteEntry, restoreEntry,
  permanentlyDeleteEntry, clearAllEntries, purgeOldTrash,
} from '@/lib/storage';
import { exportToExcelV2 } from '@/lib/exportExcelV2';
import { exportToPO } from '@/lib/exportPO';
import { buildPOPdfFile } from '@/lib/exportPDF';

function daysUntilPurge(deletedAt: string | null | undefined): number {
  if (!deletedAt) return 0;
  const deleted = new Date(deletedAt).getTime();
  const purgeAt = deleted + 15 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ShoeEntry | null>(null);
  const [entries, setEntries] = useState<ShoeEntry[]>([]);
  const [trashedEntries, setTrashedEntries] = useState<ShoeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPO, setExportingPO] = useState(false);
  const [sharingWA, setSharingWA] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stickySupplier, setStickySupplier] = useState('');
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    purgeOldTrash().catch(() => {}); // silent background purge
    const [data, trash] = await Promise.all([fetchEntries(), fetchTrashedEntries()]);
    setEntries(data);
    setTrashedEntries(trash);
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    const [data, trash] = await Promise.all([fetchEntries(), fetchTrashedEntries()]);
    setEntries(data);
    setTrashedEntries(trash);
    setLoading(false);
    setRefreshing(false);
  };

  const handleClearAll = async () => {
    if (!confirm(`Move all ${entries.length} entries to trash? You have 15 days to restore them.`)) return;
    await clearAllEntries();
    const trash = await fetchTrashedEntries();
    setEntries([]);
    setTrashedEntries(trash);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const trash = await fetchTrashedEntries();
    setTrashedEntries(trash);
  };

  const handleRestore = async (id: string) => {
    await restoreEntry(id);
    const [data, trash] = await Promise.all([fetchEntries(), fetchTrashedEntries()]);
    setEntries(data);
    setTrashedEntries(trash);
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this entry? This cannot be undone.')) return;
    await permanentlyDeleteEntry(id);
    setTrashedEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEntryClick = (entry: ShoeEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleNewEntry = () => {
    setEditEntry(null);
    setModalOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSelectGroup = (ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleToggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditEntry(null);
  };

  const handleEntryUpdate = (updated: ShoeEntry) => {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  };

  const handleShareWhatsApp = async (list: ShoeEntry[]) => {
    if (list.length > 100) {
      alert(`Too many entries for PO (${list.length}). Select 100 or fewer at a time.`);
      return;
    }
    setSharingWA(true);
    try {
      const file = await buildPOPdfFile(list);
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Purchase Order', text: 'Purchase Order' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
        window.open(`https://wa.me/?text=${encodeURIComponent('PO PDF downloaded — attach it here to send on WhatsApp.')}`, '_blank');
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return; // user cancelled the share sheet
      alert('WhatsApp share failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSharingWA(false);
    }
  };

  useEffect(() => { loadEntries(); }, [loadEntries]);
  // suppress unused var warning for visibleCount
  void setVisibleCount;

  return (
    <PinGate>
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(26,19,16,0.06)',
        }}
      >
        <div>
          <h1
            className="font-display italic font-bold tracking-wide"
            style={{ fontSize: '1.7rem', color: 'var(--red)', lineHeight: 1 }}
          >
            Kin&apos;s
          </h1>
          <p className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
            KINS ARTICLE BOARD
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sticky supplier picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSupplierPickerOpen(p => !p)}
              className="btn btn-outline"
              style={{ fontSize: '0.6rem', letterSpacing: '0.1em', padding: '8px 14px',
                background: stickySupplier ? 'var(--gold-faint2)' : undefined,
                borderColor: stickySupplier ? 'var(--border-mid)' : undefined,
                color: stickySupplier ? 'var(--gold)' : undefined,
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={stickySupplier || 'Set active supplier'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              {stickySupplier ? stickySupplier.slice(0, 18) + (stickySupplier.length > 18 ? '…' : '') : 'SET SUPPLIER'}
            </button>
            {supplierPickerOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                borderRadius: 10, boxShadow: '0 8px 32px rgba(26,19,16,0.14)',
                width: 280,
              }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 6 }}>ACTIVE SUPPLIER — auto-fills new entries</p>
                  <input
                    autoFocus
                    type="text"
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    placeholder="Type to search..."
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 6,
                      border: '1px solid var(--border-mid)', background: 'var(--bg)',
                      fontSize: '0.68rem', fontFamily: 'DM Mono, monospace',
                      color: 'var(--text)', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <button
                    onClick={() => { setStickySupplier(''); setSupplierPickerOpen(false); setSupplierSearch(''); }}
                    style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: !stickySupplier ? 'var(--gold-faint2)' : 'transparent',
                      border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}
                  >
                    — Clear supplier —
                  </button>
                  {supplierSearch.trim() && !SUPPLIER_NAMES.some(s => s.toLowerCase() === supplierSearch.trim().toLowerCase()) && (
                    <button
                      onClick={() => { setStickySupplier(supplierSearch.trim()); setSupplierPickerOpen(false); setSupplierSearch(''); }}
                      style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--gold)',
                        fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border)' }}
                    >
                      + Use &quot;{supplierSearch.trim()}&quot; as new supplier
                    </button>
                  )}
                  {SUPPLIER_NAMES.filter(s => s.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                    <button key={s} onClick={() => { setStickySupplier(s); setSupplierPickerOpen(false); setSupplierSearch(''); }}
                      style={{ width: '100%', padding: '8px 12px', textAlign: 'left',
                        background: stickySupplier === s ? 'var(--gold-faint2)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: '0.65rem',
                        color: stickySupplier === s ? 'var(--gold)' : 'var(--text)',
                        fontFamily: 'DM Mono, monospace', letterSpacing: '0.02em' }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setPlanningOpen(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.7rem', letterSpacing: '0.12em', padding: '10px 16px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            PLANNING
          </button>

          <button
            onClick={handleNewEntry}
            className="btn btn-primary"
            style={{ fontSize: '0.7rem', letterSpacing: '0.12em', padding: '10px 20px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            NEW ENTRY
          </button>
        </div>
      </header>

      {/* ── Logo hero ── */}
      <div
        className="flex flex-col items-center justify-center flex-shrink-0 relative"
        style={{
          minHeight: 260,
          background: 'linear-gradient(160deg, #fff8f0 0%, #f7f0e4 60%, #f0e6d0 100%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(196,21,21,0.04)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(139,105,20,0.05)',
          }} />
        </div>

        <div className="logo-float flex flex-col items-center z-10">
          <button
            onClick={handleNewEntry}
            className="kins-logo-3d"
            style={{ fontSize: 'min(18vw, 5.5rem)' }}
            aria-label="Open categorization board"
          >
            Kin&apos;s
          </button>
          <p
            className="gold-text font-display tracking-widest mt-1"
            style={{ fontSize: '0.75rem', letterSpacing: '0.35em' }}
          >
            FOOTWEAR
          </p>
        </div>

        <div className="flex items-center gap-2 mt-6 z-10">
          <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, var(--border-mid))' }} />
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
            TAP LOGO OR BUTTON TO CATEGORIZE A SHOE
          </p>
          <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, var(--border-mid), transparent)' }} />
        </div>
      </div>

      {/* ── Entries section ── */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs tracking-widest font-semibold" style={{ color: 'var(--text-mid)', letterSpacing: '0.2em' }}>
            RECENT ENTRIES
            {entries.length > 0 && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'var(--gold-faint2)', color: 'var(--gold)' }}
              >
                {entries.length}
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {entries.length > 0 && selectMode ? (
              <>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const selected = entries.filter(e => e.id && selectedIds.has(e.id));
                        exportToExcelV2(selected).catch(console.error);
                      }}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', color: '#1d6f42', borderColor: 'rgba(29,111,66,0.35)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      ERP ({selectedIds.size})
                    </button>
                    <button
                      disabled={exportingPO}
                      onClick={async () => {
                        const selected = entries.filter(e => e.id && selectedIds.has(e.id));
                        if (selected.length > 100) {
                          alert(`Too many entries for PO (${selected.length}). Select 100 or fewer at a time.`);
                          return;
                        }
                        setExportingPO(true);
                        try {
                          await exportToPO(selected);
                        } catch (e) { alert('PO export failed: ' + (e instanceof Error ? e.message : String(e))); }
                        finally { setExportingPO(false); }
                      }}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', color: '#c41515', borderColor: 'rgba(196,21,21,0.35)', opacity: exportingPO ? 0.6 : 1 }}
                    >
                      {exportingPO
                        ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {exportingPO ? 'GENERATING...' : `PO (${selectedIds.size})`}
                    </button>
                    <button
                      disabled={sharingWA}
                      onClick={() => {
                        const selected = entries.filter(e => e.id && selectedIds.has(e.id));
                        handleShareWhatsApp(selected);
                      }}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', color: '#25D366', borderColor: 'rgba(37,211,102,0.4)', opacity: sharingWA ? 0.6 : 1 }}
                      title="Share PO as PDF via WhatsApp"
                    >
                      {sharingWA
                        ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.36-.53.06-1.02.32-3.44-.72-2.91-1.25-4.78-4.2-4.93-4.4-.15-.2-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.01-2.4.26-.29.58-.36.77-.36.19 0 .39 0 .55.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.14.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.68-.17 1.36z"/></svg>}
                      SHARE
                    </button>
                  </>
                )}
                <button
                  onClick={handleToggleSelectMode}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px' }}
                >
                  CANCEL
                </button>
              </>
            ) : (
              <>
                {entries.length > 0 && (
                  <button
                    onClick={() => exportToExcelV2(entries).catch(console.error)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', color: '#1d6f42', borderColor: 'rgba(29,111,66,0.35)' }}
                    title="Download in ERP format (one row per size)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    ERP FORMAT
                  </button>
                )}
                {entries.length > 0 && (
                  <button
                    disabled={exportingPO}
                    onClick={async () => {
                      if (entries.length > 100) {
                        alert(`Too many entries for PO (${entries.length}). Use SELECT mode to pick entries for a specific supplier — POs are per order, not your full catalogue.`);
                        return;
                      }
                      setExportingPO(true);
                      try { await exportToPO(entries); }
                      catch (e) { alert('PO export failed: ' + (e instanceof Error ? e.message : String(e))); }
                      finally { setExportingPO(false); }
                    }}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', color: '#c41515', borderColor: 'rgba(196,21,21,0.35)', opacity: exportingPO ? 0.6 : 1 }}
                    title="Download Sample PO as Excel"
                  >
                    {exportingPO
                      ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {exportingPO ? 'GENERATING...' : 'SAMPLE PO'}
                  </button>
                )}
                {entries.length > 0 && (
                  <button
                    disabled={sharingWA}
                    onClick={() => {
                      if (entries.length > 100) {
                        alert(`Too many entries for PO (${entries.length}). Use SELECT mode to pick entries for a specific supplier — POs are per order, not your full catalogue.`);
                        return;
                      }
                      handleShareWhatsApp(entries);
                    }}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', color: '#25D366', borderColor: 'rgba(37,211,102,0.4)', opacity: sharingWA ? 0.6 : 1 }}
                    title="Share PO as PDF via WhatsApp"
                  >
                    {sharingWA
                      ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.36-.53.06-1.02.32-3.44-.72-2.91-1.25-4.78-4.2-4.93-4.4-.15-.2-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.01-2.4.26-.29.58-.36.77-.36.19 0 .39 0 .55.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.14.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.68-.17 1.36z"/></svg>}
                    {sharingWA ? 'PREPARING...' : 'SHARE'}
                  </button>
                )}
                {entries.length > 0 && (
                  <button
                    onClick={handleToggleSelectMode}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px' }}
                    title="Select specific entries to export"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 17.5h7M17.5 14v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    SELECT
                  </button>
                )}
                {entries.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', color: 'var(--red)', borderColor: 'rgba(196,21,21,0.3)' }}
                    title="Move all entries to trash"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    CLEAR ALL
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-outline"
              style={{ padding: '6px 12px' }}
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0 1 15-6.7M20 15a9 9 0 0 1-15 6.7"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {refreshing ? 'REFRESHING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        <EntriesList
          entries={entries}
          loading={loading}
          onEntryClick={handleEntryClick}
          onDelete={handleDelete}
          onEntryUpdate={handleEntryUpdate}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectGroup={handleToggleSelectGroup}
        />

        {/* ── Trash Section ── */}
        {trashedEntries.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setTrashOpen(p => !p)}
              className="flex items-center gap-2 w-full"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(196,21,21,0.2)' }} />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
                background: 'rgba(196,21,21,0.05)', border: '1px solid rgba(196,21,21,0.2)',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '0.6rem', color: 'var(--red)', fontWeight: 700, letterSpacing: '0.12em' }}>
                  TRASH ({trashedEntries.length})
                </span>
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  style={{ transform: trashOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--red)' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(196,21,21,0.2)' }} />
            </button>

            {trashOpen && (
              <div className="flex flex-col gap-3 mt-3">
                <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textAlign: 'center' }}>
                  ENTRIES BELOW AUTO-DELETE AFTER 15 DAYS
                </p>
                {trashedEntries.map((entry) => {
                  const title = entry.article_no || entry.category || entry.department || '—';
                  const picture = entry.picture || '';
                  const isSupabaseUrl = picture.startsWith('https://wsaqdgflkghaepknnsvc.supabase.co');
                  const days = daysUntilPurge(entry.deleted_at);

                  return (
                    <div
                      key={entry.id}
                      className="entry-card flex items-stretch overflow-hidden"
                      style={{ opacity: 0.65 }}
                    >
                      {/* Photo */}
                      <div className="flex-shrink-0 flex items-center justify-center" style={{
                        width: 64, position: 'relative',
                        background: picture ? undefined : 'linear-gradient(135deg, #f7f0e4, #ede3cf)',
                        borderRight: '1px solid var(--border)',
                      }}>
                        {picture ? (
                          isSupabaseUrl ? (
                            <Image src={picture} alt="" fill sizes="64px" quality={90} style={{ objectFit: 'cover' }} />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )
                        ) : (
                          <span className="font-display italic font-bold" style={{ fontSize: '1.2rem', color: 'var(--red)', opacity: 0.3 }}>K</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-4 py-3 min-w-0">
                        <p className="font-display italic font-semibold" style={{ fontSize: '1rem', color: 'var(--text)' }}>
                          {title}
                        </p>
                        {entry.supplier_name && (
                          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{entry.supplier_name}</p>
                        )}
                        <p style={{ fontSize: '0.58rem', color: 'var(--red)', marginTop: 4, letterSpacing: '0.06em' }}>
                          Deletes in {days} day{days !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Trash Actions */}
                      <div className="flex flex-col items-center justify-center gap-2 px-3 flex-shrink-0"
                        style={{ borderLeft: '1px solid var(--border)', background: 'rgba(247,242,234,0.5)' }}>
                        <button
                          onClick={() => handleRestore(entry.id!)}
                          title="Restore entry"
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 32, height: 32, background: 'rgba(29,111,66,0.08)', color: '#1d6f42', border: '1px solid rgba(29,111,66,0.2)', cursor: 'pointer' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(entry.id!)}
                          title="Delete forever"
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 32, height: 32, background: 'rgba(196,21,21,0.06)', color: 'var(--red)', border: '1px solid rgba(196,21,21,0.15)', cursor: 'pointer' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Board modal ── */}
      <BoardModal
        open={modalOpen}
        onClose={handleClose}
        onSaved={loadEntries}
        initialEntry={editEntry}
        stickySupplier={stickySupplier}
      />

      {/* ── Planning board ── */}
      <PlanningBoard open={planningOpen} onClose={() => setPlanningOpen(false)} />
    </div>
    </PinGate>
  );
}
