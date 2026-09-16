import { settingsSchema, displayUsername } from '@/lib/username';
import { db } from '@/lib/db';
import { api, body, userId } from '@/lib/http';
export async function PUT(request: Request) {
  return api(async () => {
    const id = await userId(); const data = settingsSchema.parse(await body(request));
    const user = await db.user.update({ where: { id }, data, select: { username: true, email: true, roastEnabled: true } });
    return { username: displayUsername(user), roastEnabled: user.roastEnabled };
  });
}
