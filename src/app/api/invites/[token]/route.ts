import { api, body, userId } from '@/lib/http';
import { previewInvite, redeemInvite } from '@/lib/native-invites';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return api(async () => { await body(request); return redeemInvite(params.token, await userId()); });
}
export async function GET(_request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return api(() => previewInvite(params.token));
}
