import { getTranslation } from '@/lib/i18n-server';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export default async function NotFound() {
  const { t } = await getTranslation();
  return (
    <main id="main" tabIndex={-1} className="not-found-page">
      <BookOpen aria-hidden="true" size={40} />
      <h1>{t('Recipe or page not found')}</h1>
      <p>{t('It may have moved, been deleted, or no longer be shared with you.')}</p>
      <div>
        <Link href="/recipes" className="button primary">
          {t('My recipes')}
        </Link>
        <Link href="/search" className="button secondary">
          {t('Search')}
        </Link>
      </div>
      <Link href="/help" className="text-button">
        {t('Help & FAQ')}
      </Link>
    </main>
  );
}
