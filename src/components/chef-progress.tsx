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
            <p className="chef-greeting">Chef {chefName}</p>
            <h2 id="chef-progress-heading">{progress.current.name}</h2>
            <p>
              Level {progress.current.level} of 7 · {progress.points.toLocaleString('en')} chef
              points
            </p>
          </div>
          <div className="chef-score">
            <strong>{progress.recipeCount}</strong>
            <span>recipes</span>
            <strong>{progress.receivedAprons}</strong>
            <span>aprons received</span>
          </div>
        </div>
        <div className="chef-next-level">
          <label htmlFor="chef-level-progress">
            {progress.next
              ? `${progress.pointsToNext} points to ${progress.next.name}`
              : 'You’ve reached Apron Legend'}
          </label>
          <progress id="chef-level-progress" value={progress.progress} max={100} />
        </div>
        <p className="chef-points-hint">
          Each saved recipe earns 10 points. Every apron received in a review earns 2.
        </p>
        <p className="chef-mobile-totals">
          {progress.recipeCount} recipes · {progress.receivedAprons} aprons received
        </p>
      </div>
      {roadmap && (
        <details className="chef-roadmap">
          <summary>
            Meet all seven chef levels <ChevronDown size={20} aria-hidden="true" />
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
                  <span className="ladder-number">Level {level.level}</span>
                  <h3>{level.name}</h3>
                  <p>{level.description}</p>
                </div>
                <span>{level.points.toLocaleString('en')} points</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
