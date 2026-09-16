'use client';
import { UpdatedDate } from '@/components/updated-date';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, UserPlus, Users, ArrowUpRight, BookOpen, X } from 'lucide-react';
import { request } from '@/lib/client';
import { ConfirmDialog } from './confirm-dialog';
import type { FriendView, SharedRecipeView } from '@/lib/social';
import { RecipeArt, Vibe } from './recipe-art';

export function FriendsDashboard({ friends, recipes }: { friends: FriendView[]; recipes: SharedRecipeView[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(''); const selected = friends.find(f => f.id === removing);
  const accepted = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.status !== 'accepted');

  async function invite(event: React.FormEvent) {
    event.preventDefault(); setBusy('invite'); setError(''); setNotice('');
    try {
      await request('/api/friends', 'POST', { email });
      setEmail(''); setNotice('Friend request sent. A new sous-chef is on the way.'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send request.'); }
    finally { setBusy(''); }
  }
  async function change(friend: FriendView, method: 'PATCH' | 'DELETE') {
    setBusy(friend.id); setError(''); setNotice('');
    try {
      await request(`/api/friends/${friend.id}`, method, {});
      setRemoving(''); setNotice(method === 'PATCH' ? 'You’re kitchen buddies! Open a recipe to share it.' : friend.status === 'accepted' ? 'Friend removed. Recipes shared between you are now private again.' : 'Request removed.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update this connection.'); }
    finally { setBusy(''); }
  }

  return <>{selected && <ConfirmDialog title={selected.status === 'accepted' ? 'Remove this friend?' : 'Remove this request?'} busy={!!busy} label="Remove" onCancel={() => setRemoving('')} onConfirm={() => change(selected, 'DELETE')}><p>{selected.status === 'accepted' ? 'Shared recipe access ends for both of you. You can send a new friend request later.' : 'This cancels or declines the pending request.'}</p></ConfirmDialog>}
    <span className="eyebrow">GOOD FOOD TASTES BETTER TOGETHER</span>
    <div className="page-heading"><div><h1>Your kitchen crew<span className="accent">.</span></h1><p>Add a friend. Swap a favorite. Argue lovingly about pineapple on pizza.</p></div><span className="social-count"><Users size={17} />{accepted.length} {accepted.length === 1 ? 'friend' : 'friends'}</span></div>
    <section className="social-invite form-panel">
      <div><h2><UserPlus size={21} /> Pull up another chair</h2><p>Find a friend using the exact email they use for Recipe Buddy.</p></div>
      <form onSubmit={invite}><label htmlFor="friend-email" className="sr-only">Friend’s email address</label><input id="friend-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="your-favorite-chef@example.com" /><button className="button primary" aria-busy={!!busy} disabled={!!busy}><UserPlus size={16} />{busy === 'invite' ? 'Sending…' : 'Add friend'}</button></form>
      <small>They’ll see your username and email and can accept in their Friends page. Adding a friend never shares recipes automatically.</small>
    </section>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="social-notice">{notice}</p>}
    <div className="social-people">
      <section className="form-panel"><div className="social-section-title"><h2>Your sous-chefs</h2><span>{accepted.length}</span></div>
        {accepted.length ? <ul className="friend-list">{accepted.map(friend => <li key={friend.id}><div className="friend-person"><span className="avatar">{Array.from(friend.friend.username)[0]?.toUpperCase()}</span><div><strong>{friend.friend.username}</strong><small>Ready for your next recipe recommendation</small></div></div>
          <button className="text-button" aria-busy={!!busy} disabled={!!busy} onClick={() => setRemoving(friend.id)}>Remove friend</button>
        </li>)}</ul> : <div className="social-empty"><span aria-hidden="true">🪑</span><p>There’s a seat with someone’s name on it.<br />Send your first friend request above.</p></div>}
      </section>
      <section className="form-panel"><div className="social-section-title"><h2>At the kitchen door</h2><span>{pending.length}</span></div>
        {pending.length ? <ul className="friend-list">{pending.map(friend => <li key={friend.id}><div className="friend-person"><span className="avatar">{Array.from(friend.friend.username)[0]?.toUpperCase()}</span><div><strong>{friend.friend.username}</strong><small>{friend.status === 'incoming' ? 'Wants to be your kitchen buddy' : 'Request sent · waiting for a yes'}</small></div></div><div className="friend-buttons">{friend.status === 'incoming' && <button className="button primary" aria-busy={!!busy} disabled={!!busy} onClick={() => change(friend, 'PATCH')}><Check size={15} />Accept</button>}<button className="button secondary" aria-busy={!!busy} disabled={!!busy} onClick={() => setRemoving(friend.id)}><X size={15} />{friend.status === 'incoming' ? 'Decline' : 'Cancel request'}</button></div></li>)}</ul> : <div className="social-empty"><span aria-hidden="true">✉️</span><p>No pending requests.<br />A peaceful moment in the kitchen.</p></div>}
      </section>
    </div>
    <section className="collection social-shared"><div className="collection-heading"><h2>Passed across the table <span>{recipes.length}</span></h2><span className="filter-note">Recipes your friends shared with you.</span></div>
      {recipes.length ? <div className="recipe-grid">{recipes.map(recipe => <Link className="recipe-card" href={`/shared/${recipe.id}`} key={recipe.id}><div className="card-image"><RecipeArt vibe={recipe.vibe} imageUrl={recipe.imageUrl} title={recipe.title} /><Vibe vibe={recipe.vibe} /></div><div className="card-body"><h3>{recipe.title}</h3><p className="alt-title">{recipe.altTitle || 'Straight from a friend’s kitchen.'}</p><p className="shared-by">From {recipe.sharedBy}</p><UpdatedDate date={recipe.updatedAt}/><div className="card-bottom"><span><Users size={14} />{recipe.servings} servings</span><span>View recipe <ArrowUpRight size={16} /></span></div></div></Link>)}</div> : <div className="empty-state"><BookOpen size={37} /><h2>The recipe swap starts here.</h2><p>When a friend shares a recipe, it’ll arrive here.<br />To share yours, open a saved recipe and choose a friend.</p><Link href="/recipes" className="button secondary">Visit my recipe box <ArrowUpRight size={16} /></Link></div>}
    </section>
  </>;
}
