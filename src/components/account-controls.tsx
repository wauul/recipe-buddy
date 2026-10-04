'use client';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import {clearMealDrafts} from '@/lib/meal-drafts';
import { useTranslation } from './language-provider';
import { request } from '@/lib/client';
import legal from '@/lib/legal-content.json';
export function TermsAcceptance() {
  const { locale } = useTranslation();
  const fr = locale === 'fr';
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  return <section className="form-panel"><h2>{fr ? 'Accepter les conditions' : 'Accept the terms'}</h2>
    <label><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} /> {fr ? 'J’accepte les conditions d’utilisation.' : 'I accept the Terms of use.'}</label>
    <button className="button primary" disabled={!checked || busy} onClick={async () => { setBusy(true); setNotice(''); try { await request('/api/account/terms', 'POST', { version: legal.version, accepted: true }); setNotice(fr ? 'Conditions acceptées.' : 'Terms accepted.'); } catch (e) { setNotice(e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } }}>{fr ? 'Accepter' : 'Accept'}</button>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
export function DeleteAccountForm({ accountId, email }: { accountId?: string; email?: string | null }) {
  const { locale } = useTranslation(); const fr = locale === 'fr';
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!accountId) return <section className="form-panel"><p>{fr ? 'Connectez-vous pour supprimer votre compte ou contactez-nous depuis l’email du compte.' : 'Sign in to delete your account, or contact us from the account’s email address.'}</p><Link className="button primary" href="/login?callbackUrl=%2Fdelete-account">{fr ? 'Se connecter' : 'Sign in'}</Link></section>;
  return <form className="form-panel" aria-busy={busy} onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await request('/api/account', 'DELETE', { confirmation, ...(password ? { password } : {}) });
      try {
        Object.keys(localStorage).filter(key => key.includes(accountId) && (key.startsWith('rb-') || key.startsWith('recipe-buddy:'))).forEach(key => localStorage.removeItem(key));
        sessionStorage.removeItem('rb-browser-import-v1');
      } catch { /* Browser storage restrictions must not prevent sign-out after deletion. */ }
      setPassword(''); clearMealDrafts();await signOut({ callbackUrl: '/login?deleted=1' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); setPassword(''); setBusy(false); }
  }}>
    <h2>{fr ? 'Supprimer définitivement' : 'Delete permanently'}</h2><p>{email}</p>
    <p>{fr ? 'Saisissez votre mot de passe, ou reconnectez-vous avec Google puis revenez ici sous 5 minutes.' : 'Enter your current password, or sign in again with Google and return here within 5 minutes.'}</p>
    <label htmlFor="delete-password">{fr ? 'Mot de passe actuel (si utilisé)' : 'Current password (if used)'}</label><input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={128} />
    <label htmlFor="delete-confirm">{fr ? 'Saisissez DELETE pour confirmer' : 'Type DELETE to confirm'}</label><input id="delete-confirm" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" />
    {error && <p role="alert" className="error">{error}</p>}
    <button className="button danger" disabled={busy || confirmation !== 'DELETE'}>{fr ? 'Supprimer le compte et ses données' : 'Delete account and its data'}</button>
  </form>;
}
export function LegalAccountLinks() {
  const { locale } = useTranslation(); const fr = locale === 'fr';
  return <section className="form-panel"><h2>{fr ? 'Confidentialité et compte' : 'Privacy and account'}</h2><div className="form-actions"><Link href="/privacy">{fr ? 'Confidentialité' : 'Privacy policy'}</Link><Link href="/terms">{fr ? 'Conditions' : 'Terms of use'}</Link><Link href="/delete-account">{fr ? 'Supprimer le compte' : 'Delete account'}</Link><a href={'mailto:' + legal.email}>{fr ? 'Assistance' : 'Support'}</a></div></section>;
}
