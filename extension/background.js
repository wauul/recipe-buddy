const DEFAULT_APP = 'https://recipe-buddy-wauul.vercel.app';
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === 'RECIPE_COUNT' && sender.tab?.id !== undefined && sender.frameId === 0) {
    const count = Math.max(0, Math.min(20, Number(message.count) || 0));
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: count ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#396449' });
    reply({ ok: true });
    return;
  }
  if (message?.type !== 'OPEN_IMPORT') return;
  (async () => {
    const fromContent = sender.tab && !sender.url?.startsWith('chrome-extension://');
    if (fromContent && sender.frameId !== 0) throw new Error('Open the recipe in the main page.');
    const payload = message.payload;
    const source = new URL(payload?.sourceUrl);
    if (payload?.version !== 1 || source.protocol !== 'https:' || source.username || source.password || source.href.length > 2048) throw new Error('Choose a public HTTPS recipe page.');
    if (fromContent && new URL(sender.url).origin !== source.origin) throw new Error('The recipe page changed. Please try again.');
    const encoded = encodeURIComponent(JSON.stringify(payload));
    if (encoded.length > 240000) throw new Error('This recipe is too large. Use the URL importer in Recipe Buddy.');
    await chrome.tabs.create({ url: `${DEFAULT_APP}/import#recipe=${encoded}` });
    reply({ ok: true });
  })().catch((error) => reply({ error: error.message || 'Could not open Recipe Buddy. Please try again.' }));
  return true;
});
