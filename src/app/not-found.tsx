import Link from 'next/link';
export default function NotFound() { return <div className="empty-state"><span className="loading-pot">🥄</span><h1>This recipe flew the coop.</h1><p>It might have been deleted, or it belongs to another kitchen.</p><Link href="/recipes" className="button primary">Back to recipes</Link></div>; }
