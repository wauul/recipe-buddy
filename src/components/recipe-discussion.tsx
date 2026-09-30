'use client';
import { ContentText, useContentTranslation } from './content-translation';
import { useTranslation } from '@/components/language-provider';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, CookingPot, Trash2, Plus, X } from 'lucide-react';
import { request } from '@/lib/client';
import {
  takeSchema,
  takeTypes,
  commentSchema,
  type Discussion,
  type DiscussionComment,
} from '@/lib/discussion-validation';
import { ConfirmDialog } from './confirm-dialog';

export function RecipeDiscussion({
  recipeId,
  viewerId,
  ingredients,
  discussion,
}: {
  recipeId: string;
  viewerId: string;
  ingredients: string[];
  discussion: Discussion;
}) {
  const { t } = useTranslation();
  const read = useContentTranslation([
    ...ingredients,
    ...discussion.takes.map((take) => take.title),
  ]);
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState<{
    kind: 'take' | 'comment';
    id: string;
  } | null>(null);
  const endpoint = `/api/recipes/${recipeId}/discussion`;
  const canRemove = (authorId: string) => viewerId === authorId || viewerId === discussion.ownerId;

  async function addTake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = takeSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(endpoint, 'POST', { kind: 'take', ...parsed.data });
      form.reset();
      setAdding(false);
      setNotice('Twist added.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your twist.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(endpoint, 'DELETE', removing);
      setRemoving(null);
      setNotice('Contribution removed.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove this contribution.');
    } finally {
      setBusy(false);
    }
  }

  function comments(rows: DiscussionComment[]) {
    return rows.map((comment) => (
      <article className="recipe-comment" key={comment.id}>
        <div className="contribution-meta">
          <strong>
            {t('Chef')} {comment.authorName}
            {t(comment.authorId === viewerId ? ' (you)' : '')}
          </strong>
          <time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time>
          {canRemove(comment.authorId) && (
            <button
              className="icon-button"
              disabled={busy}
              aria-label={t('Delete comment by {0}', { 0: comment.authorName })}
              onClick={() => setRemoving({ kind: 'comment', id: comment.id })}
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          )}
        </div>
        <p className="contribution-text">
          <ContentText>{comment.text}</ContentText>
        </p>
      </article>
    ));
  }

  return (
    <section className="recipe-discussion" aria-labelledby="discussion-title">
      <div className="discussion-heading">
        <div>
          <h2 id="discussion-title">
            <CookingPot aria-hidden="true" size={24} /> {t('Kitchen twists')}
          </h2>
          <p>{t('Share a change you tried, without editing the original recipe.')}</p>
        </div>
        <button
          className="button primary"
          aria-expanded={adding}
          aria-controls="take-form"
          onClick={() => setAdding(!adding)}
          disabled={busy}
        >
          {adding ? <X aria-hidden="true" size={17} /> : <Plus aria-hidden="true" size={17} />}
          {t(adding ? 'Cancel' : 'Add a twist')}
        </button>
      </div>
      <p className="discussion-privacy">
        {t(
          'Visible to the recipe’s chef and everyone this recipe is currently shared with. Contributions stay on the recipe if sharing ends.',
        )}
      </p>
      {adding && (
        <form id="take-form" className="take-form form-panel" onSubmit={addTake} aria-busy={busy}>
          <label>
            {t('Type of twist')}
            <select name="type" defaultValue="other" disabled={busy}>
              {Object.entries(takeTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('A name for your twist')}
            <input
              name="title"
              required
              maxLength={120}
              placeholder={t('Jane’s lighter, crispier version')}
              disabled={busy}
            />
          </label>
          <label>
            {t('What did you change?')}
            <textarea
              name="change"
              required
              maxLength={2000}
              rows={3}
              placeholder={t(
                'I halved the oil and baked it at 200°C for 20 minutes instead of frying.',
              )}
              disabled={busy}
            />
          </label>
          <div className="take-form-row">
            <label>
              {t('Link to an ingredient (optional)')}
              <select name="ingredient" disabled={busy}>
                <option value="">{t('Whole recipe / another part')}</option>
                {Array.from(new Set(ingredients)).map((name) => (
                  <option key={name} value={name}>
                    {read(name)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t('Why did it work for you? (optional)')}
            <textarea
              name="reason"
              maxLength={2000}
              rows={2}
              placeholder={t(
                'I wanted a lighter dinner, and the oven still made the edges crispy.',
              )}
              disabled={busy}
            />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            {t(busy ? 'Saving twist…' : 'Add twist')}
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {notice && (
        <p className="social-notice" role="status">
          {t(notice)}
        </p>
      )}
      {!discussion.takes.length && (
        <div className="twist-empty">
          <CookingPot aria-hidden="true" size={24} />
          <p>{t('No twists yet. Add a variation, ingredient swap, or cooking tip.')}</p>
        </div>
      )}
      <div className="take-list">
        {discussion.takes.map((take) => (
          <article className="take-card" key={take.id} id={`take-${take.id}`}>
            <div className="contribution-meta">
              <span className="take-author">
                {t('Chef')} {take.authorName}
                {t('’s twist')}
                {t(take.authorId === viewerId ? ' (you)' : '')}
              </span>
              <time dateTime={take.createdAt}>{take.createdAt.slice(0, 10)}</time>
              {canRemove(take.authorId) && (
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={t('Delete twist: {0}', { 0: read(take.title) })}
                  onClick={() => setRemoving({ kind: 'take', id: take.id })}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              )}
            </div>
            <div className="take-tags">
              <span className="take-type">{t(takeTypes[take.type])}</span>
              {take.ingredient && (
                <span className="take-ingredient">
                  {t('Ingredient:')} <ContentText>{take.ingredient}</ContentText>
                </span>
              )}
            </div>
            <h3>
              <ContentText>{take.title}</ContentText>
            </h3>
            <p className="contribution-text">
              <ContentText>{take.change}</ContentText>
            </p>
            {take.reason && (
              <div className="take-reason">
                <strong>{t('Why this twist?')}</strong>
                <p className="contribution-text">
                  <ContentText>{take.reason}</ContentText>
                </p>
              </div>
            )}
            <details className="take-replies">
              <summary>
                <MessageCircle aria-hidden="true" size={16} /> {t('Comments on this twist (')}
                {discussion.comments.filter((comment) => comment.takeId === take.id).length})
              </summary>
              {comments(discussion.comments.filter((comment) => comment.takeId === take.id))}
              <CommentForm
                recipeId={recipeId}
                takeId={take.id}
                label={t('Comment on Chef {0}’s twist', { 0: take.authorName })}
                onSaved={() => router.refresh()}
              />
            </details>
          </article>
        ))}
      </div>
      <section className="recipe-comments" aria-labelledby="recipe-comments-title">
        <h2 id="recipe-comments-title">
          <MessageCircle aria-hidden="true" size={23} /> {t('Recipe conversation')}
        </h2>
        <p>{t('Ask a question or share how the recipe turned out.')}</p>
        {comments(discussion.comments.filter((comment) => !comment.takeId))}
        <CommentForm
          recipeId={recipeId}
          takeId={null}
          label={t('Add a comment on the recipe')}
          onSaved={() => router.refresh()}
        />
      </section>
      {removing && (
        <ConfirmDialog
          title={t(removing.kind === 'take' ? 'Remove this twist?' : 'Remove this comment?')}
          label={t('Remove')}
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
        >
          <p>
            {t(
              removing.kind === 'take'
                ? 'This permanently removes the twist and all comments on it.'
                : 'This permanently removes the comment.',
            )}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function CommentForm({
  recipeId,
  takeId,
  label,
  onSaved,
}: {
  recipeId: string;
  takeId: string | null;
  label: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const parsed = commentSchema.safeParse({ text, takeId });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await request(`/api/recipes/${recipeId}/discussion`, 'POST', {
        kind: 'comment',
        ...parsed.data,
      });
      setText('');
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your comment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="comment-form" onSubmit={submit} aria-busy={busy}>
      <label>
        {t(label)}
        <textarea
          required
          maxLength={2000}
          rows={2}
          value={text}
          disabled={busy}
          onChange={(event) => {
            setText(event.target.value);
            setSaved(false);
          }}
          placeholder={t('Write a comment')}
        />
      </label>
      <button className="button secondary" disabled={busy || !text.trim()}>
        {t(busy ? 'Posting…' : 'Post comment')}
      </button>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {saved && (
        <p className="social-notice" role="status">
          {t('Comment posted.')}
        </p>
      )}
    </form>
  );
}
