const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const Q = require("../assets/js/academy/quiz.js");
const bank = Q.load(
  fs.readFileSync(path.join(__dirname, "../assets/data/fragen.csv"), "utf8"),
);
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
});

test("quiz of the day: five questions on one theme, explanations, result and streak", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const card = page.locator(".academy-daily");
  await expect(card).toContainText("QUIZ DES TAGES");
  const theme = await card.locator("h2").textContent();
  expect(Q.themes(bank.questions).map((t) => t.name)).toContain(theme);
  await expect(page.locator(".resqly-stats .stat.fire")).toContainText("0");
  await card.getByRole("link", { name: "Quiz starten" }).click();
  await expect(page).toHaveURL(/#\/tagesquiz$/);
  await expect(page.locator("#nav")).toBeHidden();
  const action = page.locator(".actionbar .btn");
  for (let n = 1; n <= Q.DAILY_SIZE; n++) {
    await expect(page.locator(".academy-count")).toHaveText(
      n + "/" + Q.DAILY_SIZE,
    );
    await expect(page.locator(".q-kicker")).toHaveText(theme);
    await expect(page.locator(".opt")).toHaveCount(3);
    await expect(action).toBeDisabled();
    await page.locator(".opt").first().click();
    await action.click();
    await expect(page.locator(".opt.right")).toHaveCount(1);
    await expect(page.locator(".academy-why p")).not.toBeEmpty();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await action.click();
  }
  await expect(page.locator(".academy-done h1")).toContainText(
    /\d von 5 richtig/,
  );
  await expect(page.locator(".academy-review-item")).toHaveCount(Q.DAILY_SIZE);
  await expect(page.locator(".resqly-stats .stat.fire")).toContainText("1");
  await expect(page.locator(".actionbar")).toHaveCount(0);
  // The first result of the day stands: reopening shows it, not a new attempt.
  await page.reload();
  await expect(page.locator(".academy-done h1")).toBeVisible();
  await page.getByRole("link", { name: "Zur Übersicht" }).click();
  await expect(page.locator(".academy-daily.done")).toContainText(
    "Heute erledigt",
  );
  await expect(page.locator(".academy-day.today.done")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("theme quiz: every theme is listed, rounds of ten, keyboard answers, progress kept", async ({
  page,
}) => {
  const themes = Q.themes(bank.questions);
  await page.goto("/#/themen");
  await expect(page.locator(".academy-theme")).toHaveCount(themes.length);
  await expect(page.locator("#nav a.on")).toHaveText(/Themen-Quiz/);
  await page.locator(".academy-theme").first().click();
  await expect(page).toHaveURL(new RegExp("#/quiz/" + themes[0].id + "$"));
  await expect(page.locator(".academy-count")).toHaveText("1/10");
  await page.keyboard.press("2");
  await expect(page.locator(".opt").nth(1)).toHaveClass(/sel/);
  await page.keyboard.press("Enter");
  await expect(page.locator(".academy-why")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".academy-count")).toHaveText("2/10");
  await page.locator(".lesson-top .iconbtn").click();
  await expect(page.locator(".actionbar")).toHaveCount(0);
  await expect(page.locator("#nav")).toBeVisible();
  await expect(page.locator(".academy-theme").first()).toContainText(
    /[01] von 20 Fragen sicher/,
  );
});

test("a missing question bank leaves the course links usable", async ({
  page,
}) => {
  await page.route("**/assets/data/fragen.csv", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".pill-note")).toContainText(
    "konnten nicht geladen werden",
  );
  await expect(page.locator(".academy-course")).toHaveCount(3);
});
