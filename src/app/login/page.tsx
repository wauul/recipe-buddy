import { AuthForm } from '@/components/auth-form';
import { authErrorMessage, googleAuthEnabled } from '@/lib/google-auth';
export const dynamic = 'force-dynamic';
export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <AuthForm
      googleEnabled={googleAuthEnabled()}
      errorMessage={authErrorMessage(searchParams.error)}
    />
  );
}
