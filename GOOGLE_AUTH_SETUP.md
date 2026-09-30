# Google sign-in setup

The code supports new Google chef accounts and automatically connecting a verified Google email to the matching existing password account. Credentials login and seven-day JWT sessions remain available. A dedicated Google Cloud project, `recipe-buddy-510215`, and web OAuth client named **Recipe Buddy Web** were configured with the user's authorization. Google reports the external app as **In production**, with the homepage and public privacy page configured. The client ID and secret are stored as production Secrets in Vercel, never in the repository. The canonical production callback is `https://recipe-buddy-wauul.vercel.app/api/auth/callback/google`; local callbacks for ports 3000 and 54873 are also registered. Live OAuth verification follows the Git deployment; this checkout has no local database configuration.

## Configure the client

1. In your Google Cloud project, configure the OAuth consent screen for Recipe Buddy and its intended audience. If the app is in testing, add the chefs who will test it.
2. On the [Google Auth Platform Clients page](https://console.cloud.google.com/auth/clients), create an OAuth client of type **Web application**.
3. Register exact authorized redirect URIs for the origins you use:
   - Default local server: `http://localhost:3000/api/auth/callback/google`
   - This chat’s preview: `http://localhost:54873/api/auth/callback/google`
   - Production: `https://YOUR_CANONICAL_DOMAIN/api/auth/callback/google`
4. Set these server variables in `.env.local` or the deployment environment:

```dotenv
DATABASE_URL="YOUR_POSTGRES_CONNECTION_STRING"
NEXTAUTH_SECRET="YOUR_RANDOM_SESSION_SECRET"
NEXTAUTH_URL="http://localhost:54873"
GOOGLE_CLIENT_ID="YOUR_WEB_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_WEB_CLIENT_SECRET"
```

Keep credentials out of Git and use the real canonical production origin when deploying. The provider activates only when both Google values are nonblank. The callback path follows the [NextAuth v4 Google provider configuration](https://next-auth.js.org/providers/google); client creation follows [Google’s web-server OAuth documentation](https://developers.google.com/identity/protocols/oauth2/web-server).

## Apply the migration and restart

The additive `20260930000000_google_chefs_reviews` migration adds OAuth adapter tables and recipe reviews. It preserves existing password hashes, recipe IDs, friendships and shares; nullable password hashes allow Google-only chefs.

```sh
pnpm db:migrate
pnpm dev --port 54873
```

The migration command loads `.env.local`. Apply all migrations for a fresh local database before serving the code. Local and preview builds do not migrate databases. For this existing Vercel production project, `pnpm build` invokes `scripts/migrate-chefs.cjs`: it applies only the checksum-pinned chef migration in one transaction, verifies the six existing completed migrations, and records it in Prisma's history. Repeat production builds skip the already completed migration. The helper never applies arbitrary pending migrations or resets data.

## Verify with the real integration

1. Create a new chef with **Continue with Google**. Confirm that re-login opens the same collection and that the chef can save a recipe.
2. Log into an existing password account, then choose **Connect Google** in Chef settings. Sign out and log back in through both methods; recipes and chef ID should match.
3. Attempt Google login while signed out with an email already used by a password account. It should automatically connect Google and sign into the same chef ID, preserving the collection, levels and password hash.
4. Cancel Google consent, then retry or use email. Check redirect-URI mismatch and unavailable-provider behavior.
5. Share a recipe between two chefs, submit a 1–5 apron review, update and remove it. Confirm the recipe’s chef score changes by twice the rating and that a chef cannot review their own recipe.
6. Revoke the share and confirm subsequent review reads/writes are denied. A chef may still withdraw their own review through the DELETE endpoint without gaining access to the recipe.

Google-only accounts use Google for sign-in; this release does not add password creation or recovery. The app requests the provider’s basic identity scopes rather than access to a chef’s Google files or mail. NextAuth handles OAuth state, PKCE, callback validation and account linkage; only verified Google profiles can sign in. The Prisma adapter persists provider identities, while session JWTs retain the existing application user ID.
