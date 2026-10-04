/* Run with a local test DB only. PLAYWRIGHT_MODULE can point to a bundled runtime. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const root = path.resolve(__dirname, '../..');
const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '55432');
assert.equal(database.pathname, '/recipe_buddy_test');
assert.equal(process.env.GROQ_API_KEY, '');
const app = process.env.EXTENSION_TEST_APP || 'http://localhost:3003';
assert.ok(/^http:\/\/localhost:\d+$/.test(app));
const db = new PrismaClient();
const output = path.join(root, 'test-results/extension');
const extension = path.join(root, 'extension');
const soup = {
  '@type': 'Recipe', name: 'Tomato soup · extension test', recipeYield: '4 servings',
  recipeIngredient: ['2 tomatoes', '1½ cups water'],
  recipeInstructions: [{ '@type': 'HowToSection', name: 'Prep', itemListElement: [{ '@type': 'HowToStep', text: 'Chop the tomatoes.' }, { '@type': 'HowToStep', text: 'Simmer for 20 minutes.' }] }],
};
const second = { ...soup, name: 'Soup with basil', recipeIngredient: ['2 tomatoes', '4 basil leaves'] };
const reports = [];
async function check(name, fn) { await fn(); reports.push(name); console.log('PASS ' + name); }
async function main() {
  await fs.mkdir(output, { recursive: true });
  const user = await db.user.create({ data: { email: `extension-${Date.now()}@example.test`, username: 'Extension Test Chef', hashedPassword: await hash('ExtensionTestOnly-2026', 12), roastEnabled: false } });
  let context;
  try {
    context = await chromium.launchPersistentContext(path.join(output, `profile-${Date.now()}`), {
      ...(process.env.EXTENSION_TEST_BROWSER ? { executablePath: process.env.EXTENSION_TEST_BROWSER } : { channel: 'chromium' }),
      ignoreDefaultArgs: ['--disable-extensions'], headless: true, viewport: { width: 1100, height: 850 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const errors = [];
    context.on('page', (page) => page.on('pageerror', (e) => errors.push(e.message)));
    // The shipped extension always opens the web app. Redirect that handoff to
    // the isolated fixture inside this test only, preserving its recipe fragment.
    await context.route('https://recipe-buddy-wauul.vercel.app/import', route => route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(app)} + location.pathname + location.search + location.hash)</script>`,
    }));
    await context.route('https://recipes.example.test/**', (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let markup = '';
      if (pathname === '/soup') markup = `<script type="application/ld+json">${JSON.stringify({ '@graph': [soup, second, soup] })}</script>`;
      if (pathname === '/microdata') markup = '<div itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Microdata soup</h1><span itemprop="recipeIngredient">2 onions</span><div itemprop="recipeInstructions"><span itemprop="text">Chop the onions.</span><span itemprop="text">Simmer for 10 minutes.</span></div></div>';
      if (pathname === '/malformed') markup = '<script type="application/ld+json">{broken</script>';
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><title>Recipe website</title>${markup}<style>body{margin:60px;background:#fff;font:18px/1.6 Georgia;color:#292b26;max-width:700px}h1{font-size:44px}p{max-width:520px}</style></head><body><h1>A bowl of tomato soup</h1><p>A cozy lunch for a cool afternoon. Serve with a slice of toasted bread.</p></body></html>` });
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await worker.evaluate((appUrl) => chrome.storage.local.set({ appUrl }), app);
    const page = await context.newPage();
    await check('automatic recipe detection, graph deduplication and toolbar badge', async () => {
      await page.goto('https://recipes.example.test/soup');
      await page.waitForFunction(() => [...document.documentElement.children].some((node) => node.style.zIndex === '2147483647'));
      const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id);
      assert.equal(await worker.evaluate((tabId) => chrome.action.getBadgeText({ tabId }), tabId), '2');
      await page.screenshot({ path: path.join(output, '01-suggestion.png') });
    });
    async function popup() {
      await page.bringToFront();
      const pending = context.waitForEvent('page');
      await worker.evaluate((id) => chrome.tabs.create({ url: `chrome-extension://${id}/popup.html`, active: false }), id);
      const panel = await pending;
      await panel.setViewportSize({ width: 360, height: 620 });
      await panel.waitForFunction(() => document.getElementById('status').textContent !== 'Looking for a recipe…');
      return panel;
    }
    await check('popup selection and suggestion preference changes', async () => {
      const panel = await popup();
      await panel.locator('#title').waitFor();
      assert.equal(await panel.locator('#app-url, #connection').count(), 0);
      assert.equal(await panel.locator('#choice option').count(), 2);
      await panel.locator('#choice').selectOption('1');
      assert.equal(await panel.locator('#title').textContent(), second.name);
      await panel.screenshot({ path: path.join(output, '02-popup.png') });
      await panel.locator('#automatic').uncheck();
      await page.waitForFunction(() => ![...document.documentElement.children].some((node) => node.style.zIndex === '2147483647'));
      await panel.locator('#automatic').check();
      await page.waitForFunction(() => [...document.documentElement.children].some((node) => node.style.zIndex === '2147483647'));
      await panel.close();
    });
    await check('dismissal leaves the page usable and does not reappear on metadata changes', async () => {
      const box = await page.evaluate(() => {
        const host = [...document.documentElement.children].find((node) => node.style.zIndex === '2147483647');
        const r = host.getBoundingClientRect(); return { x: r.right - 38, y: r.top + 38 };
      });
      await page.mouse.click(box.x, box.y);
      await page.waitForFunction(() => ![...document.documentElement.children].some((node) => node.style.zIndex === '2147483647'));
      await page.evaluate(() => document.querySelector('script[type="application/ld+json"]').textContent += ' ');
      // Wait for the metadata observer to run, then query the current reader via popup.
      const panel = await popup(); await panel.locator('#title').waitFor();
      assert.equal(await page.evaluate(() => [...document.documentElement.children].some((node) => node.style.zIndex === '2147483647')), false);
      await panel.close();
    });
    let imported;
    await check('extension handoff survives real email sign-in and populates the editor without AI', async () => {
      const panel = await popup();
      const pending = context.waitForEvent('page');
      await panel.locator('#add').click(); imported = await pending;
      await imported.waitForURL(/\/login\?callbackUrl=/);
      assert.equal(new URL(imported.url()).hash, '');
      await imported.locator('input[name="email"]').fill(user.email);
      await imported.locator('input[name="password"]').fill('ExtensionTestOnly-2026');
      await imported.getByRole('button', { name: 'Log in', exact: true }).click();
      await imported.waitForURL(/\/recipes\/new\?from=extension/, { timeout: 30000 });
      await imported.locator('#title').waitFor();
      await imported.waitForFunction((name) => document.getElementById('title')?.value === name, soup.name);
      assert.equal(await imported.locator('#servings').inputValue(), '4');
      assert.equal(await imported.locator('#imageUrl').inputValue(), '');
      assert.equal(await imported.locator('#ingredients-0-name').inputValue(), '2 tomatoes');
      assert.equal(await imported.locator('#steps-1').inputValue(), 'Simmer for 20 minutes.');
      await imported.screenshot({ path: path.join(output, '03-editor.png'), fullPage: true });
      await imported.setViewportSize({ width: 390, height: 844 });
      await imported.screenshot({ path: path.join(output, '04-editor-mobile.png'), fullPage: true });
      assert.equal(await imported.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    });
    await check('reviewed recipe saves through the real API and persists in the isolated database', async () => {
      await imported.getByRole('button', { name: 'Save recipe', exact: true }).click();
      await imported.waitForURL(/\/recipes\/[^/?]+$/, { timeout: 30000 });
      const id = new URL(imported.url()).pathname.split('/').pop();
      const saved = await db.recipe.findUniqueOrThrow({ where: { id } });
      assert.equal(saved.userId, user.id); assert.equal(saved.title, soup.name); assert.equal(saved.servings, 4);
      assert.deepEqual(saved.ingredients, [{ name: '2 tomatoes', quantity: '', unit: '' }, { name: 'water', quantity: '1½', unit: 'cup' }]);
      assert.deepEqual(saved.steps, ['Chop the tomatoes.', 'Simmer for 20 minutes.']);
      await imported.reload(); await imported.getByRole('heading', { name: soup.name, exact: true }).waitFor();
      await imported.screenshot({ path: path.join(output, '05-saved.png'), fullPage: true });
    });
    await check('microdata, malformed metadata, URL fallback and dynamically inserted recipes', async () => {
      await page.goto('https://recipes.example.test/microdata');
      let panel = await popup(); await panel.locator('#title').waitFor();
      assert.equal(await panel.locator('#title').textContent(), 'Microdata soup'); await panel.close();
      await page.goto('https://recipes.example.test/malformed');
      panel = await popup();
      assert.match(await panel.locator('#status').textContent(), /No complete recipe/);
      assert.equal(await panel.locator('#add').isEnabled(), true);
      const pending = context.waitForEvent('page'); await panel.locator('#add').click();
      const fallback = await pending; await fallback.waitForURL(/\/recipes\/new\?from=extension/);
      await fallback.waitForFunction(() => document.getElementById('raw')?.value === 'https://recipes.example.test/malformed');
      assert.equal(await fallback.locator('#title').inputValue(), ''); await fallback.close();
      await page.evaluate((recipe) => { const script = document.createElement('script'); script.type = 'application/ld+json'; script.textContent = JSON.stringify(recipe); document.head.append(script); }, soup);
      await page.waitForFunction(() => [...document.documentElement.children].some((node) => node.style.zIndex === '2147483647'));
      panel = await popup(); await panel.locator('#title').waitFor(); assert.equal(await panel.locator('#title').textContent(), soup.name); await panel.close();
    });
    await check('invalid transfer shows recoverable error and no browser runtime errors occurred', async () => {
      const invalid = await context.newPage(); await invalid.goto(app + '/import#recipe=%7Bbroken');
      await invalid.getByRole('alert').waitFor(); assert.equal(new URL(invalid.url()).hash, '');
      assert.deepEqual(errors, []); await invalid.close();
    });
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ browser: 'Chromium unpacked Manifest V3', app, checks: reports, database: 'isolated local test database; real save and reload', screenshots: ['01-suggestion.png', '02-popup.png', '03-editor.png', '04-editor-mobile.png', '05-saved.png'] }, null, 2));
  } catch (error) {
    for (const [index, page] of (context?.pages() || []).entries()) {
      console.error('Page at failure:', new URL(page.url()).origin + new URL(page.url()).pathname);
      if (page.url().startsWith(app)) {
        console.error((await page.locator('body').innerText()).slice(0, 1000));
        await page.screenshot({ path: path.join(output, `failure-${index}.png`), fullPage: true });
      }
    }
    throw error;
  } finally {
    await context?.close();
    await db.recipe.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
