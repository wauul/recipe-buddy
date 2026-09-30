import { getTranslation } from '@/lib/i18n-server';
import { currentUser } from '@/lib/data';
import { faqs } from '@/lib/help';
import { CodeSnippet } from '@/components/code-snippet';
export default async function HelpPage() {
  const { t } = getTranslation();
  await currentUser();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('Help & FAQ')}</h1>
          <p>{t('Answers for your recipe collection.')}</p>
        </div>
      </div>
      <section className="faq-panel">
        <h2>{t('Using Recipe Buddy')}</h2>
        {faqs.map((faq, i) => (
          <details key={faq.question} id={`faq-${i}`}>
            <summary>
              {t(faq.question)}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{t(faq.answer)}</p>
          </details>
        ))}
      </section>
      <section id="contact" className="form-panel help-contact">
        <h2>{t('Contact')}</h2>
        <p>
          {t(
            'Found a bug or have an idea? Include the page name and what happened. Never send passwords or API keys.',
          )}
        </p>
        <a
          className="button primary"
          href="mailto:contact@recipebuddy.waelfz.com?subject=Recipe%20Buddy%20feedback"
        >
          {t('Email Recipe Buddy')}
        </a>
      </section>
      <section className="form-panel">
        <h2>{t('A recipe text example')}</h2>
        <p>
          {t('Copy this format into the recipe importer and replace it with your own ingredients.')}
        </p>
        <CodeSnippet
          code={
            'Tomato toast\nServes 1\nIngredients: 1 slice bread, 1 tomato, salt to taste\nSteps: Toast bread. Slice tomato. Put tomato on toast and season.'
          }
        />
      </section>
      <p className="updated-label">
        {t('Help last updated')} <time dateTime="2026-09-15">{t('15 September 2026')}</time>
      </p>
    </>
  );
}
