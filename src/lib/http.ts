import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authOptions } from './auth';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function userId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, 'Please log in first.');
  return session.user.id;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (origin && origin !== allowed) throw new HttpError(403, 'Request origin is not allowed.');
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Send JSON, please.');
}
export async function body(request: Request) {
  sameOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 100_000) { await reader.cancel(); throw new HttpError(413, 'This request is too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'That was not valid JSON.'); }
}
export async function api(action: () => Promise<unknown>, status = 200) {
  try { return NextResponse.json(await action(), { status, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Check your input.' }, { status: 400 });
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Recipe Buddy request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'The kitchen hit a snag. Please try again.' }, { status: 500 });
  }
}
