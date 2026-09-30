'use client';
import { useEffect, useState } from 'react';
import { applyTheme, themePreference, type ThemePreference } from '@/lib/theme';
export function ThemeSettings() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    const update = () => setPreference(themePreference());
    update();
    window.addEventListener('rb-theme-change', update);
    return () => window.removeEventListener('rb-theme-change', update);
  }, []);
  return (
    <section className="form-panel theme-panel">
      <h2>Appearance</h2>
      <p>Choose a theme for this browser, or follow your device.</p>
      <label htmlFor="theme-preference">Theme</label>
      <select
        id="theme-preference"
        value={preference}
        onChange={(e) => applyTheme(e.target.value as ThemePreference)}
      >
        <option value="system">Use device setting</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </section>
  );
}
