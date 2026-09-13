import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { parseRecipe, roastRecipe } from '@/lib/ai';
import { recipeUrlText } from '@/lib/recipe-url';
import { rateLimit } from '@/lib/rate-limit';
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    const id = await userId();
    const { text } = z.object({ text: z.string().trim().min(10).max(16000) }).parse(await body(request));
    if (!(await rateLimit(`parse:${id}`, 5))) throw new HttpError(429, 'Chef needs a breather. Try again in a minute.');
    try {
      const source = /^https?:\/\//i.test(text) ? await recipeUrlText(text) : { text, imageUrl: '' };
      const recipe = { ...await parseRecipe(source.text), imageUrl: source.imageUrl };
      const user = await db.user.findUniqueOrThrow({ where: { id } });
      return { ...recipe, roastLine: await roastRecipe(recipe, user.roastEnabled) };
    } catch (error) {
      // Do not let bad model JSON or blocked websites crash the recipe editor.
      const message = error instanceof z.ZodError || error instanceof SyntaxError
        ? 'Chef could not turn that into a complete recipe. Try clearer text or fill the form manually.'
        : error instanceof Error ? error.message : 'Parsing failed. You can add the recipe manually.';
      throw new HttpError(422, message);
    }
  });
}
