'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from './language-provider';
import { browserImportKey, browserImportMaxLength, readBrowserImport } from '@/lib/browser-import';

export function BrowserImportBridge({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const fragment = window.location.hash;
      // Remove the recipe from the address bar before login or any navigation.
      window.history.replaceState(window.history.state, '', '/import');
      if (fragment.startsWith('#recipe=')) {
        if (fragment.length > browserImportMaxLength + 8) throw new Error('This recipe is too large to import. Try its URL instead.');
        const payload = readBrowserImport(decodeURIComponent(fragment.slice(8)));
        sessionStorage.setItem(browserImportKey, JSON.stringify(payload));
      } else if (fragment) {
        throw new Error('Could not read this recipe. Add it again from the extension.');
      }
      const pending = sessionStorage.getItem(browserImportKey);
      if (!pending) throw new Error('No recipe to import. Add a recipe from the extension first.');
      readBrowserImport(pending);
      router.replace(signedIn ? '/recipes/new?from=extension' : '/login?callbackUrl=%2Fimport');
    } catch (e) {
      setError(e instanceof Error && !(e.name === 'ZodError' || e instanceof SyntaxError || e instanceof URIError)
        ? e.message : 'Could not read this recipe. Add it again from the extension.');
    }
  }, [router, signedIn]);
  return <main id="main" className="main-content">
    <div className="editor">
      <h1>{t('Add from your browser')}</h1>
      {error ? <><p className="error" role="alert">{t(error)}</p><Link className="button primary" href="/recipes/new">{t('Add a recipe')}</Link></>
        : <p role="status">{t('Opening your recipe…')}</p>}
    </div>
  </main>;
}
