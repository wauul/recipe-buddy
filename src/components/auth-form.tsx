'use client';
import { useTranslation } from '@/components/language-provider';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, BookOpen, ArrowRight, ShoppingBasket, ChefHat } from 'lucide-react';
import { credentialsSchema } from '@/lib/validation';
import { request } from '@/lib/client';
import { Brand } from './brand';
import { GoogleSignIn } from './google-sign-in';
export function AuthForm({
  signup = false,
  googleEnabled = false,
  errorMessage = '',
  callbackUrl = '/recipes',
}: {
  signup?: boolean;
  googleEnabled?: boolean;
  errorMessage?: string;
  callbackUrl?: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const router = useRouter();
  const destination = callbackUrl === '/import' || /^\/(?:mobile\/connect\?attempt=c[a-z0-9]+|invite\/[A-Za-z0-9_-]{43})$/.test(callbackUrl) ? callbackUrl : '/recipes';
  const [error, setError] = useState(errorMessage),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const parsed = credentialsSchema.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (signup) await request('/api/auth/signup', 'POST', parsed.data);
      const result = await signIn('credentials', {
        ...parsed.data,
        redirect: false,
      });
      if (result?.error || !result?.ok)
        throw new Error(
          signup
            ? 'Account created. Log in to continue.'
            : 'Check your email and password, or try again later.',
        );
      router.push(destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="auth-page">
      <section className="auth-story">
        <Brand href="/" />
        <div className="auth-story-content">
          <p className="auth-eyebrow">{t('A little less “what’s for dinner?”')}</p>
          <h1>
            {t('Good recipes')}
            <br />
            <span>{t('stay with you')}</span>
          </h1>
          <p>{t('Keep your favorites, plan your shopping, and pass a recipe to a friend.')}</p>
          <div className="auth-kitchen-flow" aria-hidden="true">
            <span>
              <BookOpen size={24} />
              {t('Save')}
            </span>
            <ArrowRight size={20} />
            <span>
              <ShoppingBasket size={24} />
              {t('Plan')}
            </span>
            <ArrowRight size={20} />
            <span>
              <ChefHat size={24} />
              {t('Cook')}
            </span>
          </div>
        </div>
        <p className="auth-story-footer">
          {t('Made for real kitchens. And wonderfully imperfect chefs.')}
        </p>
      </section>
      <div className="auth-form-wrap">
        <form onSubmit={submit} className="auth-form" aria-busy={busy || googleBusy}>
          <p className="auth-eyebrow">Recipe Buddy</p>
          <h1>{t(signup ? 'Become a Recipe Buddy chef' : 'Welcome back, chef')}</h1>
          <p>
            {t(
              signup
                ? 'Your recipes are private until you choose to share them.'
                : 'Log in to your recipes and shopping list.',
            )}
          </p>
          <GoogleSignIn enabled={googleEnabled} disabled={busy} onBusyChange={setGoogleBusy} callbackUrl={destination} />
          <div className="auth-divider">
            <span>{t('or use email')}</span>
          </div>
          <label>
            {t('Email address')}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              disabled={busy || googleBusy}
            />
          </label>
          <div className="auth-password">
            <label htmlFor="password">{t('Password')}</label>
            <span className="password-field">
              <input
                id="password"
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={72}
                placeholder={t(signup ? 'At least 8 characters' : 'Your password')}
                disabled={busy || googleBusy}
                aria-describedby={signup ? 'password-hint' : undefined}
              />
              <button
                type="button"
                aria-label={t(visible ? 'Hide password' : 'Show password')}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <EyeOff aria-hidden="true" size={20} />
                ) : (
                  <Eye aria-hidden="true" size={20} />
                )}
              </button>
            </span>
            {signup && (
              <small id="password-hint">{t('Use 8 or more characters, up to 72 bytes.')}</small>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <button disabled={busy || googleBusy} className="button primary">
            {t(
              busy
                ? signup
                  ? 'Creating account…'
                  : 'Logging in…'
                : signup
                  ? 'Create account'
                  : 'Log in',
            )}
          </button>
          <p className="auth-switch">
            {t(signup ? 'Already have an account?' : 'New to Recipe Buddy?')}{' '}
            <Link href={`${signup ? '/login' : '/signup'}?callbackUrl=${encodeURIComponent(destination)}`}>
              {t(signup ? 'Log in' : 'Create account')}
            </Link>
          </p>
          <p className="auth-privacy">
            <Link href="/privacy">{t('How we use your information')}</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
