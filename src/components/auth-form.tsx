'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ChefHat, ArrowRight } from 'lucide-react';
import { credentialsSchema } from '@/lib/validation';
import { request } from '@/lib/client';
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter(); const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); const form = new FormData(e.currentTarget);
    const parsed = credentialsSchema.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (signup) await request('/api/auth/signup', 'POST', parsed.data);
      const result = await signIn('credentials', { ...parsed.data, redirect: false });
      if (result?.error || !result?.ok) throw new Error(signup ? 'Account created. Please log in to continue.' : 'Check your email and password, or try again later.');
      router.push('/recipes'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-story"><Link href="/" className="brand"><span className="brand-icon"><ChefHat /></span>recipe<span className="brand-light">buddy</span></Link><div><span className="eyebrow">YOUR KITCHEN, BUT A LITTLE MORE FUN</span><h1>Good food.<br />Questionable<br /><em>chef jokes.</em></h1><p>A cozy home for your recipes, your shopping lists,<br />and your next “actually, I made this” moment.</p><div className="auth-food" aria-hidden="true">🍝<span>✳</span></div></div><small>NO FANCY EQUIPMENT. JUST YOU AND AN APPETITE.</small></div><div className="auth-form-wrap"><form onSubmit={submit} className="auth-form"><span className="eyebrow">PULL UP A CHAIR</span><h2>{signup ? 'Join the kitchen.' : 'Welcome back, chef.'}</h2><p>{signup ? 'Your recipe collection deserves a home.' : 'Something delicious is waiting for you.'}</p><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="chef@example.com" /></label><label>Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} placeholder="At least 8 characters" /></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy ? 'Opening the kitchen…' : signup ? 'Create account' : 'Let’s get cooking'}<ArrowRight size={18} /></button><p className="auth-switch">{signup ? 'Already part of the kitchen?' : 'New around here?'} <Link href={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link></p></form></div></main>;
}
