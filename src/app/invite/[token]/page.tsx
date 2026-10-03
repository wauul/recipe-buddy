import { previewInvite } from '@/lib/native-invites';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { InviteAcceptance } from '@/components/invite-acceptance';
export const dynamic = 'force-dynamic';
export default async function Invite(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const invite = await previewInvite(params.token);
    const session = await getServerSession(authOptions);
    return <main className="page narrow"><h1>{invite.chefName} invited you to Recipe Buddy</h1>
      <p>Become friends, then choose which recipes to share. Your collection stays private.</p>
      {session?.user?.id ? <InviteAcceptance token={params.token} /> : <Link className="button primary" href={`/login?callbackUrl=${encodeURIComponent(`/invite/${params.token}`)}`}>Sign in to accept</Link>}
      <p>Have the Android app? Reopen this same link on your phone, or paste it in Friends → Invite friend. After installing, reopen the link yourself.</p>
    </main>;
  } catch (error) { return <main className="page narrow"><h1>Invitation unavailable</h1><p>{error instanceof Error ? error.message : 'Ask your friend for a fresh invitation.'}</p></main>; }
}
