'use client';
import { useTranslation } from '@/components/language-provider';
import Link from 'next/link';
import type { RecipeView } from '@/lib/validation';
export function RecipeBody({
  recipe,
  shopping = false,
}: {
  recipe: RecipeView;
  shopping?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="detail-columns">
      <section className="ingredients-panel">
        <h2>{t('Ingredients')}</h2>
        <ul>
          {recipe.ingredients.map((item, i) => (
            <li key={i}>
              <span>{item.name}</span>
              <strong>
                {[item.quantity, item.unit].filter(Boolean).join(' ') || t('as needed')}
              </strong>
            </li>
          ))}
        </ul>
        {shopping && (
          <Link href="/shopping-list" className="text-button">
            {t('Build a shopping list')}
          </Link>
        )}
      </section>
      <section className="method-panel">
        <h2>{t('Method')}</h2>
        <ol>
          {recipe.steps.map((step, i) => (
            <li key={i}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <p>
                <span className="sr-only">
                  {t('Step')} {i + 1}.{' '}
                </span>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
