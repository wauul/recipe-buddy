'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BookOpen, ShoppingBasket, Settings, LogOut, ChefHat, ArrowUpRight } from 'lucide-react';
export function Nav({ email }: { email: string }) {
  const pathname = usePathname();
  return <aside className="sidebar">
    <Link href="/recipes" className="brand"><span className="brand-icon"><ChefHat size={25} /></span><span>recipe<span className="brand-light">buddy</span><small>GOOD FOOD. GOOD MOOD.</small></span></Link>
    <button className="mobile-signout" aria-label="Sign out" onClick={() => signOut({ callbackUrl: '/login' })}><LogOut size={18} /></button>
    <div className="nav-caption">YOUR LITTLE KITCHEN</div>
    <nav aria-label="Main navigation">{[
      { href: '/recipes', label: 'My recipes', Icon: BookOpen },
      { href: '/shopping-list', label: 'Shopping list', Icon: ShoppingBasket },
      { href: '/settings', label: 'Settings', Icon: Settings }
    ].map(({ href, label, Icon }) => <Link key={href} href={href} className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`} aria-current={pathname.startsWith(href) ? 'page' : undefined}><Icon size={19} />{label}{pathname.startsWith(href) && <span className="nav-dot" />}</Link>)}</nav>
    <div className="sidebar-note"><span className="note-spark">✳</span><h3>A little messy.<br />A lot delicious.</h3><p>Your next favorite meal is probably one experiment away.</p><Link href="/recipes/new">Let’s make something <ArrowUpRight size={16} /></Link></div>
    <div className="account"><span className="avatar">{email[0].toUpperCase()}</span><div><strong>Your kitchen</strong><small title={email}>{email}</small></div><button aria-label="Sign out" title="Sign out" onClick={() => signOut({ callbackUrl: '/login' })}><LogOut size={17} /></button></div>
  </aside>;
}
