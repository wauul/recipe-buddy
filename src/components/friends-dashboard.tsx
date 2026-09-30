'use client';
import { useTranslation } from '@/components/language-provider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, UserPlus, Users, BookOpen, X } from 'lucide-react';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';
import type { FriendView, SharedRecipeView } from '@/lib/social';
import { RecipeCard } from './recipe-card';

export function FriendsDashboard({
  friends,
  recipes,
}: {
  friends: FriendView[];
  recipes: SharedRecipeView[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState('');
  const selected = friends.find((f) => f.id === removing);
  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status !== 'accepted');

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy('invite');
    setError('');
    setNotice('');
    try {
      await request('/api/friends', 'POST', { email });
      setEmail('');
      setNotice('Friend request sent.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy('');
    }
  }
  async function change(friend: FriendView, method: 'PATCH' | 'DELETE') {
    setBusy(friend.id);
    setError('');
    setNotice('');
    try {
      await request(`/api/friends/${friend.id}`, method, {});
      setRemoving('');
      setNotice(
        method === 'PATCH'
          ? 'Friend request accepted. You can now share recipes.'
          : friend.status === 'accepted'
            ? 'Friend removed. Recipes shared between you are now private again.'
            : 'Request removed.',
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this connection.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      {selected && (
        <ConfirmDialog
          title={t(selected.status === 'accepted' ? 'Remove this friend?' : 'Remove this request?')}
          busy={!!busy}
          label={t('Remove')}
          onCancel={() => setRemoving('')}
          onConfirm={() => change(selected, 'DELETE')}
        >
          <p>
            {t(
              selected.status === 'accepted'
                ? 'Shared recipe access ends for both of you. You can send a new friend request later.'
                : 'This cancels or declines the pending request.',
            )}
          </p>
        </ConfirmDialog>
      )}

      <div className="page-heading">
        <div>
          <h1>{t('Friends')}</h1>
          <p>{t('Share recipes with chefs you know.')}</p>
        </div>
        <span className="social-count">
          <Users aria-hidden="true" size={17} />
          {accepted.length} {t(accepted.length === 1 ? 'friend' : 'friends')}
        </span>
      </div>
      <section className="social-invite form-panel">
        <div>
          <h2>
            <UserPlus aria-hidden="true" size={21} /> {t('Invite a chef')}
          </h2>
          <p>{t('Find a friend using the exact email they use for Recipe Buddy.')}</p>
        </div>
        <form onSubmit={invite}>
          <label htmlFor="friend-email">{t('Friend’s email address')}</label>
          <input
            id="friend-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
          />
          <button className="button primary" aria-busy={!!busy} disabled={!!busy}>
            <UserPlus aria-hidden="true" size={16} />
            {t(busy === 'invite' ? 'Sending…' : 'Add friend')}
          </button>
        </form>
        <small>
          {t(
            'They’ll see your chef name and email and can accept in their Friends page. Adding a friend never shares recipes automatically.',
          )}
        </small>
      </section>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="social-notice">
          {t(notice)}
        </p>
      )}
      <div className="social-people">
        <section className="form-panel">
          <div className="social-section-title">
            <h2>{t('Your friends')}</h2>
            <span>{accepted.length}</span>
          </div>
          {accepted.length ? (
            <ul className="friend-list">
              {accepted.map((friend) => (
                <li key={friend.id}>
                  <div className="friend-person">
                    <span className="avatar">
                      {Array.from(friend.friend.username)[0]?.toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {t('Chef')} {friend.friend.username}
                      </strong>
                      <small>{t('Connected')}</small>
                    </div>
                  </div>
                  <button
                    className="text-button"
                    aria-busy={!!busy}
                    disabled={!!busy}
                    onClick={() => setRemoving(friend.id)}
                  >
                    {t('Remove friend')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="social-empty">
              <p>{t('No friends yet. Send a request using their account email.')}</p>
            </div>
          )}
        </section>
        <section className="form-panel">
          <div className="social-section-title">
            <h2>{t('Friend requests')}</h2>
            <span>{pending.length}</span>
          </div>
          {pending.length ? (
            <ul className="friend-list">
              {pending.map((friend) => (
                <li key={friend.id}>
                  <div className="friend-person">
                    <span className="avatar">
                      {Array.from(friend.friend.username)[0]?.toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {t('Chef')} {friend.friend.username}
                      </strong>
                      <small>
                        {t(
                          friend.status === 'incoming'
                            ? 'Sent you a friend request'
                            : 'Request sent · waiting for a yes',
                        )}
                      </small>
                    </div>
                  </div>
                  <div className="friend-buttons">
                    {friend.status === 'incoming' && (
                      <button
                        className="button primary"
                        aria-busy={!!busy}
                        disabled={!!busy}
                        onClick={() => change(friend, 'PATCH')}
                      >
                        <Check aria-hidden="true" size={15} />
                        {t('Accept')}
                      </button>
                    )}
                    <button
                      className="button secondary"
                      aria-busy={!!busy}
                      disabled={!!busy}
                      onClick={() => setRemoving(friend.id)}
                    >
                      <X aria-hidden="true" size={15} />
                      {t(friend.status === 'incoming' ? 'Decline' : 'Cancel request')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="social-empty">
              <p>{t('No pending requests.')}</p>
            </div>
          )}
        </section>
      </div>
      <section className="collection social-shared">
        <div className="collection-heading">
          <h2>
            {t('Shared with you')} <span>{recipes.length}</span>
          </h2>
          <span className="filter-note">{t('Recipes your friends shared with you.')}</span>
        </div>
        {recipes.length ? (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} sharedBy={recipe.sharedBy} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen aria-hidden="true" size={37} />
            <h2>{t('No shared recipes yet')}</h2>
            <p>
              {t(
                'Recipes your friends share with you will appear here. To share yours, open a saved recipe.',
              )}
            </p>
            <Link href="/recipes" className="button secondary">
              {t('My recipes')}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
