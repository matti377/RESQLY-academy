/* One academy-wide rating: XP per course, a log of learning days, a level and
   a day streak that every course feeds. The courses keep their own state; this
   only records what they earn. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResqlyProfile = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const STORE = "resqly-profile-v1";
  const SOURCES = ["academy", "ekg", "roentgen"];
  // Course stores read once to take over XP and streaks earned before the profile existed.
  const COURSE_STORES = { ekg: "ekg-lernen-v1", roentgen: "roentgen-learning-v1" };
  const DAILY_GOAL = 20;
  const KEEP_DAYS = 400;
  const TITLES = [
    [1, "Einstieg"],
    [3, "Grundlagen"],
    [6, "Fortgeschritten"],
    [10, "Routine"],
    [15, "Expertise"],
  ];

  const number = (n, max = 1000000000) => (Number.isInteger(n) && n >= 0 && n <= max ? n : 0);
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  // EKG writes days unpadded ("2026-11-2"); both forms name the same day.
  function parseDay(text) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || ""));
    return m ? new Date(+m[1], m[2] - 1, +m[3]) : null;
  }
  const shift = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

  function empty() {
    return { version: 1, xp: {}, days: {} };
  }
  function restore(raw) {
    const state = empty();
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!data || data.version !== 1) return state;
      for (const source of SOURCES) if (data.xp && number(data.xp[source])) state.xp[source] = data.xp[source];
      for (const [key, value] of Object.entries(data.days || {}))
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) state.days[key] = number(value, 1000000);
    } catch (_) {
      /* A corrupt profile starts over; the course stores still hold the work. */
    }
    return state;
  }
  function prune(state) {
    const keys = Object.keys(state.days).sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete state.days[key];
  }

  function award(state, source, amount, now = new Date()) {
    if (!SOURCES.includes(source) || !(amount > 0)) return 0;
    amount = Math.round(amount);
    state.xp[source] = (state.xp[source] || 0) + amount;
    const today = dayKey(now);
    state.days[today] = (state.days[today] || 0) + amount;
    prune(state);
    return amount;
  }
  // A course reports its own XP total; what is new since the last report was
  // earned now. Returns the XP added.
  function report(state, source, courseXp, now = new Date()) {
    return award(state, source, number(courseXp) - (state.xp[source] || 0), now);
  }
  // Takes over XP from course stores without counting it as earned today, e.g.
  // older progress or progress synced from another device.
  function absorb(state, source, courseXp) {
    if (SOURCES.includes(source) && number(courseXp) > (state.xp[source] || 0)) state.xp[source] = courseXp;
  }
  // Rebuilds learning days from a course's old streak counter.
  function backfill(state, lastDay, streak) {
    const last = parseDay(lastDay);
    if (!last) return;
    for (let i = 0; i < Math.min(number(streak), KEEP_DAYS); i++) {
      const key = dayKey(shift(last, -i));
      if (!(key in state.days)) state.days[key] = 0;
    }
    prune(state);
  }

  function total(state) {
    return SOURCES.reduce((sum, source) => sum + (state.xp[source] || 0), 0);
  }
  // Learning days in a row; a streak survives until the end of the next day.
  function streak(state, now = new Date()) {
    let day = dayKey(now) in state.days ? now : shift(now, -1);
    let run = 0;
    while (dayKey(day) in state.days) {
      run++;
      day = shift(day, -1);
    }
    return run;
  }
  // Level n starts at 25·n·(n−1) XP: 0, 50, 150, 300, 500, 750 …
  const levelStart = (n) => 25 * n * (n - 1);
  function level(xp) {
    let n = 1;
    while (levelStart(n + 1) <= xp) n++;
    const title = TITLES.filter(([from]) => n >= from).pop()[1];
    return { n, title, into: xp - levelStart(n), span: levelStart(n + 1) - levelStart(n) };
  }
  function summary(state, now = new Date()) {
    const xp = total(state);
    const bySource = {};
    for (const source of SOURCES) bySource[source] = state.xp[source] || 0;
    return { xp, level: level(xp), streak: streak(state, now), today: state.days[dayKey(now)] || 0, goal: DAILY_GOAL, bySource };
  }

  /* ------------------------------------------------------------ browser */

  const page = typeof window !== "undefined" ? window : globalThis;
  let state = empty();
  const listeners = [];
  function storage() {
    try {
      return page.localStorage || null;
    } catch (_) {
      return null;
    }
  }
  function changed() {
    const local = storage();
    try {
      local?.setItem(STORE, JSON.stringify(state));
    } catch (_) {
      /* the rating lasts for this visit only */
    }
    page.ResqlyAccount?.saveProgress("profile", state);
    const now = summary(state);
    listeners.forEach((fn) => fn(now));
  }
  function init() {
    const local = storage();
    let raw = null;
    try {
      raw = local?.getItem(STORE);
    } catch (_) {
      /* see changed() */
    }
    state = restore(raw);
    const fresh = raw == null;
    for (const [source, key] of Object.entries(COURSE_STORES)) {
      let course = null;
      try {
        course = JSON.parse(local?.getItem(key));
      } catch (_) {
        /* unreadable course store: nothing to take over */
      }
      if (!course || typeof course !== "object") continue;
      absorb(state, source, course.xp);
      if (fresh) backfill(state, course.lastDay, course.streak);
    }
    try {
      local?.setItem(STORE, JSON.stringify(state));
    } catch (_) {
      /* see changed() */
    }
    return summary(state);
  }
  return {
    // Pure helpers on a given state (tests, server-independent logic).
    STORE, SOURCES, DAILY_GOAL, restore, absorb, backfill, total, streak, level, dayKey,
    addXp: award,
    reportXp: report,
    summarize: summary,
    // The page's own profile.
    init,
    award(source, amount) {
      const gained = award(state, source, amount);
      if (gained) changed();
      return gained;
    },
    report(source, courseXp) {
      const gained = report(state, source, courseXp);
      if (gained) changed();
      return gained;
    },
    summary: () => summary(state),
    subscribe: (fn) => listeners.push(fn),
  };
});
