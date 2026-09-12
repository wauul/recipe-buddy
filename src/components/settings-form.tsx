'use client';
import { useState } from 'react';
import { request } from '@/lib/client';
export function SettingsForm({ roastEnabled }: { roastEnabled: boolean }) {
  const [enabled, setEnabled] = useState(roastEnabled), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function toggle() {
    setBusy(true); setMessage('');
    try { await request('/api/settings', 'PUT', { roastEnabled: !enabled }); setEnabled(!enabled); setMessage('Preference saved. Chef got the memo.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }
  return <><span className="eyebrow">SEASON TO TASTE</span><div className="page-heading"><div><h1>Your kitchen rules<span className="accent">.</span></h1><p>A little personality. Exactly how you like it.</p></div></div><section className="form-panel settings-panel"><span className="settings-chef">🧑‍🍳</span><div><h2>Chef roast mode</h2><p>A sarcastic little one-liner with every recipe. All in good taste. Mostly.</p><small>Switching this off hides existing roasts and stops generating new ones.</small></div><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label="Chef roast mode" disabled={busy} onClick={toggle}><span /></button></section><p role="status">{message}</p></>;
}
