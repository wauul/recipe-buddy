'use client';
import { useTranslation } from '@/components/language-provider';
export function UpdatedDate({ date }: { date: string }) {
  const { t, locale } = useTranslation();
  return (
    <p className="updated-label">
      {t('Last updated')}{' '}
      <time dateTime={date}>
        {new Date(date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </time>
    </p>
  );
}
