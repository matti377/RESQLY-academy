/* Shared start-up for the academy page and the course folders. Each index.html
   declares its application; this builds the academy shell (brand, switcher,
   academy-wide stats) and loads the scripts. */
(async function () {
  "use strict";
  const app = document.documentElement.dataset.application;
  const home = Resqly.homeURL(location, app);
  // Every page carries the academy brand; it always leads to the start page.
  const brand = document.querySelector(".brand");
  brand.href = home;
  brand.classList.add("academy-brand");
  brand.innerHTML =
    '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5L12 5l10 4.5-10 4.5zM6.5 12v4.5q5.5 3.5 11 0V12"/></svg></span>' +
    '<span class="brand-name">Resqly Academy</span>';
  const switcher = document.createElement("nav");
  switcher.className = "application-switcher";
  switcher.setAttribute("aria-label", "Bereiche der Resqly Academy");
  for (const [name, label] of [["academy", "Start"], ["ekg", "EKG"], ["roentgen", "Röntgen"]]) {
    const link = document.createElement("a");
    link.href = name === "academy" ? home : Resqly.switchURL(name, location, app);
    link.textContent = label;
    if (name === app) link.setAttribute("aria-current", "true");
    switcher.append(link);
  }
  brand.after(switcher);
  const stats = document.createElement("a");
  stats.className = "resqly-stats";
  stats.href = home;
  switcher.after(stats);
  if (app !== "academy") {
    // Course path links become bookmarkable hash routes.
    const route = Resqly.route(location, app);
    const folder = "/" + app + "/";
    if (
      location.protocol !== "file:" &&
      location.pathname !== folder &&
      location.pathname !== folder + "index.html"
    )
      history.replaceState(null, "", folder + location.search + "#/" + route);
    else if (!location.hash)
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#/" + route,
      );
  }
  try {
    const accountScript = document.createElement("script");
    accountScript.src = resqlyAssetRoot + "assets/js/account.js?v=2";
    await new Promise((resolve, reject) => {
      accountScript.onload = resolve;
      accountScript.onerror = reject;
      document.body.append(accountScript);
    });
    await ResqlyAccount.init(app);
  } catch (_) {
    // The lessons remain available without account sync.
  }
  // After the account sync, so the profile starts from the synced stores.
  function showStats(s) {
    const item = (cls, icon, value, label) =>
      '<span class="stat ' + cls + '"><span class="ic" aria-hidden="true">' + icon + "</span>" + value +
      '<span class="sr-only"> ' + label + "</span></span>";
    stats.innerHTML =
      item("fire", "🔥", s.streak, s.streak === 1 ? "Tag in Folge" : "Tage in Folge") +
      item("gold", "⭐", s.xp, "XP") +
      item("level", "🎓", "Lv " + s.level.n, "· " + s.level.title);
    stats.title = "Resqly Academy: Level " + s.level.n + " (" + s.level.title + "), " + s.xp + " XP, " + s.streak + " Tage in Folge";
  }
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = resqlyAssetRoot + "assets/js/profile.js?v=1";
      script.onload = resolve;
      script.onerror = reject;
      document.body.append(script);
    });
    showStats(ResqlyProfile.init());
    ResqlyProfile.subscribe(showStats);
  } catch (_) {
    stats.remove();
  }
  const files = {
    academy: ["ui.js", "academy/quiz.js", "academy/app.js?v=3"],
    roentgen: ["ui.js", "roentgen/content.js?v=3", "roentgen/core.js?v=3", "roentgen/app.js?v=4"],
    ekg: [
      "ekg.js?v=25",
      "heart.js?v=25",
      "content.js?v=25",
      "ui.js?v=25",
      "challenge.js?v=1",
      "app.js?v=32",
    ],
  }[app];
  try {
    for (const file of files)
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = resqlyAssetRoot + "assets/js/" + file;
        script.onload = resolve;
        script.onerror = reject;
        document.body.append(script);
      });
  } catch (_) {
    document.getElementById("app").textContent =
      "Die Anwendung konnte nicht geladen werden. Bitte die Seite neu laden.";
  }
})();
