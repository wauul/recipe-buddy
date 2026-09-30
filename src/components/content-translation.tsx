'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Languages, LoaderCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { translator, type Locale } from '@/lib/i18n';
import { recipeLanguageSeed, type SavedLanguages } from '@/lib/recipe-languages';
import type { RecipeView } from '@/lib/validation';
import { translationBatch, validateTranslations } from '@/lib/content-translation';

type Context = {
  read: (text: string) => string;
  register: (texts: string[]) => void;
  version: number;
  seed: (languages: SavedLanguages) => void;
  notice?: React.ReactNode;
};
const ContentContext = createContext<Context>({
  read: (text) => text,
  register: () => {},
  version: 0,
  seed: () => {},
});

export function ContentTranslationProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const publicPage = ['/', '/login', '/signup', '/privacy'].includes(pathname);
  const [version, setVersion] = useState(0);
  const [originals, setOriginals] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const state = useRef({
    locale,
    cache: new Map<string, string>(),
    pending: new Set<string>(),
    failed: false,
    active: false,
  });
  const saved = useRef({ en: new Map<string, string>(), fr: new Map<string, string>() });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const controller = useRef<AbortController>();
  const t = translator(locale);
  const flush = useCallback(async () => {
    const current = state.current;
    if (current.active || current.failed || !current.pending.size) return;
    current.active = true;
    setBusy(true);
    controller.current = new AbortController();
    let retries = 0;
    try {
      while (current.pending.size && state.current === current) {
        const texts = translationBatch(current.pending);
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: current.locale, texts }),
          signal: controller.current.signal,
        });
        if (response.status === 429 && retries < 3) {
          const retry = Number(response.headers.get('Retry-After')) || 15;
          if (retry <= 60) {
            retries++;
            const signal = controller.current.signal;
            await new Promise<void>((resolve, reject) => {
              const abort = () => {
                clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
              };
              const timeout = setTimeout(
                () => {
                  signal.removeEventListener('abort', abort);
                  resolve();
                },
                (retry + 1) * 1000,
              );
              if (signal.aborted) abort();
              else signal.addEventListener('abort', abort, { once: true });
            });
            continue;
          }
        }
        if (!response.ok) throw new Error('Translation unavailable');
        const translated = validateTranslations(texts, await response.json());
        if (state.current !== current) return;
        texts.forEach((text, index) => {
          current.cache.set(text, translated[index]);
          current.pending.delete(text);
        });
        setVersion((value) => value + 1);
        retries = 0;
      }
    } catch {
      if (state.current === current) {
        current.failed = true;
        setFailed(true);
        setOriginals(true);
      }
    } finally {
      current.active = false;
      if (state.current === current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    controller.current?.abort();
    clearTimeout(timer.current);
    state.current = {
      locale,
      cache: new Map(saved.current[locale]),
      pending: new Set(),
      failed: false,
      active: false,
    };
    setFailed(false);
    setBusy(false);
    setOriginals(false);
    setVersion((value) => value + 1);
    setHasContent(false);
    return () => {
      controller.current?.abort();
      clearTimeout(timer.current);
    };
  }, [locale, publicPage]);
  const seed = useCallback((languages: SavedLanguages) => {
    for (const language of ['en', 'fr'] as const) {
      for (const [source, translated] of Object.entries(languages[language]))
        saved.current[language].set(source, translated);
    }
    let changed = false;
    for (const [source, translated] of Object.entries(languages[state.current.locale])) {
      if (state.current.cache.get(source) !== translated) changed = true;
      state.current.cache.set(source, translated);
      state.current.pending.delete(source);
    }
    if (changed) setVersion((value) => value + 1);
  }, []);
  const register = useCallback(
    (texts: string[]) => {
      const current = state.current;
      for (const text of texts) {
        const stored = saved.current[current.locale].get(text);
        if (stored !== undefined) {
          current.cache.set(text, stored);
          current.pending.delete(text);
        } else if (text.trim() && !current.cache.has(text)) current.pending.add(text);
      }
      if (texts.some((text) => text.trim())) setHasContent(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, 80);
    },
    [flush],
  );
  const read = useCallback(
    (text: string) =>
      originals || state.current.locale !== locale ? text : (state.current.cache.get(text) ?? text),
    [originals, locale],
  );
  const notice =
    !publicPage && hasContent ? (
      <aside className="translation-notice" aria-label={t('Recipe language')}>
        <span role="status">
          {busy ? (
            <LoaderCircle className="translation-spinner" size={15} aria-hidden="true" />
          ) : (
            <Languages size={15} aria-hidden="true" />
          )}
          {t(
            busy
              ? 'Translating recipes…'
              : failed
                ? 'Translation unavailable. Showing originals.'
                : originals
                  ? 'Original text'
                  : 'Recipes in your language',
          )}
        </span>
        {failed && (
          <button
            onClick={() => {
              state.current.failed = false;
              setFailed(false);
              setOriginals(false);
              void flush();
            }}
          >
            {t('Try again')}
          </button>
        )}
        {!failed && (
          <button onClick={() => setOriginals((value) => !value)}>
            {t(originals ? 'Show translations' : 'Show originals')}
          </button>
        )}
      </aside>
    ) : null;
  const value = { read, register, version, notice, seed };
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function ContentTranslationNotice() {
  return useContext(ContentContext).notice;
}

export function useContentTranslation(texts: string[]) {
  const { read, register, version } = useContext(ContentContext);
  const key = JSON.stringify(texts);
  useEffect(() => {
    register(JSON.parse(key));
  }, [key, register, version]);
  return read;
}

export function ContentText({ children }: { children: string }) {
  const read = useContentTranslation([children]);
  return <>{read(children)}</>;
}

export function useSavedRecipeTranslations(recipes: RecipeView[]) {
  const { seed } = useContext(ContentContext);
  const key = JSON.stringify(recipes.map(recipeLanguageSeed));
  useEffect(() => {
    for (const languages of JSON.parse(key)) seed(languages);
  }, [key, seed]);
}
export function SavedRecipeLanguages({ recipes }: { recipes: RecipeView[] }) {
  useSavedRecipeTranslations(recipes);
  return null;
}
