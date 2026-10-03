import 'server-only';
import { cookies } from 'next/headers';
import { localeCookie, parseLocale, translator } from './i18n';

export async function getTranslation() {
  const locale = parseLocale((await cookies()).get(localeCookie)?.value);
  return { locale, t: translator(locale) };
}
