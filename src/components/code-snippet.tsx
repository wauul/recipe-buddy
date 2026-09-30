'use client';
import { useState } from 'react';
export function CodeSnippet({ code }: { code: string }) {
  const [status, setStatus] = useState('');
  return (
    <div className="code-snippet">
      <pre tabIndex={0} aria-label="Recipe text example">
        <code>{code}</code>
      </pre>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setStatus('Copied!');
          } catch {
            setStatus('Copy unavailable. Select the text to copy it.');
          }
        }}
      >
        Copy
      </button>
      <span role="status">{status}</span>
    </div>
  );
}
