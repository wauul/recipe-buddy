'use client';
import { useTranslation } from '@/components/language-provider';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state" role="alert">
      <h1>{t('Could not load this page')}</h1>
      <p>{t('Please check your connection and try again.')}</p>
      <button className="button primary" onClick={reset}>
        {t('Try again')}
      </button>
    </div>
  );
}
