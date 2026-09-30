'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, Trash2, Save, LoaderCircle } from 'lucide-react';
import { recipeSchema, type RecipeInput, type RecipeView } from '@/lib/validation';
import { request } from '@/lib/client';
import { RecipePhotoInput } from './recipe-photo-input';
const blank: RecipeInput = {
  imageUrl: '',
  title: '',
  servings: 2,
  altTitle: '',
  vibe: 'cozy',
  ingredients: [{ name: '', quantity: '', unit: '' }],
  steps: [''],
};
export function RecipeForm({ initial }: { initial?: RecipeView }) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeInput>(initial || blank),
    [photoBusy, setPhotoBusy] = useState(false);
  const [raw, setRaw] = useState(''),
    [error, setError] = useState(''),
    [parseError, setParseError] = useState(''),
    [roast, setRoast] = useState(''),
    [busy, setBusy] = useState<'parse' | 'save' | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  function fieldError(path: string) {
    return issues[path] ? (
      <small className="field-error" id={path + '-error'}>
        {issues[path]}
      </small>
    ) : null;
  }
  const invalid = (path: string) => ({
    'aria-invalid': !!issues[path],
    'aria-describedby': issues[path] ? path + '-error' : undefined,
  });
  async function parse() {
    setBusy('parse');
    setParseError('');
    try {
      const recipe = await request<RecipeInput & { roastLine: string }>(
        '/api/recipes/parse',
        'POST',
        { text: raw },
      );
      setForm(recipe);
      setRoast(recipe.roastLine);
      setIssues({});
      setError('');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Could not import. Enter the recipe below.');
    } finally {
      setBusy(null);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = recipeSchema.safeParse(form);
    if (!parsed.success) {
      setIssues(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('-'), issue.message]),
        ),
      );
      setError('Check the highlighted fields before saving.');
      return;
    }
    setIssues({});
    setBusy('save');
    try {
      const result = await request<{ id?: string }>(
        initial ? '/api/recipes/' + initial.id : '/api/recipes',
        initial ? 'PUT' : 'POST',
        parsed.data,
      );
      router.push('/recipes/' + (initial?.id || result.id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="editor">
      <Link href={initial ? '/recipes/' + initial.id : '/recipes'} className="back-link">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to {initial ? 'recipe' : 'recipes'}
      </Link>
      <div className="page-heading">
        <div>
          <h1>{initial ? 'Edit recipe' : 'Add a recipe'}</h1>
          <p>
            {initial
              ? 'Update the recipe everyone sees when you share it.'
              : 'Keep a favorite by hand, or import it below.'}
          </p>
        </div>
      </div>
      {!initial && (
        <section className="parse-panel">
          <h2>
            <FileText aria-hidden="true" size={22} />
            Import a recipe
          </h2>
          <p>
            Paste a public HTTPS recipe URL or the recipe text. Review the ingredients and steps
            before saving.
          </p>
          <label htmlFor="raw">Recipe URL or text</label>
          <textarea
            id="raw"
            rows={4}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            maxLength={16000}
            placeholder="https://… or paste the recipe here"
            disabled={!!busy || photoBusy}
            aria-describedby="import-hint"
          />
          <div className="parse-bottom">
            <small id="import-hint">
              Import uses AI. You can always enter the recipe manually.
            </small>
            <button
              type="button"
              className="button secondary"
              onClick={parse}
              disabled={!!busy || photoBusy || raw.trim().length < 10}
            >
              {busy === 'parse' ? 'Importing recipe…' : 'Import recipe'}
            </button>
          </div>
          {parseError && (
            <p className="error" role="alert">
              {parseError}
            </p>
          )}
        </section>
      )}
      <form onSubmit={save} noValidate aria-busy={busy === 'save'}>
        {error && (
          <div className="error" role="alert" tabIndex={-1} ref={errorSummary}>
            <p>{error}</p>
            {Object.keys(issues).length > 0 && (
              <ul>
                {Object.entries(issues).map(([path, message]) => (
                  <li key={path}>
                    <a href={'#' + path}>{message}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <fieldset disabled={!!busy} className="form-panel">
          <div className="section-label">
            <h2>Recipe details</h2>
          </div>
          <label htmlFor="title">
            Recipe title
            <input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={160}
              required
              placeholder="Sunday tomato pasta"
              {...invalid('title')}
            />
            {fieldError('title')}
          </label>
          {roast && <p className="speech">{roast}</p>}
          <div className="form-row">
            <label htmlFor="altTitle">
              Alternate title <span className="optional">(optional)</span>
              <input
                id="altTitle"
                value={form.altTitle}
                onChange={(e) => setForm({ ...form, altTitle: e.target.value })}
                maxLength={180}
                placeholder="Another name for this recipe"
                {...invalid('altTitle')}
              />
              {fieldError('altTitle')}
            </label>
            <label htmlFor="servings">
              Servings
              <input
                id="servings"
                type="number"
                min={1}
                max={100}
                required
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                {...invalid('servings')}
              />
              {fieldError('servings')}
            </label>
            <label htmlFor="vibe">
              Vibe
              <select
                id="vibe"
                value={form.vibe}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vibe: e.target.value as RecipeInput['vibe'],
                  })
                }
              >
                {['cozy', 'lazy', 'fancy', 'chaotic'].map((v) => (
                  <option key={v} value={v}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <RecipePhotoInput
            value={form.imageUrl}
            onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
            onBusy={setPhotoBusy}
          />
          {fieldError('imageUrl')}
          <div className="section-label">
            <h2>Ingredients</h2>
          </div>
          {form.ingredients.map((item, i) => (
            <div className="ingredient-row" key={i}>
              {(['name', 'quantity', 'unit'] as const).map((key) => (
                <label key={key} htmlFor={'ingredients-' + i + '-' + key}>
                  {key === 'name' ? 'Ingredient' : key === 'quantity' ? 'Quantity' : 'Unit'}
                  <span className="sr-only"> {i + 1}</span>
                  <input
                    id={'ingredients-' + i + '-' + key}
                    placeholder={
                      key === 'name' ? 'Cherry tomatoes' : key === 'quantity' ? '500' : 'g'
                    }
                    required={key === 'name'}
                    maxLength={key === 'name' ? 120 : 40}
                    value={item[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ingredients: form.ingredients.map((x, n) =>
                          n === i ? { ...x, [key]: e.target.value } : x,
                        ),
                      })
                    }
                    {...invalid('ingredients-' + i + '-' + key)}
                  />
                  {fieldError('ingredients-' + i + '-' + key)}
                </label>
              ))}
              <button
                type="button"
                className="icon-button"
                aria-label={'Remove ingredient ' + (i + 1)}
                disabled={form.ingredients.length === 1}
                onClick={() =>
                  setForm({
                    ...form,
                    ingredients: form.ingredients.filter((_, n) => n !== i),
                  })
                }
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            disabled={form.ingredients.length >= 100}
            onClick={() =>
              setForm({
                ...form,
                ingredients: [...form.ingredients, { name: '', quantity: '', unit: '' }],
              })
            }
          >
            <Plus aria-hidden="true" size={18} />
            Add ingredient
          </button>
          <div className="section-label">
            <h2>Method</h2>
          </div>
          {form.steps.map((step, i) => (
            <div className="step-row" key={i}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <label htmlFor={'steps-' + i}>
                Step {i + 1}
                <textarea
                  id={'steps-' + i}
                  required
                  maxLength={2000}
                  rows={3}
                  placeholder="Describe what to do"
                  value={step}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      steps: form.steps.map((x, n) => (n === i ? e.target.value : x)),
                    })
                  }
                  {...invalid('steps-' + i)}
                />
                {fieldError('steps-' + i)}
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={'Remove step ' + (i + 1)}
                disabled={form.steps.length === 1}
                onClick={() =>
                  setForm({
                    ...form,
                    steps: form.steps.filter((_, n) => n !== i),
                  })
                }
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            disabled={form.steps.length >= 80}
            onClick={() => setForm({ ...form, steps: [...form.steps, ''] })}
          >
            <Plus aria-hidden="true" size={18} />
            Add step
          </button>
        </fieldset>
        <div className="form-actions">
          <Link href={initial ? '/recipes/' + initial.id : '/recipes'} className="button secondary">
            Cancel
          </Link>
          <button className="button primary" disabled={!!busy || photoBusy}>
            {busy === 'save' ? (
              <LoaderCircle aria-hidden="true" size={18} />
            ) : (
              <Save aria-hidden="true" size={18} />
            )}{' '}
            {busy === 'save' ? 'Saving recipe…' : 'Save recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
