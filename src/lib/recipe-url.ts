import { lookup } from 'node:dns/promises';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { recipePage } from './recipe-page';

export function isPublicAddress(address: string) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export async function recipeUrlText(raw: string, redirects = 0): Promise<{ text: string; imageUrl: string }> {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Use a public HTTPS recipe URL.');
  }
  if (redirects > 3) throw new Error('Too many redirects. Paste the recipe text instead.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Only public recipe websites are allowed.');
  // Pin the connection to the checked IP: a second DNS lookup would allow rebinding.
  const address = addresses[0];
  const result = await new Promise<{ location?: string; html?: string }>((resolve, reject) => {
    const req = https.get(url, {
      family: address.family,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: { 'User-Agent': 'RecipeBuddy/1.0', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        res.resume(); resolve({ location: new URL(res.headers.location, url).href }); return;
      }
      if (res.statusCode !== 200 || !/text\/(html|plain)/i.test(res.headers['content-type'] || '')) {
        res.resume(); reject(new Error('Could not read that page. Paste the recipe text instead.')); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1_000_000) req.destroy(new Error('Page is too large. Paste the recipe text instead.'));
        else chunks.push(chunk);
      });
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    const timer = setTimeout(() => req.destroy(new Error('Website timed out. Paste the recipe text instead.')), 6000);
    req.on('close', () => clearTimeout(timer)); req.on('error', reject);
  });
  if (result.location) return recipeUrlText(result.location, redirects + 1);
  return recipePage(result.html || '', url.href);
}
