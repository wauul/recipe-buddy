import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { recipeSchema } from '../src/lib/validation';
import * as languages from '../src/lib/recipe-languages';

function harness(complete = false, stale = false, outage = false) {
  const recipe = { id: 'fixture-recipe', userId: 'fixture-owner', updatedAt: new Date('2026-10-03T12:00:00Z'),
    title: 'Toast', ingredients: [{ name: 'bread', quantity: '1', unit: 'slice' }], steps: ['Toast bread.'],
    imageUrl: '', altTitle: '', servings: 1, vibe: 'cozy', roastLine: 'Existing joke', translations: {} as any };
  const dictionary = Object.fromEntries(languages.recipeTexts(recipe).map(text => [text, text]));
  recipe.translations = complete ? { en: dictionary, fr: dictionary, pending: false, version: 2 } : { en: {}, fr: {}, pending: true, version: 2 };
  const jobs: (() => Promise<void>)[] = [], writes: any[] = [], leases = new Set<string>();
  let generations = 0, roasts = 0;
  const dependencies: Record<string, unknown> = {
    'next/server': { after: (job: () => Promise<void>) => jobs.push(job) },
    './db': { transactionScope: { exit: (job: () => Promise<void>) => job() }, db: { recipe: {
      findFirst: async () => stale ? null : recipe,
      updateMany: async (write: any) => { writes.push(write); return { count: 1 }; },
    } } },
    './validation': { recipeSchema }, './recipe-languages': languages,
    './rate-limit': { rateLimit: async (key: string, limit: number) => {
      if(limit !== 1) return true;
      if(leases.has(key)) return false; leases.add(key); return true;
    } },
    './ai': { roastRecipe: async () => { roasts++; return 'Generated joke'; } },
    './translate': { prepareRecipeLanguages: async () => { generations++; if(outage) throw new Error('fixture outage'); return { en: dictionary, fr: dictionary, pending: false, version: 2 }; } },
  };
  const exports: any = {};
  runInContext(transpileModule(readFileSync('src/lib/recipe-enrichment.ts', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText, createContext({ exports, require: (name: string) => dependencies[name], console: { warn() {} } }));
  return { ...exports, recipe, jobs, writes, leases, generations: () => generations, roasts: () => roasts };
}

test('automatic bilingual retries keep the existing roast and lease one job per saved version', async () => {
  const h = harness(); h.enrichRecipeLater(h.recipe, true); h.enrichRecipeLater(h.recipe, true);
  for(const job of h.jobs) await job();
  assert.equal(h.generations(), 1); assert.equal(h.roasts(), 0); assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.roastLine, 'Existing joke'); assert.equal(h.writes[0].data.translations.pending, false);
  assert.equal(h.writes[0].where.userId, h.recipe.userId);
  assert.equal(h.writes[0].where.updatedAt, h.recipe.updatedAt);
});

test('complete or obsolete recipe versions never start another translation request', async () => {
  for(const h of [harness(true), harness(false, true)]) {
    h.enrichRecipeLater(h.recipe, true); await h.jobs[0]();
    assert.equal(h.generations(), 0); assert.equal(h.roasts(), 0); assert.equal(h.writes.length, 0);
  }
});

test('a provider outage preserves the original and retry cooldown prevents a polling storm', async () => {
  const h = harness(false, false, true);
  h.enrichRecipeLater(h.recipe, true); await h.jobs[0]();
  h.enrichRecipeLater(h.recipe, true); await h.jobs[1]();
  assert.equal(h.generations(), 1); assert.equal(h.writes.length, 0);
  h.leases.clear(); h.enrichRecipeLater(h.recipe, true); await h.jobs[2]();
  assert.equal(h.generations(), 2); assert.equal(h.writes.length, 0);
});
