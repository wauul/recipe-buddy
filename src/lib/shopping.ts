import type { Ingredient } from './validation';
const aliases: Record<string, string> = { cups: 'cup', tablespoons: 'tbsp', tablespoon: 'tbsp', teaspoons: 'tsp', teaspoon: 'tsp', grams: 'g', gram: 'g', kilograms: 'kg', kilogram: 'kg', milliliters: 'ml', milliliter: 'ml', liters: 'l', liter: 'l', ounces: 'oz', ounce: 'oz', pounds: 'lb', pound: 'lb', cloves: 'clove' };
const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
export function quantityNumber(raw: string): number | null {
  const fractions: Record<string, string> = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' };
  const value = raw.replace(/[½¼¾⅓⅔⅛]/g, f => ` ${fractions[f]}`).trim();
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (m && Number(m[3]) > 0) return Number(m[1] || 0) + Number(m[2]) / Number(m[3]);
  return null;
}
export type ShoppingItem = { name: string; amounts: string[] };
export function mergeIngredients(ingredients: Ingredient[]): ShoppingItem[] {
  const groups = new Map<string, Map<string, { total: number; hasNumber: boolean; text: string[] }>>();
  for (const ingredient of ingredients) {
    const name = clean(ingredient.name), unit = aliases[clean(ingredient.unit)] || clean(ingredient.unit);
    const units = groups.get(name) || new Map();
    const amount = units.get(unit) || { total: 0, hasNumber: false, text: [] };
    const n = quantityNumber(ingredient.quantity);
    if (n !== null) { amount.total += n; amount.hasNumber = true; }
    else { const q = ingredient.quantity.trim() || (unit ? '' : 'as needed'); if (!amount.text.includes(q)) amount.text.push(q); }
    units.set(unit, amount); groups.set(name, units);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, units]) => ({ name,
    // Keep incompatible units separate rather than guessing volume-to-weight conversions.
    amounts: [...units].flatMap(([unit, amount]) => [
      ...(amount.hasNumber ? [`${Number(amount.total.toFixed(3))} ${unit}`.trim()] : []),
      ...amount.text.map(text => `${text} ${unit}`.trim())
    ])
  }));
}
