import { AsyncLocalStorage } from 'node:async_hooks';
export const syncContext = new AsyncLocalStorage<{ entityId?: string; occurredAt: string }>();
