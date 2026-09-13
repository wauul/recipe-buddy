import { load } from 'cheerio';

// Read real website metadata rather than asking the model to invent image URLs.
export function recipePage(html: string, pageUrl: string) {
  const $ = load(html);
  const candidates: string[] = [];
  function images(value: unknown): void {
    if (typeof value === 'string') candidates.push(value);
    else if (Array.isArray(value)) value.forEach(images);
    else if (value && typeof value === 'object') images((value as Record<string, unknown>).url || (value as Record<string, unknown>).contentUrl);
  }
  function visit(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, unknown>;
    if ([item['@type']].flat().includes('Recipe')) images(item.image);
    Object.values(item).filter(v => typeof v === 'object').forEach(visit);
  }
  $('script[type="application/ld+json"]').each((_i, element) => {
    try { visit(JSON.parse($(element).text())); } catch { /* Malformed metadata must not prevent text import. */ }
  });
  images($('meta[property="og:image"]').attr('content'));
  images($('meta[name="twitter:image"]').attr('content'));
  let imageUrl = '';
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, pageUrl);
      if (url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2048) { imageUrl = url.href; break; }
    } catch { /* Try the next image, or keep the illustrated fallback. */ }
  }
  $('script,style,nav,header,footer,noscript,iframe').remove();
  return { imageUrl, text: ($('article').text() || $('main').text() || $('body').text()).replace(/\s+/g, ' ').trim().slice(0, 16000) };
}
