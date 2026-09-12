import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { credentialsSchema } from './validation';
import { rateLimit } from './rate-limit';
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [CredentialsProvider({
    name: 'Email and password',
    credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      if (!(await rateLimit(`login:${parsed.data.email}`, 10, 900))) return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      // A dummy hash keeps missing-user requests on the password-comparison path.
      const valid = await compare(parsed.data.password, user?.hashedPassword ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
      return user && valid ? { id: user.id, email: user.email } : null;
    }
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.sub = user.id; return token; },
    async session({ session, token }) { if (session.user && token.sub) session.user.id = token.sub; return session; }
  }
};
