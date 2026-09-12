import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, userId } from '@/lib/http';
export async function PUT(request: Request) {
  return api(async () => {
    const id = await userId(); const data = z.object({ roastEnabled: z.boolean() }).parse(await body(request));
    return db.user.update({ where: { id }, data, select: { roastEnabled: true } });
  });
}
