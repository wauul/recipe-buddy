'use client';
import Link from 'next/link';
import { useTranslation } from './language-provider';
import { useContentTranslation } from './content-translation';

type SearchRecipe = {
  title: string;
  altTitle: string;
  ingredients: unknown;
  steps: unknown;
  href: string;
  source: string;
};
function recipeText(recipe: SearchRecipe): string[] {
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.flatMap((item) =>
        item && typeof item === 'object'
          ? [item.name, item.quantity, item.unit].filter(
              (value): value is string => typeof value === 'string',
            )
          : [],
      )
    : [];
  const steps = Array.isArray(recipe.steps)
    ? recipe.steps.filter((value): value is string => typeof value === 'string')
    : [];
  return [recipe.title, recipe.altTitle, ...ingredients, ...steps].filter(Boolean);
}
export function RecipeSearchResults({
  recipes,
  query,
  otherCount,
}: {
  recipes: SearchRecipe[];
  query: string;
  otherCount: number;
}) {
  const { t } = useTranslation();
  const read = useContentTranslation(recipes.flatMap(recipeText));
  const term = query.toLowerCase();
  const matches = query
    ? recipes.filter((recipe) =>
        recipeText(recipe).some((text) => `${text} ${read(text)}`.toLowerCase().includes(term)),
      )
    : [];
  return (
    <>
      <p role="status">
        {query
          ? t('{0} results for “{1}”', { 0: matches.length + otherCount, 1: query })
          : t('Search your recipes, recipes shared with you, pages and help.')}
      </p>
      <div className="search-results">
        {matches.map((recipe) => (
          <Link key={recipe.href} href={recipe.href}>
            <small>{t(recipe.source)}</small>
            <h2>{read(recipe.title)}</h2>
            <p>{read(recipe.altTitle) || t('Open recipe')}</p>
          </Link>
        ))}
      </div>
      {query && !matches.length && !otherCount && (
        <div className="empty-state">
          <h2>{t('No results')}</h2>
          <p>{t('Try a shorter phrase, an ingredient, or a different spelling.')}</p>
        </div>
      )}
    </>
  );
}
