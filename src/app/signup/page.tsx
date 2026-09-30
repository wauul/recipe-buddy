import { AuthForm } from '@/components/auth-form';
import { googleAuthEnabled } from '@/lib/google-auth';
export const dynamic = 'force-dynamic';
export default function Signup() {
  return <AuthForm signup googleEnabled={googleAuthEnabled()} />;
}
