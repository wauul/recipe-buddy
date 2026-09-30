import { RecipeSearchResults } from '@/components/recipe-search-results';
import { getTranslation } from '@/lib/i18n-server';
import Link from 'next/link';
import { SavedRecipeLanguages } from '@/components/content-translation';
import { currentUser, recipeView } from '@/lib/data';
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
        }),
        db.recipeShare.findMany({
          where: sharedRecipeWhere(user.id),
          include: { recipe: true },
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
  ];
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
      <SavedRecipeLanguages
        recipes={[...owned.map(recipeView), ...shared.map((s) => recipeView(s.recipe))]}
      />
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
      <RecipeSearchResults recipes={recipes} query={q} otherCount={answers.length + pages.length} />
      <div className="search-results">
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
    </>
  );
}
