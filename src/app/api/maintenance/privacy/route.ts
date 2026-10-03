import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { api, HttpError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return api(async () => {
    const secret = process.env.CRON_SECRET;
    const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    const providedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(secret ?? '');
    if (!secret || secret.length < 32 || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) throw new HttpError(401, 'Unauthorized.');
    const now = new Date();
    const [counters, scans, attempts, sessions, reports] = await db.$transaction([
      db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
      db.nativeScan.deleteMany({ where: { expiresAt: { lt: now } } }),
      db.nativeAuthAttempt.deleteMany({ where: { expiresAt: { lt: now } } }),
      db.nativeSession.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(Date.now() - 30 * 86400_000) } }] } }),
      db.contentReport.deleteMany({ where: { status: { not: 'open' }, createdAt: { lt: new Date(Date.now() - 30 * 86400_000) } } }),
    ]);
    return { counters: counters.count, scans: scans.count, attempts: attempts.count, sessions: sessions.count, reviewedReports: reports.count };
  });
}
