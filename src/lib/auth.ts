import type { NextAuthOptions } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from './db';
import { passwordUser } from './password-auth';
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
        return passwordUser(credentials);
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
      if (user) { token.sub = user.id; token.authenticatedAt = Date.now(); }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // A deleted account must not remain authorized by an old web JWT.
        const exists = await db.user.findUnique({ where: { id: token.sub }, select: { id: true } });
        session.user.id = exists?.id ?? '';
        session.user.authenticatedAt = typeof token.authenticatedAt === 'number' ? token.authenticatedAt : undefined;
      }
      return session;
    },
  },
};
