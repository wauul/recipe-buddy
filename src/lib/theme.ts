export type ThemePreference = 'system' | 'light' | 'dark';
export function themePreference(): ThemePreference {
  try {
    const value = localStorage.getItem('rb-theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
export function applyTheme(value: ThemePreference) {
  document.documentElement.dataset.theme =
    value === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : value;
  try {
    if (value === 'system') localStorage.removeItem('rb-theme');
    else localStorage.setItem('rb-theme', value);
  } catch {
    /* Theme remains usable without storage. */
  }
  window.dispatchEvent(new Event('rb-theme-change'));
}
