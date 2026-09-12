'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty-state"><h1>A little kitchen mishap.</h1><p>We couldn’t load this page. Check your connection and try again.</p><button className="button primary" onClick={reset}>Try again</button></div>; }
