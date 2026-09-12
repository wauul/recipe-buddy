import { currentUser } from '@/lib/data';
import { Nav } from '@/components/nav';
export const dynamic = 'force-dynamic';
export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a><Nav email={user.email} /><main id="main" className="main-content">{children}</main></div>;
}
