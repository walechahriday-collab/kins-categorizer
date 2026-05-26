'use client';

import { useState, useEffect } from 'react';

const CORRECT_PIN = process.env.NEXT_PUBLIC_APP_PIN ?? '1414';
const SESSION_KEY = 'kins_auth';

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'ok') setUnlocked(true);
    setChecked(true);
  }, []);

  const submit = (value: string) => {
    if (value === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => { setError(false); setPin(''); }, 700);
    }
  };

  const press = (digit: string) => {
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #fff8f0 0%, #f7f0e4 60%, #f0e6d0 100%)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <span
          className="font-display italic font-bold"
          style={{ fontSize: '4rem', color: 'var(--red)', lineHeight: 1 }}
        >
          Kin&apos;s
        </span>
        <p className="gold-text font-display tracking-widest mt-1" style={{ fontSize: '0.7rem', letterSpacing: '0.35em' }}>
          FOOTWEAR
        </p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: error ? '#c41515' : pin.length > i ? '#c41515' : 'transparent',
              border: `2px solid ${error ? '#c41515' : pin.length > i ? '#c41515' : 'var(--border-mid)'}`,
              transition: 'all 0.15s',
              transform: error ? 'translateX(0)' : 'none',
              animation: error ? 'shake 0.3s ease' : 'none',
            }}
          />
        ))}
      </div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!k) return;
              if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(false); }
              else if (pin.length < 4) press(k);
            }}
            disabled={!k}
            style={{
              width: 72, height: 72, borderRadius: 16,
              fontSize: k === '⌫' ? '1.2rem' : '1.4rem',
              fontWeight: 600,
              background: k ? 'var(--bg-card)' : 'transparent',
              border: k ? '1px solid var(--border)' : 'none',
              color: 'var(--text)',
              cursor: k ? 'pointer' : 'default',
              boxShadow: k ? '0 2px 8px rgba(26,19,16,0.06)' : 'none',
              transition: 'background 0.1s',
              opacity: !k ? 0 : 1,
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <p className="text-xs mt-10 tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
        ENTER ACCESS CODE
      </p>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
