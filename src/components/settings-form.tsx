'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/client';
import { usernameSchema } from '@/lib/username';

export function SettingsForm({ roastEnabled, username }: { roastEnabled: boolean; username: string }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(roastEnabled), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [name, setName] = useState(username), [savedName, setSavedName] = useState(username), [nameBusy, setNameBusy] = useState(false), [nameError, setNameError] = useState(''), [nameNotice, setNameNotice] = useState('');
  async function saveName(event: FormEvent) {
    event.preventDefault(); setNameError(''); setNameNotice('');
    const parsed = usernameSchema.safeParse(name);
    if (!parsed.success) { setNameError(parsed.error.issues[0].message); return; }
    setNameBusy(true);
    try {
      const result = await request<{ username: string }>('/api/settings', 'PUT', { username: parsed.data });
      setName(result.username); setSavedName(result.username); setNameNotice('Username saved. Your kitchen crew will see your new name.'); router.refresh();
    } catch (e) { setNameError(e instanceof Error ? e.message : 'Could not save your username.'); }
    finally { setNameBusy(false); }
  }
  async function toggle() {
    setBusy(true); setMessage('');
    try { await request('/api/settings', 'PUT', { roastEnabled: !enabled }); setEnabled(!enabled); setMessage('Preference saved. Chef got the memo.'); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }
  return <><span className="eyebrow">SEASON TO TASTE</span><div className="page-heading"><div><h1>Your kitchen rules<span className="accent">.</span></h1><p>A little personality. Exactly how you like it.</p></div></div>
    <section className="form-panel username-panel"><h2>What should the kitchen call you?</h2><p>Your username appears on shared recipes, twists, and comments.</p>
      <form onSubmit={saveName} aria-busy={nameBusy}><label htmlFor="username">Username</label><div className="username-controls"><input id="username" name="username" autoComplete="nickname" required maxLength={64} value={name} onChange={e => { setName(e.target.value); setNameError(''); setNameNotice(''); }} disabled={nameBusy} aria-describedby="username-hint" aria-invalid={!!nameError}/><button className="button primary" disabled={nameBusy || name.trim() === savedName}>{nameBusy ? 'Saving…' : 'Save username'}</button></div><p id="username-hint" className="username-hint">Starts as the part of your email before @. Change it whenever you like. Keep using your email to log in and add friends.</p>
      {nameError && <p role="alert" className="error">{nameError}</p>}{nameNotice && <p role="status" className="social-notice">{nameNotice}</p>}</form>
    </section>
    <section className="form-panel settings-panel"><span className="settings-chef">🧑‍🍳</span><div><h2>Chef roast mode</h2><p>A sarcastic little one-liner with every recipe. All in good taste. Mostly.</p><small>Switching this off hides existing roasts and stops generating new ones.</small></div><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label="Chef roast mode" disabled={busy} onClick={toggle}><span /></button></section><p role="status">{message}</p></>;
}
