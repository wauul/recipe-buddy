export function RecipeArt({ vibe, small = false }: { vibe: string; small?: boolean }) {
  const food = vibe === 'fancy' ? '🥗' : vibe === 'lazy' ? '🍳' : vibe === 'chaotic' ? '🌮' : '🍝';
  return <div className={`recipe-art art-${vibe} ${small ? 'small' : ''}`} aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="herb herb-one">✳</span><span className="herb herb-two">✧</span><div className="plate"><span>{food}</span></div><span className="art-dots">···</span></div>;
}
export function Vibe({ vibe }: { vibe: string }) { return <span className={`vibe vibe-${vibe}`}><span />{vibe}</span>; }
