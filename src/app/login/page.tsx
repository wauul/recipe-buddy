import { AuthForm } from '@/components/auth-form';
import { authErrorMessage, googleAuthEnabled } from '@/lib/google-auth';
export const dynamic = 'force-dynamic';
export default async function Login(props: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <AuthForm
      googleEnabled={googleAuthEnabled()}
      errorMessage={authErrorMessage(searchParams.error)}
      callbackUrl={searchParams.callbackUrl}
    />
  );
}
