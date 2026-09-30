'use client';
import { useTranslation } from '@/components/language-provider';

import { useState } from 'react';
export function CodeSnippet({ code }: { code: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  return (
    <div className="code-snippet">
      <pre tabIndex={0} aria-label={t('Recipe text example')}>
        <code>{t(code)}</code>
      </pre>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(t(code));
            setStatus('Copied!');
          } catch {
            setStatus('Copy unavailable. Select the text to copy it.');
          }
        }}
      >
        {t('Copy')}
      </button>
      <span role="status">{t(status)}</span>
    </div>
  );
}
