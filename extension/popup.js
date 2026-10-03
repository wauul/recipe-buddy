const $ = (id) => document.getElementById(id);
let recipes = [], sourceUrl = '';
const DEFAULT_APP = 'https://recipe-buddy-wauul.vercel.app';
function preview() {
  const recipe = recipes[Number($('choice').value) || 0];
  $('preview').hidden = !recipe;
  $('status').hidden = !!recipe;
  if (recipe) {
    $('title').textContent = recipe.title;
    $('details').textContent = `${recipe.ingredients.length} ingredients · ${recipe.steps.length} steps`;
    $('photo').hidden = !recipe.imageUrl;
    // Avoid sending the recipe page URL in an image request.
    $('photo').referrerPolicy = 'no-referrer';
    $('photo').src = recipe.imageUrl || '';
    $('photo').onerror = () => { $('photo').hidden = true; };
  }
  $('add').textContent = recipe ? 'Add to Recipe Buddy' : 'Import this page in the app';
  $('add').disabled = !sourceUrl;
}
$('choice').onchange = preview;
$('automatic').onchange = () => chrome.storage.local.set({ automatic: $('automatic').checked });
$('add').onclick = async () => {
  $('add').disabled = true; $('error').textContent = '';
  try {
    const result = await chrome.runtime.sendMessage({ type: 'OPEN_IMPORT', payload: RecipeBuddyReader.payload(sourceUrl, recipes[Number($('choice').value) || 0]) });
    if (!result?.ok) throw new Error(result?.error || 'Could not open Recipe Buddy. Try again.');
    window.close();
  } catch (error) { $('error').textContent = error.message; $('add').disabled = !sourceUrl; }
};
$('connection').onsubmit = async (event) => {
  event.preventDefault();
  try {
    const url = new URL($('app-url').value.trim());
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Enter an HTTPS app address, or http://localhost:3000.');
    await chrome.storage.local.set({ appUrl: url.origin });
    $('connection-status').textContent = 'Connection saved.';
  } catch (error) { $('connection-status').textContent = error.message; }
};
(async () => {
  try {
    const settings = await chrome.storage.local.get(['automatic', 'appUrl']);
    $('automatic').checked = settings.automatic !== false;
    $('app-url').value = settings.appUrl || DEFAULT_APP;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || (tab.url && !RecipeBuddyReader.httpsUrl(tab.url))) {
      $('status').textContent = 'Open a public HTTPS recipe page to add it.'; return;
    }
    if (tab.url && new URL(tab.url).origin === new URL(settings.appUrl || DEFAULT_APP).origin) {
      $('status').textContent = 'Browse a recipe website to find your next favorite.'; return;
    }
    let result;
    try { result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RECIPES' }); }
    catch {
      // Also works in tabs opened before installation or when site access is on-click.
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['recipe-reader.js', 'content.js'] });
      result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RECIPES' });
    }
    recipes = result.recipes || []; sourceUrl = RecipeBuddyReader.httpsUrl(result.sourceUrl);
    if (sourceUrl && new URL(sourceUrl).origin === new URL(settings.appUrl || DEFAULT_APP).origin) {
      sourceUrl = ''; $('status').textContent = 'Browse a recipe website to find your next favorite.'; return;
    }
    $('status').textContent = 'No complete recipe metadata found. You can try the app’s URL importer.';
    for (const [index, recipe] of recipes.entries()) {
      const option = document.createElement('option'); option.value = String(index); option.textContent = recipe.title; $('choice').append(option);
    }
    $('choice').hidden = $('choice-label').hidden = recipes.length <= 1;
    preview();
  } catch { $('status').textContent = 'Chrome cannot read this page. Try a regular recipe website.'; }
})();
