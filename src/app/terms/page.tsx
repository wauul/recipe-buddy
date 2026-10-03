import Link from 'next/link';
import { getTranslation } from '@/lib/i18n-server';
import legal from '@/lib/legal-content.json';
import { TermsAcceptance } from '@/components/account-controls';
export const metadata = { title: 'Terms of use' };
export default async function TermsPage() {
  const { locale } = await getTranslation(); const fr = locale === 'fr';
  return <main id="main" tabIndex={-1} className="privacy-page"><Link className="text-button" href="/">Recipe Buddy</Link><h1>{fr ? 'Conditions d’utilisation' : 'Terms of use'}</h1>{legal[fr ? 'fr' : 'en'].terms.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}<TermsAcceptance /><Link href="/privacy">{fr ? 'Confidentialité' : 'Privacy policy'}</Link></main>;
}
