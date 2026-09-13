'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Check } from 'lucide-react';
import { request } from '@/lib/client';

type Friend = { id: string; email: string };
export function RecipeSharing({ recipeId, friends, recipientIds }: { recipeId: string; friends: Friend[]; recipientIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function toggle(friend: Friend) {
    const shared = recipientIds.includes(friend.id);
    setBusy(friend.id); setError(''); setNotice('');
    try {
      await request(`/api/recipes/${recipeId}/shares`, shared ? 'DELETE' : 'POST', { recipientId: friend.id });
      setNotice(shared ? `Sharing stopped for ${friend.email}.` : `Shared with ${friend.email}. Dinner inspiration delivered.`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update sharing.'); }
    finally { setBusy(''); }
  }
  return <section className="form-panel recipe-sharing"><div className="sharing-heading"><Share2 size={23} /><div><h2>Pass the recipe, chef.</h2><p>Choose who gets a taste. Friends can view the latest version, but only you can edit it.</p></div></div>
    {friends.length ? <ul className="share-friends">{friends.map(friend => { const shared = recipientIds.includes(friend.id); return <li key={friend.id}><span><strong>{friend.email}</strong><small>{shared ? 'Can view this recipe' : 'Not shared'}</small></span><button className={`button ${shared ? 'secondary' : 'primary'}`} disabled={!!busy} onClick={() => toggle(friend)}>{shared ? <Check size={15} /> : <Share2 size={15} />}{busy === friend.id ? 'Updating…' : shared ? 'Stop sharing' : 'Share recipe'}</button></li>; })}</ul> : <p>No kitchen buddies yet. <Link className="text-button" href="/friends">Add a friend →</Link></p>}
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="social-notice">{notice}</p>}
    <small>Sharing is revocable. Removing a friend also ends access to recipes shared between you.</small>
  </section>;
}
