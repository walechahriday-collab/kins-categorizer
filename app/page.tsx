'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import BoardModal from '@/components/BoardModal';
import EntriesList from '@/components/EntriesList';
import PinGate from '@/components/PinGate';
import { ShoeEntry } from '@/lib/categories';
import { fetchEntries, deleteEntry, clearAllEntries } from '@/lib/storage';
import { exportToExcel } from '@/lib/exportExcel';
import { exportToExcelV2 } from '@/lib/exportExcelV2';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ShoeEntry | null>(null);
  const [entries, setEntries] = useState<ShoeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const data = await fetchEntries();
    setEntries(data);
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    const data = await fetchEntries();
    setEntries(data);
    setLoading(false);
    setRefreshing(false);
  };

  const handleClearAll = async () => {
    if (!confirm(`Delete all ${entries.length} entries? This cannot be undone.`)) return;
    await clearAllEntries();
    setEntries([]);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEntryClick = (entry: ShoeEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleNewEntry = () => {
    setEditEntry(null);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditEntry(null);
  };

  useEffect(() => { loadEntries(); }, [loadEntries]);

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
            LADIES ARTICLE BOARD
          </p>
        </div>

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
        {/* Decorative circles */}
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

        {/* CSS 3D logo — always visible, no WebGL needed */}
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

        {/* Tap hint */}
        <div className="flex items-center gap-2 mt-6 z-10">
          <div style={{
            width: 32, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--border-mid))',
          }} />
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
            TAP LOGO OR BUTTON TO CATEGORIZE A SHOE
          </p>
          <div style={{
            width: 32, height: 1,
            background: 'linear-gradient(90deg, var(--border-mid), transparent)',
          }} />
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
            {/* Export to Excel (original) */}
            {entries.length > 0 && (
              <button
                onClick={() => exportToExcel(entries)}
                className="btn btn-outline"
                style={{ padding: '6px 12px', color: '#1d6f42', borderColor: 'rgba(29,111,66,0.35)' }}
                title="Download all entries as Excel file"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                EXPORT EXCEL
              </button>
            )}

            {/* Export to Excel V2 (ERP format — one row per size) */}
            {entries.length > 0 && (
              <button
                onClick={() => exportToExcelV2(entries).catch(console.error)}
                className="btn btn-outline"
                style={{ padding: '6px 12px', color: '#1d6f42', borderColor: 'rgba(29,111,66,0.35)', opacity: 0.75 }}
                title="Download in ERP format (one row per size)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M8 13h2l2 4 2-4h2M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ERP FORMAT
              </button>
            )}

            {/* Clear All */}
            {entries.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn btn-outline"
                style={{ padding: '6px 12px', color: 'var(--red)', borderColor: 'rgba(196,21,21,0.3)' }}
                title="Delete all entries"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                CLEAR ALL
              </button>
            )}

            {/* Refresh */}
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
        />
      </div>

      {/* ── Board modal ── */}
      <BoardModal
        open={modalOpen}
        onClose={handleClose}
        onSaved={loadEntries}
        initialEntry={editEntry}
      />
    </div>
    </PinGate>
  );
}
