// Generate store-sized artwork from the app's own icon and verified UI captures.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const assets = path.join(__dirname, 'assets');
const svg = (body, width, height) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`);
const text = (x, y, size, words, color = '#293c30', weight = 400) => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}">${words}</text>`;
async function main() {
  await fs.mkdir(assets, { recursive: true });
  const mark = await sharp(path.join(root, 'public/recipe-buddy-icon.svg')).resize(96, 96).png().toBuffer();
  const icon = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: mark, left: 16, top: 16 }]).png().toBuffer();
  await fs.writeFile(path.join(root, 'extension/icons/128.png'), icon);
  await fs.writeFile(path.join(assets, 'store-icon-128.png'), icon);
  const popup = await sharp(path.join(root, 'test-results/extension/02-popup.png')).resize(360, 620).png().toBuffer();
  const screenshot = svg(`<rect width="1280" height="800" fill="#faf9f5"/><path d="M0 718H1280V800H0Z" fill="#e4ebdf"/>${text(70, 135, 28, 'Recipe Buddy', '#396449', 700)}${text(70, 275, 55, 'Save the recipes', '#293c30', 700)}${text(70, 342, 55, 'you find.', '#293c30', 700)}${text(70, 419, 23, 'Browse. Add. Review. Save.')}${text(70, 481, 19, 'A recipe collection that grows with you.', '#626b5c')}<rect x="792" y="72" width="376" height="648" rx="14" fill="#e4ebdf"/>${text(70, 757, 17, 'Recipe detection stays in your browser.', '#396449')}`, 1280, 800);
  await sharp(screenshot).composite([{ input: popup, left: 800, top: 84 }]).flatten({ background: '#faf9f5' }).png().toFile(path.join(assets, 'screenshot-01-1280x800.png'));
  const editorPath = path.join(root, 'test-results/extension/03-editor.png');
  const editor = await sharp(editorPath).extract({ left: 200, top: 165, width: 880, height: 840 }).resize(616, 588).png().toBuffer();
  const editorScene = svg(`<rect width="1280" height="800" fill="#faf9f5"/>${text(60, 130, 26, 'Recipe Buddy', '#396449', 700)}${text(60, 276, 45, 'Your next favorite.', '#293c30', 700)}${text(60, 333, 45, 'Ready to review.', '#293c30', 700)}${text(60, 418, 20, 'Keep the publisher’s ingredients and steps.')}${text(60, 458, 20, 'Review servings and quantities.')}${text(60, 498, 20, 'Save it to your Recipe Buddy account.')}<rect x="590" y="85" width="644" height="616" rx="14" fill="#e4ebdf"/>${text(60, 743, 17, 'A Recipe Buddy account is required to save.', '#626b5c')}`, 1280, 800);
  await sharp(editorScene).composite([{ input: editor, left: 604, top: 99 }]).flatten({ background: '#faf9f5' }).png().toFile(path.join(assets, 'screenshot-02-1280x800.png'));
  const tile = svg(`<rect width="440" height="280" fill="#293c30"/><circle cx="340" cy="225" r="130" fill="#396449"/><rect x="238" y="65" width="152" height="156" rx="10" fill="#faf9f5"/><path d="M258 99H364M258 124H346M258 149H354" stroke="#858d7b" stroke-width="6" stroke-linecap="round"/><rect x="258" y="176" width="109" height="24" rx="5" fill="#396449"/>${text(28, 166, 27, 'Recipe Buddy', '#faf9f5', 700)}${text(28, 204, 16, 'Save what you find.', '#dce4d6')}`, 440, 280);
  await sharp(tile).composite([{ input: await sharp(mark).resize(72, 72).png().toBuffer(), left: 28, top: 51 }]).flatten({ background: '#293c30' }).png().toFile(path.join(assets, 'small-promo-440x280.png'));
  // Export store screenshots and promo art as opaque RGB PNGs; keep icon alpha.
  for (const filename of ['screenshot-01-1280x800.png', 'screenshot-02-1280x800.png', 'small-promo-440x280.png']) {
    const imagePath = path.join(assets, filename);
    await sharp(await fs.readFile(imagePath)).removeAlpha().png().toFile(imagePath);
  }
  console.log('Store icon, 2 screenshots, and small promotional tile generated.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
