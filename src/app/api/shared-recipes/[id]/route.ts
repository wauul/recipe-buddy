import { api, HttpError, userId } from '@/lib/http';
import { db } from '@/lib/db';
import { recipeView } from '@/lib/data';
import { sharedRecipeWhere } from '@/lib/social-policy';
import { displayUsername } from '@/lib/username';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return api(async () => {
    const share = await db.recipeShare.findFirst({ where: sharedRecipeWhere(await userId(), params.id), include: { recipe: { include: { user: { select: { email: true, username: true } } } } } });
    if (!share) throw new HttpError(404, 'This recipe is no longer shared with you.');
    return { ...recipeView(share.recipe), sharedBy: displayUsername(share.recipe.user) };
  });
}
