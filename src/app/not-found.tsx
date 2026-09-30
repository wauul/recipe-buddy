import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="not-found-page">
      <BookOpen aria-hidden="true" size={40} />
      <h1>Recipe or page not found</h1>
      <p>It may have moved, been deleted, or no longer be shared with you.</p>
      <div>
        <Link href="/recipes" className="button primary">
          My recipes
        </Link>
        <Link href="/search" className="button secondary">
          Search
        </Link>
      </div>
      <Link href="/help" className="text-button">
        Help & FAQ
      </Link>
    </main>
  );
}
