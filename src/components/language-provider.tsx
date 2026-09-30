'use client';
import { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { localeCookie, parseLocale, translator, type Locale } from '@/lib/i18n';
import { ContentTranslationProvider } from './content-translation';

const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: 'en',
  setLocale: () => {},
});

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return (
    <LanguageContext.Provider value={value}>
      <ContentTranslationProvider locale={locale}>{children}</ContentTranslationProvider>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const { locale } = useContext(LanguageContext);
  return { locale, t: useMemo(() => translator(locale), [locale]) };
}

export function LanguageSelector({ settings = false }: { settings?: boolean }) {
  const id = useId();
  const { locale, setLocale } = useContext(LanguageContext);
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <div className={settings ? 'language-settings' : 'language-selector'}>
      <label htmlFor={id} className={settings ? '' : 'sr-only'}>
        {t('Language')}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(event) => {
          const next = parseLocale(event.target.value);
          document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
          setLocale(next);
          router.refresh();
        }}
      >
        <option value="en" lang="en">
          {t(settings ? 'English' : 'EN')}
        </option>
        <option value="fr" lang="fr">
          {t(settings ? 'Français' : 'FR')}
        </option>
      </select>
    </div>
  );
}
