const { test, expect } = require('@playwright/test');
const C = require('../assets/js/roentgen/content.js');
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});
const action = page => page.locator('.actionbar .btn');
async function clickImage(page, point) {
  const img = page.locator('.xr-spot-surface img');
  const bounds = await img.boundingBox();
  const position = { x: bounds.width * point.x / 100, y: bounds.height * point.y / 100 };
  if (test.info().project.use.hasTouch) await img.tap({ position });
  else await img.click({ position });
}
async function answer(page, q, correct = true) {
  await expect(page.locator('.xr-stage')).toHaveAttribute('data-question', q.id);
  if (q.type === 'order') {
    const order = correct ? q.correct : q.correct.slice().reverse();
    for (const i of order) await page.locator('.opt[data-answer="' + i + '"]').click();
  } else if (q.type === 'spot') {
    await expect(page.locator('.xr-marker, .opt, .xr-solution')).toHaveCount(0);
    await clickImage(page, correct ? q.target : { x: 5, y: 5 });
  } else await page.locator('.opt[data-answer="' + (correct ? q.correct : (q.correct + 1) % q.options.length) + '"]').click();
  await action(page).click();
  await expect(page.locator('.xr-feedback')).toHaveClass(correct ? /good/ : /bad/);
  await expect(page.locator('.xr-feedback')).toContainText(q.explanation);
}
test('every lesson opens with visible explanations before any exercise', async ({ page }) => {
  await page.goto('/roentgen/');
  await page.evaluate(ids => localStorage.setItem('roentgen-learning-v1', JSON.stringify({ version: 1, done: Object.fromEntries(ids.map(id => [id, { best: 100 }])) })), C.lessons.map(l => l.id));
  await page.reload();
  for (const lesson of C.lessons) {
    await page.goto('/roentgen/#/lektion/' + lesson.id);
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Erklärung zur Lektion' })).toBeVisible();
    await expect(page.locator('.xr-teach-card')).toHaveCount(lesson.teaching.length);
    for (const section of lesson.teaching) {
      await expect(page.getByRole('heading', { name: section.title, exact: true })).toBeVisible();
      await expect(page.locator('.xr-teaching')).toContainText(section.body);
    }
    await expect(page.locator('.opts, .xr-spot-surface')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (lesson.id === 'handgelenk') {
      await expect(page.locator('.xr-teaching')).toContainText('Colles-Muster');
      await expect(page.locator('.xr-teaching')).toContainText('Handrückenseite');
      await page.screenshot({ path: 'test-results/roentgen-colles-explanation-' + test.info().project.name + '.png', fullPage: true });
    }
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expect(page.locator('.xr-stage')).toHaveAttribute('data-question', lesson.questions[0].id);
    await expect(page.locator('.xr-teaching')).toHaveCount(0);
    await expect(action(page)).toBeDisabled();
  }
});
test('image exercises start unmarked, accept a movable free click, and reveal only after checking', async ({ page }) => {
  await page.goto('/roentgen/');
  await page.evaluate(() => localStorage.setItem('roentgen-learning-v1', JSON.stringify({ version: 1, done: { handgelenk: { best: 100 } } })));
  await page.goto('/roentgen/#/lektion/schluesselbein'); await page.reload();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.locator('.xr-spot-surface')).toBeVisible();
  await expect(page.locator('.xr-marker, .opt, .xr-pick, .xr-solution')).toHaveCount(0);
  await expect(action(page)).toBeDisabled();
  await clickImage(page, { x: 10, y: 65 });
  await expect(action(page)).toBeEnabled();
  await expect(page.locator('.xr-pick')).toHaveCount(1);
  await expect(page.locator('.xr-solution')).toHaveCount(0);
  const q = C.lessons.find(l => l.id === 'schluesselbein').questions[0];
  await page.getByRole('button', { name: '⊕ Vergrößern' }).click();
  // Force a horizontal pan on mobile; the click must still map to the image.
  await page.locator('.xr-film-scroll').evaluate(el => { el.scrollLeft = 100; });
  await clickImage(page, q.target);
  await expect(page.locator('.xr-pick')).toHaveCount(1);
  await expect(page.locator('.xr-solution')).toHaveCount(0);
  await action(page).click();
  await expect(page.locator('.xr-feedback')).toHaveClass(/good/);
  await expect(page.locator('.xr-solution')).toHaveCount(1);
  await expect(page.locator('.xr-spot-surface')).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: '⊖ Gesamtbild' }).click();
  await page.locator('.xr-spot-surface img').scrollIntoViewIfNeeded();
  const picked = await page.locator('.xr-pick').getAttribute('style');
  const bounds = await page.locator('.xr-spot-surface img').boundingBox();
  // A physical click still must not change an already checked answer.
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  else await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  expect(await page.locator('.xr-pick').getAttribute('style')).toBe(picked);
  await expect(page.locator('.xr-solution')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/roentgen-free-click-' + test.info().project.name + '.png', fullPage: true });
});
test('a wrong image location loses a heart and clears the answer overlay on the next exercise', async ({ page }) => {
  await page.goto('/roentgen/');
  await page.evaluate(() => localStorage.setItem('roentgen-learning-v1', JSON.stringify({ version: 1, done: { normalbild: { best: 100 } } })));
  await page.goto('/roentgen/#/lektion/kortikalis'); await page.reload();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  const q = C.lessons.find(l => l.id === 'kortikalis').questions[0];
  await answer(page, q, false);
  await expect(page.locator('.hearts')).toHaveAttribute('aria-label', '4 von 5 Herzen');
  await expect(page.locator('.xr-pick.wrong, .xr-solution')).toHaveCount(2);
  await action(page).click();
  await expect(page.locator('.xr-pick, .xr-solution')).toHaveCount(0);
});
test('complete every lesson, unlock sequentially, retain XP and resume after reload', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/roentgen/');
  await expect(page.locator('.node')).toHaveCount(12);
  await expect(page.locator('.node:disabled')).toHaveCount(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.node').first().click();
  for (const [i, lesson] of C.lessons.entries()) {
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.locator('#nav')).toBeHidden();
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    for (const q of lesson.questions) {
      await expect(action(page)).toBeDisabled();
      await answer(page, q);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await action(page).click();
    }
    await expect(page.getByRole('heading', { name: 'Runde geschafft!' })).toBeVisible();
    await expect(page.locator('.xr-done')).toContainText('+15 XP');
    if (i < C.lessons.length - 1) await page.getByRole('link', { name: 'Nächste Lektion' }).click();
  }
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await page.reload();
  await expect(page.locator('.node.done')).toHaveCount(12);
  await expect(page.locator('.resqly-stats .stat.gold')).toHaveText('⭐180 XP');
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('roentgen-learning-v1')));
  expect(Object.keys(s.done)).toHaveLength(12); expect(s.streak).toBe(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/roentgen-path-' + test.info().project.name + '.png', fullPage: true });
});
test('wrong answers lose hearts and are repeated before completion', async ({ page }) => {
  await page.goto('/roentgen/#/lektion/bildstart');
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  const qs = C.lessons[0].questions;
  await answer(page, qs[0], false);
  await expect(page.locator('.hearts')).toHaveAttribute('aria-label', '4 von 5 Herzen');
  await action(page).click();
  for (const q of qs.slice(1)) { await answer(page, q); await action(page).click(); }
  await expect(page.locator('.q-kicker')).toContainText('NOCH EINMAL');
  await answer(page, qs[0]); await action(page).click();
  await expect(page.locator('.xr-done')).toContainText('+10 XP');
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('roentgen-learning-v1')));
  expect(s.done.bildstart.best).toBe(67); expect(s.answers[qs[0].id]).toEqual({ n: 2, last: true });
});
test('five mistakes fail without awarding XP or unlocking; error practice repairs mistakes', async ({ page }) => {
  await page.goto('/roentgen/#/lektion/bildstart');
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  const qs = C.lessons[0].questions;
  for (let i = 0; i < 5; i++) { await answer(page, qs[i % 3], false); await action(page).click(); }
  await expect(page.locator('.xr-done')).toContainText('Ein neuer Versuch');
  await expect(page.locator('.resqly-stats .stat.gold')).toHaveText('⭐0 XP');
  await page.getByRole('link', { name: 'Zum Lernpfad' }).click();
  await expect(page.locator('.node:disabled')).toHaveCount(11);
  await page.goto('/roentgen/#/trainer');
  await page.getByRole('link', { name: 'Fehler üben' }).click();
  for (let i = 0; i < 3; i++) {
    const id = await page.locator('.xr-stage').getAttribute('data-question');
    await answer(page, qs.find(q => q.id === id)); await action(page).click();
  }
  await page.getByRole('link', { name: 'Zum Trainer' }).click();
  await expect(page.locator('#app')).toContainText('Noch keine offenen Fehler');
});
test('atlas images decode, filtering, zoom, contrast, attribution and responsive image tasks', async ({ page }) => {
  await page.goto('/roentgen/#/atlas');
  await expect(page.locator('.xr-atlas-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Normalbilder', exact: true }).click();
  await expect(page.locator('.xr-atlas-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Frakturen', exact: true }).click();
  await expect(page.locator('.xr-atlas-card')).toHaveCount(3);
  for (const m of C.media) {
    await page.goto('/roentgen/#/atlas/' + m.id);
    const img = page.locator('.xr-film img');
    await expect.poll(() => img.evaluate(i => i.naturalWidth)).toBe(m.width);
    await expect(page.getByRole('link', { name: m.license, exact: true })).toHaveAttribute('href', m.licenseURL);
    await expect(page.locator('.xr-atlas-finding')).toContainText(m.finding);
    const before = await img.boundingBox();
    await page.getByRole('button', { name: '⊕ Vergrößern' }).click();
    const after = await img.boundingBox(); expect(after.width).toBeGreaterThan(before.width);
    await page.getByRole('slider', { name: 'Bildkontrast' }).fill('150');
    await expect(img).toHaveCSS('filter', 'contrast(1.5)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'test-results/roentgen-image-' + test.info().project.name + '.png', fullPage: true });
});
test('direct locks, deep links, unknown content and blocked storage recover', async ({ page }) => {
  await page.goto('/roentgen/lektion/abschluss');
  await expect(page.locator('h1')).toContainText('noch gesperrt');
  await page.goto('/roentgen/wissen'); await page.reload();
  await expect(page.locator('h1')).toContainText('Ein fester Ablauf');
  await page.goto('/roentgen/#/atlas/missing');
  await expect(page.locator('h1')).toContainText('nicht verfügbar');
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto('/roentgen/#/lektion/bildstart');
  await page.reload();
  await expect(page.locator('#xr-storage')).toBeVisible();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  for (const q of C.lessons[0].questions) { await answer(page, q); await action(page).click(); }
  await expect(page.getByRole('heading', { name: 'Runde geschafft!' })).toBeVisible();
});
