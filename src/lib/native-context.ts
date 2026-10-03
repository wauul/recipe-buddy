import { AsyncLocalStorage } from 'node:async_hooks';

// Only the native route boundary can enter this scope after bearer validation.
// The exact Request is bound too: unrelated requests retain browser origin checks.
export const nativeContext = new AsyncLocalStorage<{ userId: string; request: Request }>();
