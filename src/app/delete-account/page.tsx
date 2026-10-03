import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslation } from '@/lib/i18n-server';
import legal from '@/lib/legal-content.json';
import { DeleteAccountForm } from '@/components/account-controls';
export const metadata = { title: 'Delete your Recipe Buddy account' };
export const dynamic = 'force-dynamic';
export default async function DeleteAccountPage() {
  const { locale } = await getTranslation(); const fr = locale === 'fr'; const session = await getServerSession(authOptions);
  return <main id="main" tabIndex={-1} className="privacy-page"><Link className="text-button" href="/">Recipe Buddy</Link><h1>{fr ? 'Supprimer votre compte Recipe Buddy' : 'Delete your Recipe Buddy account'}</h1>
    <p>{fr ? 'Vous pouvez demander la suppression sans installer l’application.' : 'You can request deletion without installing the app.'}</p>
    <p>{fr ? 'Cette action supprime définitivement votre compte, recettes, photos, contributions, partages, liens et sessions de la base active. Les copies faites par autrui ne peuvent pas être rappelées. Les appareils hors ligne effacent leurs données à leur prochaine connexion ; déconnectez-les ou désinstallez pour les effacer immédiatement.' : 'This permanently deletes your account, recipes, photos, contributions, shares, connections and sessions from the active database. Copies made by others cannot be recalled. Offline devices clear local account data when they reconnect; sign out or uninstall on those devices to clear it immediately.'}</p>
    <DeleteAccountForm accountId={session?.user?.id} email={session?.user?.email} />
    <section><h2>{fr ? 'Impossible de vous connecter ?' : 'Cannot sign in?'}</h2><p>{fr ? 'Demandez la suppression à' : 'Request account deletion at'} <a href={'mailto:' + legal.email + '?subject=Recipe%20Buddy%20account%20deletion'}>{legal.email}</a>. {fr ? 'Écrivez depuis l’email du compte. Nous vérifierons votre identité avant la suppression.' : 'Write from the account email. We verify ownership before deletion.'}</p></section><Link href="/privacy">{fr ? 'Confidentialité et conservation' : 'Privacy and retention'}</Link>
  </main>;
}
