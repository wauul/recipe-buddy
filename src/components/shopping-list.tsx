'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBasket, Check, RotateCcw } from 'lucide-react';
import { request } from '@/lib/client';
import type { ShoppingItem } from '@/lib/shopping';
export function ShoppingList({
  recipes,
  userId,
}: {
  recipes: { id: string; title: string; servings: number }[];
  userId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [items, setItems] = useState<ShoppingItem[]>([]),
    [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false);
  const storageKey = `recipe-buddy:shopping:v1:${userId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          Array.isArray(saved.items) &&
          saved.items.every(
            (x: ShoppingItem) =>
              typeof x.name === 'string' &&
              Array.isArray(x.amounts) &&
              x.amounts.every((a) => typeof a === 'string'),
          ) &&
          Array.isArray(saved.checked)
        ) {
          setItems(saved.items);
          setChecked(saved.checked.filter((x: unknown) => typeof x === 'string'));
          if (Array.isArray(saved.selected))
            setSelected(saved.selected.filter((id: string) => recipes.some((r) => r.id === id)));
        }
      }
    } catch {
      /* Storage is optional; private browsing must still work. */
    }
    setReady(true);
  }, [storageKey, recipes]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ items, checked, selected }));
      } catch {
        /* Keep working in memory. */
      }
    }
  }, [items, checked, selected, ready, storageKey]);
  async function generate() {
    setBusy(true);
    setError('');
    try {
      setItems(
        await request<ShoppingItem[]>('/api/shopping-list', 'POST', {
          recipeIds: selected,
        }),
      );
      setChecked([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate list.');
    } finally {
      setBusy(false);
    }
  }
  async function toggle(name: string) {
    const next = checked.includes(name) ? checked.filter((x) => x !== name) : [...checked, name];
    setChecked(next);
    if (
      items.length > 0 &&
      items.every((x) => next.includes(x.name)) &&
      !items.every((x) => checked.includes(x.name)) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#396449', '#91bd86', '#d99b4e'],
        disableForReducedMotion: true,
      });
    }
  }
  const done = items.filter((x) => checked.includes(x.name)).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Shopping list</h1>
          <p>Choose recipes and combine their ingredients.</p>
        </div>
      </div>
      {!recipes.length ? (
        <div className="empty-state">
          <ShoppingBasket aria-hidden="true" size={54} />
          <h2>Add a recipe first</h2>
          <p>Your saved recipes become the ingredients on your list.</p>
          <Link href="/recipes/new" className="button primary">
            Add a recipe{' '}
          </Link>
        </div>
      ) : (
        <div className="shopping-layout">
          <section className="form-panel">
            <h2>Choose recipes</h2>
            <p>Select recipes to combine their ingredients.</p>
            <div className="recipe-checks">
              {recipes.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() =>
                      setSelected(
                        selected.includes(r.id)
                          ? selected.filter((x) => x !== r.id)
                          : [...selected, r.id],
                      )
                    }
                  />
                  <span>
                    <strong>{r.title}</strong>
                    <small>{r.servings} servings</small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="button primary"
              disabled={!selected.length || busy}
              onClick={generate}
            >
              {busy ? 'Combining ingredients…' : `Build list (${selected.length})`}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
          <section className="form-panel shopping-results">
            <div className="shopping-title">
              <div>
                <h2>Ingredients to buy</h2>
              </div>
              {items.length > 0 && (
                <button
                  className="icon-button"
                  aria-label="Uncheck all items"
                  onClick={() => setChecked([])}
                >
                  <RotateCcw aria-hidden="true" size={17} />
                </button>
              )}
            </div>
            {items.length ? (
              <>
                <div className="progress-label">
                  <span>
                    {done === items.length
                      ? 'Everything checked'
                      : `${done} of ${items.length} ingredients checked`}
                  </span>
                  <strong>{Math.round((done / items.length) * 100)}%</strong>
                </div>
                <progress max={items.length} value={done} aria-label="Shopping completion" />
                <ul className="shopping-items">
                  {items.map((item) => (
                    <li key={item.name}>
                      <label className={checked.includes(item.name) ? 'checked' : ''}>
                        <input
                          type="checkbox"
                          checked={checked.includes(item.name)}
                          onChange={() => toggle(item.name)}
                        />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.amounts.join(' + ')}</small>
                        </span>
                        {checked.includes(item.name) && <Check aria-hidden="true" size={17} />}
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="muted">
                  Saved on this browser. Regenerate after changing your menu. Different units stay
                  separate.
                </p>
              </>
            ) : (
              <div className="shopping-placeholder">
                <ShoppingBasket aria-hidden="true" size={40} />
                <p>Choose your recipes, then build the list</p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
