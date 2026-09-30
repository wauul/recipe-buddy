import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Recipe Buddy uses account information, recipes and Google sign-in data.',
};

export default function PrivacyPage() {
  return (
    <main id="main" tabIndex={-1} className="privacy-page">
      <Link href="/" className="text-button">
        Recipe Buddy home
      </Link>
      <h1>Privacy in the kitchen</h1>
      <p className="privacy-date">Updated September 30, 2026</p>
      <p>
        Recipe Buddy keeps your recipe collection private until you choose to share a recipe with a
        friend. This page explains what information the app stores and how it is used.
      </p>
      <section aria-labelledby="privacy-account">
        <h2 id="privacy-account">Your chef account</h2>
        <p>
          We store your email address, chef name and account preferences to identify your account,
          sign you in and show your contributions. Email signup stores a hashed password. The app
          uses essential session cookies to keep you signed in.
        </p>
      </section>
      <section aria-labelledby="privacy-google">
        <h2 id="privacy-google">When you sign in with Google</h2>
        <p>
          Google provides your verified email address, name, profile picture and a provider account
          identifier. Recipe Buddy stores that identity and the authentication tokens returned by
          Google to create or connect your account and support sign-in. It requests only basic
          identity information, without access to Gmail, Drive, Calendar or your contacts.
        </p>
        <p>
          Google account information is used for authentication and account identification. It is
          not sold, used for advertising or sent to the recipe AI service. You can remove Recipe
          Buddy’s access in your Google Account’s third-party connections settings. Removing that
          connection does not automatically delete your Recipe Buddy account or recipes.
        </p>
      </section>
      <section aria-labelledby="privacy-recipes">
        <h2 id="privacy-recipes">Recipes, sharing and reviews</h2>
        <p>
          The app stores recipes, uploaded photos, cooking activity, friend connections, shares,
          kitchen twists, comments and apron reviews. These support your collection, shopping lists
          and chef level. A shared recipe is visible to its owner and current recipients. Other
          chefs see your chef name on your contributions; sharing a recipe does not expose your
          email address to its other recipients.
        </p>
        <p>
          Ending a share removes the recipient’s access. Previous comments and reviews remain with
          the recipe unless removed. Deleting a recipe removes its associated shares, activity and
          contributions. People may retain information they already copied.
        </p>
      </section>
      <section aria-labelledby="privacy-services">
        <h2 id="privacy-services">Services that run the app</h2>
        <p>
          Vercel hosts the app and supplies usage and performance analytics. Neon hosts its
          PostgreSQL database. These providers process data needed to deliver, secure and monitor
          the service. The app keeps temporary abuse-prevention counters using hashed identifiers.
        </p>
        <p>
          If you choose AI recipe import or optional roast generation, the relevant recipe text is
          sent to Groq to produce that result. Website import fetches the public URL you submit.
          Manual recipe entry remains available without AI import. The app does not send your Google
          profile or authentication tokens to Groq.
        </p>
      </section>
      <section aria-labelledby="privacy-browser">
        <h2 id="privacy-browser">On your device</h2>
        <p>
          Theme preferences, the cookie-notice choice and shopping-list selections and checkmarks
          are stored in your browser. Shopping data is separated by chef account on that browser.
          Clearing browser storage removes these local preferences and lists. The app does not use
          advertising cookies.
        </p>
      </section>
      <section aria-labelledby="privacy-control">
        <h2 id="privacy-control">Your choices and questions</h2>
        <p>
          You can edit your chef name, change preferences, delete your recipes, remove your reviews
          and stop sharing through the app. Account information is retained while your account
          remains in use; this version has no self-service account-deletion screen.
        </p>
        <p>
          To request access, correction or deletion of account information, or ask a privacy
          question, contact{' '}
          <a href="mailto:contact@recipebuddy.waelfz.com">contact@recipebuddy.waelfz.com</a>.
          Requests may require verification that you own the account. We will update this page if
          the app’s data practices change.
        </p>
      </section>
    </main>
  );
}
