'use client';
import { useTranslation } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import { applyTheme, themePreference, type ThemePreference } from '@/lib/theme';
export function ThemeSettings() {
  const { t } = useTranslation();
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    const update = () => setPreference(themePreference());
    update();
    window.addEventListener('rb-theme-change', update);
    return () => window.removeEventListener('rb-theme-change', update);
  }, []);
  return (
    <section className="form-panel theme-panel">
      <h2>{t('Appearance')}</h2>
      <p>{t('Choose a theme for this browser, or follow your device.')}</p>
      <label htmlFor="theme-preference">{t('Theme')}</label>
      <select
        id="theme-preference"
        value={preference}
        onChange={(e) => applyTheme(e.target.value as ThemePreference)}
      >
        <option value="system">{t('Use device setting')}</option>
        <option value="light">{t('Light')}</option>
        <option value="dark">{t('Dark')}</option>
      </select>
    </section>
  );
}
