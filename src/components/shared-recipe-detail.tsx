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
  return (
    <>
      <Link className="back-link" href="/friends">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to friends
      </Link>
      <div className="detail-hero">
        <RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} />
        <div>
          <Vibe vibe={recipe.vibe} />
          <h1>{recipe.title}</h1>
          {recipe.altTitle && <p className="detail-subtitle">{recipe.altTitle}</p>}
          <UpdatedDate date={recipe.updatedAt} />
          <p className="servings">
            <Users aria-hidden="true" size={18} />
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}{' '}
            <span aria-hidden="true">·</span>
            {recipe.ingredients.length} ingredients
          </p>
          <p className="shared-author">
            From Chef {sharedBy}’s kitchen{' '}
            {chefLevel && (
              <span className="chef-level-tag">
                Lv {chefLevel.level} · {chefLevel.name}
              </span>
            )}
          </p>
          {roastEnabled && recipe.roastLine && <p className="speech">{recipe.roastLine}</p>}
          <p className="shared-readonly">
            <LockKeyhole aria-hidden="true" size={18} />
            Shared with you · only this recipe’s chef can edit
          </p>
        </div>
      </div>
      <RecipeBody recipe={recipe} />
    </>
  );
}
