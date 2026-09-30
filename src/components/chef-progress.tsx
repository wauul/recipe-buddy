'use client';
import { useTranslation } from '@/components/language-provider';
import { chefLevels, type ChefProgress } from '@/lib/chef-levels';
import { CookingIllustration } from './cooking-illustration';
import { ChefBadge } from './chef-badge';
import { ChevronDown } from 'lucide-react';
export function ChefProgressPanel({
  chefName,
  progress,
  roadmap = false,
}: {
  chefName: string;
  progress: ChefProgress;
  roadmap?: boolean;
}) {
  const { t, locale } = useTranslation();
  return (
    <section
      className={`chef-progress ${roadmap ? 'with-roadmap' : ''}`}
      aria-labelledby="chef-progress-heading"
    >
      <div className="chef-progress-sketch">
        <CookingIllustration />
      </div>
      <div className="chef-progress-content">
        <div className="chef-progress-summary">
          <div className={`chef-emblem chef-level-${progress.current.level}`}>
            <ChefBadge level={progress.current.level} />
          </div>
          <div>
            <p className="chef-greeting">
              {t('Chef')} {chefName}
            </p>
            <h2 id="chef-progress-heading">{t(progress.current.name)}</h2>
            <p>
              {t('Level')} {progress.current.level} {t('of 7 ·')}{' '}
              {progress.points.toLocaleString(locale)} {t('chef points')}
            </p>
          </div>
          <div className="chef-score">
            <strong>{progress.recipeCount}</strong>
            <span>{t('recipes')}</span>
            <strong>{progress.receivedAprons}</strong>
            <span>{t('aprons received')}</span>
          </div>
        </div>
        <div className="chef-next-level">
          <label htmlFor="chef-level-progress">
            {t(
              progress.next
                ? t('{0} points to {1}', { 0: progress.pointsToNext, 1: t(progress.next.name) })
                : 'You’ve reached Apron Legend',
            )}
          </label>
          <progress id="chef-level-progress" value={progress.progress} max={100} />
        </div>
        <p className="chef-points-hint">
          {t('Each saved recipe earns 10 points. Every apron received in a review earns 2.')}
        </p>
        <p className="chef-mobile-totals">
          {progress.recipeCount} {t('recipes ·')} {progress.receivedAprons} {t('aprons received')}
        </p>
      </div>
      {roadmap && (
        <details className="chef-roadmap">
          <summary>
            {t('Meet all seven chef levels')} <ChevronDown size={20} aria-hidden="true" />
          </summary>
          <ol className="chef-level-ladder">
            {chefLevels.map((level) => (
              <li
                key={level.level}
                className={
                  level.level === progress.current.level
                    ? 'current-level'
                    : level.level < progress.current.level
                      ? 'earned-level'
                      : ''
                }
                aria-current={level.level === progress.current.level ? 'step' : undefined}
              >
                <ChefBadge level={level.level} />
                <div>
                  <span className="ladder-number">
                    {t('Level')} {level.level}
                  </span>
                  <h3>{t(level.name)}</h3>
                  <p>{t(level.description)}</p>
                </div>
                <span>
                  {level.points.toLocaleString(locale)} {t('points')}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
