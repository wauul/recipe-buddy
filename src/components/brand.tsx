import Link from 'next/link';
import { ChefHat } from 'lucide-react';
export function Brand({ href = '/recipes' }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Recipe Buddy home">
      <span className="brand-icon">
        <ChefHat aria-hidden="true" size={24} />
      </span>
      <span>
        recipe<span className="brand-light">buddy</span>
      </span>
    </Link>
  );
}
