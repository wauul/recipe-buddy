import 'server-only';
import { cookies } from 'next/headers';
import { localeCookie, parseLocale, translator } from './i18n';

export function getTranslation() {
  const locale = parseLocale(cookies().get(localeCookie)?.value);
  return { locale, t: translator(locale) };
}
