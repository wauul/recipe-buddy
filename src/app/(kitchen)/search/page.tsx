import { getTranslation } from '@/lib/i18n-server';
import Link from 'next/link';
import { currentUser } from '@/lib/data';
import { db } from '@/lib/db';
import { faqs } from '@/lib/help';
import { sharedRecipeWhere } from '@/lib/social-policy';
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const { t } = getTranslation();
  const user = await currentUser();
  const q = (typeof searchParams.q === 'string' ? searchParams.q : '').trim().slice(0, 100);
  const term = q.toLowerCase();
  const [owned, shared] = q
    ? await Promise.all([
        db.recipe.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            title: true,
            altTitle: true,
            ingredients: true,
            steps: true,
          },
        }),
        db.recipeShare.findMany({
          where: sharedRecipeWhere(user.id),
          select: {
            recipe: {
              select: {
                id: true,
                title: true,
                altTitle: true,
                ingredients: true,
                steps: true,
              },
            },
          },
        }),
      ])
    : [[], []];
  const recipes = [
    ...owned.map((r) => ({
      ...r,
      href: `/recipes/${r.id}`,
      source: 'Your recipe',
    })),
    ...shared.map((s) => ({
      ...s.recipe,
      href: `/shared/${s.recipe.id}`,
      source: 'Shared with you',
    })),
  ].filter((r) =>
    `${r.title} ${r.altTitle} ${JSON.stringify(r.ingredients)} ${JSON.stringify(r.steps)}`
      .toLowerCase()
      .includes(term),
  );
  const answers = q
    ? faqs
        .map((f, i) => ({ ...f, i }))
        .filter((f) =>
          `${t(f.question)} ${t(f.answer)} ${f.question} ${f.answer}`.toLowerCase().includes(term),
        )
    : [];
  const pages = [
    ['/recipes', 'My recipes'],
    ['/shopping-list', 'Shopping list'],
    ['/friends', 'Friends and shared recipes'],
    ['/settings', 'Settings and roast mode'],
    ['/help', 'Help FAQ contact'],
  ].filter(([, label]) => q && `${t(label)} ${label}`.toLowerCase().includes(term));
  return (
    <>
      <Link href="/recipes" className="back-link">
        {t('← Back to recipes')}
      </Link>
      <h1>{t('Search')}</h1>
      <form action="/search" className="search-page-form">
        <label htmlFor="full-search">{t('Recipe, ingredient, cooking step or help topic')}</label>
        <div>
          <input id="full-search" name="q" defaultValue={q} maxLength={100} required />
          <button className="button primary">{t('Search')}</button>
        </div>
      </form>
      <p role="status">
        {t(
          q
            ? t('{0} results for “{1}”', {
                0: recipes.length + answers.length + pages.length,
                1: q,
              })
            : 'Search your recipes, recipes shared with you, pages and help.',
        )}
      </p>
      <div className="search-results">
        {recipes.map((r) => (
          <Link key={r.href} href={r.href}>
            <small>{t(r.source)}</small>
            <h2>{r.title}</h2>
            <p>{r.altTitle || t('Open recipe')}</p>
          </Link>
        ))}
        {answers.map((f) => (
          <Link key={f.i} href={`/help#faq-${f.i}`}>
            <small>{t('Help')}</small>
            <h2>{t(f.question)}</h2>
            <p>{t(f.answer)}</p>
          </Link>
        ))}
        {pages.map(([href, label]) => (
          <Link key={href} href={href}>
            <small>{t('Page')}</small>
            <h2>{t(label)}</h2>
          </Link>
        ))}
      </div>
      {q && !recipes.length && !answers.length && !pages.length && (
        <div className="empty-state">
          <h2>{t('No results')}</h2>
          <p>{t('Try a shorter phrase, an ingredient, or a different spelling.')}</p>
        </div>
      )}
    </>
  );
}
