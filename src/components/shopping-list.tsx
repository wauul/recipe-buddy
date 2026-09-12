'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBasket, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { request } from '@/lib/client';
import type { ShoppingItem } from '@/lib/shopping';
export function ShoppingList({ recipes, userId }: { recipes: { id: string; title: string; servings: number }[]; userId: string }) {
  const [selected, setSelected] = useState<string[]>([]), [items, setItems] = useState<ShoppingItem[]>([]), [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [ready, setReady] = useState(false);
  const storageKey = `recipe-buddy:shopping:v1:${userId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.items) && saved.items.every((x: ShoppingItem) => typeof x.name === 'string' && Array.isArray(x.amounts) && x.amounts.every(a => typeof a === 'string')) && Array.isArray(saved.checked)) {
          setItems(saved.items); setChecked(saved.checked.filter((x: unknown) => typeof x === 'string'));
          if (Array.isArray(saved.selected)) setSelected(saved.selected.filter((id: string) => recipes.some(r => r.id === id)));
        }
      }
    } catch { /* Storage is optional; private browsing must still work. */ }
    setReady(true);
  }, [storageKey, recipes]);
  useEffect(() => { if (ready) { try { localStorage.setItem(storageKey, JSON.stringify({ items, checked, selected })); } catch { /* Keep working in memory. */ } } }, [items, checked, selected, ready, storageKey]);
  async function generate() {
    setBusy(true); setError('');
    try { setItems(await request<ShoppingItem[]>('/api/shopping-list', 'POST', { recipeIds: selected })); setChecked([]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not generate list.'); } finally { setBusy(false); }
  }
  async function toggle(name: string) {
    const next = checked.includes(name) ? checked.filter(x => x !== name) : [...checked, name]; setChecked(next);
    if (items.length > 0 && items.every(x => next.includes(x.name)) && !items.every(x => checked.includes(x.name)) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 }, colors: ['#396449', '#e7ad69', '#e8cbb7'], disableForReducedMotion: true });
    }
  }
  const done = items.filter(x => checked.includes(x.name)).length;
  return <><span className="eyebrow">PANTRY, MEET PLAN</span><div className="page-heading"><div><h1>Aisle be there for you<span className="accent">.</span></h1><p>Pick your meals. We’ll bring the list. You bring the reusable bag.</p></div></div>{!recipes.length ? <div className="empty-state"><ShoppingBasket size={54} /><h2>Can’t shop for a daydream. Yet.</h2><p>Save a recipe first, then we’ll turn it into a shopping list.</p><Link href="/recipes/new" className="button primary">Add a recipe <ArrowRight size={16} /></Link></div> : <div className="shopping-layout"><section className="form-panel"><span className="eyebrow">01 / PICK THE MENU</span><h2>What’s on the table?</h2><p>Select recipes to combine their ingredients.</p><div className="recipe-checks">{recipes.map(r => <label key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(selected.includes(r.id) ? selected.filter(x => x !== r.id) : [...selected, r.id])} /><span><strong>{r.title}</strong><small>{r.servings} servings</small></span></label>)}</div><button className="button primary" disabled={!selected.length || busy} onClick={generate}>{busy ? 'Checking the pantry…' : `Make my list (${selected.length})`}<ArrowRight size={16} /></button>{error && <p className="error" role="alert">{error}</p>}</section><section className="form-panel shopping-results"><div className="shopping-title"><div><span className="eyebrow">02 / BAG THE GOOD STUFF</span><h2>Your shopping list</h2></div>{items.length > 0 && <button className="icon-button" aria-label="Uncheck all items" onClick={() => setChecked([])}><RotateCcw size={17} /></button>}</div>{items.length ? <><div className="progress-label"><span>{done === items.length ? 'Fully stocked. Main character behavior.' : `${done} of ${items.length} ingredients in the bag`}</span><strong>{Math.round(done / items.length * 100)}%</strong></div><progress max={items.length} value={done} aria-label="Shopping completion" /><ul className="shopping-items">{items.map(item => <li key={item.name}><label className={checked.includes(item.name) ? 'checked' : ''}><input type="checkbox" checked={checked.includes(item.name)} onChange={() => toggle(item.name)} /><span><strong>{item.name}</strong><small>{item.amounts.join(' + ')}</small></span>{checked.includes(item.name) && <Check size={17} />}</label></li>)}</ul><p className="muted">Saved on this browser. Regenerate after changing your menu. Different units stay separate.</p></> : <div className="shopping-placeholder"><span>🛒</span><p>Your next grocery run,<br />minus the “what did I forget?”</p></div>}</section></div>}</>;
}
