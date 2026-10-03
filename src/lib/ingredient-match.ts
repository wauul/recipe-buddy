import { quantityNumber } from './shopping';
import type { Ingredient } from './validation';
const synonyms: Record<string, string> = {
  tomatoes: 'tomato', tomate: 'tomato', tomates: 'tomato', eggs: 'egg', oeuf: 'egg', oeufs: 'egg', 'œuf': 'egg', 'œufs': 'egg',
  riz: 'rice', onions: 'onion', oignon: 'onion', oignons: 'onion', ail: 'garlic', carrots: 'carrot', carotte: 'carrot', carottes: 'carrot',
  potatoes: 'potato', 'pomme de terre': 'potato', 'pommes de terre': 'potato', lait: 'milk', farine: 'flour',
  'lait d amande': 'almond milk', 'almond milks': 'almond milk', 'farine d amande': 'almond flour', 'farine d amandes': 'almond flour',
  sel: 'salt', eau: 'water', huile: 'oil', 'olive oil': 'olive oil', 'huile d olive': 'olive oil',
  'green onions': 'scallion', 'green onion': 'scallion', scallions: 'scallion', 'oignon vert': 'scallion', 'oignons verts': 'scallion',
  courgettes: 'zucchini', courgette: 'zucchini', 'bell pepper': 'pepper', 'bell peppers': 'pepper', poivron: 'pepper', poivrons: 'pepper',
};
export function normalizeIngredient(name: string) {
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').toLowerCase()
    .replace(/\((?:optional|facultati[fv]e?)\)/gi, '').replace(/['’]/g, ' ').trim().replace(/\s+/g, ' ');
  // Closed synonym map: no substring substitution or generic suffix stripping.
  return synonyms[clean] ?? clean;
}
export function rankRecipes<T extends { id: string; ingredients: Ingredient[] }>(recipes: T[], available: Ingredient[]) {
  const inventory = new Map<string, Ingredient[]>();
  for (const item of available) {
    const key = normalizeIngredient(item.name);
    inventory.set(key, [...(inventory.get(key) ?? []), item]);
  }
  return recipes.map(recipe => {
    const required = recipe.ingredients.filter(i => !/\((?:optional|facultati[fv]e?)\)/i.test(i.name));
    const missing = required.filter(i => !inventory.has(normalizeIngredient(i.name)));
    let insufficient = false, quantityUnknown = false;
    const needs = new Map<string, { total: number; unknown: boolean }>();
    for (const item of required) {
      const name = normalizeIngredient(item.name);
      if (!inventory.has(name)) continue;
      const unit = item.unit.trim().toLowerCase(), key = `${name}\0${unit}`;
      const n = quantityNumber(item.quantity), need = needs.get(key) ?? { total: 0, unknown: false };
      need.total += n ?? 0; need.unknown ||= n === null; needs.set(key, need);
    }
    for (const [key, need] of needs) {
      const [name, unit] = key.split('\0');
      const comparable = inventory.get(name)!.filter(i => i.unit.trim().toLowerCase() === unit);
      const values = comparable.map(i => quantityNumber(i.quantity));
      if (need.unknown || !values.length || values.some(v => v === null)) quantityUnknown = true;
      else if (values.reduce<number>((s, n) => s + n!, 0) < need.total) insufficient = true;
    }
    const matched = required.length - missing.length;
    return { recipe, matched, required: required.length, missing,
      quantityCaveat: insufficient ? 'insufficient' : quantityUnknown ? 'unknown' : 'check',
      allFound: missing.length === 0 };
  }).sort((a, b) => a.missing.length - b.missing.length ||
    (b.matched / (b.required || 1)) - (a.matched / (a.required || 1)) || a.recipe.id.localeCompare(b.recipe.id));
}
