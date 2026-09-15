'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Menu, Moon, Sun, Search, Mail, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { trackedOutbound } from '@/lib/outbound';

export function SiteTools() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false), [menu, setMenu] = useState(false), [cookies, setCookies] = useState(false), [top, setTop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
    try { setCookies(!localStorage.getItem('rb-cookie-notice-v1')); } catch { setCookies(true); }
    const update = () => { const max = document.documentElement.scrollHeight - innerHeight; if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`; setTop(scrollY > 500); };
    update(); addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
    const observer = new ResizeObserver(update); observer.observe(document.body);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); observer.disconnect(); };
  }, []);
  useEffect(() => { setMenu(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    const update = () => { document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a => { const href=a.getAttribute('href')!;const next=trackedOutbound(href,location.origin);if(next!==href)a.setAttribute('href',next); }); };
    update();const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});return()=>observer.disconnect();
  }, []);
  useEffect(() => { const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);setSearchOpen(false);if(document.activeElement===searchInput.current)searchToggle.current?.focus();}};addEventListener('keydown',close);return()=>removeEventListener('keydown',close); }, []);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  function closeSearch() { setSearchOpen(false); searchToggle.current?.focus(); }
  function theme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; try { localStorage.setItem('rb-theme', next ? 'dark' : 'light'); } catch { /* Theme still works without storage. */ } }
  return <><a href="#main" className="skip-link">Skip to content</a><header className={`site-header ${searchOpen ? 'search-open' : ''}`}><Link href="/recipes" className="header-brand">Recipe Buddy<span>YOUR DAILY DISH OF INSPIRATION</span></Link><button ref={searchToggle} className="icon-button mobile-search-toggle" aria-label={searchOpen ? 'Close search' : 'Open search'} aria-expanded={searchOpen} aria-controls="header-search" onClick={() => { if(searchOpen)closeSearch();else{setSearchOpen(true);setMenu(false);} }}>{searchOpen ? <X size={19}/> : <Search size={19}/>}</button><form id="header-search" action="/search" role="search" className="global-search" onSubmit={() => setSearchOpen(false)}><Search size={17} /><label className="sr-only" htmlFor="site-search">Search recipes and help</label><input ref={searchInput} id="site-search" name="q" maxLength={100} placeholder="Find a recipe, ingredient or answer…" /><button type="submit" aria-label="Search site">Go</button></form><button className="icon-button" onClick={theme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-button mobile-menu-toggle" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => { setMenu(!menu); setSearchOpen(false); }} aria-label={menu ? 'Close menu' : 'Open menu'}>{menu ? <X size={20} /> : <Menu size={20} />}</button><div ref={bar} className="scroll-progress" aria-hidden="true" /></header>{menu && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">{[['/recipes','My recipes'],['/shopping-list','Shopping list'],['/friends','Friends'],['/settings','Settings'],['/help','Help & FAQ']].map(([href,label]) => <Link href={href} key={href} onClick={() => setMenu(false)}>{label}</Link>)}<button onClick={() => signOut({callbackUrl:'/login'})}>Sign out</button></nav>}<div className="floating-tools">{top && <button className="icon-button" aria-label="Back to top" onClick={() => { window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); document.getElementById('main')?.focus({preventScroll:true}); }}><ArrowUp size={20} /></button>}<Link href="mailto:contact@recipebuddy.waelfz.com?subject=Recipe%20Buddy%20feedback" className="button primary" aria-label="Contact Recipe Buddy"><Mail size={18} /><span>Get in touch</span></Link></div>{cookies && <aside className="cookie-banner" aria-label="Cookie notice"><div><strong>A small cookie, no crumbs.</strong><p>We use essential cookies to keep you signed in, and local storage for preferences. No advertising cookies.</p></div><button className="button primary" onClick={() => { setCookies(false); try { localStorage.setItem('rb-cookie-notice-v1','seen'); } catch { /* Dismiss for this visit. */ } }}>Got it</button></aside>}</>;
}
