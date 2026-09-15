export function trackedOutbound(href: string, origin: string) {
  try {
    const url = new URL(href, origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === new URL(origin).origin) return href;
    for (const [key,value] of Object.entries({utm_source:'recipe_buddy',utm_medium:'referral',utm_campaign:'app'})) if (!url.searchParams.has(key)) url.searchParams.set(key,value);
    return url.href;
  } catch { return href; }
}
