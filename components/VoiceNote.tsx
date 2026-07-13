'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadVoiceNote, saveVoiceNoteUrl, removeVoiceNote } from '@/lib/storage';
import { ShoeEntry } from '@/lib/categories';

interface Props {
  entry: ShoeEntry;
  onUpdated: (updated: ShoeEntry) => void;
}

export default function VoiceNote({ entry, onUpdated }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      mediaRef.current?.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setUploading(true);
        try {
          const url = await uploadVoiceNote(blob, entry.id!);
          await saveVoiceNoteUrl(entry.id!, url);
          onUpdated({ ...entry, voice_note_url: url });
        } catch (err) {
          console.error('Voice note upload failed:', err);
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(entry.voice_note_url!);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => { setPlaying(false); alert('Could not play voice note.'); };
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this voice note?')) return;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setDeleting(true);
    try {
      await removeVoiceNote(entry.id!, entry.voice_note_url!);
      onUpdated({ ...entry, voice_note_url: '' });
    } catch (err) {
      console.error('Voice note delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const hasNote = !!entry.voice_note_url;
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
    flexShrink: 0, transition: 'opacity 0.15s',
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ marginTop: 4 }}
    >
      {hasNote ? (
        <>
          <button
            onClick={togglePlay}
            title={playing ? 'Stop playback' : 'Play voice note'}
            style={{
              ...btnBase,
              background: playing ? 'rgba(196,21,21,0.1)' : 'rgba(29,111,66,0.08)',
              color: playing ? 'var(--red)' : '#1d6f42',
            }}
          >
            {playing ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3l14 9-14 9V3z"/>
              </svg>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete voice note"
            style={{ ...btnBase, background: 'rgba(196,21,21,0.06)', color: 'var(--red)', opacity: deleting ? 0.5 : 1 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>VOICE</span>
        </>
      ) : (
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          title={recording ? 'Stop recording' : 'Record voice note'}
          style={{
            ...btnBase,
            background: recording ? 'rgba(196,21,21,0.12)' : 'var(--gold-faint2)',
            color: recording ? 'var(--red)' : 'var(--gold)',
            animation: recording ? 'pulse 1s infinite' : undefined,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
            </svg>
          ) : recording ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
