'use client';
import { useState } from 'react';
import { RecipeArt } from './recipe-art';

export function RecipePhotoInput({ value, onChange, onBusy }: { value: string; onChange: (value: string) => void; onBusy: (busy: boolean) => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) { setError('Choose a JPG, PNG or WebP photo under 10 MB.'); return; }
    setLoading(true); onBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      // Store a small, re-encoded image in Postgres: no paid file storage or upload key.
      let result = canvas.toDataURL('image/webp', .8);
      for (const quality of [.6, .4, .25]) { if (result.length <= 300000) break; result = canvas.toDataURL('image/webp', quality); }
      if (result.length > 300000) throw new Error('This photo is too detailed. Try a smaller image.');
      onChange(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read this photo.'); }
    finally { URL.revokeObjectURL(url); setLoading(false); onBusy(false); }
  }
  return <section className="photo-editor"><div><label htmlFor="recipe-photo">Recipe photo <span className="optional">(optional)</span></label><p>Upload your masterpiece, or use an HTTPS image link. Website imports pick up the recipe photo automatically when available.</p><input id="recipe-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={loading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /><label>Image URL<input type="url" maxLength={2048} value={value.startsWith('data:') ? '' : value} placeholder="https://example.com/dinner.jpg" disabled={loading} onChange={e => onChange(e.target.value)} /></label>{value && <button type="button" className="text-button" disabled={loading} onClick={() => onChange('')}>Remove photo</button>}{loading && <p role="status">Getting your photo ready…</p>}{error && <p className="error" role="alert">{error}</p>}</div><RecipeArt vibe="cozy" imageUrl={value} title="Recipe photo preview" /></section>;
}
