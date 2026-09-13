'use client';
import { useState } from 'react';
export function RecipeArt({ vibe, small = false, imageUrl = '', title = 'Recipe' }: { vibe: string; small?: boolean; imageUrl?: string; title?: string }) {
  const [failed, setFailed] = useState('');
  if (imageUrl && failed !== imageUrl) return <div className={`recipe-art recipe-photo ${small ? 'small' : ''}`}>
    {/* External photos load directly, never through a server-side image proxy. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={imageUrl} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(imageUrl)} />
  </div>;
  const food = vibe === 'fancy' ? '🥗' : vibe === 'lazy' ? '🍳' : vibe === 'chaotic' ? '🌮' : '🍝';
  return <div className={`recipe-art art-${vibe} ${small ? 'small' : ''}`} aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="herb herb-one">✳</span><span className="herb herb-two">✧</span><div className="plate"><span>{food}</span></div><span className="art-dots">···</span></div>;
}
export function Vibe({ vibe }: { vibe: string }) { return <span className={`vibe vibe-${vibe}`}><span />{vibe}</span>; }
