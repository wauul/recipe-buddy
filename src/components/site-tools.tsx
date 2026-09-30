'use client';
import { useTranslation } from '@/components/language-provider';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Menu, Moon, Sun, Search, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { trackedOutbound } from '@/lib/outbound';
import { LanguageSelector } from './language-provider';
import { applyTheme, themePreference } from '@/lib/theme';
export function SiteTools() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const publicPage = ['/', '/login', '/signup', '/privacy'].includes(pathname);
  const [dark, setDark] = useState(false),
    [menu, setMenu] = useState(false),
    [cookies, setCookies] = useState(false),
    [top, setTop] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null),
    menuToggle = useRef<HTMLButtonElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    bar = useRef<HTMLDivElement>(null),
    menuPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    const updateTheme = () => setDark(document.documentElement.dataset.theme === 'dark');
    updateTheme();
    const media = matchMedia('(prefers-color-scheme: dark)');
    const systemTheme = () => {
      if (themePreference() === 'system') applyTheme('system');
    };
    const storageTheme = () => applyTheme(themePreference());
    window.addEventListener('rb-theme-change', updateTheme);
    window.addEventListener('storage', storageTheme);
    media.addEventListener('change', systemTheme);
    try {
      setCookies(!localStorage.getItem('rb-cookie-notice-v1'));
    } catch {
      setCookies(true);
    }
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      setTop(scrollY > 500);
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('rb-theme-change', updateTheme);
      window.removeEventListener('storage', storageTheme);
      media.removeEventListener('change', systemTheme);
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    const update = () =>
      document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
        const href = a.getAttribute('href')!;
        const next = trackedOutbound(href, location.origin);
        if (next !== href) a.setAttribute('href', next);
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menu) {
          setMenu(false);
          menuToggle.current?.focus();
        }
        if (searchOpen) {
          setSearchOpen(false);
          searchToggle.current?.focus();
        }
      }
    };
    const outside = (e: PointerEvent) => {
      if (
        menu &&
        !menuPanel.current?.contains(e.target as Node) &&
        !menuToggle.current?.contains(e.target as Node)
      )
        setMenu(false);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', outside);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', outside);
    };
  }, [menu, searchOpen]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (menu) menuPanel.current?.querySelector<HTMLElement>('a,button')?.focus();
  }, [menu]);
  function closeSearch() {
    setSearchOpen(false);
    searchToggle.current?.focus();
  }
  return (
    <>
      <a href="#main" className="skip-link">
        {t('Skip to content')}
      </a>
      <header
        className={`site-header ${publicPage ? 'public-header' : ''} ${['/login', '/signup'].includes(pathname) ? 'auth-header' : ''} ${searchOpen ? 'search-open' : ''}`}
      >
        <Link href={publicPage ? '/' : '/recipes'} className="header-brand">
          Recipe Buddy
        </Link>
        {!publicPage && (
          <>
            <button
              ref={searchToggle}
              className="icon-button mobile-search-toggle"
              aria-label={t(searchOpen ? 'Close search' : 'Open search')}
              aria-expanded={searchOpen}
              aria-controls="header-search"
              onClick={() => {
                if (searchOpen) closeSearch();
                else {
                  setSearchOpen(true);
                  setMenu(false);
                }
              }}
            >
              {searchOpen ? (
                <X aria-hidden="true" size={20} />
              ) : (
                <Search aria-hidden="true" size={20} />
              )}
            </button>
            <form id="header-search" action="/search" role="search" className="global-search">
              <Search aria-hidden="true" size={18} />
              <label className="sr-only" htmlFor="site-search">
                {t('Search recipes and help')}
              </label>
              <input
                ref={searchInput}
                id="site-search"
                name="q"
                maxLength={100}
                placeholder={t('Find a recipe, ingredient or answer')}
                required
              />
              <button type="submit" aria-label={t('Search site')}>
                {t('Go')}
              </button>
            </form>
          </>
        )}
        {pathname === '/' && (
          <nav className="landing-nav" aria-label={t('Site navigation')}>
            <a href="#how-it-works">{t('How it works')}</a>
            <Link href="/login">{t('Log in')}</Link>
            <Link href="/signup" className="button primary">
              {t('Join the kitchen')}
            </Link>
          </nav>
        )}
        {publicPage && pathname !== '/' && (
          <a
            className="header-contact"
            href="mailto:contact@recipebuddy.waelfz.com?subject=Recipe%20Buddy%20feedback"
          >
            {t('Contact')}
          </a>
        )}
        <LanguageSelector />
        <button
          className="icon-button"
          onClick={() => applyTheme(dark ? 'light' : 'dark')}
          aria-label={t(dark ? 'Switch to light mode' : 'Switch to dark mode')}
          aria-pressed={dark}
        >
          {dark ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
        </button>
        {!publicPage && (
          <button
            ref={menuToggle}
            className="icon-button mobile-menu-toggle"
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => {
              setMenu(!menu);
              setSearchOpen(false);
            }}
            aria-label={t(menu ? 'Close menu' : 'Open menu')}
          >
            {menu ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        )}
        <div ref={bar} className="scroll-progress" aria-hidden="true" />
      </header>
      {menu && (
        <nav
          ref={menuPanel}
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label={t('Account and help')}
        >
          <Link href="/recipes/new">{t('Add a recipe')}</Link>
          <Link href="/settings">{t('Settings')}</Link>
          <Link href="/help">{t('Help & FAQ')}</Link>
          <a href="mailto:contact@recipebuddy.waelfz.com?subject=Recipe%20Buddy%20feedback">
            {t('Contact')}
          </a>
          <button onClick={() => signOut({ callbackUrl: '/login' })}>{t('Sign out')}</button>
        </nav>
      )}
      {top && (
        <div className="floating-tools">
          <button
            className="icon-button"
            aria-label={t('Back to top')}
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              });
              document.getElementById('main')?.focus({ preventScroll: true });
            }}
          >
            <ArrowUp aria-hidden="true" size={20} />
          </button>
        </div>
      )}
      {cookies && (
        <aside className="cookie-banner" aria-label={t('Cookie notice')}>
          <div>
            <strong>{t('Cookies and preferences')}</strong>
            <p>
              {t(
                'We use essential cookies to keep you signed in, and local storage for preferences. No advertising cookies.',
              )}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setCookies(false);
              try {
                localStorage.setItem('rb-cookie-notice-v1', 'seen');
              } catch {
                /* Dismiss for this visit. */
              }
            }}
          >
            {t('Got it')}
          </button>
        </aside>
      )}
    </>
  );
}
