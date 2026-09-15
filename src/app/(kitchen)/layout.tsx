import { currentUser } from '@/lib/data';
import { Nav } from '@/components/nav';
export const dynamic = 'force-dynamic';
export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return <div className="app-shell"><Nav email={user.email} /><main id="main" tabIndex={-1} className="main-content">{children}</main></div>;
}
