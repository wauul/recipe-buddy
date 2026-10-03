import { api, body, userId } from '@/lib/http';
import { acceptTerms } from '@/lib/account-controls';
export async function POST(request: Request) { return api(async () => acceptTerms(await userId(), await body(request))); }
