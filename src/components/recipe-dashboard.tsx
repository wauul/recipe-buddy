'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Shuffle, ArrowUpRight, Users, BookOpen, Sparkles } from 'lucide-react';
import { RecipeArt, Vibe } from './recipe-art';
import type { RecipeView } from '@/lib/validation';
type Progress = { count: number; mascot: string; days: boolean[] };
export function RecipeDashboard({ recipes, progress }: { recipes: RecipeView[]; progress: Progress }) {
  const router = useRouter();
  const [query, setQuery] = useState(''), [vibe, setVibe] = useState('all'), [shuffling, setShuffling] = useState(false);
  const filtered = recipes.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) && (vibe === 'all' || r.vibe === vibe));
  async function surprise() {
    if (!recipes.length || shuffling) return;
    setShuffling(true); await new Promise(resolve => setTimeout(resolve, 850));
    router.push(`/recipes/${recipes[Math.floor(Math.random() * recipes.length)].id}`);
  }
  return <>
    <div className="eyebrow">THE RECIPE BOX <span>•</span> MADE WITH A PINCH OF CHAOS</div>
    <div className="page-heading"><div><h1>Good things are cooking<span className="accent">.</span></h1><p>Your favorite recipes, a little inspiration, and absolutely no judgment.</p></div><Link href="/recipes/new" className="button primary"><Plus size={18} /> Add a recipe</Link></div>
    <section className="dashboard-top">
      <div className="hero-panel"><div className="hero-copy"><span className="eyebrow"><Sparkles size={14} /> LESS SCROLLING. MORE SIMMERING.</span><h2>A home for your<br />“I should make that.”</h2><p>Save the good stuff. Make a little mess.<br />Let’s figure out what’s for dinner.</p><button className="button dark" onClick={surprise} disabled={!recipes.length || shuffling}><Shuffle size={17} className={shuffling ? 'spinning' : ''} />{shuffling ? 'Consulting the pantry…' : 'Surprise me'}<ArrowUpRight size={17} /></button></div><div className="hero-art" aria-hidden="true"><span className="art-label">a dash of happy</span><div className="hero-plate">🍝</div><span className="hero-leaf">🌿</span><span className="hero-tomato">🍅</span><span className="hero-spark">✦</span></div></div>
      <div className="streak-panel"><div className="streak-top"><span className="eyebrow">YOUR COOKING ERA</span><span className="week-label">THIS WEEK</span></div><div className="streak-main"><span className="mascot" role="img" aria-label="Cooking mascot">{progress.mascot}</span><div><strong>{progress.count}<span> / 7 days</span></strong><p>{progress.count ? 'Look at you, feeding yourself.' : 'Your stove misses you.'}</p></div></div><div className="week-days">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div key={i}><span className={progress.days[i] ? 'cooked-day' : ''} aria-label={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}${progress.days[i] ? ': cooked' : ': not cooked'}`}>{progress.days[i] ? '✓' : '·'}</span><small>{day}</small></div>)}</div><p className="streak-footer">One homemade meal is a small victory. <span>♡</span></p></div>
    </section>
    <section className="collection"><div className="collection-heading"><h2>Your recipe collection <span>{recipes.length}</span></h2><label className="search"><Search size={17} /><input placeholder="Find something delicious…" aria-label="Search recipes" value={query} onChange={e => setQuery(e.target.value)} /></label></div><div className="filter-row">{['all', 'cozy', 'lazy', 'fancy', 'chaotic'].map(v => <button key={v} className={`filter ${vibe === v ? 'selected' : ''}`} onClick={() => setVibe(v)} aria-pressed={vibe === v}>{v === 'all' ? 'All recipes' : `${({ cozy: '☀', lazy: '☁', fancy: '✧', chaotic: 'ϟ' } as Record<string, string>)[v]} ${v[0].toUpperCase() + v.slice(1)}`}</button>)}<span className="filter-note">A recipe for every kind of day.</span></div>
    {filtered.length ? <div className="recipe-grid">{filtered.map(recipe => <Link className="recipe-card" href={`/recipes/${recipe.id}`} key={recipe.id}><div className="card-image"><RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} /><Vibe vibe={recipe.vibe} /></div><div className="card-body"><h3>{recipe.title}</h3><p className="alt-title">{recipe.altTitle || 'A little homemade happiness.'}</p><div className="card-bottom"><span><Users size={14} /> {recipe.servings} servings</span><span>{recipe.ingredients.length} ingredients <ArrowUpRight size={16} /></span></div></div></Link>)}</div> : <div className="empty-state"><div className="empty-illustration" aria-hidden="true">🥣<span>✦</span></div><h2>{recipes.length ? 'Nothing simmering here.' : 'Your next favorite starts here.'}</h2><p>{recipes.length ? 'Try another search or a different vibe.' : 'No recipes yet. Even instant noodles count, we don’t judge.'}</p>{!recipes.length && <Link href="/recipes/new" className="button primary"><Plus size={16} /> Add your first recipe</Link>}</div>}
    </section><footer className="page-footer"><BookOpen size={14} /> Made for real kitchens. Including the messy ones.<span>RECIPE BUDDY ✳</span></footer>
  </>;
}
