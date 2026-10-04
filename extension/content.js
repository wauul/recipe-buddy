(function () {
  if (globalThis.recipeBuddyContentLoaded) return;
  globalThis.recipeBuddyContentLoaded = true;
  const appUrl = 'https://recipe-buddy-wauul.vercel.app';
  let recipes = [], enabled = true;
  let currentUrl = location.href, dismissed = false, host, timer, lastCount = -1;
  const reader = RecipeBuddyReader;
  function remove() { host?.remove(); host = undefined; }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function prompt() {
    remove();
    if (!enabled || dismissed || !recipes.length || location.origin === new URL(appUrl).origin) return;
    host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;bottom:20px;right:20px;z-index:2147483647;width:min(340px,calc(100vw - 40px));';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = element('style');
    style.textContent = `:host{color-scheme:light}*{box-sizing:border-box}section{font:15px/1.45 system-ui,sans-serif;color:#293c30;background:#faf9f5;border:1px solid #858d7b;border-radius:12px;padding:16px;box-shadow:0 8px 32px #0002}header{display:flex;align-items:center;justify-content:space-between;gap:12px}strong{font-size:15px}h2{font-size:20px;line-height:1.25;margin:12px 0 8px;overflow-wrap:anywhere}p{font-size:13px;color:#626b5c;margin:0 0 16px}button{font:600 15px system-ui;cursor:pointer;min-height:44px;border:0;border-radius:6px}button:focus-visible{outline:3px solid #a56824;outline-offset:3px}.close{width:44px;background:transparent;color:#293c30;font-size:24px}.add{width:100%;background:#396449;color:white;padding:10px 16px}.add:disabled{opacity:.6;cursor:wait}.error{color:#a83f37;margin-top:12px;margin-bottom:0}.error:empty{display:none}@media(prefers-reduced-motion:no-preference){section{animation:enter .18s ease-out}@keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}`;
    const section = element('section'); section.setAttribute('aria-label', 'Recipe Buddy recipe suggestion');
    const header = element('header'); header.append(element('strong', 'Recipe Buddy'));
    const close = element('button', '×', 'close'); close.setAttribute('aria-label', 'Dismiss recipe suggestion');
    close.onclick = () => { dismissed = true; remove(); };
    header.append(close);
    const add = element('button', 'Add to Recipe Buddy', 'add');
    const error = element('p', '', 'error'); error.setAttribute('role', 'alert');
    add.onclick = async () => {
      add.disabled = true; error.textContent = '';
      try {
        const result = await chrome.runtime.sendMessage({ type: 'OPEN_IMPORT', payload: reader.payload(location.href, recipes[0]) });
        if (!result?.ok) throw new Error(result?.error || 'Reload this page and try again.');
        dismissed = true; remove();
      } catch (e) { error.textContent = e.message || 'Reload this page and try again.'; add.disabled = false; }
    };
    section.append(header, element('h2', recipes[0].title), element('p', 'Recipe found. Review it in the app before saving.'), add, error);
    shadow.append(style, section); document.documentElement.append(host);
  }
  function scan() {
    if (location.href !== currentUrl) { currentUrl = location.href; dismissed = false; }
    const next = reader.read();
    if (next.length !== lastCount) {
      lastCount = next.length;
      chrome.runtime.sendMessage({ type: 'RECIPE_COUNT', count: next.length }).catch(() => {});
    }
    const changed = JSON.stringify(next) !== JSON.stringify(recipes);
    recipes = next;
    if (changed || (!host && !dismissed)) prompt();
  }
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'GET_RECIPES') { scan(); reply({ recipes, sourceUrl: location.href }); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.automatic) enabled = changes.automatic.newValue !== false;
    prompt();
  });
  chrome.storage.local.get(['automatic']).then((settings) => {
    enabled = settings.automatic !== false; scan();
  });
  // Only metadata/content changes trigger a debounced scan; our own prompt is ignored.
  const observer = new MutationObserver((changes) => {
    if (changes.every((change) => [...change.addedNodes, ...change.removedNodes].every((node) => node === host))) return;
    clearTimeout(timer); timer = setTimeout(scan, 700);
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  // Detect client-side URL changes even when a site reuses its DOM.
  setInterval(() => { if (currentUrl !== location.href) scan(); }, 1500);
})();
