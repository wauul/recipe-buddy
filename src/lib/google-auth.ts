import { z } from 'zod';
import { usernameSchema } from './username';

const identity = z.object({
  sub: z.string().min(1),
  email: z.string().trim().email(),
  email_verified: z.literal(true),
});
export function isVerifiedGoogleProfile(profile: unknown) {
  return identity.safeParse(profile).success;
}
export function defaultChefName(name: string | null | undefined, email: string) {
  const proposed = usernameSchema.safeParse(name?.trim().slice(0, 64));
  return proposed.success ? proposed.data : email.split('@')[0].slice(0, 64);
}
export function googleAuthEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
export function authErrorMessage(error?: string) {
  if (!error) return '';
  if (error === 'OAuthAccountNotLinked')
    return 'This Google account is already connected to another chef. Sign out and continue with Google to open that account.';
  if (error === 'AccessDenied')
    return 'Google sign-in was not approved. Use a verified Google account, or log in with email.';
  if (error === 'CredentialsSignin') return 'Check your email and password, or try again later.';
  return 'Sign-in did not complete. Please try again, or use your email and password.';
}
