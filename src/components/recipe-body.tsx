import Link from 'next/link';
import type { RecipeView } from '@/lib/validation';
export function RecipeBody({
  recipe,
  shopping = false,
}: {
  recipe: RecipeView;
  shopping?: boolean;
}) {
  return (
    <div className="detail-columns">
      <section className="ingredients-panel">
        <h2>Ingredients</h2>
        <ul>
          {recipe.ingredients.map((item, i) => (
            <li key={i}>
              <span>{item.name}</span>
              <strong>{[item.quantity, item.unit].filter(Boolean).join(' ') || 'as needed'}</strong>
            </li>
          ))}
        </ul>
        {shopping && (
          <Link href="/shopping-list" className="text-button">
            Build a shopping list
          </Link>
        )}
      </section>
      <section className="method-panel">
        <h2>Method</h2>
        <ol>
          {recipe.steps.map((step, i) => (
            <li key={i}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <p>
                <span className="sr-only">Step {i + 1}. </span>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
