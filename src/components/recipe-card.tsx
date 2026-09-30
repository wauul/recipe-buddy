import Link from 'next/link';
import { Users } from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeArt, Vibe } from './recipe-art';
import { UpdatedDate } from './updated-date';
export function RecipeCard({ recipe, sharedBy }: { recipe: RecipeView; sharedBy?: string }) {
  return (
    <Link className="recipe-card" href={`/${sharedBy ? 'shared' : 'recipes'}/${recipe.id}`}>
      <div className="card-image">
        <RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} />
        <Vibe vibe={recipe.vibe} />
      </div>
      <div className="card-body">
        <h3>{recipe.title}</h3>
        {sharedBy && <p className="shared-by">From Chef {sharedBy}</p>}
        {recipe.altTitle && <p className="alt-title">{recipe.altTitle}</p>}
        <UpdatedDate date={recipe.updatedAt} />
        <div className="card-bottom">
          <span>
            <Users aria-hidden="true" size={16} />
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </span>
          <span>{recipe.ingredients.length} ingredients</span>
        </div>
      </div>
    </Link>
  );
}
