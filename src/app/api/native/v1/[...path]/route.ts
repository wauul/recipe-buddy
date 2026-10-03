import { z } from 'zod';
import { api, body, HttpError } from '@/lib/http';
import { authenticateNative } from '@/lib/native-auth';
import { nativeContext } from '@/lib/native-context';
import { db } from '@/lib/db';
import { recipeView } from '@/lib/data';
import { sharedRecipeWhere } from '@/lib/social-policy';
import { displayUsername } from '@/lib/username';
import { friendList, sharedRecipes } from '@/lib/social';
import { currentChefProgress } from '@/lib/chefs';
import { ingredientSchema } from '@/lib/validation';
import { mergeIngredients } from '@/lib/shopping';
import { rankRecipes } from '@/lib/ingredient-match';
import { createInvite, previewInvite, redeemInvite } from '@/lib/native-invites';
import { analyzeIngredients } from '@/lib/native-vision';
import * as collection from '@/app/api/recipes/route';
import * as detail from '@/app/api/recipes/[id]/route';
import * as cook from '@/app/api/recipes/[id]/cook/route';
import * as shares from '@/app/api/recipes/[id]/shares/route';
import * as friends from '@/app/api/friends/route';
import * as friend from '@/app/api/friends/[id]/route';
import * as settings from '@/app/api/settings/route';
import * as parse from '@/app/api/recipes/parse/route';
import * as discussion from '@/app/api/recipes/[id]/discussion/route';
import * as reviews from '@/app/api/recipes/[id]/reviews/route';
import * as roast from '@/app/api/recipes/[id]/roast/route';
import * as languages from '@/app/api/recipes/[id]/translations/route';
import * as translate from '@/app/api/translate/route';
import { recipeDiscussion } from '@/lib/discussion';
import { recipeReviews } from '@/lib/reviews';
import { acceptTerms, deleteAccount, requireTerms } from '@/lib/account-controls';
import { blockChef, blockedChefs, reportContent } from '@/lib/moderation';
import { nativeHome, nativeMe } from '@/lib/native-home';
import { coachInput, coachStep } from '@/lib/chef-coach';
import { rateLimit } from '@/lib/rate-limit';
import { proStatus, requirePro, verifySubscription } from '@/lib/native-pro';
import { syncInput, synchronize } from '@/lib/native-sync';
import { voiceCommandInput, interpretVoice } from '@/lib/native-voice-command';
import { findChefs } from '@/lib/native-chef-search';
import { enrichRecipeLater } from '@/lib/recipe-enrichment';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function authorizedRecipes(userId: string, ids?: string[]) {
  return db.recipe.findMany({ where: { ...(ids ? { id: { in: ids } } : {}), OR: [
    { userId }, { shares: { some: sharedRecipeWhere(userId) } },
  ] }, include: { user: { select: { username: true, email: true } } }, orderBy: { id: 'asc' } });
}
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  // Errors in authentication remain JSON. Business handlers keep their existing
  // ownership checks and rate limits; only an authenticated exact request is scoped.
  try {
    const session = await authenticateNative(request);
    const params = await context.params;
    return await nativeContext.run({ userId: session.userId, request }, async () => {
      const [root, id, action] = params.path, method = request.method;
      if (root === 'sync' && method === 'POST') return api(async () => synchronize(session.userId, syncInput.parse(await body(request)), request,
        (inner, path) => handle(inner, { params: Promise.resolve({ path }) })));
      if (root === 'kitchen-state' && method === 'GET') return api(async () => db.nativeKitchenState.findMany({ where: { userId: session.userId }, select: { kind: true, id: true, payload: true, updatedAt: true } }));
      if (root === 'recipes' && (method === 'POST' || method === 'PUT') && action !== 'cook') await requireTerms(session.userId);
      const ctx = { params: Promise.resolve({ id }) };
      if (root === 'translate' && method === 'POST') return translate.POST(request);
      if (root === 'recipes' && action === 'discussion') {
        if (method === 'GET') return discussion.GET(request, ctx);
        if (method === 'POST') return discussion.POST(request, ctx);
        if (method === 'DELETE') return discussion.DELETE(request, ctx);
      }
      if (root === 'recipes' && action === 'reviews') {
        if (method === 'GET') return reviews.GET(request, ctx);
        if (method === 'PUT') return reviews.PUT(request, ctx);
        if (method === 'DELETE') return reviews.DELETE(request, ctx);
      }
      if (root === 'recipes' && action === 'roast' && method === 'POST') { await requirePro(session.userId); return roast.POST(request, ctx); }
      if (root === 'recipes' && action === 'translations' && method === 'POST') return languages.POST(request, ctx);
      if (root === 'recipes' && !id && method === 'POST') return collection.POST(request);
      if (root === 'recipes' && id === 'parse' && method === 'POST') return parse.POST(request);
      if (root === 'recipes' && id && !action && method === 'PUT') return detail.PUT(request, ctx);
      if (root === 'recipes' && id && !action && method === 'DELETE') return detail.DELETE(request, ctx);
      if (root === 'recipes' && action === 'cook' && method === 'POST') return cook.POST(request, ctx);
      if (root === 'recipes' && action === 'shares') {
        if (method === 'GET') return shares.GET(request, ctx);
        if (method === 'POST') return shares.POST(request, ctx);
        if (method === 'DELETE') return shares.DELETE(request, ctx);
      }
      if (root === 'friends' && !id && method === 'POST') return friends.POST(request);
      if (root === 'friends' && id && method === 'PATCH') return friend.PATCH(request, ctx);
      if (root === 'friends' && id && method === 'DELETE') return friend.DELETE(request, ctx);
      if (root === 'settings' && method === 'PUT') return settings.PUT(request);
      return api(async () => {
        const user = session.userId;
        if (root === 'chef-search' && method === 'GET') return findChefs(user, new URL(request.url).searchParams.get('name') ?? '');
        if (root === 'voice-command' && method === 'POST') {
          await requirePro(user);
          if (!(await rateLimit(`voice-command:${user}`, 30))) throw new HttpError(429, 'Try again shortly.');
          return interpretVoice(voiceCommandInput.parse(await body(request)));
        }
        if (root === 'pro' && !id && method === 'GET') return proStatus(user);
        if (root === 'pro' && id === 'verify' && method === 'POST') {
          await requireTerms(user);
          if (!(await rateLimit(`pro:verify:${user}`, 10))) throw new HttpError(429, 'Please try later.');
          const { purchaseToken } = z.object({ purchaseToken: z.string().min(16).max(4096) }).parse(await body(request));
          return verifySubscription(user, purchaseToken);
        }
        if (root === 'recipes' && (action === 'coach' || action === 'chef-roast') && method === 'POST') {
          const input = coachInput.parse(await body(request));
          if (!(await rateLimit(`coach:${user}`, 15))) throw new HttpError(429, 'Chef coaching limit reached. Try later.');
          const row = (await authorizedRecipes(user, [id]))[0];
          if (!row) throw new HttpError(404, 'Recipe is unavailable.');
          const roastOnly = action === 'chef-roast';
          if (!roastOnly || input.variation > 0) await requirePro(user);
          const view = recipeView(row), translate = (text: string) => view.translations?.[input.language]?.[text] || text;
          const recipe = { title: translate(view.title), servings: view.servings,
            steps: view.steps.map(translate), ingredients: view.ingredients.map(i => ({ name: translate(i.name), quantity: i.quantity, unit: translate(i.unit) })) };
          if (!roastOnly) return coachStep(recipe, input, user);
          const key = { userId: user, recipeId: id };
          await db.chefRoast.deleteMany({ where: { ...key, text: '', createdAt: { lt: new Date(Date.now() - 120_000) } } });
          const saved = await db.chefRoast.findUnique({ where: { userId_recipeId: key } });
          if (saved && input.variation === 0) {
            if (!saved.text) throw new HttpError(409, 'Your roast is being prepared. Try again shortly.');
            return { roast: saved.text, language: saved.language, step: saved.step };
          }
          if (input.variation > 0) {
            const result = await coachStep(recipe, { ...input, roast: true }, user);
            return { roast: result.roast, language: result.language, step: result.step };
          }
          try { await db.chefRoast.create({ data: { ...key, language: input.language, step: input.step } }); }
          catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new HttpError(409, 'Your roast is being prepared. Try again shortly.'); throw error; }
          try {
            const result = await coachStep(recipe, { ...input, roast: true }, user);
            await db.chefRoast.update({ where: { userId_recipeId: key }, data: { text: result.roast } });
            return { roast: result.roast, language: result.language, step: result.step };
          } catch (error) { await db.chefRoast.deleteMany({ where: { ...key, text: '' } }); throw error; }
        }
        if (root === 'home' && method === 'GET') return nativeHome(user);
        if (root === 'me' && method === 'GET') return nativeMe(user);
        if (root === 'chefs' && id && method === 'GET') {
          const connection = (await friendList(user)).find(f => f.friend.id === id && f.status === 'accepted');
          if (!connection) throw new HttpError(404, 'Chef is unavailable.');
          const recipes = (await authorizedRecipes(user)).filter(r => r.userId === id);
          return { id, username: connection.friend.username, chef: await currentChefProgress(id), recipes: recipes.map(r => ({ ...recipeView(r), owned: false, sharedBy: displayUsername(r.user), sharedChefId: id })) };
        }
        if (root === 'search' && method === 'GET') {
          const term = (new URL(request.url).searchParams.get('q') ?? '').trim().toLocaleLowerCase().slice(0, 100);
          if (!term) return [];
          const rows = await authorizedRecipes(user);
          // Search the same originals and saved language variants as the web app.
          return rows.filter(r => JSON.stringify([r.title, r.altTitle, r.ingredients, r.steps, r.translations]).toLocaleLowerCase().includes(term)).map(r => ({ ...recipeView(r), owned: r.userId === user, sharedBy: r.userId === user ? '' : displayUsername(r.user), sharedChefId: r.userId === user ? '' : r.userId }));
        }
        if (root === 'recipes' && !id && method === 'GET') {
          const url = new URL(request.url), cursor = url.searchParams.get('cursor'), query = (url.searchParams.get('q') ?? '').slice(0, 160);
          const vibe = url.searchParams.get('vibe');
          const candidates = await db.recipe.findMany({ where: { userId: user, ...(cursor ? { id: { gt: cursor } } : {}),
            ...(vibe ? { vibe } : {}) }, orderBy: { id: 'asc' }, ...(!query ? { take: 51 } : {}) });
          const term = query.toLocaleLowerCase();
          const rows = query ? candidates.filter(row => {
            const view = recipeView(row);
            return [row.title, view.translations?.en[row.title] ?? '', view.translations?.fr[row.title] ?? ''].some(title => title.toLocaleLowerCase().includes(term));
          }) : candidates;
          return { items: rows.slice(0, 50).map(recipeView), nextCursor: rows.length > 50 ? rows[49].id : null };
        }
        if (root === 'recipes' && id && !action && method === 'GET') {
          const rows = await authorizedRecipes(user, [id]); const row = rows[0];
          if (!row) throw new HttpError(404, 'Recipe is unavailable.');
          const view = recipeView(row);
          if (row.userId === user && view.translations?.pending) {
            const owner = await db.user.findUniqueOrThrow({ where: { id: user }, select: { roastEnabled: true } });
            enrichRecipeLater(row, owner.roastEnabled, row.translations);
          }
          return { ...view, owned: row.userId === user, sharedBy: row.userId === user ? '' : displayUsername(row.user), sharedChefId: row.userId === user ? '' : row.userId };
        }
        if (root === 'recipes' && action === 'community' && method === 'GET') {
          const [discussion, reviews] = await Promise.all([recipeDiscussion(id, user), recipeReviews(id, user)]);
          return { recipeId: id, discussion, reviews };
        }
        if (root === 'friends' && method === 'GET') return friendList(user);
        if (root === 'terms' && method === 'POST') return acceptTerms(user, await body(request));
        if (root === 'account' && !id && method === 'DELETE') return deleteAccount(user, await body(request), session.authenticatedAt.getTime());
        if (root === 'blocks' && method === 'GET') return blockedChefs(user);
        if (root === 'blocks' && (method === 'POST' || method === 'DELETE')) return blockChef(user, await body(request), method === 'DELETE');
        if (root === 'reports' && method === 'POST') return reportContent(user, await body(request));
        if (root === 'shared-recipes' && method === 'GET') return sharedRecipes(user);
        if (root === 'invites' && !id && method === 'POST') { await body(request); return createInvite(user); }
        if (root === 'invites' && id && method === 'GET') return previewInvite(id);
        if (root === 'invites' && id && method === 'POST') { await body(request); return redeemInvite(id, user); }
        if (root === 'matches' && method === 'POST') {
          const { ingredients } = z.object({ ingredients: z.array(ingredientSchema).min(1).max(100) }).parse(await body(request));
          const rows = await authorizedRecipes(user);
          return rankRecipes(rows.map(row => ({ ...recipeView(row), owned: row.userId === user,
            sharedBy: row.userId === user ? '' : displayUsername(row.user) })), ingredients);
        }
        if (root === 'shopping-list' && method === 'POST') {
          const { recipeIds } = z.object({ recipeIds: z.array(z.string().cuid()).min(1).max(100) }).parse(await body(request));
          const ids = [...new Set(recipeIds)], rows = await authorizedRecipes(user, ids);
          if (rows.length !== ids.length) throw new HttpError(404, 'A recipe is unavailable.');
          return mergeIngredients(rows.flatMap(row => z.array(ingredientSchema).parse(row.ingredients)));
        }
        if (root === 'analyze' && method === 'POST') { await requirePro(user); return analyzeIngredients(user, await body(request)); }
        throw new HttpError(404, 'Unknown native API operation.');
      });
    });
  } catch (e) { return api(async () => { throw e; }); }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
