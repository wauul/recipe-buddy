import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MobileApproval } from '@/components/mobile-approval';
export const dynamic = 'force-dynamic';
export default async function Connect(props: { searchParams: Promise<{ attempt?: string }> }) {
  const searchParams = await props.searchParams;
  const id = searchParams.attempt;
  if (!id || !/^c[a-z0-9]{24,}$/.test(id)) return <main><h1>Invalid connection link</h1></main>;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/mobile/connect?attempt=${id}`)}`);
  const attempt = await db.nativeAuthAttempt.findUnique({ where: { id } });
  if (!attempt || attempt.expiresAt <= new Date() || attempt.codeHash) return <main><h1>Connection expired</h1><p>Start again from the Android app.</p></main>;
  return <MobileApproval attempt={id} />;
}
