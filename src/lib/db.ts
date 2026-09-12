import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
// Initialize only on a database request, never while Next.js collects build metadata.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = globalDb.prisma ??= new PrismaClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
