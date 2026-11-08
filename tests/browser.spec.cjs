const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});
test('academy offers EKG, Röntgen and anatomy and never exposes Sono', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Resqly Academy/);
  await expect(page.locator('.academy-course')).toHaveCount(3);
  await expect(page.locator('.application-switcher a')).toHaveText(['Start', 'EKG', 'Röntgen', 'Anatomie']);
  await expect(page.locator('.application-switcher a[aria-current]')).toHaveText('Start');
  await expect(page.locator('.brand')).toContainText('Resqly Academy');
  await expect(page.locator('body')).not.toContainText(/sono|sonographie/i);
  await page.getByRole('link', { name: /Zum Röntgen-Kurs/ }).click();
  await expect(page).toHaveURL(/\/roentgen\/#\/pfad$/);
  await expect(page.locator('h1')).toContainText('Röntgen verstehen');
  await expect(page.locator('.application-switcher a[aria-current]')).toHaveText('Röntgen');
  await page.locator('.application-switcher').getByRole('link', { name: 'EKG', exact: true }).click();
  await expect(page.locator('h1')).toContainText('EKG verstehen');
  await expect(page.locator('.brand')).toContainText('Resqly Academy');
  await page.getByRole('button', { name: 'Weiter zur Website' }).click();
  await page.locator('.application-switcher').getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page.locator('.academy-progress')).toBeVisible();
  expect(errors).toEqual([]);
});
test('one rating across the academy: course XP reaches the start page and every header', async ({ page }) => {
  await page.goto('/roentgen/');
  await page.evaluate(() => {
    localStorage.setItem('roentgen-learning-v1', JSON.stringify({ version: 1, done: { normalbild: { best: 100 } }, xp: 40, streak: 2, lastDay: new Date().toISOString().slice(0, 10) }));
    localStorage.setItem('ekg-lernen-v1', JSON.stringify({ xp: 30, done: { l1_1: { best: 100 } } }));
  });
  await page.goto('/');
  await expect(page.locator('.resqly-stats')).toContainText('70');
  await expect(page.locator('.resqly-stats')).toContainText('Lv 2');
  await expect(page.locator('.academy-progress')).toContainText('Level 2');
  await expect(page.locator('.academy-progress-parts')).toContainText('Röntgen40 XP');
  await expect(page.locator('.academy-course[data-course="ekg"]')).toContainText('1 Lektion abgeschlossen · 30 XP');
  await page.goto('/ekg/#/pfad');
  await expect(page.locator('.resqly-stats')).toContainText('70');
});
test('all EKG screens and initial lesson still render', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const route of ['pfad', 'trainer', 'bibliothek', 'labor', 'ableitungen', 'challenge']) {
    await page.goto('/ekg/#/' + route);
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page.locator('.application-switcher a[aria-current]')).toHaveText('EKG');
    await expect(page.locator('.application-switcher')).not.toContainText(/sono/i);
  }
  await page.goto('/ekg/#/pfad');
  await page.getByRole('button', { name: 'Weiter zur Website' }).click();
  await page.locator('.node').first().click();
  await expect(page.locator('.lesson-top')).toBeVisible();
  expect(errors).toEqual([]);
});
test('hidden Sono links return to academy; EKG legacy routes remain usable', async ({ page }) => {
  for (const url of ['/?app=sono#/home', '/sono/', '/sono/lektion/lunge-06', '/sono/index.html']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toContainText('Schritt für Schritt');
    await expect(page.locator('body')).not.toContainText(/sono|sonographie/i);
  }
  await page.goto('/?app=ekg');
  await expect(page).toHaveURL(/\/ekg\/#\/pfad$/);
  await page.goto('/ekg/labor');
  await expect(page.locator('#nav a.on')).toHaveText(/Labor/);
});
test('production EKG host can reach Röntgen on its existing domain', async ({ page, request }) => {
  await page.route('https://ekg.resqly.lu/**', async route => {
    const url = new URL(route.request().url());
    await route.fulfill({ response: await request.get(test.info().project.use.baseURL + url.pathname + url.search) });
  });
  await page.goto('https://ekg.resqly.lu/');
  await expect(page.locator('.application-switcher a[aria-current]')).toHaveText('EKG');
  await page.getByRole('button', { name: 'Weiter zur Website' }).click();
  await page.locator('.application-switcher').getByRole('link', { name: 'Röntgen', exact: true }).click();
  await expect(page).toHaveURL('https://ekg.resqly.lu/roentgen/#/pfad');
  await expect(page).toHaveTitle(/Röntgen by Resqly/);
  await expect(page.locator('h1')).toContainText('Röntgen verstehen');
  await page.locator('.application-switcher').getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL('https://ekg.resqly.lu/?app=academy#/home');
  await expect(page.locator('.academy-course')).toHaveCount(3);
  await page.unrouteAll({ behavior: 'wait' });
});
test('direct file preview works for the new course and hides the archived course', async ({ page }) => {
  const { pathToFileURL } = require('node:url');
  const path = require('node:path');
  const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
  await page.goto(url);
  await page.getByRole('link', { name: /Zum Röntgen-Kurs/ }).click();
  await expect(page).toHaveURL(/\/roentgen\/index\.html#\/pfad$/);
  await expect(page.locator('h1')).toContainText('Röntgen verstehen');
  await page.locator('.node').first().click();
  await expect(page.locator('.xr-film img')).toBeVisible();
  await expect.poll(() => page.locator('.xr-film img').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  await page.goto(url + '?app=sono#/home');
  await expect(page).toHaveURL(url);
  await expect(page.locator('.academy-course')).toHaveCount(3);
});
