import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api, body, HttpError } from '@/lib/http';
import { deleteAccount } from '@/lib/account-controls';
export async function DELETE(request: Request) {
  return api(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Please sign in first.');
    return deleteAccount(session.user.id, await body(request), session.user.authenticatedAt);
  });
}
