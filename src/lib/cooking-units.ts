// Canonical labels only: never convert volume to weight or guess a spoon size.
const definitions: Record<string, string[]> = {
  tsp: ['tsp', 'tsps', 'tspn', 'teaspoon', 'teaspoons', 'tea spoon', 'tea spoons', 'c à c', 'c a c', 'cac', 'c à café', 'cuillère à café', 'cuillères à café', 'cuillere a cafe', 'cucharadita', 'cucharaditas', 'cucchiaino', 'cucchiaini', 'colher de chá', 'colheres de chá', 'teelöffel', 'tl'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tbl', 'tbls', 'tbspn', 'tablespoon', 'tablespoons', 'table spoon', 'table spoons', 'c à s', 'c a s', 'cas', 'cs', 'c à soupe', 'cuillère à soupe', 'cuillères à soupe', 'cuillere a soupe', 'cucharada', 'cucharadas', 'cucchiaio', 'cucchiai', 'colher de sopa', 'colheres de sopa', 'esslöffel', 'el'],
  g: ['g', 'gr', 'grs', 'gram', 'grams', 'gramme', 'grammes', 'gramo', 'gramos', 'grammo', 'grammi', 'grama', 'gramas', 'gramm'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramo', 'kilogramos', 'chilogrammo', 'chilogrammi', 'quilograma', 'quilogramas', 'kilogramm'],
  mg: ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes'],
  ml: ['ml', 'mls', 'cc', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'millilitro', 'millilitri', 'mililitro', 'mililitros'],
  cl: ['cl', 'cls', 'centiliter', 'centiliters', 'centilitre', 'centilitres'],
  dl: ['dl', 'deciliter', 'deciliters', 'decilitre', 'decilitres'],
  l: ['l', 'lt', 'lts', 'liter', 'liters', 'litre', 'litres', 'litro', 'litros', 'litri'],
  oz: ['oz', 'ounce', 'ounces', 'once', 'onces', 'onza', 'onzas'],
  'fl oz': ['fl oz', 'fluid ounce', 'fluid ounces', 'once liquide', 'onces liquides'],
  lb: ['lb', 'lbs', 'pound', 'pounds', 'livre', 'livres', 'libra', 'libras'],
  cup: ['cup', 'cups', 'tasse', 'tasses', 'taza', 'tazas', 'tazza', 'tazze', 'xícara', 'xícaras'],
  pint: ['pt', 'pint', 'pints', 'pinte', 'pintes'],
  quart: ['qt', 'qts', 'quart', 'quarts'],
  gallon: ['gal', 'gallon', 'gallons'],
  pinch: ['pinch', 'pinches', 'pincée', 'pincées', 'pizca', 'pizcas', 'pizzico', 'pizzichi', 'pitada', 'pitadas', 'prise', 'prisen'],
  dash: ['dash', 'dashes'],
  clove: ['clove', 'cloves', 'gousse', 'gousses', 'diente', 'dientes', 'spicchio', 'spicchi'],
  slice: ['slice', 'slices', 'tranche', 'tranches', 'rebanada', 'rebanadas', 'fetta', 'fette'],
  piece: ['piece', 'pieces', 'morceau', 'morceaux', 'pièce', 'pièces', 'pezzo', 'pezzi'],
  can: ['can', 'cans', 'tin', 'tins', 'boîte', 'boîtes', 'lata', 'latas'],
  packet: ['packet', 'packets', 'package', 'packages', 'paquet', 'paquets', 'sachet', 'sachets'],
  bunch: ['bunch', 'bunches', 'bouquet', 'bouquets', 'botte', 'bottes'],
};
const key = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim();
const aliases = new Map(Object.entries(definitions).flatMap(([unit, names]) => names.map(name => [key(name), unit] as const)));
export function normalizeCookingUnit(text: string): string {
  // Preserve case-sensitive conventional spoon symbols.
  if (text.trim() === 'T') return 'tbsp';
  if (text.trim() === 't') return 'tsp';
  return aliases.get(key(text)) ?? text.trim();
}
const quantity = '(?:\\d+(?:[.,]\\d+)?(?:\\s*[/⁄]\\s*\\d+)?(?:\\s+\\d+\\s*[/⁄]\\s*\\d+)?[¼½¾⅐-⅞]?|[¼½¾⅐-⅞])(?:\\s*[-–]\\s*(?:\\d+(?:[.,]\\d+)?|[¼½¾⅐-⅞]))?';
export function splitCookingAmount(text: string) {
  const match = text.trim().match(new RegExp(`^(${quantity})\\s*(.+)$`));
  if (!match || !aliases.has(key(match[2])) && !['T', 't'].includes(match[2])) return undefined;
  return { quantity: match[1], unit: normalizeCookingUnit(match[2]) };
}
export function normalizeIngredient<T extends { name: string; quantity: string; unit: string }>(ingredient: T): T {
  const amount = !ingredient.unit ? splitCookingAmount(ingredient.quantity) : undefined;
  return { ...ingredient, ...(amount ?? {}), unit: amount?.unit ?? normalizeCookingUnit(ingredient.unit) };
}
export function ingredientFromLine(line: string) {
  const match = line.trim().match(new RegExp(`^(${quantity})\\s*(.*)$`));
  if (!match || !match[2]) return { name: line, quantity: '', unit: '' };
  const rest = match[2].trim();
  // Longest recognized prefix wins (fluid ounces before ounces, for example).
  const ends = [...rest.matchAll(/\s+/g)].map(m => m.index!);
  for (const end of ends.reverse()) {
    const candidate = rest.slice(0, end);
    if (aliases.has(key(candidate)) || ['T', 't'].includes(candidate)) {
      const name = rest.slice(end).trim().replace(/^(?:of\s+|de\s+|d['’])/i, '');
      if (name) return { name, quantity: match[1], unit: normalizeCookingUnit(candidate) };
    }
  }
  // Unknown units and complex package sizes stay intact for manual review.
  return { name: line, quantity: '', unit: '' };
}
