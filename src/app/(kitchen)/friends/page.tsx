import { currentUser } from '@/lib/data';
import { friendList, sharedRecipes } from '@/lib/social';
import { FriendsDashboard } from '@/components/friends-dashboard';

export default async function FriendsPage() {
  const user = await currentUser();
  const [friends, recipes] = await Promise.all([friendList(user.id), sharedRecipes(user.id)]);
  return <FriendsDashboard friends={friends} recipes={recipes} />;
}
