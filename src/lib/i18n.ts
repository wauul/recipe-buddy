import { french } from './messages.fr';

export type Locale = 'en' | 'fr';
export const localeCookie = 'rb-language';
export function parseLocale(value: unknown): Locale {
  return value === 'fr' ? 'fr' : 'en';
}
export function translator(locale: Locale) {
  return function t<T>(message: T, values?: Record<string, string | number>): T {
    if (typeof message !== 'string') return message;
    const text = locale === 'fr' ? (french[message] ?? message) : message;
    return (
      values ? text.replace(/\{(\d+)\}/g, (match, key) => String(values[key] ?? match)) : text
    ) as T;
  };
}
