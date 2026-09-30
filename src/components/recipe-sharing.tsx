'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Check } from 'lucide-react';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';

type Friend = { id: string; email: string; username: string };
export function RecipeSharing({
  recipeId,
  friends,
  recipientIds,
}: {
  recipeId: string;
  friends: Friend[];
  recipientIds: string[];
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Friend | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function toggle(friend: Friend) {
    const shared = recipientIds.includes(friend.id);
    setBusy(friend.id);
    setError('');
    setNotice('');
    try {
      await request(`/api/recipes/${recipeId}/shares`, shared ? 'DELETE' : 'POST', {
        recipientId: friend.id,
      });
      setNotice(
        shared ? `Sharing stopped for ${friend.username}.` : `Shared with ${friend.username}.`,
      );
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update sharing.');
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="form-panel recipe-sharing">
      {confirm && (
        <ConfirmDialog
          title="Stop sharing this recipe?"
          busy={!!busy}
          label="Stop sharing"
          onCancel={() => setConfirm(null)}
          onConfirm={() => toggle(confirm)}
        >
          <p>{confirm.username} will no longer be able to view this recipe.</p>
        </ConfirmDialog>
      )}
      <div className="sharing-heading">
        <Share2 aria-hidden="true" size={23} />
        <div>
          <h2>Share this recipe</h2>
          <p>Choose which friends can view your recipe. Only you can edit it.</p>
        </div>
      </div>
      {friends.length ? (
        <ul className="share-friends">
          {friends.map((friend) => {
            const shared = recipientIds.includes(friend.id);
            return (
              <li key={friend.id}>
                <span>
                  <strong>Chef {friend.username}</strong>
                  <small>{shared ? 'Can view this recipe' : 'Not shared'}</small>
                </span>
                <button
                  className={`button ${shared ? 'secondary' : 'primary'}`}
                  aria-busy={!!busy}
                  disabled={!!busy}
                  onClick={() => (shared ? setConfirm(friend) : toggle(friend))}
                >
                  {shared ? (
                    <Check aria-hidden="true" size={15} />
                  ) : (
                    <Share2 aria-hidden="true" size={15} />
                  )}
                  {busy === friend.id ? 'Updating…' : shared ? 'Stop sharing' : 'Share recipe'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          Add an accepted friend to share this recipe.{' '}
          <Link className="text-button" href="/friends">
            Add a friend
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="social-notice">
          {notice}
        </p>
      )}
      <small>
        Sharing is revocable. Removing a friend also ends access to recipes shared between you.
      </small>
    </section>
  );
}
