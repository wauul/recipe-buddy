/* Shared by the content script, popup, and Node tests. No network requests. */
(function (root) {
  const clean = (value) => {
    if (typeof value !== 'string') return '';
    // Decode entities and remove publisher markup without adding it to the page.
    if (typeof document !== 'undefined' && /[<&]/.test(value)) {
      // Template contents remain inert: publisher markup cannot run or load images.
      const template = document.createElement('template');
      template.innerHTML = value;
      template.content.querySelectorAll('script,style').forEach((node) => node.remove());
      return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
    }
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  };
  function httpsUrl(value, base) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, base);
      return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2048 ? url.href : '';
    } catch { return ''; }
  }
  function steps(value) {
    if (Array.isArray(value)) return value.flatMap(steps);
    if (typeof value === 'string') return value.split(/\n+/).map(clean).filter(Boolean);
    if (!value || typeof value !== 'object') return [];
    if (value.itemListElement) return steps(value.itemListElement);
    return steps(value.text || value.description || '');
  }
  function image(value, base) {
    if (Array.isArray(value)) return value.map((item) => image(item, base)).find(Boolean) || '';
    return httpsUrl(typeof value === 'object' && value ? value.url || value.contentUrl : value || '', base);
  }
  function normalize(item, sourceUrl) {
    const title = clean(item.name);
    const ingredients = Array.isArray(item.recipeIngredient) ? item.recipeIngredient.map(clean).filter(Boolean) : [];
    const instructions = steps(item.recipeInstructions);
    if (!title || title.length > 160 || !ingredients.length || ingredients.length > 100 ||
        ingredients.some((line) => line.length > 120) || !instructions.length || instructions.length > 80 ||
        instructions.some((line) => line.length > 2000)) return null;
    const rawYield = [item.recipeYield].flat()[0];
    const count = typeof rawYield === 'number' ? rawYield : Number(String(rawYield || '').match(/\d+/)?.[0]);
    // Recipe yields may describe cookies or loaves, so only trust explicit servings.
    const explicit = typeof rawYield === 'number' || /^\d+\s*(servings?|people|portions?|personnes?)?$/i.test(String(rawYield || '').trim());
    const servings = explicit && Number.isInteger(count) && count >= 1 && count <= 100 ? count : 2;
    return { title, imageUrl: image(item.image, sourceUrl), servings, ingredients, steps: instructions };
  }
  function fromJson(values, sourceUrl) {
    const found = [];
    const seen = new Set();
    let visited = 0;
    function visit(value, depth = 0) {
      if (depth > 30 || ++visited > 10000 || found.length >= 20) return;
      if (Array.isArray(value)) { value.forEach((child) => visit(child, depth + 1)); return; }
      if (!value || typeof value !== 'object') return;
      const types = [value['@type']].flat();
      if (types.some((type) => typeof type === 'string' && /^(?:https?:\/\/schema\.org\/)?Recipe$/.test(type))) {
        const recipe = normalize(value, sourceUrl);
        const key = recipe && JSON.stringify(recipe);
        if (recipe && !seen.has(key)) { seen.add(key); found.push(recipe); }
      }
      Object.values(value).forEach((child) => { if (child && typeof child === 'object') visit(child, depth + 1); });
    }
    values.forEach((value) => visit(value));
    return found;
  }
  function read(doc = document, sourceUrl = location.href) {
    if (!httpsUrl(sourceUrl)) return [];
    const values = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
      if (node.textContent.length > 1000000) return;
      try { values.push(JSON.parse(node.textContent)); } catch { /* Try other blocks. */ }
    });
    const found = fromJson(values, sourceUrl);
    if (found.length) return found;
    doc.querySelectorAll('[itemscope][itemtype~="https://schema.org/Recipe"], [itemscope][itemtype~="http://schema.org/Recipe"]').forEach((scope) => {
      const owned = (prop) => [...scope.querySelectorAll(`[itemprop~="${prop}"]`)]
        .filter((node) => node.closest('[itemtype*="schema.org/Recipe"]') === scope);
      const value = (node) => node?.getAttribute('content') || node?.getAttribute('src') || node?.textContent || '';
      const recipe = normalize({
        name: value(owned('name')[0]), image: value(owned('image')[0]), recipeYield: value(owned('recipeYield')[0]),
        recipeIngredient: owned('recipeIngredient').map(value),
        recipeInstructions: owned('recipeInstructions').map((node) => {
          const details = [...node.querySelectorAll('[itemprop~="text"]')].map(value);
          return details.length ? details : value(node);
        }).flat(),
      }, sourceUrl);
      if (recipe) found.push(recipe);
    });
    return found.slice(0, 20);
  }
  function payload(sourceUrl, recipe) { return { version: 1, sourceUrl, ...(recipe ? { recipe } : {}) }; }
  const api = { read, fromJson, normalize, httpsUrl, payload };
  root.RecipeBuddyReader = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
