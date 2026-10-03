import { NextResponse } from 'next/server';
export async function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map(s => s.trim()).filter(s => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(s));
  return NextResponse.json(fingerprints.length ? [{ relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'com.recipebuddy.android', sha256_cert_fingerprints: fingerprints } }] : []);
}
