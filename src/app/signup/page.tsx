import { AuthForm } from '@/components/auth-form';
import { googleAuthEnabled } from '@/lib/google-auth';
export const dynamic = 'force-dynamic';
export default async function Signup(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const searchParams = await props.searchParams;
  return <AuthForm signup googleEnabled={googleAuthEnabled()} callbackUrl={searchParams.callbackUrl} />;
}
