'use client';
import { ContentText, useContentTranslation } from './content-translation';
import { useTranslation } from '@/components/language-provider';
import Link from 'next/link';
import { ArrowLeft, Users, LockKeyhole } from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeArt, Vibe } from './recipe-art';
import { RecipeBody } from './recipe-body';
import { UpdatedDate } from './updated-date';
export function SharedRecipeDetail({
  recipe,
  sharedBy,
  roastEnabled,
  chefLevel,
}: {
  recipe: RecipeView;
  sharedBy: string;
  roastEnabled: boolean;
  chefLevel?: { level: number; name: string };
}) {
  const { t } = useTranslation();
  const read = useContentTranslation([recipe.title]);
  return (
    <>
      <Link className="back-link" href="/friends">
        <ArrowLeft aria-hidden="true" size={18} />
        {t('Back to friends')}
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
          <p className="servings">
            <Users aria-hidden="true" size={18} />
            {recipe.servings} {t(recipe.servings === 1 ? 'serving' : 'servings')}{' '}
            <span aria-hidden="true">·</span>
            {recipe.ingredients.length} {t('ingredients')}
          </p>
          <p className="shared-author">
            {t('From Chef')} {sharedBy}
            {t('’s kitchen')}{' '}
            {chefLevel && (
              <span className="chef-level-tag">
                {t('Lv')} {chefLevel.level} · {t(chefLevel.name)}
              </span>
            )}
          </p>
          {roastEnabled && recipe.roastLine && (
            <p className="speech">
              <ContentText>{recipe.roastLine}</ContentText>
            </p>
          )}
          <p className="shared-readonly">
            <LockKeyhole aria-hidden="true" size={18} />
            {t('Shared with you · only this recipe’s chef can edit')}
          </p>
        </div>
      </div>
      <RecipeBody recipe={recipe} />
    </>
  );
}
