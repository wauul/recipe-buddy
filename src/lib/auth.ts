import type { NextAuthOptions } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { db } from './db';
import { credentialsSchema } from './validation';
import { rateLimit } from './rate-limit';
import { defaultChefName, googleAuthEnabled, isVerifiedGoogleProfile } from './google-auth';
export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(db),
    async createUser(data: Omit<AdapterUser, 'id'>) {
      if (!data.email || !(await rateLimit('signup:global', 30, 3600)))
        throw new Error('Chef registration is temporarily unavailable.');
      return db.user.create({
        data: {
          ...data,
          email: data.email.trim().toLowerCase(),
          username: defaultChefName(data.name, data.email),
          emailVerified: new Date(),
        },
      });
    },
  },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!(await rateLimit(`login:${parsed.data.email}`, 10, 900))) return null;
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        // A dummy hash keeps missing-user requests on the password-comparison path.
        const valid = await compare(
          parsed.data.password,
          user?.hashedPassword ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
        );
        return user?.hashedPassword && valid ? { id: user.id, email: user.email } : null;
      },
    }),
    ...(googleAuthEnabled()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // The signIn callback rejects unverified Google identities before account linking.
            // Reuse a matching chef ID so recipes, reviews and password login stay intact.
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email?.trim().toLowerCase(),
                image: profile.picture,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider !== 'google' || isVerifiedGoogleProfile(profile);
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
