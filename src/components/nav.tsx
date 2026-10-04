'use client';
import { useTranslation } from '@/components/language-provider';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {clearMealDrafts} from '@/lib/meal-drafts';
import { BookOpen, ShoppingBasket, CalendarDays, Leaf, LogOut, Users } from 'lucide-react';
import { Brand } from './brand';
export function Nav({
  email,
  username,
  level,
}: {
  email: string;
  username: string;
  level?: { level: number; name: string };
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Brand />
      <nav aria-label={t('Main navigation')}>
        {[
          { href: '/recipes', label: 'My recipes', Icon: BookOpen },
          {
            href: '/shopping-list',
            label: 'Shopping list',
            Icon: ShoppingBasket,
          },
          { href: '/friends', label: 'Friends', Icon: Users },
          { href: '/agenda', label: 'Agenda', Icon: CalendarDays },
          { href: '/pantry', label: 'Pantry', Icon: Leaf },
        ].map(({ href, label, Icon }) => {
          const active =
            pathname.startsWith(href) || (href === '/friends' && pathname.startsWith('/shared/'));
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" size={20} />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-note">
        <Link href="/settings">{t('Settings')}</Link> · <Link href="/help">{t('Help & FAQ')}</Link>
        <p>
          {t('Keep the recipes')}
          <br />
          {t('you come back to')}
        </p>
        <Link href="/recipes/new" className="text-button">
          {t('Add a recipe')}
        </Link>
      </div>
      <div className="account">
        <span className="avatar" aria-hidden="true">
          {Array.from(username)[0]?.toUpperCase()}
        </span>
        <div>
          <strong title={username}>
            {t('Chef')} {username}
          </strong>
          {level && (
            <small className="nav-chef-level">
              {t('Lv')} {level.level} · {t(level.name)}
            </small>
          )}
          <small title={email}>{email}</small>
        </div>
        <button
          className="icon-button"
          aria-label={t('Sign out')}
          title={t('Sign out')}
          onClick={() => {clearMealDrafts();void signOut({ callbackUrl: '/login' });}}
        >
          <LogOut aria-hidden="true" size={18} />
        </button>
      </div>
    </aside>
  );
}
