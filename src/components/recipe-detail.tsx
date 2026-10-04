'use client';
import {
  ContentText,
  useContentTranslation,
  useSavedRecipeTranslations,
} from './content-translation';
import { useTranslation } from '@/components/language-provider';

import { UpdatedDate } from '@/components/updated-date';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  LoaderCircle,
  RefreshCw,
  Languages,
} from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeArt, Vibe } from './recipe-art';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';
import { RecipeBody } from './recipe-body';
import { CookingOccasion } from './cooking-occasion';
export function RecipeDetail({
  recipe: initialRecipe,
  roastEnabled,
  cookedToday,
}: {
  recipe: RecipeView;
  roastEnabled: boolean;
  cookedToday: boolean;
}) {
  const [recipe, setRecipe] = useState(initialRecipe);
  useEffect(() => {
    setRecipe(initialRecipe);
  }, [initialRecipe]);
  const [roastBusy, setRoastBusy] = useState(false),
    [translationBusy, setTranslationBusy] = useState(false);
  useSavedRecipeTranslations([recipe]);
  const { t } = useTranslation();
  const read = useContentTranslation([recipe.title]);
  const router = useRouter();
  const [, setCooked] = useState(cookedToday),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState('');
  async function refreshPersonality(kind: 'roast' | 'translations') {
    const setLoading = kind === 'roast' ? setRoastBusy : setTranslationBusy;
    setLoading(true);
    setError('');
    try {
      const result = await request<{
        roastLine?: string;
        translations: NonNullable<RecipeView['translations']>;
      }>(`/api/recipes/${recipe.id}/${kind}`, 'POST', {});
      setRecipe((current) => ({ ...current, ...result }));
      if (result.translations.pending && kind === 'translations')
        setError(
          'Translations are still pending. Your original recipe is saved. Try again shortly.',
        );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }
  async function action(kind: 'cook' | 'delete') {
    setBusy(true);
    setError('');
    try {
      await request(
        `/api/recipes/${recipe.id}${kind === 'cook' ? '/cook' : ''}`,
        kind === 'cook' ? 'POST' : 'DELETE',
        {},
      );
      if (kind === 'delete') router.push('/recipes');
      else setCooked(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/recipes" className="back-link">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('Back to recipes')}
      </Link>
      <div className="detail-hero">
        <RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={read(recipe.title)} />
        <div>
          <Vibe vibe={recipe.vibe} />
          <h1>
            <ContentText>{recipe.title}</ContentText>
          </h1>
          {recipe.altTitle && (
            <p className="detail-subtitle">
              <ContentText>{recipe.altTitle}</ContentText>
            </p>
          )}
          <UpdatedDate date={recipe.updatedAt} />
          {recipe.sourceProvenance && <p className="small-note"><a href={recipe.sourceProvenance.url} target="_blank" rel="noopener noreferrer">{recipe.sourceProvenance.publisher}</a> · {recipe.sourceProvenance.license}</p>}
          <p className="servings">
            <Users aria-hidden="true" size={17} />
            {recipe.servings} {t(recipe.servings === 1 ? 'serving' : 'servings')} <span>•</span>{' '}
            {recipe.ingredients.length} {t('ingredients')}
          </p>
          {roastEnabled && (
            <div className="recipe-roast">
              {recipe.roastLine && (
                <p className="speech" aria-live="polite">
                  <ContentText>{recipe.roastLine}</ContentText>
                </p>
              )}
              <button
                className="text-button roast-refresh"
                disabled={roastBusy || busy || translationBusy}
                aria-busy={roastBusy}
                onClick={() => refreshPersonality('roast')}
              >
                {roastBusy ? (
                  <LoaderCircle className="translation-spinner" aria-hidden="true" size={15} />
                ) : (
                  <RefreshCw aria-hidden="true" size={15} />
                )}
                {t(roastBusy ? 'Cooking up a joke…' : 'New roast')}
              </button>
            </div>
          )}
          {recipe.translations?.pending && (
            <div className="recipe-language-pending">
              <p role="status">
                {t(
                  translationBusy
                    ? 'Saving English & French versions…'
                    : 'Your recipe is saved. Its English & French versions need preparing.',
                )}
              </p>
              <button
                className="button secondary"
                disabled={translationBusy || roastBusy || busy}
                aria-busy={translationBusy}
                onClick={() => refreshPersonality('translations')}
              >
                {translationBusy ? (
                  <LoaderCircle className="translation-spinner" size={16} aria-hidden="true" />
                ) : (
                  <Languages size={16} aria-hidden="true" />
                )}
                {t(translationBusy ? 'Preparing languages…' : 'Prepare languages')}
              </button>
            </div>
          )}
          <div className="detail-actions">
            <CookingOccasion recipeId={recipe.id} servings={recipe.servings} />
            <Link className="button secondary" href={`/recipes/${recipe.id}/edit`}>
              <Pencil aria-hidden="true" size={16} />
              {t('Edit')}
            </Link>
            <button
              className="icon-button"
              aria-label={t('Delete recipe')}
              disabled={roastBusy || translationBusy}
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
          <small>{t('Cooking days are counted in UTC, Monday–Sunday.')}</small>
        </div>
      </div>
      {deleting && (
        <ConfirmDialog
          title={t('Delete this recipe?')}
          busy={busy}
          label={t('Delete recipe')}
          onCancel={() => setDeleting(false)}
          onConfirm={() => action('delete')}
        >
          <p>
            {t(
              'This permanently deletes the recipe, its shares, cooking history, twists and comments.',
            )}
          </p>
        </ConfirmDialog>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <RecipeBody recipe={recipe} shopping />
    </>
  );
}
