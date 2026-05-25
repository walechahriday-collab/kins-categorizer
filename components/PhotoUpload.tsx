'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
}

export default function PhotoUpload({ value, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setDragOver(false);

      // FileReader blocked in Safari Lockdown mode — fall back to object URL
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => onChange(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        onChange(URL.createObjectURL(file));
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
  });

  return (
    <div
      {...getRootProps()}
      className="relative flex items-center justify-center rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        height: value ? 140 : 72,
        border: dragOver ? '2px solid var(--red)' : '1.5px dashed var(--border-mid)',
        background: dragOver ? 'rgba(196,21,21,0.05)' : 'var(--bg)',
      }}
    >
      <input {...getInputProps()} />

      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Shoe photo" className="h-full w-full object-contain" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(26,19,16,0.65)' }}
          >
            <span className="text-xs tracking-widest font-semibold" style={{ color: '#fff' }}>
              CHANGE PHOTO
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 pointer-events-none select-none">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V8m0 0-3 3m3-3 3 3M20 16.7A5 5 0 0 0 16 7h-.5A7.5 7.5 0 1 0 4 14.3"
              stroke="var(--red)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          </svg>
          <div>
            <p className="text-xs tracking-widest font-semibold" style={{ color: 'var(--text-mid)', fontSize: '0.65rem' }}>
              ATTACH SHOE PHOTO
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>
              drag & drop or tap to choose
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
