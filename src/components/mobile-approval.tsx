'use client';
import { useState } from 'react';
export function MobileApproval({ attempt }: { attempt: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="page narrow"><h1>Connect your Android app</h1><p>Only continue if you started this connection in Recipe Buddy on your phone.</p>
    <button className="button primary" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try {
        const res = await fetch('/api/native/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attempt }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.error);
        window.location.href = data.redirect;
      } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); setBusy(false); }
    }}>Connect and return to app</button>{error && <p role="alert">{error}</p>}</main>;
}
