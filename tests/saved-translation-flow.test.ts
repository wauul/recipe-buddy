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

test('foreign recipes get both languages and EN/FR originals survive provider paraphrases', async () => {
  const examples = [
    { title: 'Sopa de tomate', name: 'tomates', step: 'Añadir los tomates y cocinar durante 10 minutos.', language: 'other',
      en: ['Tomato soup', 'tomatoes', 'Add the tomatoes and cook for ⟦V0⟧ minutes.'],
      fr: ['Soupe de tomates', 'tomates', 'Ajouter les tomates et cuire pendant ⟦V0⟧ minutes.'] },
    { title: 'Kartoffelsuppe', name: 'Kartoffeln', step: 'Die Kartoffeln zugeben und 10 Minuten kochen.', language: 'other',
      en: ['Potato soup', 'potatoes', 'Add the potatoes and cook for ⟦V0⟧ minutes.'],
      fr: ['Soupe de pommes de terre', 'pommes de terre', 'Ajouter les pommes de terre et cuire pendant ⟦V0⟧ minutes.'] },
    { title: '番茄汤', name: '番茄', step: '加入番茄，煮10分钟。', language: 'other',
      en: ['Tomato soup', 'tomatoes', 'Add the tomatoes and cook for ⟦V0⟧ minutes.'],
      fr: ['Soupe de tomates', 'tomates', 'Ajouter les tomates et cuire pendant ⟦V0⟧ minutes.'] },
    { title: 'Soupe aux tomates', name: 'tomates fraîches', step: 'Ajouter les tomates et cuire pendant 10 minutes.', language: 'fr',
      en: ['Tomato soup', 'fresh tomatoes', 'Add the tomatoes and cook for ⟦V0⟧ minutes.'],
      fr: ['Soupe de tomates', 'tomates', 'Faire mijoter les tomates pendant ⟦V0⟧ minutes.'] },
    { title: 'Fresh tomato soup', name: 'fresh tomatoes', step: 'Add the tomatoes and cook for 10 minutes.', language: 'en',
      en: ['Tomato soup', 'tomatoes', 'Simmer the tomatoes for ⟦V0⟧ minutes.'],
      fr: ['Soupe aux tomates fraîches', 'tomates fraîches', 'Ajouter les tomates et cuire pendant ⟦V0⟧ minutes.'] },
  ];
  for (const example of examples) {
    const source = [example.title, example.name, example.step];
    const module = load('src/lib/translate.ts', {
      'zod': require('zod'),
      './db': { db: { contentTranslation: { findMany: async () => [], createMany: async () => {} } } },
      './ai': { completion: async (system: string, input: string) => {
        const texts = JSON.parse(input).texts;
        const locale = system.includes('into French') ? 'fr' : 'en';
        const protectedSource = integrity.protectCookingValues(source).texts;
        return JSON.stringify({ sourceLanguages: texts.map(() => example.language),
          translations: texts.map((text: string) => example[locale][protectedSource.indexOf(text)]) });
      } },
      './content-translation': integrity,
      './recipe-languages': languages,
    });
    const saved = await module.prepareRecipeLanguages('chef-a', {
      title: example.title, altTitle: '', roastLine: '', imageUrl: '', servings: 2, vibe: 'cozy',
      ingredients: [{ name: example.name, quantity: '2', unit: 'g' }], steps: [example.step],
    });
    assert.equal(saved.pending, false, example.title);
    for (const locale of ['en', 'fr'] as const) {
      assert.equal(saved[locale][example.title], example.language === locale ? example.title : example[locale][0]);
      assert.equal(saved[locale][example.step], example.language === locale ? example.step : example[locale][2].replace('⟦V0⟧', '10'));
    }
  }
});

test('unchanged third-language prose cannot be cached as a completed translation', async () => {
  let calls = 0, writes = 0;
  const source = 'Mezclar la harina con el agua.';
  const module = load('src/lib/translate.ts', {
    'zod': require('zod'),
    './db': { db: { contentTranslation: { findMany: async () => [], createMany: async () => { writes++; } } } },
    './ai': { completion: async () => { calls++; return JSON.stringify({ translations: [source], sourceLanguages: ['other'] }); } },
    './content-translation': integrity,
    './recipe-languages': languages,
  });
  for (const locale of ['en', 'fr']) await assert.rejects(module.translateTexts('chef-a', locale, [source]), (error: any) => error.code === 'untranslated');
  assert.equal(calls, 4, 'one forced retry for each language');
  assert.equal(writes, 0);
});
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
    'zod': require('zod'),
    './db': { db },
    './ai': {
      completion: async (system: string, input: string) => {
        calls++;
        const texts = JSON.parse(input).texts;
        return JSON.stringify({
          sourceLanguages: texts.map(() => "en"),
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
      version: 3,
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
    'zod': require('zod'),
    './db': { db },
    './ai': {
      completion: async (system: string, input: string) => {
        const texts = JSON.parse(input).texts;
        batches.push(texts);
        if (texts.length === 1) {
          assert.equal(rows[0].text, 'farine', 'completed ingredient was stored before retry');
          return JSON.stringify({
            sourceLanguages: ['en'],
            translations: ['Ces pâtes ont plus de drame que votre télévision.'],
          });
        }
        return JSON.stringify({ sourceLanguages: ['en', 'en'], translations: ['farine', source] });
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
    'zod': require('zod'),
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
        return JSON.stringify({ sourceLanguages: ['en'], translations: ['farine'] });
      },
    },
    './content-translation': integrity,
    './recipe-languages': languages,
  });
  const result = await module.translateTexts('chef-a', 'fr', ['flour']);
  assert.equal(result[0], 'farine');
  assert.deepEqual(budgets, [2200, 6000]);
});
