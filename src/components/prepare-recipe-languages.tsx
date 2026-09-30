'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Languages, LoaderCircle } from 'lucide-react';
import { request } from '@/lib/client';
import type { SavedLanguages } from '@/lib/recipe-languages';
import { useTranslation } from './language-provider';
export function PrepareRecipeLanguages({ recipeIds }: { recipeIds: string[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(0),
    [error, setError] = useState('');
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      for (let index = done; index < recipeIds.length; index++) {
        const result = await request<{ translations: SavedLanguages }>(
          `/api/recipes/${recipeIds[index]}/translations`,
          'POST',
          {},
        );
        if (result.translations.pending)
          throw new Error(
            'Translations are still pending. Your original recipe is saved. Try again shortly.',
          );
        setDone(index + 1);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-panel recipe-language-settings">
      <h2>{t('Saved recipe languages')}</h2>
      <p>
        {t(
          'English and French versions are saved with each recipe. Switching languages does not regenerate them.',
        )}
      </p>
      {recipeIds.length > 0 && done < recipeIds.length ? (
        <>
          <p role="status">
            {t(
              busy
                ? 'Preparing recipe {0} of {1}…'
                : '{0} recipes need their saved language versions.',
              { 0: busy ? done + 1 : recipeIds.length - done, 1: recipeIds.length },
            )}
          </p>
          <button className="button secondary" disabled={busy} aria-busy={busy} onClick={prepare}>
            {busy ? (
              <LoaderCircle className="translation-spinner" size={17} aria-hidden="true" />
            ) : (
              <Languages size={17} aria-hidden="true" />
            )}
            {t(busy ? 'Preparing languages…' : 'Prepare existing recipes')}
          </button>
        </>
      ) : (
        <p className="social-notice" role="status">
          {t('Your saved recipes are ready in English and French.')}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </section>
  );
}
