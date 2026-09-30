'use client';
import { useTranslation } from '@/components/language-provider';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/client';
import { usernameSchema } from '@/lib/username';
import { LanguageSelector } from './language-provider';
import { ThemeSettings } from './theme-settings';
import { ChefHat } from 'lucide-react';

export function SettingsForm({
  roastEnabled,
  username,
  showHeading = true,
}: {
  roastEnabled: boolean;
  username: string;
  showHeading?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [enabled, setEnabled] = useState(roastEnabled),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [name, setName] = useState(username),
    [savedName, setSavedName] = useState(username),
    [nameBusy, setNameBusy] = useState(false),
    [nameError, setNameError] = useState(''),
    [nameNotice, setNameNotice] = useState('');
  const [toggleError, setToggleError] = useState('');
  async function saveName(event: FormEvent) {
    event.preventDefault();
    setNameError('');
    setNameNotice('');
    const parsed = usernameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0].message);
      return;
    }
    setNameBusy(true);
    try {
      const result = await request<{ username: string }>('/api/settings', 'PUT', {
        username: parsed.data,
      });
      setName(result.username);
      setSavedName(result.username);
      setNameNotice('Chef name saved. Your friends will see your new name.');
      router.refresh();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : 'Could not save your chef name.');
    } finally {
      setNameBusy(false);
    }
  }
  async function toggle() {
    setBusy(true);
    setMessage('');
    setToggleError('');
    try {
      await request('/api/settings', 'PUT', { roastEnabled: !enabled });
      setEnabled(!enabled);
      setMessage('Roast preference saved.');
      router.refresh();
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {showHeading && (
        <div className="page-heading">
          <div>
            <h1>{t('Settings')}</h1>
            <p>{t('Your chef name, recipe roasts and appearance.')}</p>
          </div>
        </div>
      )}
      <section className="form-panel username-panel">
        <h2>{t('Your chef name')}</h2>
        <p>{t('Your chef name appears on shared recipes, twists, and comments.')}</p>
        <form onSubmit={saveName} aria-busy={nameBusy}>
          <label htmlFor="username">{t('Chef name')}</label>
          <div className="username-controls">
            <input
              id="username"
              name="username"
              autoComplete="nickname"
              required
              maxLength={64}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
                setNameNotice('');
              }}
              disabled={nameBusy}
              aria-describedby={nameError ? 'username-hint username-error' : 'username-hint'}
              aria-invalid={!!nameError}
            />
            <button className="button primary" disabled={nameBusy || name.trim() === savedName}>
              {t(nameBusy ? 'Saving…' : 'Save chef name')}
            </button>
          </div>
          <p id="username-hint" className="username-hint">
            {t(
              'Change your name whenever you like. Keep using your account email to log in and add friends.',
            )}
          </p>
          {nameError && (
            <p id="username-error" role="alert" className="error">
              {t(nameError)}
            </p>
          )}
          {nameNotice && (
            <p role="status" className="social-notice">
              {t(nameNotice)}
            </p>
          )}
        </form>
      </section>
      <section className="form-panel settings-panel">
        <ChefHat aria-hidden="true" size={28} />
        <div>
          <h2>{t('Chef roast mode')}</h2>
          <p>{t('Add a playful one-liner when you import or save a recipe.')}</p>
          <small>
            {t('Switching this off hides existing roasts and stops generating new ones.')}
          </small>
        </div>
        <button
          className={`toggle ${enabled ? 'on' : ''}`}
          role="switch"
          aria-checked={enabled}
          aria-label={t('Chef roast mode')}
          disabled={busy}
          onClick={toggle}
        >
          <span />
        </button>
      </section>
      {toggleError && (
        <p className="error" role="alert">
          {t(toggleError)}
        </p>
      )}
      {message && (
        <p className="social-notice" role="status">
          {t(message)}
        </p>
      )}
      <section className="form-panel">
        <h2>{t('Language')}</h2>
        <p>
          {t(
            'Choose your language for the app, recipes and kitchen conversation. Saved originals stay intact.',
          )}
        </p>
        <LanguageSelector settings />
      </section>
      <ThemeSettings />
    </>
  );
}
