'use client';
import { ContentText } from './content-translation';
import { useTranslation } from '@/components/language-provider';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/client';
import { apronReviewSchema, canReviewRecipe, type RecipeReviews } from '@/lib/review-validation';
import { ApronIcon } from './apron-icon';

export function RecipeReviewsPanel({
  recipeId,
  viewerId,
  initial,
}: {
  recipeId: string;
  viewerId: string;
  initial: RecipeReviews;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const id = useId();
  const firstApron = useRef<HTMLInputElement>(null);
  const [data, setData] = useState(initial);
  useEffect(() => {
    setData(initial);
  }, [initial]);
  const own = data.reviews.find((review) => review.authorId === viewerId);
  const [rating, setRating] = useState(own?.rating ?? 0),
    [text, setText] = useState(own?.text ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const canReview = canReviewRecipe(data.ownerId, viewerId);
  const total = data.reviews.reduce((sum, review) => sum + review.rating, 0);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    const parsed = apronReviewSchema.safeParse({ rating, text });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      if (!rating) firstApron.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const updated = await request<RecipeReviews>(
        `/api/recipes/${recipeId}/reviews`,
        'PUT',
        parsed.data,
      );
      setData(updated);
      setNotice('Your apron review is saved. Thanks, chef.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your review. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(`/api/recipes/${recipeId}/reviews`, 'DELETE', {});
      setData({
        ...data,
        reviews: data.reviews.filter((review) => review.authorId !== viewerId),
      });
      setRating(0);
      setText('');
      setNotice('Your review has been removed.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove your review.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recipe-reviews" aria-labelledby={id + '-heading'}>
      <div className="reviews-heading">
        <div>
          <h2 id={id + '-heading'}>
            <ApronIcon size={26} /> {t('Apron reviews')}
          </h2>
          <p>{t('How did this recipe turn out in another chef’s kitchen?')}</p>
        </div>
        <div className="review-average">
          {data.reviews.length ? (
            <>
              <strong>
                {(total / data.reviews.length).toLocaleString(locale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                <span>{t('/5 aprons')}</span>
              </strong>
              <small>
                {data.reviews.length} {t(data.reviews.length === 1 ? 'review' : 'reviews')}
              </small>
            </>
          ) : (
            <span>{t('No reviews yet')}</span>
          )}
        </div>
      </div>
      {canReview ? (
        <form className="review-form form-panel" onSubmit={save} aria-busy={busy} noValidate>
          <fieldset disabled={busy} className="apron-picker">
            <legend>{t(own ? 'Your apron rating' : 'Rate this recipe')}</legend>
            <div>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className={value <= rating ? 'awarded' : ''}>
                  <input
                    ref={value === 1 ? firstApron : undefined}
                    aria-describedby={error ? id + '-review-error' : undefined}
                    type="radio"
                    name={id + '-rating'}
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    aria-label={t('{0} {1}', { 0: value, 1: t(value === 1 ? 'apron' : 'aprons') })}
                    required
                  />
                  <ApronIcon size={32} filled={value <= rating} />
                  <span>{value}</span>
                </label>
              ))}
            </div>
            <small>{t('1 = needs work · 5 = worth making again')}</small>
          </fieldset>
          <label htmlFor={id + '-text'}>
            {t('A note for the chef')} <span className="optional">{t('(optional)')}</span>
            <textarea
              id={id + '-text'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={busy}
              placeholder={t('What worked well, or what would you change?')}
            />
          </label>
          <div className="review-actions">
            <button className="button primary" disabled={busy}>
              {t(busy ? 'Saving review…' : own ? 'Update review' : 'Save review')}
            </button>
            {own && (
              <button type="button" className="text-button" onClick={remove} disabled={busy}>
                {t('Remove my review')}
              </button>
            )}
          </div>
          {error && (
            <p id={id + '-review-error'} role="alert" className="error">
              {t(error)}
            </p>
          )}
          {notice && (
            <p role="status" className="social-notice">
              {t(notice)}
            </p>
          )}
          <small>
            {t(
              'One review per chef. You can update or remove yours. Each apron adds 2 points to this recipe’s chef.',
            )}
          </small>
        </form>
      ) : (
        <p className="review-owner-note">
          {t(
            'Other chefs can review recipes you share with them. You cannot rate your own recipe.',
          )}
        </p>
      )}
      <div className="review-list">
        {data.reviews.map((review) => (
          <article className="apron-review" key={review.id}>
            <div className="contribution-meta">
              <strong>
                {t('Chef')} {review.chefName}
                {t(review.authorId === viewerId ? ' (you)' : '')}
              </strong>
              <time dateTime={review.updatedAt}>{review.updatedAt.slice(0, 10)}</time>
              <span className="review-rating">
                <ApronIcon size={20} filled />
                {review.rating}
                {t('/5 aprons')}
              </span>
            </div>
            {review.text && (
              <p className="contribution-text">
                <ContentText>{review.text}</ContentText>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
