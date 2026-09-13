import { api, userId } from '@/lib/http';
import { sharedRecipes } from '@/lib/social';
export const dynamic = 'force-dynamic';
export async function GET() { return api(async () => sharedRecipes(await userId())); }
