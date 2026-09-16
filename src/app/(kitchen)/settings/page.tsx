import { currentUser } from '@/lib/data';
import { SettingsForm } from '@/components/settings-form';
export default async function SettingsPage() { const user = await currentUser(); return <SettingsForm roastEnabled={user.roastEnabled} username={user.username} />; }
