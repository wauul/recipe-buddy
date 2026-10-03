import { getTranslation } from '@/lib/i18n-server';
export default async function Loading() {
  const { t } = await getTranslation();
  return (
    <div className="loading-layout" role="status" aria-label={t('Loading your kitchen')}>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-hero" />
      <div className="recipe-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">{t('Loading your recipes…')}</span>
    </div>
  );
}
