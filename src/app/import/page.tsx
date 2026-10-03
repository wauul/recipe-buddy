import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BrowserImportBridge } from '@/components/browser-import-bridge';
export const dynamic = 'force-dynamic';
export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  return <BrowserImportBridge signedIn={!!session?.user?.id} />;
}
