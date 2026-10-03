import Link from 'next/link';
import { getTranslation } from '@/lib/i18n-server';
import legal from '@/lib/legal-content.json';
export const metadata = { title: 'Privacy', description: 'Recipe Buddy privacy, permissions and account deletion.' };
export default async function PrivacyPage() {
  const { locale } = await getTranslation(); const fr = locale === 'fr';
  return <main id="main" tabIndex={-1} className="privacy-page"><Link className="text-button" href="/">Recipe Buddy</Link><h1>{fr ? 'Confidentialité dans la cuisine' : 'Privacy in the kitchen'}</h1>{legal[fr ? 'fr' : 'en'].privacy.map((section, index) => <section key={section.title} id={index === 6 ? 'account-deletion' : index === 7 ? 'browser-extension' : undefined}><h2>{section.title}</h2><p>{section.text}</p></section>)}<p><Link href="/delete-account">{fr ? 'Supprimer mon compte' : 'Delete my account'}</Link> · <Link href="/terms">{fr ? 'Conditions d’utilisation' : 'Terms of use'}</Link></p><a href={'mailto:' + legal.email}>{legal.email}</a></main>;
}
