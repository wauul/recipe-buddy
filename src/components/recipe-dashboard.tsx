'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Shuffle, Check } from 'lucide-react';
import type { RecipeView } from '@/lib/validation';
import { RecipeCard } from './recipe-card';
import { CookingIllustration } from './cooking-illustration';
import { ChefProgressPanel } from './chef-progress';
import type { ChefProgress } from '@/lib/chef-levels';
type Progress = { count: number; mascot: string; days: boolean[] };
export function RecipeDashboard({
  recipes,
  progress,
  chef,
}: {
  recipes: RecipeView[];
  progress: Progress;
  chef?: { name: string; progress: ChefProgress };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(''),
    [vibe, setVibe] = useState('all'),
    [shuffling, setShuffling] = useState(false);
  const filtered = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) && (vibe === 'all' || r.vibe === vibe),
  );
  function surprise() {
    if (!recipes.length || shuffling) return;
    setShuffling(true);
    router.push(`/recipes/${recipes[Math.floor(Math.random() * recipes.length)].id}`);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My recipes</h1>
          <p>A place for the meals worth making again</p>
        </div>
        <Link href="/recipes/new" className="button primary">
          <Plus aria-hidden="true" size={18} />
          Add a recipe
        </Link>
      </div>
      {chef && <ChefProgressPanel chefName={chef.name} progress={chef.progress} />}
      <section className="dashboard-top" aria-label="Cooking this week">
        <div className="dinner-prompt">
          <CookingIllustration compact />
          <div>
            <h2>What’s for dinner?</h2>
            <p>Let your recipe box choose.</p>
          </div>
          <button
            className="button secondary"
            onClick={surprise}
            disabled={!recipes.length || shuffling}
          >
            <Shuffle aria-hidden="true" size={18} />
            {shuffling ? 'Opening recipe…' : 'Choose for me'}
          </button>
        </div>
        <div className="streak-panel">
          <div className="streak-top">
            <h2>This week</h2>
            <p>{progress.count} of 7 cooking days</p>
          </div>
          <div className="week-days">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day}>
                <span
                  role="img"
                  className={progress.days[i] ? 'cooked-day' : ''}
                  aria-label={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}: ${progress.days[i] ? 'cooked' : 'not cooked'}`}
                >
                  {progress.days[i] ? (
                    <Check aria-hidden="true" size={16} />
                  ) : (
                    <span aria-hidden="true" className="day-dot" />
                  )}
                </span>
                <small>{day}</small>
              </div>
            ))}
          </div>
          <small>Monday–Sunday, UTC</small>
        </div>
      </section>
      <section className="collection" aria-labelledby="collection-title">
        <div className="collection-heading">
          <h2 id="collection-title">
            Recipe box <span>{recipes.length}</span>
          </h2>
          <label className="search">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search recipes</span>
            <input
              placeholder="Search by recipe name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="filter-row" aria-label="Filter by vibe">
          {['all', 'cozy', 'lazy', 'fancy', 'chaotic'].map((v) => (
            <button
              key={v}
              className={`filter ${vibe === v ? 'selected' : ''}`}
              onClick={() => setVibe(v)}
              aria-pressed={vibe === v}
            >
              {v === 'all' ? 'All recipes' : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <div className="recipe-grid">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CookingIllustration vibe="cozy" />
            <h2>{recipes.length ? 'No matching recipes' : 'Start your recipe box'}</h2>
            <p>
              {recipes.length
                ? 'Try another name or choose a different vibe.'
                : 'Add a recipe by hand, or import one from a website or text.'}
            </p>
            {recipes.length ? (
              <button
                className="button secondary"
                onClick={() => {
                  setQuery('');
                  setVibe('all');
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link href="/recipes/new" className="button primary">
                <Plus aria-hidden="true" size={18} />
                Add a recipe
              </Link>
            )}
          </div>
        )}
      </section>
      <footer className="page-footer">
        <span>Your recipes stay private until you share them.</span>
        <Link href="/help">Help & FAQ</Link>
      </footer>
    </>
  );
}
