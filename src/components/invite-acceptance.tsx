'use client';
import { useState } from 'react';
export function InviteAcceptance({ token }: { token: string }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  if (declined) return <p role="status">Invitation declined. No friendship was created.</p>;
  return <><button className="button primary" disabled={busy || accepted} onClick={async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setAccepted(true); setMessage('Invitation accepted. Recipes are shared individually from their action menu.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  }}>Accept invitation</button>{!accepted && <button className="button" disabled={busy} onClick={() => setDeclined(true)}>Decline</button>}<p role="status">{message}</p></>;
}
