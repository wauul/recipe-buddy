import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, LockKeyhole } from 'lucide-react';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { sharedRecipeWhere } from '@/lib/social-policy';
import { RecipeArt, Vibe } from '@/components/recipe-art';

export default async function SharedRecipePage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  const share = await db.recipeShare.findFirst({ where: sharedRecipeWhere(user.id, params.id), include: { recipe: { include: { user: { select: { email: true } } } } } });
  if (!share) notFound();
  const recipe = recipeView(share.recipe);
  return <>
    <Link className="back-link" href="/friends"><ArrowLeft size={16} />Back to your kitchen crew</Link>
    <div className="detail-hero"><RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} /><div><Vibe vibe={recipe.vibe} /><h1>{recipe.title}</h1>{recipe.altTitle && <p className="detail-subtitle">{recipe.altTitle}</p>}<p className="servings"><Users size={17} />{recipe.servings} servings <span>•</span>{recipe.ingredients.length} ingredients</p><p className="shared-author">From {share.recipe.user.email}’s kitchen</p>{user.roastEnabled && recipe.roastLine && <p className="speech">🧑‍🍳 {recipe.roastLine}</p>}<p className="shared-readonly"><LockKeyhole size={15} />Shared with you · only the owner can edit</p></div></div>
    <div className="detail-columns"><section className="ingredients-panel"><span className="eyebrow">THE GOOD STUFF</span><h2>Ingredients</h2><ul>{recipe.ingredients.map((item, i) => <li key={i}><span>{item.name}</span><strong>{[item.quantity, item.unit].filter(Boolean).join(' ') || 'as needed'}</strong></li>)}</ul></section><section className="method-panel"><span className="eyebrow">FROM THEIR KITCHEN TO YOURS</span><h2>Let’s make it</h2><ol>{recipe.steps.map((step, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section></div>
  </>;
}
