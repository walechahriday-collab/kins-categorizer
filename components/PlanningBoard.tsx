'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEPARTMENTS, DEPT_CATEGORIES } from '@/lib/categories';
import {
  fetchOrderPlans, fetchOrderProgress, fetchDeptSubcategoryTotals,
  upsertPlannedQty, resetOrderPlan, resetAllOrderPlans, setPeriodStart,
  OrderProgress, DeptSubcategoryTotal,
} from '@/lib/storage';
import { OrderPlan } from '@/lib/categories';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLANNING_PIN = '0176';

const COLOR_UNDER = 'var(--red)';
const COLOR_EXACT = '#1a8a3c';
const COLOR_OVER = '#7c3aed';

function key(department: string, category: string): string {
  return `${department} ${category}`;
}

function sinceLabel(periodStart?: string | null): string {
  if (!periodStart) return 'all-time';
  const d = new Date(periodStart);
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (daysAgo <= 0) return 'since today';
  return `since ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

function toDateInputValue(periodStart?: string | null): string {
  if (!periodStart) return '';
  return new Date(periodStart).toISOString().slice(0, 10);
}

export default function PlanningBoard({ open, onClose }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [plans, setPlans] = useState<Record<string, OrderPlan>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [deptTotals, setDeptTotals] = useState<Record<string, { casual: number; party: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingSinceKey, setEditingSinceKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUnlocked(false);
    setPin('');
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    const [planRows, progressRows, subcatRows] = await Promise.all([
      fetchOrderPlans(), fetchOrderProgress(), fetchDeptSubcategoryTotals(),
    ]);
    const planMap: Record<string, OrderPlan> = {};
    for (const p of planRows) planMap[key(p.department, p.category)] = p;
    setPlans(planMap);

    const progMap: Record<string, number> = {};
    for (const p of progressRows as OrderProgress[]) progMap[key(p.department, p.category)] = p.ordered_qty;
    setProgress(progMap);

    const dtMap: Record<string, { casual: number; party: number }> = {};
    for (const d of subcatRows as DeptSubcategoryTotal[]) {
      if (!dtMap[d.department]) dtMap[d.department] = { casual: 0, party: 0 };
      if (d.sub_category === 'Casualwear') dtMap[d.department].casual += d.ordered_qty;
      else if (d.sub_category === 'Partywear') dtMap[d.department].party += d.ordered_qty;
    }
    setDeptTotals(dtMap);
    setLoading(false);
  }, []);

  useEffect(() => { if (open && unlocked) load(); }, [open, unlocked, load]);

  const submitPin = useCallback((value: string) => {
    if (value === PLANNING_PIN) {
      setUnlocked(true);
    } else {
      setPinError(true);
      setTimeout(() => { setPinError(false); setPin(''); }, 700);
    }
  }, []);

  const pressDigit = useCallback((d: string) => {
    setPin(prev => {
      const next = prev + d;
      if (next.length === 4) setTimeout(() => submitPin(next), 0);
      return next;
    });
  }, [submitPin]);

  const handlePlannedChange = useCallback(async (department: string, category: string, value: string) => {
    const k = key(department, category);
    const qty = Math.max(0, parseInt(value) || 0);
    setPlans(prev => ({ ...prev, [k]: { ...(prev[k] ?? { department, category, period_start: null }), planned_qty: qty } }));
    setSavingKey(k);
    await upsertPlannedQty(department, category, qty);
    setSavingKey(null);
  }, []);

  const handleResetRow = useCallback(async (department: string, category: string) => {
    if (!confirm(`Reset the planned/ordered counter for "${category}"? This starts a fresh count from now — it does not delete any entries.`)) return;
    await resetOrderPlan(department, category);
    await load();
  }, [load]);

  const handleResetAll = useCallback(async () => {
    if (!confirm('Reset ALL planned/ordered counters? This starts every category fresh from now — it does not delete any entries.')) return;
    await resetAllOrderPlans();
    await load();
  }, [load]);

  const handleSinceChange = useCallback(async (department: string, category: string, dateValue: string) => {
    const iso = dateValue ? new Date(`${dateValue}T00:00:00`).toISOString() : null;
    await setPeriodStart(department, category, iso);
    setEditingSinceKey(null);
    await load();
  }, [load]);

  const totalPlanned = useMemo(() => Object.values(plans).reduce((s, p) => s + (p.planned_qty || 0), 0), [plans]);
  const totalOrdered = useMemo(() => Object.values(progress).reduce((s, v) => s + v, 0), [progress]);

  const deptOrderedTotal = useCallback((dept: string) => {
    return (DEPT_CATEGORIES[dept] ?? []).reduce((s, cat) => s + (progress[key(dept, cat)] ?? 0), 0);
  }, [progress]);

  const sortedCategories = useMemo(() => {
    const categories = DEPT_CATEGORIES[selectedDept] ?? [];
    return [...categories].sort((a, b) => {
      const diff = (progress[key(selectedDept, b)] ?? 0) - (progress[key(selectedDept, a)] ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  }, [selectedDept, progress]);

  const dt = deptTotals[selectedDept] ?? { casual: 0, party: 0 };

  if (!open) return null;

  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(26,19,16,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex flex-col items-center"
          style={{ background: 'var(--bg-modal)', borderRadius: 20, padding: '2.5rem 2.5rem 2rem',
            boxShadow: '0 8px 40px rgba(26,19,16,0.25)', border: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ alignSelf: 'flex-end', marginTop: -16, marginRight: -16, color: 'var(--text-muted)', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <p className="font-display italic font-bold" style={{ fontSize: '1.4rem', color: 'var(--red)' }}>Order Planning</p>
          <p className="text-xs mt-1 mb-6 tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
            ENTER PLANNING PASSCODE
          </p>

          <div className="flex gap-3 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: pinError ? '#c41515' : pin.length > i ? '#c41515' : 'transparent',
                border: `2px solid ${pinError ? '#c41515' : pin.length > i ? '#c41515' : 'var(--border-mid)'}`,
                transition: 'all 0.15s',
                animation: pinError ? 'shake 0.3s ease' : 'none',
              }} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!k) return;
                  if (k === '⌫') { setPin(p => p.slice(0, -1)); setPinError(false); }
                  else if (pin.length < 4) pressDigit(k);
                }}
                disabled={!k}
                style={{
                  width: 64, height: 64, borderRadius: 14,
                  fontSize: k === '⌫' ? '1.1rem' : '1.3rem', fontWeight: 600,
                  background: k ? 'var(--bg-card)' : 'transparent',
                  border: k ? '1px solid var(--border)' : 'none',
                  color: 'var(--text)', cursor: k ? 'pointer' : 'default',
                  boxShadow: k ? '0 2px 8px rgba(26,19,16,0.06)' : 'none',
                  opacity: !k ? 0 : 1,
                }}
              >
                {k}
              </button>
            ))}
          </div>

          <style>{`
            @keyframes shake {
              0%,100% { transform: translateX(0); }
              25% { transform: translateX(-4px); }
              75% { transform: translateX(4px); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(26,19,16,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="slide-up w-full flex flex-col"
        style={{ background: 'var(--bg-modal)', borderTop: '2px solid var(--border-mid)',
          borderRadius: '16px 16px 0 0', height: '100vh', boxShadow: '0 -8px 40px rgba(26,19,16,0.18)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-display text-xl italic font-bold" style={{ color: 'var(--red)', lineHeight: 1 }}>
              Order Planning
            </p>
            <p className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
              TOTAL PLANNED {totalPlanned} · TOTAL ORDERED {totalOrdered}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleResetAll} className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.6rem', color: 'var(--red)', borderColor: 'rgba(196,21,21,0.3)' }}>
              RESET ALL
            </button>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Department picker */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border)' }}>
          {DEPARTMENTS.map(dept => {
            const isActive = dept === selectedDept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: 8,
                  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.03em',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  background: isActive ? 'var(--red)' : '#fff',
                  color: isActive ? '#fff' : 'var(--text-mid)',
                  border: `1px solid ${isActive ? 'var(--red)' : 'var(--border-mid)'}`,
                }}
              >
                {dept}
                {!loading && <span style={{ opacity: 0.7, marginLeft: 6 }}>· {deptOrderedTotal(dept)}</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 flex items-center gap-5 px-5 py-2"
          style={{ background: 'var(--gold-faint)', borderBottom: '1px solid var(--border)' }}>
          {[
            { color: COLOR_UNDER, label: 'Below target' },
            { color: COLOR_EXACT, label: 'Exactly as planned' },
            { color: COLOR_OVER, label: 'Over-ordered' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-mid)' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loading ? (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="font-display italic font-semibold" style={{ fontSize: '1.3rem', color: 'var(--text)' }}>
                  {selectedDept}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-mid)', letterSpacing: '0.06em' }}>
                  Casual: <strong>{dt.casual}</strong> &nbsp;·&nbsp; Party Wear: <strong>{dt.party}</strong>
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {sortedCategories.map(cat => {
                  const k = key(selectedDept, cat);
                  const plan = plans[k];
                  const plannedQty = plan?.planned_qty ?? 0;
                  const orderedQty = progress[k] ?? 0;
                  const hasTarget = plannedQty > 0;
                  const isOver = hasTarget && orderedQty > plannedQty;
                  const isExact = hasTarget && orderedQty === plannedQty;
                  const overQty = isOver ? orderedQty - plannedQty : 0;
                  const remaining = Math.max(0, plannedQty - orderedQty);
                  const pct = hasTarget ? Math.min(100, Math.round((orderedQty / plannedQty) * 100)) : 0;
                  const barColor = isOver ? COLOR_OVER : isExact ? COLOR_EXACT : COLOR_UNDER;
                  const isSaving = savingKey === k;

                  return (
                    <div key={cat} className="entry-card"
                      style={{
                        padding: '1.75rem 2rem',
                        borderLeft: `6px solid ${hasTarget ? barColor : 'var(--border-mid)'}`,
                        background: isOver ? 'rgba(124,58,237,0.05)' : isExact ? 'rgba(26,138,60,0.05)' : '#fff',
                      }}>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <span className="font-display italic font-bold" style={{ fontSize: '1.9rem', color: 'var(--text)', lineHeight: 1 }}>
                          {cat}
                        </span>
                        {isOver && (
                          <span style={{
                            fontSize: '0.9rem', fontWeight: 800, color: '#fff', background: COLOR_OVER,
                            padding: '5px 14px', borderRadius: 999, letterSpacing: '0.04em',
                          }}>
                            {overQty} OVER
                          </span>
                        )}
                        {isExact && (
                          <span style={{
                            fontSize: '0.9rem', fontWeight: 800, color: '#fff', background: COLOR_EXACT,
                            padding: '5px 14px', borderRadius: 999, letterSpacing: '0.04em',
                          }}>
                            ON TARGET
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-6">
                        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>PLANNED</span>
                          <input
                            type="number"
                            min={0}
                            value={plannedQty || ''}
                            placeholder="0"
                            onChange={e => handlePlannedChange(selectedDept, cat, e.target.value)}
                            style={{
                              width: 110, padding: '10px 14px', borderRadius: 10,
                              border: '1.5px solid var(--border-mid)', background: '#fff',
                              fontSize: '1.15rem', fontWeight: 700, fontFamily: 'DM Mono, monospace',
                              color: 'var(--text)', outline: 'none', textAlign: 'right',
                            }}
                          />
                          {isSaving && <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>●</span>}
                        </div>

                        <div className="flex-1 min-w-[220px] flex items-center gap-4">
                          <div style={{ flex: 1, height: 20, borderRadius: 10, background: 'rgba(139,105,20,0.12)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${hasTarget ? Math.max(pct, orderedQty > 0 ? 4 : 0) : 0}%`, height: '100%',
                              background: barColor, transition: 'width 0.2s',
                            }} />
                          </div>
                        </div>

                        <div className="flex flex-col items-end" style={{ flexShrink: 0, minWidth: 170 }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: isOver ? COLOR_OVER : isExact ? COLOR_EXACT : 'var(--text)' }}>
                            {orderedQty} ordered
                          </span>
                          {editingSinceKey === k ? (
                            <div className="flex items-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                              <input
                                type="date"
                                autoFocus
                                defaultValue={toDateInputValue(plan?.period_start)}
                                onChange={e => handleSinceChange(selectedDept, cat, e.target.value)}
                                style={{
                                  fontSize: '0.65rem', padding: '3px 6px', borderRadius: 6,
                                  border: '1px solid var(--border-mid)', fontFamily: 'DM Mono, monospace',
                                  color: 'var(--text)', outline: 'none',
                                }}
                              />
                              <button
                                title="Clear — count all-time"
                                onClick={() => handleSinceChange(selectedDept, cat, '')}
                                style={{ fontSize: '0.6rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingSinceKey(k)}
                              title="Click to change the counting start date"
                              style={{
                                fontSize: '0.68rem', color: 'var(--text-muted)', background: 'none',
                                border: 'none', cursor: 'pointer', textDecoration: 'underline dotted',
                                textUnderlineOffset: 2,
                              }}
                            >
                              ({sinceLabel(plan?.period_start)})
                            </button>
                          )}
                        </div>

                        {!isOver && !isExact && (
                          <div className="flex flex-col items-end" style={{ flexShrink: 0, minWidth: 90 }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-mid)' }}>
                              {remaining}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>left</span>
                          </div>
                        )}

                        <button
                          onClick={() => handleResetRow(selectedDept, cat)}
                          title={`Reset ${cat}`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                            background: 'rgba(196,21,21,0.06)', color: 'var(--red)',
                            border: '1px solid rgba(196,21,21,0.15)', cursor: 'pointer',
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
