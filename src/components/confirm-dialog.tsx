'use client';
import { useEffect, useRef } from 'react';
export function ConfirmDialog({ title, children, busy, onCancel, onConfirm, label = 'Confirm' }: { title: string; children: React.ReactNode; busy?: boolean; onCancel: () => void; onConfirm: () => void; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog=ref.current; const previous=document.activeElement as HTMLElement; dialog?.showModal(); return () => { dialog?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="confirm-modal" aria-labelledby="confirm-title" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="confirm-title">{title}</h2><div>{children}</div><div className="dialog-actions"><button autoFocus className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : label}</button></div></dialog>;
}
