'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Sparkles, Trash2, Plus, X } from 'lucide-react';
import { request } from '@/lib/client';
import { takeSchema, takeTypes, commentSchema, type Discussion, type DiscussionComment } from '@/lib/discussion-validation';
import { ConfirmDialog } from './confirm-dialog';

export function RecipeDiscussion({ recipeId, viewerId, ingredients, discussion }: {
  recipeId: string; viewerId: string; ingredients: string[]; discussion: Discussion;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState<{ kind: 'take' | 'comment'; id: string } | null>(null);
  const endpoint = `/api/recipes/${recipeId}/discussion`;
  const canRemove = (authorId: string) => viewerId === authorId || viewerId === discussion.ownerId;

  async function addTake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = takeSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await request(endpoint, 'POST', { kind: 'take', ...parsed.data });
      form.reset(); setAdding(false); setNotice('Your twist is on the recipe. A little kitchen creativity goes a long way.'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your twist.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true); setError(''); setNotice('');
    try { await request(endpoint, 'DELETE', removing); setRemoving(null); setNotice('Contribution removed.'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove this contribution.'); }
    finally { setBusy(false); }
  }

  function comments(rows: DiscussionComment[]) {
    return rows.map(comment => <article className="recipe-comment" key={comment.id}>
      <div className="contribution-meta"><strong>{comment.authorName}{comment.authorId === viewerId ? ' (you)' : ''}</strong><time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time>
        {canRemove(comment.authorId) && <button className="icon-button" disabled={busy} aria-label={`Delete comment by ${comment.authorName}`} onClick={() => setRemoving({ kind: 'comment', id: comment.id })}><Trash2 size={15}/></button>}
      </div><p className="contribution-text">{comment.text}</p>
    </article>);
  }

  return <section className="recipe-discussion" aria-labelledby="discussion-title">
    <div className="discussion-heading"><div><span className="eyebrow">SAME RECIPE. YOUR OWN SPIN.</span><h2 id="discussion-title"><Sparkles size={25}/> Kitchen twists</h2><p>Different quantities, a new technique, a bold swap—tell the crew what you tried.</p></div><button className="button primary" aria-expanded={adding} aria-controls="take-form" onClick={() => setAdding(!adding)} disabled={busy}>{adding ? <X size={17}/> : <Plus size={17}/>}{adding ? 'Cancel' : 'Add my take'}</button></div>
    <p className="discussion-privacy">Visible to the recipe owner and everyone this recipe is currently shared with. Contributions stay on the recipe if sharing ends.</p>
    {adding && <form id="take-form" className="take-form form-panel" onSubmit={addTake} aria-busy={busy}>
      <label>Type of twist<select name="type" defaultValue="other" disabled={busy}>{Object.entries(takeTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>A name for your twist<input name="title" required maxLength={120} placeholder="Jane’s lighter, crispier version" disabled={busy}/></label>
      <label>What did you change?<textarea name="change" required maxLength={2000} rows={3} placeholder="I halved the oil and baked it at 200°C for 20 minutes instead of frying." disabled={busy}/></label>
      <div className="take-form-row"><label>Link to an ingredient (optional)<select name="ingredient" disabled={busy}><option value="">Whole recipe / another part</option>{Array.from(new Set(ingredients)).map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
      <label>Why did it work for you? (optional)<textarea name="reason" maxLength={2000} rows={2} placeholder="I wanted a lighter dinner, and the oven still made the edges crispy." disabled={busy}/></label>
      <button className="button primary" disabled={busy} type="submit">{busy ? 'Saving your spin…' : 'Share my take'}</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="social-notice" role="status">{notice}</p>}
    {!discussion.takes.length && <div className="twist-empty"><Sparkles size={25}/><p>No twists yet. Your “I did it a little differently” belongs here.</p></div>}
    <div className="take-list">{discussion.takes.map(take => <article className="take-card" key={take.id} id={`take-${take.id}`}>
      <div className="contribution-meta"><span className="take-author">{take.authorName}’s twist{take.authorId === viewerId ? ' (you)' : ''}</span><time dateTime={take.createdAt}>{take.createdAt.slice(0, 10)}</time>{canRemove(take.authorId) && <button className="icon-button" disabled={busy} aria-label={`Delete twist: ${take.title}`} onClick={() => setRemoving({ kind: 'take', id: take.id })}><Trash2 size={16}/></button>}</div>
      <div className="take-tags"><span className="take-type">{takeTypes[take.type]}</span>{take.ingredient && <span className="take-ingredient">On the {take.ingredient} part</span>}</div>
      <h3>{take.title}</h3><p className="contribution-text">{take.change}</p>{take.reason && <div className="take-reason"><strong>Why this twist?</strong><p className="contribution-text">{take.reason}</p></div>}
      <details className="take-replies"><summary><MessageCircle size={16}/> Comments on this twist ({discussion.comments.filter(comment => comment.takeId === take.id).length})</summary>
        {comments(discussion.comments.filter(comment => comment.takeId === take.id))}
        <CommentForm recipeId={recipeId} takeId={take.id} label={`Comment on ${take.authorName}’s twist`} onSaved={() => router.refresh()}/>
      </details>
    </article>)}</div>
    <section className="recipe-comments" aria-labelledby="recipe-comments-title"><h2 id="recipe-comments-title"><MessageCircle size={23}/> Recipe conversation</h2><p>Tips, questions, or a very enthusiastic “made this twice.”</p>
      {comments(discussion.comments.filter(comment => !comment.takeId))}
      <CommentForm recipeId={recipeId} takeId={null} label="Add a comment on the recipe" onSaved={() => router.refresh()}/>
    </section>
    {removing && <ConfirmDialog title={removing.kind === 'take' ? 'Remove this twist?' : 'Remove this comment?'} label="Remove" busy={busy} onCancel={() => setRemoving(null)} onConfirm={remove}><p>{removing.kind === 'take' ? 'This permanently removes the twist and all comments on it.' : 'This permanently removes the comment.'}</p></ConfirmDialog>}
  </section>;
}

function CommentForm({ recipeId, takeId, label, onSaved }: { recipeId: string; takeId: string | null; label: string; onSaved: () => void }) {
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSaved(false);
    const parsed = commentSchema.safeParse({ text, takeId });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try { await request(`/api/recipes/${recipeId}/discussion`, 'POST', { kind: 'comment', ...parsed.data }); setText(''); setSaved(true); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not post your comment.'); }
    finally { setBusy(false); }
  }
  return <form className="comment-form" onSubmit={submit} aria-busy={busy}><label>{label}<textarea required maxLength={2000} rows={2} value={text} disabled={busy} onChange={event => { setText(event.target.value); setSaved(false); }} placeholder="Pull up a chair. What do you think?"/></label><button className="button secondary" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post comment'}</button>{error && <p className="error" role="alert">{error}</p>}{saved && <p className="social-notice" role="status">Comment posted.</p>}</form>;
}
