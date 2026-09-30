'use client';
import { UpdatedDate } from '@/components/updated-date';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Check, CookingPot, Users, LoaderCircle } from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeArt, Vibe } from './recipe-art';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';
import { RecipeBody } from './recipe-body';
export function RecipeDetail({
  recipe,
  roastEnabled,
  cookedToday,
}: {
  recipe: RecipeView;
  roastEnabled: boolean;
  cookedToday: boolean;
}) {
  const router = useRouter();
  const [cooked, setCooked] = useState(cookedToday),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState('');
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
        Back to recipes
      </Link>
      <div className="detail-hero">
        <RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} />
        <div>
          <Vibe vibe={recipe.vibe} />
          <h1>{recipe.title}</h1>
          {recipe.altTitle && <p className="detail-subtitle">{recipe.altTitle}</p>}
          <UpdatedDate date={recipe.updatedAt} />
          <p className="servings">
            <Users aria-hidden="true" size={17} />
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'} <span>•</span>{' '}
            {recipe.ingredients.length} ingredients
          </p>
          {roastEnabled && recipe.roastLine && <p className="speech">{recipe.roastLine}</p>}
          <div className="detail-actions">
            <button
              className={`button primary ${cooked ? 'just-cooked' : ''}`}
              disabled={busy || cooked}
              aria-busy={busy}
              onClick={() => action('cook')}
            >
              {busy ? (
                <LoaderCircle aria-hidden="true" size={18} />
              ) : cooked ? (
                <Check aria-hidden="true" size={18} />
              ) : (
                <CookingPot aria-hidden="true" size={18} />
              )}
              {busy ? 'Saving cooking day…' : cooked ? 'Cooked today' : 'Mark as cooked'}
            </button>
            <Link className="button secondary" href={`/recipes/${recipe.id}/edit`}>
              <Pencil aria-hidden="true" size={16} />
              Edit
            </Link>
            <button
              className="icon-button"
              aria-label="Delete recipe"
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
          <small>Cooking days are counted in UTC, Monday–Sunday.</small>
        </div>
      </div>
      {deleting && (
        <ConfirmDialog
          title="Delete this recipe?"
          busy={busy}
          label="Delete recipe"
          onCancel={() => setDeleting(false)}
          onConfirm={() => action('delete')}
        >
          <p>
            This permanently deletes the recipe, its shares, cooking history, twists and comments.
          </p>
        </ConfirmDialog>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <RecipeBody recipe={recipe} shopping />
    </>
  );
}
