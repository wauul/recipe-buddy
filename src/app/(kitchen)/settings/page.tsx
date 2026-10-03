import { PrepareRecipeLanguages } from '@/components/prepare-recipe-languages';
import { savedLanguages } from '@/lib/recipe-languages';
import { getTranslation } from '@/lib/i18n-server';
import { currentUser } from '@/lib/data';
import { SettingsForm } from '@/components/settings-form';
import { ChefProgressPanel } from '@/components/chef-progress';
import { GoogleSignIn } from '@/components/google-sign-in';
import { googleAuthEnabled } from '@/lib/google-auth';
import { currentChefProgress } from '@/lib/chefs';
import { db } from '@/lib/db';
export default async function SettingsPage() {
  const { t } = await getTranslation();
  const user = await currentUser();
  const [progress, google, recipes] = await Promise.all([
    currentChefProgress(user.id),
    db.account.findFirst({
      where: { userId: user.id, provider: 'google' },
      select: { id: true },
    }),
    db.recipe.findMany({
      where: { userId: user.id },
      select: { id: true, translations: true },
    }),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('Chef settings')}</h1>
          <p>{t('Your chef journey, account and kitchen preferences.')}</p>
        </div>
      </div>
      <div className="settings-cards">
        <ChefProgressPanel chefName={user.username} progress={progress} roadmap />
        <SettingsForm
          roastEnabled={user.roastEnabled}
          username={user.username}
          showHeading={false}
        />
        <PrepareRecipeLanguages
          recipeIds={recipes
            .filter((recipe) => savedLanguages(recipe.translations).pending)
            .map((recipe) => recipe.id)}
        />
        <section className="form-panel google-connection">
          <h2>{t('Google sign-in')}</h2>
          <p>
            {t(
              google
                ? 'Google is connected to your chef account.'
                : 'Connect Google to this chef account so you can sign in either way.',
            )}
          </p>
          {!google && <GoogleSignIn enabled={googleAuthEnabled()} connect />}
          {google && <p className="social-notice">{t('Google connected')}</p>}
        </section>
      </div>
    </>
  );
}
