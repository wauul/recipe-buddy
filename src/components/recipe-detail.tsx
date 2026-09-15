'use client';
import { UpdatedDate } from '@/components/updated-date';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Check, CookingPot, Users } from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeArt, Vibe } from './recipe-art';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';
export function RecipeDetail({ recipe, roastEnabled, cookedToday }: { recipe: RecipeView; roastEnabled: boolean; cookedToday: boolean }) {
  const router = useRouter(); const [cooked, setCooked] = useState(cookedToday), [busy, setBusy] = useState(false), [deleting, setDeleting] = useState(false), [error, setError] = useState('');
  async function action(kind: 'cook' | 'delete') {
    setBusy(true); setError('');
    try { await request(`/api/recipes/${recipe.id}${kind === 'cook' ? '/cook' : ''}`, kind === 'cook' ? 'POST' : 'DELETE', {}); if (kind === 'delete') router.push('/recipes'); else setCooked(true); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); } finally { setBusy(false); }
  }
  return <><Link href="/recipes" className="back-link"><ArrowLeft size={16} />Back to recipes</Link><div className="detail-hero"><RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} /><div><Vibe vibe={recipe.vibe} /><h1>{recipe.title}</h1>{recipe.altTitle && <p className="detail-subtitle">{recipe.altTitle}</p>}<UpdatedDate date={recipe.updatedAt}/><p className="servings"><Users size={17} />{recipe.servings} servings <span>•</span> {recipe.ingredients.length} ingredients</p>{roastEnabled && recipe.roastLine && <p className="speech">🧑‍🍳 {recipe.roastLine}</p>}<div className="detail-actions"><button className="button primary" disabled={busy || cooked} onClick={() => action('cook')}>{cooked ? <Check size={18} /> : <CookingPot size={18} />}{cooked ? 'Cooked today. Nailed it!' : 'Mark as cooked'}</button><Link className="button secondary" href={`/recipes/${recipe.id}/edit`}><Pencil size={16} />Edit</Link><button className="icon-button" aria-label="Delete recipe" onClick={() => setDeleting(true)}><Trash2 size={18} /></button></div><small>Cooking days are counted in UTC, Monday–Sunday.</small></div></div>
    {deleting && <ConfirmDialog title="Retire this recipe?" busy={busy} label="Delete recipe" onCancel={() => setDeleting(false)} onConfirm={() => action('delete')}><p>This permanently deletes the recipe, its shares and cooking history.</p></ConfirmDialog>}{error && <p className="error" role="alert">{error}</p>}<div className="detail-columns"><section className="ingredients-panel"><span className="eyebrow">THE GOOD STUFF</span><h2>Ingredients</h2><ul>{recipe.ingredients.map((item, i) => <li key={i}><span>{item.name}</span><strong>{[item.quantity, item.unit].filter(Boolean).join(' ') || 'as needed'}</strong></li>)}</ul><Link href="/shopping-list" className="text-button">Build a shopping list →</Link></section><section className="method-panel"><span className="eyebrow">YOU’VE GOT THIS</span><h2>Let’s make it</h2><ol>{recipe.steps.map((step, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section></div></>;
}
