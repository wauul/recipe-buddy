import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db, transactionScope } from './db';
import { syncContext } from './native-sync-context';
import { nativeContext } from './native-context';
import { HttpError } from './http';
import { recipeView } from './data';
import type { Prisma } from '@prisma/client';
import { ingredientSchema } from './validation';

export const syncInput = z.object({
  operationId: z.string().uuid(), path: z.string().max(200),
  method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']), payload: z.string().max(400_000),
  entityId: z.string().cuid().optional(), baseVersion: z.string().max(80).optional(),
  occurredAt: z.string().datetime(),
});
export function allowedSync(path: string, method: string) {
  const id = '[a-zA-Z0-9_-]{1,64}';
  return (path === 'recipes' && method === 'POST') ||
    (new RegExp(`^recipes/${id}$`).test(path) && ['PUT', 'DELETE'].includes(method)) ||
    (new RegExp(`^recipes/${id}/discussion$`).test(path) && ['POST', 'DELETE'].includes(method)) ||
    (new RegExp(`^recipes/${id}/reviews$`).test(path) && ['PUT', 'DELETE'].includes(method)) ||
    (new RegExp(`^recipes/${id}/cook$`).test(path) && method === 'POST') ||
    (new RegExp(`^recipes/${id}/shares$`).test(path) && ['POST', 'DELETE'].includes(method)) ||
    (path === 'friends' && method === 'POST') ||
    (new RegExp(`^friends/${id}$`).test(path) && ['PATCH', 'DELETE'].includes(method)) ||
    (path === 'settings' && method === 'PUT') ||
    (path === 'blocks' && ['POST', 'DELETE'].includes(method)) ||
    (path === 'reports' && method === 'POST') ||
    (path === 'kitchen-state' && ['PUT', 'DELETE'].includes(method));
}
const kitchenInput = z.object({ kind: z.enum(['shopping', 'progress', 'ingredients', 'timer']), id: z.string().min(1).max(80), payload: z.string().max(40_000).optional() });
function kitchenJson(value: string): unknown {
  try { return JSON.parse(value); }
  catch { throw new HttpError(400, 'Invalid kitchen data.'); }
}
function validateKitchen(kind: string, id: string, payload: string) {
  const value = kitchenJson(payload);
  if (kind === 'ingredients') { z.array(ingredientSchema).max(100).parse(value); if(id !== 'confirmed') throw new HttpError(400, 'Invalid pantry ID.'); return; }
  const schema = kind === 'shopping'
    ? z.object({ id: z.string().min(1).max(80), name: z.string().trim().min(1).max(120), amount: z.string().max(400), checked: z.boolean() })
    : kind === 'progress'
      ? z.object({ recipeId: z.string().cuid(), step: z.number().int().min(0).max(199), servings: z.number().int().min(1).max(100) })
      : z.object({ id: z.string().min(1).max(80), recipeId: z.string().cuid(), name: z.string().min(1).max(120), deadline: z.number().int().nonnegative().max(8_640_000_000_000_000), step: z.number().int().min(0).max(199), delivered: z.boolean() });
  const parsed = schema.parse(value);
  if (('id' in parsed ? parsed.id : parsed.recipeId) !== id) throw new HttpError(400, 'Kitchen item ID mismatch.');
}
export async function synchronize(userId: string, input: z.infer<typeof syncInput>, outer: Request,
  dispatch: (request: Request, path: string[]) => Promise<Response>) {
  if (!allowedSync(input.path, input.method)) throw new HttpError(400, 'This operation requires a connection.');
  if (Date.parse(input.occurredAt) > Date.now() + 300_000) throw new HttpError(400, 'Check the device clock.');
  if ((input.path === 'recipes' || input.path.endsWith('/discussion')) && input.method === 'POST' && !input.entityId)
    throw new HttpError(400, 'A stable item ID is required.');
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return db.$transaction(async tx => transactionScope.run(tx, async () => {
    // Serialize receipts per account. A lost response or two devices replaying an
    // operation can never commit the mutation twice, even after a process crash.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 20261003))`;
    const key = { userId, operationId: input.operationId };
    const receipt = await tx.nativeSyncReceipt.findUnique({ where: { userId_operationId: key } });
    if (receipt) {
      if (receipt.digest !== digest) throw new HttpError(409, 'This operation ID was already used.');
      return receipt.response;
    }
    const recipeId = input.path.split('/')[1];
    if (/^recipes\/[^/]+$/.test(input.path) && input.baseVersion) {
      await tx.$queryRaw`SELECT "id" FROM "Recipe" WHERE "id" = ${recipeId} AND "userId" = ${userId} FOR UPDATE`;
      let version = input.baseVersion;
      if (version.startsWith('after:')) {
        const prior = await tx.nativeSyncReceipt.findUnique({ where: { userId_operationId: { userId, operationId: version.slice(6) } } });
        version = (prior?.response as { recipe?: { updatedAt?: string } })?.recipe?.updatedAt ?? '';
        if (!version) throw new HttpError(409, 'The earlier change must synchronize first.');
      }
      const row = await tx.recipe.findFirst({ where: { id: recipeId, userId } });
      if (!row) throw new HttpError(404, 'Recipe no longer available.');
      if (row.updatedAt.toISOString() !== version) throw new HttpError(409, 'This recipe changed on another device. Review your saved edit.');
    }
    let result: unknown, kitchenVersion: string | undefined;
    if (input.path === 'kitchen-state') {
      const data = kitchenInput.parse(kitchenJson(input.payload));
      const stateKey = { userId, kind: data.kind, id: data.id };
      const current = await tx.nativeKitchenState.findUnique({ where: { userId_kind_id: stateKey } });
      if (input.baseVersion) {
        let version = input.baseVersion;
        if (version.startsWith('after:')) {
          const prior = await tx.nativeSyncReceipt.findUnique({ where: { userId_operationId: { userId, operationId: version.slice(6) } } });
          version = (prior?.response as { kitchenVersion?: string })?.kitchenVersion ?? '';
          if (!version) throw new HttpError(409, 'The earlier change must synchronize first.');
        }
        if ((current?.updatedAt.toISOString() ?? 'missing') !== version) throw new HttpError(409, 'This item changed on another device. Your edit is saved.');
      }
      if (input.method === 'DELETE') await tx.nativeKitchenState.deleteMany({ where: stateKey });
      else {
        if (!data.payload) throw new HttpError(400, 'Missing kitchen data.');
        validateKitchen(data.kind, data.id, data.payload);
        const saved = await tx.nativeKitchenState.upsert({ where: { userId_kind_id: stateKey }, create: { ...stateKey, payload: data.payload }, update: { payload: data.payload } });
        kitchenVersion = saved.updatedAt.toISOString();
      }
      if (input.method === 'DELETE') kitchenVersion = 'missing';
      result = { ok: true };
    } else {
      const request = new Request(new URL(`/api/native/v1/${input.path}`, outer.url), {
        method: input.method, headers: { 'content-type': 'application/json', authorization: outer.headers.get('authorization')! }, body: input.payload,
      });
      const response = await syncContext.run({ entityId: input.entityId, occurredAt: input.occurredAt },
        () => nativeContext.run({ userId, request }, () => dispatch(request, input.path.split('/'))));
      result = await response.json();
      if (!response.ok) throw new HttpError(response.status, (result as { error?: string }).error ?? 'This change could not be synchronized.');
    }
    const recipe = /^recipes(?:\/[^/]+)?$/.test(input.path) && input.method !== 'DELETE'
      ? await tx.recipe.findFirst({ where: { id: input.entityId ?? recipeId, userId } }) : null;
    const response = JSON.parse(JSON.stringify({ result, ...(recipe ? { recipe: recipeView(recipe) } : {}), ...(kitchenVersion ? { kitchenVersion } : {}) })) as Prisma.InputJsonValue;
    await tx.nativeSyncReceipt.create({ data: { ...key, digest, response } });
    return response;
  }), { timeout: 15_000, maxWait: 15_000 });
}
