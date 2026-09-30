import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import * as integrity from '../src/lib/content-translation';
import * as languages from '../src/lib/recipe-languages';
function load(file: string, dependencies: Record<string, unknown>) {
  const source = transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, any> = {};
  const context = createContext({
    exports,
    require: (name: string) => (name in dependencies ? dependencies[name] : require(name)),
    Date,
    setTimeout,
    console: { warn() {} },
  });
  runInContext(source, context);
  return exports;
}
test('save-time bilingual preparation persists reusable translations; reopening, repeat saves and other chefs cannot consume or expose another chef’s cached rows', async () => {
  const rows: any[] = [];
  let calls = 0;
  const db = {
    contentTranslation: {
      findMany: async ({ where }: any) =>
        rows.filter((row) => row.userId === where.userId && where.key.in.includes(row.key)),
      createMany: async ({ data }: any) => {
        rows.push(...data);
      },
    },
  };
  const module = load('src/lib/translate.ts', {
    './db': { db },
    './ai': {
      completion: async (system: string, input: string) => {
        calls++;
        const texts = JSON.parse(input).texts;
        return JSON.stringify({
          translations: texts.map((text: string) =>
            system.includes('into French') ? 'FR ' + text : text,
          ),
        });
      },
    },
    './content-translation': integrity,
    './recipe-languages': languages,
  });
  const recipe = {
    title: 'Bread',
    altTitle: 'Dough drama',
    roastLine: 'The bread is auditioning for a doorstop.',
    imageUrl: '',
    servings: 2,
    vibe: 'cozy',
    ingredients: [{ name: 'flour', quantity: '500', unit: 'g' }],
    steps: ['Bake at 200°C for 20 minutes.'],
  };
  const saved = await module.prepareRecipeLanguages('chef-a', recipe);
  assert.equal(saved.pending, false);
  assert.equal(saved.fr.flour, 'FR flour');
  const initialCalls = calls;
  await module.prepareRecipeLanguages('chef-a', recipe);
  assert.equal(
    calls,
    initialCalls,
    'database rows reuse translations even without a prior snapshot',
  );
  await module.prepareRecipeLanguages('chef-a', recipe, saved);
  assert.equal(calls, initialCalls);
  await module.prepareRecipeLanguages('chef-b', recipe);
  assert.ok(calls > initialCalls, 'cache is isolated by chef');
  assert.equal(recipe.steps[0], 'Bake at 200°C for 20 minutes.');
  assert.ok(rows.every((row) => row.key.length === 64));
});
test('roast replacement requires ownership and roast mode; failure preserves the joke and successful writes touch only the bilingual roast', async () => {
  let owns = false,
    enabled = true,
    fail = false,
    generations = 0;
  const updates: any[] = [];
  const recipe = {
    id: 'recipe',
    userId: 'chef-a',
    title: 'Bread',
    roastLine: 'Old joke',
    updatedAt: new Date(),
    translations: {
      en: { Bread: 'Bread', 'Old joke': 'Old joke' },
      fr: { Bread: 'Pain', 'Old joke': 'Ancienne blague' },
      pending: false,
      version: 2,
    },
  };
  const db = {
    recipe: {
      findFirst: async ({ where }: any) => (owns && where.userId === 'chef-a' ? recipe : null),
      updateMany: async (input: any) => {
        updates.push(input);
        return { count: 1 };
      },
    },
    user: { findUniqueOrThrow: async () => ({ roastEnabled: enabled }) },
  };
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  const route = load('src/app/api/recipes/[id]/roast/route.ts', {
    '@/lib/db': { db },
    '@/lib/http': {
      api: (fn: () => unknown) => fn(),
      body: async () => ({}),
      userId: async () => 'chef-a',
      HttpError,
    },
    '@/lib/ai': {
      freshRoast: async () => {
        generations++;
        if (fail) throw new Error('provider unavailable');
        return { en: 'New joke', fr: 'Nouvelle blague' };
      },
    },
    '@/lib/recipe-languages': languages,
    '@/lib/rate-limit': { rateLimit: async () => true },
  });
  const call = () => route.POST({}, { params: { id: 'recipe' } });
  await assert.rejects(call(), (e: any) => e.status === 404);
  assert.equal(generations, 0);
  owns = true;
  enabled = false;
  await assert.rejects(call(), (e: any) => e.status === 400);
  assert.equal(generations, 0);
  enabled = true;
  fail = true;
  await assert.rejects(call(), (e: any) => e.status === 503);
  assert.equal(updates.length, 0);
  assert.equal(recipe.roastLine, 'Old joke');
  fail = false;
  const result = await call();
  assert.equal(result.translations.fr['New joke'], 'Nouvelle blague');
  assert.equal(result.translations.fr.Bread, 'Pain');
  assert.deepEqual(Object.keys(updates[0].data).sort(), ['roastLine', 'translations']);
  assert.equal(updates[0].where.userId, 'chef-a');
  assert.equal(updates[0].where.updatedAt, recipe.updatedAt);
});

test('an untranslated roast is retried by itself and accepted fields remain persisted', async () => {
  const rows: any[] = [],
    batches: string[][] = [];
  const source = 'The pasta has more drama than your television.';
  const db = {
    contentTranslation: {
      findMany: async () => [],
      createMany: async ({ data }: any) => {
        rows.push(...data);
      },
    },
  };
  const module = load('src/lib/translate.ts', {
    './db': { db },
    './ai': {
      completion: async (system: string, input: string) => {
        const texts = JSON.parse(input).texts;
        batches.push(texts);
        if (texts.length === 1) {
          assert.equal(rows[0].text, 'farine', 'completed ingredient was stored before retry');
          return JSON.stringify({
            translations: ['Ces pâtes ont plus de drame que votre télévision.'],
          });
        }
        return JSON.stringify({ translations: ['farine', source] });
      },
    },
    './content-translation': integrity,
    './recipe-languages': languages,
  });
  const result = await module.translateTexts('chef-a', 'fr', ['flour', source]);
  assert.deepEqual(Array.from(result), [
    'farine',
    'Ces pâtes ont plus de drame que votre télévision.',
  ]);
  assert.deepEqual(Array.from(batches[1]), [source]);
  assert.equal(rows.length, 2);
});

test('provider JSON truncation retries once with a larger output budget', async () => {
  const budgets: number[] = [];
  const module = load('src/lib/translate.ts', {
    './db': {
      db: { contentTranslation: { findMany: async () => [], createMany: async () => {} } },
    },
    './ai': {
      completion: async (_system: string, _input: string, _json: boolean, budget: number) => {
        budgets.push(budget);
        if (budgets.length === 1)
          throw Object.assign(new Error('truncated'), {
            status: 400,
            code: 'json_validate_failed',
          });
        return JSON.stringify({ translations: ['farine'] });
      },
    },
    './content-translation': integrity,
    './recipe-languages': languages,
  });
  const result = await module.translateTexts('chef-a', 'fr', ['flour']);
  assert.equal(result[0], 'farine');
  assert.deepEqual(budgets, [2200, 6000]);
});
