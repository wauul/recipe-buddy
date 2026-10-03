import { z } from 'zod';

export const coachInput = z.object({ step: z.number().int().min(0).max(199), language: z.enum(['en', 'fr']),
  roast: z.boolean().default(false), variation: z.number().int().min(0).max(100).default(0), servings: z.number().int().min(1).max(100), previousRoast: z.string().max(240).default('') });
const resultSchema = z.object({ guidance: z.string().trim().min(20).max(950), explanation: z.string().trim().min(20).max(1400), roast: z.string().trim().max(240) });
export type CoachResult = z.infer<typeof resultSchema> & { source: 'ai'; language: 'en' | 'fr'; step: number };
export type CoachRecipe = { title: string; servings: number; ingredients: { name: string; quantity: string; unit: string }[]; steps: string[] };
export function validateCoaching(value: unknown, recipe: CoachRecipe, input: z.infer<typeof coachInput>): CoachResult {
  const result = resultSchema.parse(value);
  const instruction = recipe.steps[input.step];
  if (!instruction || result.guidance.toLowerCase().trim() === instruction.toLowerCase().trim()) throw new Error('Coaching must explain the step');
  // Never accept invented numeric temperatures, durations or amounts.
  const numbers = new Set(JSON.stringify([instruction, recipe.ingredients]).match(/\d+(?:[.,]\d+)?/g) ?? []);
  numbers.add(String(input.servings)); numbers.add(String(input.step + 1));
  for (const number of (result.guidance + ' ' + result.explanation).match(/\d+(?:[.,]\d+)?/g) ?? []) {
    if (!numbers.has(number)) throw new Error('Unspecified cooking measurement');
  }
  const measurements = (text: string) => [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(seconds?|secondes?|minutes?|mins?|hours?|heures?|°\s*[CF]|degrees?|degr[eé]s?)/giu)]
    .map(match => match[1] + ':' + (/second/i.test(match[2]) ? 'seconds' : /min/i.test(match[2]) ? 'minutes' : /hour|heur/i.test(match[2]) ? 'hours' : 'temperature'));
  const allowed = new Set(measurements(instruction));
  if (measurements(result.guidance + ' ' + result.explanation).some(value => !allowed.has(value))) throw new Error('Unspecified cooking time or temperature');
  if (input.roast) {
    if (!/\b(you|your|you're|tu|toi|ton|ta|tes|vous|votre|vos)\b/i.test(result.roast)) throw new Error('Roast must address the cook');
    const words = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z]{3,}/g) ?? [];
    const stop = new Set('the and with for into from your this that then until les des une dans avec pour sur cette faites avant puis'.split(' '));
    const anchors = words(instruction).filter(word => !stop.has(word));
    if (!result.roast || !words(result.roast).some(word => anchors.some(anchor => word.startsWith(anchor.slice(0, Math.min(4, anchor.length)))))) throw new Error('Roast must refer to this step');
    const techniques = [
      [/blend|puree|mixez|mixer/i, /blend|puree|mix|blender|smooth|crem|liss|bean|haricot/i],
      [/slice|chop|dice|mince|cut|tranch|coup|hach|emin/i, /slic|chop|dic|minc|cut|knif|blade|tranch|coup|hach|emin|couteau|lame|decoup/i],
      [/whisk|beat|fouett|batt/i, /whisk|beat|fouet|batt|arm|bras/i],
      [/simmer|mijot|frem/i, /simmer|bubbl|mijot|bull|frem|bouill/i],
      [/serve|servir|servez/i, /serv|plat|assiett|dress|present/i],
      [/bake|roast|oven|four|enfourn|rotir/i, /bak|roast|oven|four|enfourn|rot|cuiss/i],
      [/mix|stir|melang|remu/i, /mix|stir|melang|remu|bowl|bol|spoon|cuill/i],
    ] as const;
    const normalized = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const technique = techniques.find(([pattern]) => pattern.test(normalized(instruction)));
    if (technique && !technique[1].test(normalized(result.roast))) throw new Error('Roast must refer to this technique');
    if (/^(why|pourquoi)\b/i.test(result.roast)) throw new Error('Use a chef quip, not a generic riddle');
    if (result.roast.toLowerCase() === input.previousRoast.toLowerCase()) throw new Error('Roast must be fresh');
  }
  return { ...result, roast: input.roast ? result.roast : '', source: 'ai', language: input.language, step: input.step };
}
