import { api, body, HttpError, userId } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { translationRequestSchema, TranslationIntegrityError } from '@/lib/content-translation';
import { translateTexts } from '@/lib/translate';
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    const id = await userId();
    const { locale, texts } = translationRequestSchema.parse(await body(request));
    if (!(await rateLimit(`translate:${id}`, 30)))
      throw new HttpError(429, 'Translation limit reached. Try again in a minute.', 60);
    try {
      return { translations: await translateTexts(id, locale, texts) };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        const retry =
          'retryAfter' in error && typeof error.retryAfter === 'number' ? error.retryAfter : 15;
        throw new HttpError(429, 'Translation limit reached. Try again in a minute.', retry);
      }
      console.warn('Content translation failed', {
        kind: error instanceof Error ? error.name : 'unknown',
        code: error instanceof TranslationIntegrityError ? error.code : undefined,
      });
      throw new HttpError(503, 'Translation is unavailable. Your original text is still here.');
    }
  });
}
