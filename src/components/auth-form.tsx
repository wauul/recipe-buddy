'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';
import { credentialsSchema } from '@/lib/validation';
import { request } from '@/lib/client';
import { Brand } from './brand';
import { GoogleSignIn } from './google-sign-in';
export function AuthForm({
  signup = false,
  googleEnabled = false,
  errorMessage = '',
}: {
  signup?: boolean;
  googleEnabled?: boolean;
  errorMessage?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const router = useRouter();
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
      router.push('/recipes');
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
        <div>
          <h1>
            Good recipes
            <br />
            <span>stay with you</span>
          </h1>
          <p>Keep your favorites, plan your shopping, and pass a recipe to a friend.</p>
        </div>
        <ol className="auth-index">
          <li>
            <span>01</span> Save the meals you love.
          </li>
          <li>
            <span>02</span> Make the shopping simple.
          </li>
          <li>
            <span>03</span> Share a little kitchen wisdom.
          </li>
        </ol>
      </section>
      <div className="auth-form-wrap">
        <form onSubmit={submit} className="auth-form" aria-busy={busy || googleBusy}>
          <h2>{signup ? 'Become a Recipe Buddy chef' : 'Welcome back, chef'}</h2>
          <p>
            {signup
              ? 'Your recipes are private until you choose to share them.'
              : 'Log in to your recipes and shopping list.'}
          </p>
          <GoogleSignIn enabled={googleEnabled} disabled={busy} onBusyChange={setGoogleBusy} />
          <div className="auth-divider">
            <span>or use email</span>
          </div>
          <label>
            Email address
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
            <label htmlFor="password">Password</label>
            <span className="password-field">
              <input
                id="password"
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={72}
                placeholder="At least 8 characters"
                disabled={busy || googleBusy}
                aria-describedby={signup ? 'password-hint' : undefined}
              />
              <button
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
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
            {signup && <small id="password-hint">Use 8 or more characters, up to 72 bytes.</small>}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy || googleBusy} className="button primary">
            {busy
              ? signup
                ? 'Creating account…'
                : 'Logging in…'
              : signup
                ? 'Create account'
                : 'Log in'}
          </button>
          <p className="auth-switch">
            {signup ? 'Already have an account?' : 'New to Recipe Buddy?'}{' '}
            <Link href={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create account'}</Link>
          </p>
          <p className="auth-privacy">
            <Link href="/privacy">How we use your information</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
