import { currentUser } from '@/lib/data';
import { SettingsForm } from '@/components/settings-form';
import { ChefProgressPanel } from '@/components/chef-progress';
import { GoogleSignIn } from '@/components/google-sign-in';
import { googleAuthEnabled } from '@/lib/google-auth';
import { currentChefProgress } from '@/lib/chefs';
import { db } from '@/lib/db';
export default async function SettingsPage() {
  const user = await currentUser();
  const [progress, google] = await Promise.all([
    currentChefProgress(user.id),
    db.account.findFirst({
      where: { userId: user.id, provider: 'google' },
      select: { id: true },
    }),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Chef settings</h1>
          <p>Your chef journey, account and kitchen preferences.</p>
        </div>
      </div>
      <ChefProgressPanel chefName={user.username} progress={progress} roadmap />
      <SettingsForm roastEnabled={user.roastEnabled} username={user.username} showHeading={false} />
      <section className="form-panel google-connection">
        <h2>Google sign-in</h2>
        <p>
          {google
            ? 'Google is connected to your chef account.'
            : 'Connect Google to this chef account so you can sign in either way.'}
        </p>
        {!google && <GoogleSignIn enabled={googleAuthEnabled()} connect />}
        {google && <p className="social-notice">Google connected</p>}
      </section>
    </>
  );
}
