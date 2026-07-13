'use client';

import { useEffect, useState } from 'react';

interface Props {
  src: string;
  label: string;
  style?: React.CSSProperties;
  alt?: string;
}

export default function LabeledPhoto({ src, label, style, alt = '' }: Props) {
  const [compositedSrc, setCompositedSrc] = useState<string>(src);

  useEffect(() => {
    if (!src || !label) { setCompositedSrc(src); return; }
    let cancelled = false;
    let blobUrl: string | null = null;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.max(20, Math.round(img.naturalWidth * 0.045));
      ctx.font = `bold ${fontSize}px monospace`;
      const padding = Math.round(fontSize * 0.5);
      const textWidth = ctx.measureText(label).width;
      const barHeight = fontSize + padding * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, img.naturalHeight - barHeight, img.naturalWidth, barHeight);
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, (img.naturalWidth - textWidth) / 2, img.naturalHeight - barHeight / 2);

      canvas.toBlob((blob) => {
        if (cancelled || !blob) return;
        blobUrl = URL.createObjectURL(blob);
        setCompositedSrc(blobUrl);
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => { if (!cancelled) setCompositedSrc(src); };
    img.src = src;

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, label]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={compositedSrc} alt={alt} style={style} />;
}
