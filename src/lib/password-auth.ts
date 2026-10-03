import { compare } from 'bcryptjs';
import { db } from './db';
import { credentialsSchema } from './validation';
import { rateLimit } from './rate-limit';

export async function passwordUser(credentials: unknown) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  if (!(await rateLimit(`login:${parsed.data.email}`, 10, 900))) return null;
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await compare(parsed.data.password,
    user?.hashedPassword ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  return user?.hashedPassword && valid ? { id: user.id, email: user.email } : null;
}
