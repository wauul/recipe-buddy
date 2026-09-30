import { z } from 'zod';

export class TranslationIntegrityError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = 'TranslationIntegrityError';
  }
}

export function protectCookingValues(texts: string[]) {
  const values: string[][] = [];
  const protectedTexts = texts.map((text, index) => {
    values[index] = [];
    return text.replace(
      /(?<!\d)[+−-]?\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?(?:\s*(?:°\s*[CF]|kg\b|mg\b|g\b|ml\b|cl\b|l\b))?|[¼½¾\u2150-\u215e]/gi,
      (value) => {
        const token = `⟦V${values[index].length}⟧`;
        values[index].push(value.trimStart());
        return value.startsWith(' ') ? ` ${token}` : token;
      },
    );
  });
  return { texts: protectedTexts, values };
}

export function restoreCookingValues(
  protectedInput: ReturnType<typeof protectCookingValues>,
  value: unknown,
) {
  const result = z.object({ translations: z.array(z.string().min(1).max(8000)) }).parse(value);
  if (result.translations.length !== protectedInput.texts.length)
    throw new TranslationIntegrityError('incomplete');
  return result.translations.map((text, index) => {
    const actual = text.match(/⟦V\d+⟧/g) ?? [];
    const expected = protectedInput.values[index].map((_, position) => `⟦V${position}⟧`);
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new TranslationIntegrityError('value_tokens');
    return text.replace(
      /⟦V(\d+)⟧/g,
      (_, position) => protectedInput.values[index][Number(position)],
    );
  });
}

export const translationRequestSchema = z
  .object({
    locale: z.enum(['en', 'fr']),
    texts: z.array(z.string().min(1).max(4000)).min(1).max(32),
  })
  .refine(({ texts }) => texts.join('').length <= 12000, 'Translation batch is too large.');

// Numbers, temperatures and measurements must survive translation exactly.
// This also rejects model output that silently adds or drops a cooking quantity.
function numbers(text: string) {
  return (text.match(/(?<!\d)[+−-]?\s*\d+(?:[.,]\d+)?|[¼½¾\u2150-\u215e]/g) ?? []).map((value) =>
    value.replace(/\s/g, '').replace('−', '-'),
  );
}
function measurements(text: string) {
  return (text.match(/\d+(?:[.,]\d+)?\s*(?:°\s*[CF]|kg\b|mg\b|g\b|ml\b|cl\b|l\b)/gi) ?? []).map(
    (value) => value.replace(/\s/g, '').toLowerCase(),
  );
}

function clearlyNeedsTranslation(text: string, locale: 'en' | 'fr') {
  const languageWords =
    locale === 'fr'
      ? /\b(the|this|with|and|your|that|until|another|while|you|add|stir|bake|cook)\b/gi
      : /\b(le|la|les|avec|faire|cuire|pendant|ajouter|remuer|vous|une|dans|pour)\b/gi;
  const measurementWords =
    locale === 'fr'
      ? /\b(tablespoons?|teaspoons?|slices?|chopped|pieces?|cups?)\b/i
      : /\b(cuillères?|tranches?|morceaux?|tasses?|paquets?)\b/i;
  const culinaryWords =
    locale === 'fr'
      ? /\b(soup|sizzlers?|silly|bonanza|delight|balls?|pops?|dough|bread|chicken|mushrooms?|flour|onions?|ginger|cheesy|saucy|pockets?|whisk|water|eggs?|butter|yeast|sugar|oil)\b/i
      : /\b(poulet|farine|oignons?|gingembre|fromage|beurre|levure|sucre|huile|eau|champignons?|cuillères?|raviolis)\b/i;
  return (
    (text.match(languageWords)?.length ?? 0) >= 2 ||
    measurementWords.test(text) ||
    culinaryWords.test(text)
  );
}

export function translationIsUnnecessary(text: string, locale: 'en' | 'fr') {
  // Plain numbers and internationally used metric abbreviations need no provider call.
  if (
    /^[\d\s.,/+−°¼½¾\u2150-\u215e-]+$/.test(text) ||
    /^[\d\s.,/+−¼½¾\u2150-\u215e-]*(?:(?:kg|mg|g|ml|cl|l|°C|°F)\s*)+$/i.test(text)
  )
    return true;
  const english =
    text.match(
      /\b(the|this|with|and|your|that|until|another|while|you|add|stir|bake|cook|preheat)\b/gi,
    ) ?? [];
  const french =
    text.match(/\b(le|la|les|avec|faire|cuire|pendant|ajouter|remuer|vous|une|dans|pour|et)\b/gi) ??
    [];
  return locale === 'en'
    ? english.length >= 2 && !french.length
    : french.length >= 2 && !english.length;
}

export function validateTranslations(
  source: string[],
  value: unknown,
  locale?: 'en' | 'fr',
): string[] {
  const result = z.object({ translations: z.array(z.string().min(1).max(8000)) }).parse(value);
  if (result.translations.length !== source.length)
    throw new TranslationIntegrityError('incomplete');
  result.translations.forEach((text, index) => {
    if (
      locale &&
      clearlyNeedsTranslation(source[index], locale) &&
      text.trim() === source[index].trim()
    )
      throw new TranslationIntegrityError('untranslated');
    if (JSON.stringify(numbers(text)) !== JSON.stringify(numbers(source[index])))
      throw new TranslationIntegrityError('numbers');
    if (JSON.stringify(measurements(text)) !== JSON.stringify(measurements(source[index])))
      throw new TranslationIntegrityError('measurements');
  });
  return result.translations;
}

export function translationBatch(texts: Iterable<string>, maxCharacters = 10000) {
  const batch: string[] = [];
  let length = 0;
  for (const text of texts) {
    if (batch.length === 32 || (batch.length > 0 && length + text.length > maxCharacters)) break;
    batch.push(text);
    length += text.length;
  }
  return batch;
}
