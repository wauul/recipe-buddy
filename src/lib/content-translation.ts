import { z } from 'zod';

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

export function validateTranslations(source: string[], value: unknown): string[] {
  const result = z.object({ translations: z.array(z.string().min(1).max(8000)) }).parse(value);
  if (result.translations.length !== source.length) throw new Error('Incomplete translation.');
  result.translations.forEach((text, index) => {
    if (JSON.stringify(numbers(text)) !== JSON.stringify(numbers(source[index])))
      throw new Error('Translation changed a cooking quantity.');
    if (JSON.stringify(measurements(text)) !== JSON.stringify(measurements(source[index])))
      throw new Error('Translation changed a measurement or temperature.');
  });
  return result.translations;
}

export function translationBatch(texts: Iterable<string>) {
  const batch: string[] = [];
  let length = 0;
  for (const text of texts) {
    if (batch.length === 32 || length + text.length > 10000) break;
    batch.push(text);
    length += text.length;
  }
  return batch;
}
