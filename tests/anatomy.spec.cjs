const { test, expect } = require('@playwright/test');
const C = require('../assets/js/anatomy/content.js');
test.beforeEach(async ({ page }) => { await page.route('https://fonts.googleapis.com/**', route => route.abort()); });
async function region(page, value = 'kopf') {
  await page.getByRole('combobox', { name: 'Körperregion', exact: true }).selectOption(value);
}
async function pick(page, id) {
  const details = page.locator('.an-keyboard');
  if (!(await details.evaluate(element => element.open))) await details.locator('summary').click();
  await page.locator('.an-bone-option[data-bone="' + id + '"]').click();
}
test('academy entry, 3D controls, atlas and responsive layout', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('.academy-course[data-course="anatomie"]').click();
  await expect(page.locator('h1')).toHaveText('Knochen für Knochen.');
  await expect(page.locator('.an-render-status')).toHaveText('3D · INTERAKTIV');
  await expect(page.locator('.an-model canvas')).toBeVisible();
  await expect(page.locator('.an-model')).toHaveAttribute('data-model-source', 'ecorche-bodyparts3d');
  await expect(page.locator('.an-model')).toHaveAttribute('data-mesh-count', '267');
  await page.getByRole('button', { name: 'Hinten', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hinten', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await page.getByRole('button', { name: 'Ansicht zurücksetzen' }).click();
  await page.locator('#nav').getByRole('link', { name: 'Knochenatlas' }).click();
  await region(page, 'arme'); await pick(page, 'radius-r');
  await expect(page.locator('.an-task')).toContainText('Speiche · rechts');
  await expect(page.locator('.an-task')).toContainText('Daumenseite');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/anatomy-atlas-' + test.info().project.name + '.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('recall keeps misses, removes known bones and retains first-attempt score after retry', async ({ page }) => {
  await page.goto('/anatomie/'); await region(page);
  await page.getByRole('button', { name: 'Runde starten' }).click();
  await pick(page, 'frontal');
  await expect(page.locator('.an-task')).toContainText('Stirnbein');
  await page.getByRole('button', { name: 'Noch nicht gewusst' }).click();
  await expect(page.locator('.an-bone-option[data-bone="frontal"]')).toHaveCount(1);
  await pick(page, 'frontal'); await page.getByRole('button', { name: '✓ Gewusst', exact: true }).click();
  await expect(page.locator('.an-bone-option[data-bone="frontal"]')).toHaveCount(0);
  for (const b of C.bones.filter(b => b.region === 'kopf' && b.id !== 'frontal')) { await pick(page, b.id); await page.getByRole('button', { name: '✓ Gewusst', exact: true }).click(); }
  await expect(page.locator('.an-result-score')).toContainText('83%');
  await expect(page.locator('.an-progress-label')).toHaveText('6 / 6 gemeistert');
  await page.reload(); await region(page);
  await expect(page.locator('.an-region-count')).toContainText('6 zuletzt gewusst');
});
test('name-to-bone learning shows errors, highlights the answer and repeats it', async ({ page }) => {
  await page.goto('/anatomie/'); await region(page);
  await page.locator('[data-mode="learn"]').click();
  await page.getByRole('button', { name: 'Runde starten' }).click();
  const name = await page.locator('.an-task h2').textContent();
  const target = C.bones.find(b => b.name === name);
  const wrong = C.bones.find(b => b.region === 'kopf' && b.id !== target.id);
  await pick(page, wrong.id);
  await expect(page.locator('.an-task')).toHaveClass(/an-wrong/);
  await expect(page.locator('.an-task')).toContainText('leuchtet grün');
  await page.getByRole('button', { name: 'Weiter', exact: false }).click();
  for (let i = 0; i < 6; i++) {
    const prompt = await page.locator('.an-task h2').textContent();
    const b = C.bones.find(b => b.name === prompt);
    await pick(page, b.id);
    await expect(page.locator('.an-task')).toHaveClass(/an-good/);
    await page.getByRole('button', { name: 'Weiter', exact: false }).click();
  }
  await expect(page.locator('.an-result-score')).toContainText('83%');
});
test('timed completion stops the clock, persists a ranked result and excludes early finishes', async ({ page }) => {
  await page.goto('/anatomie/'); await region(page);
  await page.locator('[data-mode="timed"]').click(); await page.getByRole('button', { name: 'Zeit starten' }).click();
  await expect(page.locator('.an-timer')).not.toHaveText('00:00.0');
  for (const b of C.bones.filter(b => b.region === 'kopf')) { await pick(page, b.id); await page.getByRole('button', { name: '✓ Gewusst', exact: true }).click(); }
  await expect(page.locator('.an-result-rank')).toContainText('Platz 1');
  const stopped = await page.locator('.an-timer').textContent();
  await page.getByRole('link', { name: 'Zur Bestenliste', exact: true }).click();
  await expect(page.locator('.an-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.an-table')).toContainText(stopped);
  await page.reload(); await expect(page.locator('.an-empty')).toBeVisible(); // Default is entire skeleton.
  await page.getByRole('combobox', { name: 'Bestenliste nach Region filtern' }).selectOption('kopf');
  await expect(page.locator('.an-table tbody tr')).toHaveCount(1);
  await page.locator('#nav').getByRole('link', { name: 'Training', exact: true }).click();
  await page.locator('[data-mode="timed"]').click(); await page.getByRole('button', { name: 'Zeit starten' }).click();
  await page.getByRole('button', { name: 'Runde auswerten' }).click();
  await expect(page.locator('.an-task')).toContainText('Nur vollständig geleerte');
  await page.getByRole('link', { name: 'Zur Bestenliste', exact: true }).click();
  await expect(page.locator('.an-table tbody tr')).toHaveCount(1);
});
test('WebGL fallback and unavailable storage leave practice usable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (/webgl/.test(type)) return null; return getContext.call(this, type, ...args); };
    Storage.prototype.setItem = function () { throw new Error('Storage unavailable'); };
  });
  await page.goto('/anatomie/');
  await expect(page.locator('.an-fallback')).toBeVisible();
  await region(page); await page.getByRole('button', { name: 'Runde starten' }).click();
  await pick(page, 'frontal'); await page.getByRole('button', { name: '✓ Gewusst', exact: true }).click();
  await expect(page.locator('.an-storage-note')).toContainText('für diesen Besuch');
  await expect(page.locator('.an-progress-label')).toHaveText('1 / 6 gemeistert');
});
test('physical bone clicks raycast the 3D geometry; dragging rotates without answering', async ({ page }) => {
  await page.goto('/anatomie/');
  await page.getByRole('button', { name: 'Runde starten' }).click();
  await page.getByRole('button', { name: 'Vorne', exact: true }).click();
  const canvas = page.locator('.an-model canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  // Perspective projection of the sternum center in the model's front view.
  const tan = Math.tan(17 * Math.PI / 180);
  const boxes = Object.values(C.model.targets).map(t => t.bounds);
  const min = [0, 1, 2].map(a => Math.min(...boxes.map(b => b[0][a])));
  const max = [0, 1, 2].map(a => Math.max(...boxes.map(b => b[1][a])));
  const size = min.map((lo, a) => max[a] - lo);
  const center = min.map((lo, a) => (max[a] + lo) / 2);
  const distance = Math.max(size[1] / 2, size[0] / (2 * bounds.width / bounds.height)) / tan * 1.12 + size[2] / 2;
  const [x, y, z] = C.bones.find(b => b.id === 'sternum').center.map((v, a) => v - center[a]);
  const point = { x: bounds.width / 2 + x / ((distance - z) * tan) * bounds.height / 2, y: bounds.height / 2 - y / ((distance - z) * tan) * bounds.height / 2 };
  if (test.info().project.use.hasTouch) await canvas.tap({ position: point });
  else await canvas.click({ position: point });
  await expect(page.locator('.an-task h2')).toHaveText('Brustbein');
  await page.getByRole('button', { name: '✓ Gewusst', exact: true }).click();
  await expect(page.locator('.an-progress-label')).toHaveText('1 / 88 gemeistert');
  await canvas.scrollIntoViewIfNeeded();
  const rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 60, rect.y + rect.height / 2 + 25, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('.an-bone-card')).toHaveCount(0);
});
test('file entry works without an account server or remote 3D assets', async ({ page }) => {
  const { pathToFileURL } = require('node:url'); const path = require('node:path');
  await page.goto(pathToFileURL(path.resolve(__dirname, '../anatomie/index.html')).href);
  await expect(page.locator('.an-render-status')).toHaveText('3D · INTERAKTIV');
  await region(page); await page.getByRole('button', { name: 'Runde starten' }).click();
  await pick(page, 'mandible'); await expect(page.locator('.an-task')).toContainText('Mandibula');
});
test('an unavailable model shows a retry and never starts a training session', async ({ page }) => {
  await page.route('**/assets/media/anatomy/skeleton.glb*', route => route.abort());
  await page.goto('/anatomie/');
  await expect(page.getByRole('heading', { name: 'Das anatomische Modell konnte nicht geladen werden.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Erneut laden' })).toBeVisible();
  await expect(page.locator('.an-model, .an-timer')).toHaveCount(0);
  await page.unroute('**/assets/media/anatomy/skeleton.glb*');
  await page.getByRole('button', { name: 'Erneut laden' }).click();
  await expect(page.locator('.an-render-status')).toHaveText('3D · INTERAKTIV');
});
