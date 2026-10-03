import { PrismaClient, type Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
// A native sync operation and its receipt commit together. Existing domain handlers
// retain their validation/permissions, including nested transaction callbacks.
export const transactionScope = new AsyncLocalStorage<Prisma.TransactionClient>();
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
// Initialize only on a database request, never while Next.js collects build metadata.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const scoped = transactionScope.getStore();
    if (scoped && property === '$transaction') return async (action: unknown) => {
      if (typeof action !== 'function') throw new Error('Sync requires a transaction callback');
      return action(scoped);
    };
    const client = scoped ?? (globalDb.prisma ??= new PrismaClient());
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
