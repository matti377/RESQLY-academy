/* Academy: start page, quiz of the day and theme quizzes. Reuses UI.h and the
   shared Resqly shell; the question bank is assets/data/fragen.csv. */
(function () {
  "use strict";
  const h = UI.h;
  const Q = AcademyQuiz;
  const root = document.getElementById("app");
  const text = (tag, value, cls) => h(tag, { text: value, class: cls || "" });
  const STORE = "resqly-academy-v1";
  const PRACTICE_SIZE = 10;
  // XP for the academy-wide rating, in line with the courses.
  const XP_RIGHT = 2;
  const XP_DAILY = 10;
  const XP_DAILY_PERFECT = 5;
  const profile = () => window.ResqlyProfile;
  const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  /* Decorative course previews, not diagnostic images. */
  const BEAT = "h18q8-12 16 0h10l4 5 7-46 7 52 4-11h14q12-18 24 0h24";
  const EKG_ART =
    '<svg viewBox="0 0 640 124" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<path class="academy-trace" pathLength="1" d="M0 68' +
    BEAT.repeat(5) +
    '"/></svg>';
  const XRAY_ART = '<svg viewBox="0 0 640 124" aria-hidden="true"><g fill="#d8e4ff" stroke="#91a9dc" stroke-width="3" transform="translate(255 -30) rotate(20 65 90)"><path d="M35 0Q20 25 37 42L45 88 65 98 55 56Q74 28 57 0Z"/><path d="M48 106L70 116 85 162Q110 184 94 205L74 209Q50 188 65 168Z"/><path d="M90 0L100 92 111 100 115 0ZM103 112L113 122 136 215 126 219Z"/></g><circle cx="321" cy="67" r="24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="4 5"/></svg>';

  const COURSES = [
    {
      app: "ekg",
      store: "ekg-lernen-v1",
      icon: "💓",
      title: "EKG lernen",
      sub: "Vom ersten Ausschlag bis zum Infarkt-EKG",
      desc: "Kurze Lektionen, animierte Kurven und Übungen, die hängen bleiben — dazu Trainer, Befund-Bibliothek und EKG-Labor.",
      tags: ["Lernpfad", "Trainer", "EKG-Labor", "Challenge"],
      cta: "Zum EKG-Kurs",
      button: "btn heart wide",
      art: EKG_ART,
      colors: ["#ff4d6d", "#d92e50", "#ffe8ec"],
    },
    {
      app: "roentgen",
      store: "roentgen-learning-v1",
      icon: "🩻",
      title: "Röntgen lernen",
      sub: "Bilder lesen. Frakturen erkennen.",
      desc: "Trainiere deinen Blick an echten Röntgenbildern: systematisch analysieren, Bruchstellen finden und Befunde beschreiben. Mit kurzen Lektionen, Herzen und XP.",
      tags: ["12 Lektionen", "Echte Röntgenbilder", "Fraktur-Trainer"],
      cta: "Zum Röntgen-Kurs",
      button: "btn violet wide",
      art: XRAY_ART,
      colors: ["#7c5cff", "#5c3fd4", "#eee9ff"],
    },
  ];
  const STEPS = [
    [
      "⚡",
      "Jeden Tag ein Thema",
      "Das Quiz des Tages stellt fünf Fragen zu einem Thema — in drei Minuten erledigt.",
    ],
    [
      "🎯",
      "Lücken gezielt schließen",
      "Im Themen-Quiz kommen zuerst neue Fragen und die, die zuletzt falsch waren.",
    ],
    [
      "🔓",
      "Überall weiterlernen",
      "Jede Lektion und jedes Quiz bringt XP für dein gemeinsames Level — mit Konto auf allen Geräten.",
    ],
  ];
  const NAV = [
    ["home", "🏠", "Start"],
    ["tagesquiz", "⚡", "Quiz des Tages"],
    ["themen", "🧠", "Themen-Quiz"],
  ];

  /* ---------------------------------------------------------------- state */

  let bank = null; // { questions, themes } once loaded, { failed: true } on error
  let state = Q.emptyState();
  try {
    state = Q.restore(localStorage.getItem(STORE));
  } catch (_) {
    /* private mode: progress lasts for this visit only */
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (_) {
      /* see above */
    }
    window.ResqlyAccount?.saveProgress("academy", state);
  }
  const today = () => Q.dayKey(new Date());
  let leave = null; // tears down the running quiz, if any

  /* ------------------------------------------------------------- building */

  function meter(percent, label) {
    const fill = h("i");
    fill.style.width = percent + "%";
    return h(
      "div",
      {
        class: "academy-meter",
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(percent),
        "aria-label": label,
      },
      [fill],
    );
  }
  function note(icon, message) {
    return h("div", { class: "pill-note" }, [
      h("span", { class: "bi", text: icon, "aria-hidden": "true" }),
      text("span", message),
    ]);
  }
  /* Shown wherever questions are needed but the bank is not there (yet). */
  function bankNotice() {
    if (!bank) return note("⏳", "Die Quizfragen werden geladen …");
    return note(
      "⚠️",
      "Die Quizfragen konnten nicht geladen werden. Quiz des Tages und Themen-Quiz brauchen den Server (python3 server.py); die Kurse funktionieren weiterhin.",
    );
  }
  const ready = () => bank && !bank.failed;

  function courseCard(c) {
    const card = h(
      "a",
      {
        class: "academy-course",
        href: Resqly.switchURL(c.app, location, "academy"),
        "data-course": c.app,
      },
      [
        h("div", { class: "academy-art", html: c.art }),
        h("div", { class: "unit-head" }, [
          h("div", { class: "unit-badge", text: c.icon, "aria-hidden": "true" }),
          h("div", {}, [text("h3", c.title), text("p", c.sub)]),
        ]),
        text("p", c.desc, "academy-desc"),
        courseProgress(c),
        h(
          "div",
          { class: "taglist" },
          c.tags.map((t) => text("span", t, "tag2")),
        ),
        text("span", c.cta + " →", c.button),
      ],
    );
    card.style.setProperty("--u", c.colors[0]);
    card.style.setProperty("--u-dk", c.colors[1]);
    card.style.setProperty("--u-lt", c.colors[2]);
    return card;
  }

  function courseProgress(c) {
    let done = 0;
    try {
      done = Object.keys(JSON.parse(localStorage.getItem(c.store))?.done || {}).length;
    } catch (_) {
      /* nothing stored yet */
    }
    const xp = profile()?.summary().bySource[c.app] || 0;
    return text(
      "p",
      done || xp
        ? (done === 1 ? "1 Lektion" : done + " Lektionen") + " abgeschlossen · " + xp + " XP"
        : "Noch nicht begonnen",
      "academy-course-progress",
    );
  }

  /* The academy-wide rating every course feeds: level, streak, daily goal. */
  function progressCard() {
    const s = profile()?.summary();
    if (!s) return null;
    const { n, title, into, span } = s.level;
    const percent = Math.round((into / span) * 100);
    const goal = Math.min(100, Math.round((s.today / s.goal) * 100));
    const part = (label, xp) =>
      h("li", {}, [text("span", label), text("b", xp + " XP")]);
    return h("section", { class: "card academy-progress", "aria-label": "Dein Fortschritt in der Academy" }, [
      h("div", { class: "academy-progress-level" }, [
        h("div", { class: "academy-level-badge", "aria-hidden": "true" }, [text("span", "LEVEL"), text("b", String(n))]),
        h("div", {}, [
          text("span", "DEIN FORTSCHRITT", "academy-eyebrow"),
          text("h2", "Level " + n + " · " + title),
          meter(percent, "Fortschritt bis Level " + (n + 1)),
          text("p", s.xp + " XP gesamt · noch " + (span - into) + " XP bis Level " + (n + 1)),
        ]),
      ]),
      h("div", { class: "academy-progress-facts" }, [
        h("div", {}, [
          text("span", "SERIE", "academy-eyebrow"),
          text("b", "🔥 " + (s.streak === 1 ? "1 Tag" : s.streak + " Tage")),
          text("p", s.today ? "Heute schon gelernt" : "Heute lernen, um die Serie zu halten"),
        ]),
        h("div", {}, [
          text("span", "TAGESZIEL", "academy-eyebrow"),
          text("b", "⭐ " + Math.min(s.today, s.goal) + " / " + s.goal + " XP"),
          meter(goal, "Tagesziel"),
        ]),
        h("ul", { class: "academy-progress-parts" }, [
          part("EKG", s.bySource.ekg),
          part("Röntgen", s.bySource.roentgen),
          part("Quiz", s.bySource.academy),
        ]),
      ]),
    ]);
  }

  function themeCard(theme, index) {
    const m = Q.mastery(state, theme.questions);
    return h("a", { class: "academy-theme", href: "#/quiz/" + theme.id }, [
      h("div", { class: "academy-theme-no", text: String(index + 1), "aria-hidden": "true" }),
      h("div", { class: "academy-theme-body" }, [
        text("h3", theme.name),
        text(
          "p",
          m.seen
            ? m.right + " von " + m.total + " Fragen sicher"
            : m.total + " Fragen · noch nicht geübt",
        ),
        meter(m.percent, "Wissens-Score " + theme.name),
      ]),
      h("span", { class: "academy-theme-go", text: "→", "aria-hidden": "true" }),
    ]);
  }

  function weekStrip() {
    const now = today();
    const days = [];
    for (let back = 6; back >= 0; back--) {
      const key = Q.addDays(now, -back);
      const [y, m, d] = key.split("-").map(Number);
      const done = !!state.daily[key];
      days.push(
        h(
          "div",
          {
            class: "academy-day" + (done ? " done" : "") + (back ? "" : " today"),
            title: key + (done ? ": erledigt" : ": offen"),
          },
          [
            text("span", WEEKDAYS[new Date(y, m - 1, d).getDay()]),
            h("b", { text: done ? "✓" : "", "aria-hidden": "true" }),
          ],
        ),
      );
    }
    return h("div", { class: "academy-week", "aria-label": "Quiz des Tages in den letzten sieben Tagen" }, days);
  }

  function dailyCard() {
    const quiz = Q.daily(bank.questions, today());
    if (!quiz) return h("div", { class: "card" }, [note("ℹ️", "Für ein Quiz des Tages braucht ein Thema mindestens fünf Fragen.")]);
    const done = state.daily[quiz.key];
    const run = Q.streak(state, quiz.key);
    const date = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return h("div", { class: "card academy-daily" + (done ? " done" : "") }, [
      h("div", { class: "academy-daily-top" }, [
        text("span", "QUIZ DES TAGES", "academy-eyebrow"),
        text("span", date, "academy-date"),
      ]),
      text("h2", quiz.theme.name),
      text(
        "p",
        done
          ? "Heute erledigt: " + done.correct + " von " + done.total + " richtig. Morgen wartet ein neues Thema."
          : quiz.questions.length + " Fragen zu einem Thema · etwa 3 Minuten · mit Erklärung zu jeder Antwort.",
        "academy-daily-sub",
      ),
      weekStrip(),
      h("div", { class: "academy-daily-foot" }, [
        h("a", {
          class: "btn " + (done ? "gray" : "violet"),
          href: "#/tagesquiz",
          text: done ? "Auswertung ansehen" : "Quiz starten",
        }),
        h("span", { class: "stat fire" }, [
          h("span", { class: "ic", text: "🔥", "aria-hidden": "true" }),
          text("span", "Quiz-Serie: " + (run === 1 ? "1 Tag" : run + " Tage")),
        ]),
      ]),
    ]);
  }

  function scoreCard() {
    const m = Q.mastery(state, bank.questions);
    return h("div", { class: "card academy-score" }, [
      text("span", "WISSENS-SCORE", "academy-eyebrow"),
      h("div", { class: "academy-score-value" }, [text("b", m.percent + " %")]),
      meter(m.percent, "Wissens-Score gesamt"),
      text(
        "p",
        m.seen
          ? m.right + " von " + m.total + " Fragen zuletzt richtig beantwortet, " + (m.total - m.seen) + " noch offen."
          : "Beantworte Fragen, um deinen Stand in " + bank.themes.length + " Themen zu sehen.",
      ),
      h("a", { class: "btn-ghost", href: "#/themen", text: "Alle Themen" }),
    ]);
  }

  /* ---------------------------------------------------------------- views */

  function viewHome() {
    const kids = [
      h("section", { class: "hero academy-hero" }, [
        text("p", "RESQLY ACADEMY", "academy-kicker"),
        text("h1", "Verstehen — Schritt für Schritt"),
        text(
          "p",
          "Jeden Tag ein Quiz zu einem Thema, dazu Themen-Quiz mit Erklärungen und interaktive Kurse für EKG und Röntgen.",
        ),
      ]),
      progressCard(),
    ];
    if (ready()) {
      // Themes the learner knows least come first; ties keep the file order.
      const weakest = bank.themes
        .map((theme, index) => ({ theme, index, m: Q.mastery(state, theme.questions) }))
        .sort((a, b) => a.m.percent - b.m.percent || a.index - b.index)
        .slice(0, 4);
      kids.push(
        h("div", { class: "academy-today" }, [dailyCard(), scoreCard()]),
        h("div", { class: "sec-head" }, [
          text("h2", "Themen-Quiz"),
          text("span", bank.questions.length + " Fragen in " + bank.themes.length + " Themen"),
        ]),
        h(
          "div",
          { class: "academy-themes" },
          weakest.map((w) => themeCard(w.theme, w.index)),
        ),
        h("p", { class: "academy-more" }, [
          h("a", { href: "#/themen", text: "Alle " + bank.themes.length + " Themen ansehen →" }),
        ]),
      );
    } else kids.push(bankNotice());
    kids.push(
      h("div", { class: "sec-head" }, [
        text("h2", "Deine Kurse"),
        text("span", "Zwei Lernpfade, ein gemeinsames Level"),
      ]),
      h("div", { class: "academy-courses" }, COURSES.map(courseCard)),
      h("div", { class: "sec-head" }, [text("h2", "So lernst du")]),
      h(
        "div",
        { class: "academy-steps" },
        STEPS.map(([icon, title, body]) =>
          h("div", { class: "card" }, [
            h("div", { class: "academy-step-icon", text: icon, "aria-hidden": "true" }),
            text("h3", title),
            text("p", body),
          ]),
        ),
      ),
      h("div", {
        class: "footer",
        html:
          "Die Resqly Academy ist ein <b>Lernwerkzeug</b> und ersetzt keine medizinische Ausbildung, " +
          "keine Leitlinie, kein beaufsichtigtes praktisches Training und keine ärztliche Beurteilung.",
      }),
    );
    root.replaceChildren(...kids);
  }

  function viewThemes() {
    const kids = [
      h("div", { class: "sec-head academy-page-head" }, [
        text("h1", "Themen-Quiz"),
        text("span", "Zehn Fragen pro Runde, jede mit Erklärung"),
      ]),
    ];
    if (!ready()) kids.push(bankNotice());
    else {
      const subjects = [...new Set(bank.themes.map((t) => t.subject))];
      for (const subject of subjects) {
        const list = bank.themes.filter((t) => t.subject === subject);
        const m = Q.mastery(state, list.flatMap((t) => t.questions));
        kids.push(
          h("div", { class: "sec-head" }, [
            text("h2", subject),
            text("span", m.total + " Fragen · Wissens-Score " + m.percent + " %"),
          ]),
          h(
            "div",
            { class: "academy-themes" },
            list.map((theme) => themeCard(theme, bank.themes.indexOf(theme))),
          ),
        );
      }
    }
    root.replaceChildren(...kids);
  }

  /* One question at a time: choose, check, read the explanation, continue.
     `session` = { theme, questions, seed, exit, finish(result) }. */
  function run(session) {
    const total = session.questions.length;
    const picks = {};
    let index = 0;
    let correct = 0;
    let buttons = [];
    const bar = h("i");
    const count = text("span", "", "academy-count");
    const stage = h("div", {});
    const action = h("button", { class: "btn wide", type: "button", text: "Prüfen" });
    const actionBar = h("div", { class: "actionbar" }, [h("div", { class: "ab-in" }, [action])]);
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const slot = "123abc".indexOf(event.key.toLowerCase()) % 3;
      if (event.key.length === 1 && slot >= 0 && buttons[slot]) buttons[slot].click();
      else if (event.key === "Enter" && !action.disabled && !event.target.closest("a")) {
        event.preventDefault();
        action.click();
      }
    };
    document.body.classList.add("academy-run");
    document.body.append(actionBar);
    document.addEventListener("keydown", onKey);
    leave = () => {
      actionBar.remove();
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("academy-run");
    };
    root.replaceChildren(
      h("div", { class: "lesson-top" }, [
        h("a", { class: "iconbtn", href: session.exit, text: "✕", "aria-label": "Quiz verlassen" }),
        h("div", { class: "pbar" }, [bar]),
        count,
      ]),
      stage,
    );

    function show() {
      const q = session.questions[index];
      const order = Q.optionOrder(q, session.seed);
      const last = index === total - 1;
      let picked = -1;
      let checked = false;
      const why = h("div", { class: "academy-why", role: "status" });
      buttons = order.map((original, slot) => {
        const button = h("button", { class: "opt", type: "button" }, [
          h("span", { class: "key", text: "ABC"[slot] }),
          text("span", q.options[original]),
        ]);
        button.addEventListener("click", () => {
          if (checked) return;
          picked = slot;
          buttons.forEach((b) => b.classList.toggle("sel", b === button));
          action.disabled = false;
          UI.Sound.tap();
        });
        return button;
      });
      bar.style.width = (index / total) * 100 + "%";
      count.textContent = index + 1 + "/" + total;
      action.textContent = "Prüfen";
      action.className = "btn wide";
      action.disabled = true;
      action.onclick = () => {
        if (checked) {
          index++;
          if (index < total) return show();
          leave();
          leave = null;
          return session.finish({ correct, total, picks });
        }
        checked = true;
        const ok = order[picked] === q.answer;
        if (ok) {
          correct++;
          profile()?.award("academy", XP_RIGHT);
        }
        picks[q.id] = order[picked];
        Q.record(state, q.id, ok);
        save();
        buttons.forEach((b, slot) => {
          b.classList.add("locked");
          b.classList.remove("sel");
          if (order[slot] === q.answer) b.classList.add("right");
          else if (slot === picked) b.classList.add("wrong");
        });
        why.classList.add(ok ? "good" : "bad");
        why.replaceChildren(text("h4", ok ? "Richtig!" : "Nicht ganz."), text("p", q.why));
        bar.style.width = ((index + 1) / total) * 100 + "%";
        action.textContent = last ? "Auswertung ansehen" : "Weiter";
        action.className = "btn wide " + (ok ? "ok" : "bad");
        UI.Sound[ok ? "right" : "wrong"]();
        why.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      stage.replaceChildren(
        h("div", { class: "q-wrap" }, [
          text("div", session.theme.name, "q-kicker"),
          text("h2", q.text, "q-title"),
          h("div", { class: "opts" }, buttons),
          why,
        ]),
      );
      scrollTo(0, 0);
    }
    show();
  }

  /* `result.picks` maps question id to the chosen option; questions without
     a pick (bank changed since) are left out of the review. */
  function viewResult(options) {
    const { theme, questions, result } = options;
    const share = result.total ? result.correct / result.total : 0;
    const all = Q.mastery(state, bank.questions);
    const stat = (label, value, color) => {
      const box = h("div", { class: "dstat" }, [
        h("div", { class: "in" }, [text("div", label, "t"), text("div", value, "v")]),
      ]);
      box.style.setProperty("--c", color);
      return box;
    };
    const review = questions
      .filter((q) => result.picks && result.picks[q.id] !== undefined)
      .map((q) => {
        const pick = result.picks[q.id];
        const ok = pick === q.answer;
        return h("li", { class: "academy-review-item " + (ok ? "good" : "bad") }, [
          h("span", { class: "academy-review-mark", text: ok ? "✓" : "✕", "aria-hidden": "true" }),
          h("div", {}, [
            text("h3", q.text),
            ok ? null : h("p", { class: "academy-review-pick" }, ["Deine Antwort: " + q.options[pick]]),
            h("p", { class: "academy-review-right" }, ["Richtig: " + q.options[q.answer]]),
            text("p", q.why, "academy-review-why"),
          ]),
        ]);
      });
    root.replaceChildren(
      h("div", { class: "done-wrap academy-done" }, [
        h("div", { class: "done-emoji", text: share === 1 ? "🏆" : share >= 0.6 ? "🎉" : "💪", "aria-hidden": "true" }),
        text("h1", result.correct + " von " + result.total + " richtig"),
        text("p", options.title + " · " + theme.name),
        h("div", { class: "done-stats" }, [
          result.xp != null
            ? stat("Erfahrung", "+" + result.xp + " XP", "#ff8a3d")
            : stat("Serie", (profile()?.summary().streak || 0) + " 🔥", "#ff8a3d"),
          stat("Thema", Q.mastery(state, theme.questions).percent + " %", "#7c5cff"),
          stat("Wissens-Score", all.percent + " %", "#35c759"),
        ]),
        h("div", { class: "academy-done-actions" }, options.actions),
      ]),
      review.length ? h("div", { class: "sec-head" }, [text("h2", "Auswertung")]) : null,
      review.length ? h("ul", { class: "academy-review" }, review) : null,
    );
    scrollTo(0, 0);
  }

  function viewDaily() {
    if (!ready()) return root.replaceChildren(bankNotice());
    const quiz = Q.daily(bank.questions, today());
    if (!quiz) return viewHome();
    const done = state.daily[quiz.key];
    const result = (stored) =>
      viewResult({
        title: "Quiz des Tages",
        theme: quiz.theme,
        questions: quiz.questions,
        result: stored,
        actions: [
          h("a", { class: "btn violet", href: "#/home", text: "Zur Übersicht" }),
          h("a", { class: "btn gray", href: "#/quiz/" + quiz.theme.id, text: "Thema weiter üben" }),
        ],
      });
    if (done) return result(done);
    run({
      theme: quiz.theme,
      questions: quiz.questions,
      seed: Q.dayNumber(quiz.key),
      exit: "#/home",
      finish: (outcome) => {
        const stored = Q.finishDaily(state, quiz.key, {
          theme: quiz.theme.id,
          correct: outcome.correct,
          total: outcome.total,
          picks: outcome.picks,
        });
        save();
        const bonus = profile()?.award("academy", XP_DAILY + (outcome.correct === outcome.total ? XP_DAILY_PERFECT : 0)) || 0;
        if (outcome.correct === outcome.total) UI.Sound.win();
        result({ ...stored, xp: outcome.correct * XP_RIGHT + bonus });
      },
    });
  }

  function viewTheme(id) {
    if (!ready()) return root.replaceChildren(bankNotice());
    const theme = bank.themes.find((t) => t.id === id);
    if (!theme) return viewThemes();
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const questions = Q.practice(theme.questions, state, PRACTICE_SIZE, seed);
    run({
      theme,
      questions,
      seed,
      exit: "#/themen",
      finish: (outcome) => {
        if (outcome.correct === outcome.total) UI.Sound.win();
        viewResult({
          title: "Themen-Quiz",
          theme,
          questions,
          result: { ...outcome, xp: outcome.correct * XP_RIGHT },
          actions: [
            h("button", { class: "btn violet", type: "button", text: "Weiter üben", onclick: () => viewTheme(id) }),
            h("a", { class: "btn gray", href: "#/themen", text: "Alle Themen" }),
          ],
        });
      },
    });
  }

  /* ----------------------------------------------------------------- shell */

  function route() {
    if (leave) leave();
    leave = null;
    const [name, arg] = location.hash.replace(/^#\/?/, "").split("/");
    const view = name === "quiz" ? "themen" : NAV.some(([r]) => r === name) ? name : "home";
    for (const link of document.querySelectorAll("#nav a"))
      link.classList.toggle("on", link.dataset.r === view);
    scrollTo(0, 0);
    if (name === "tagesquiz") viewDaily();
    else if (name === "themen") viewThemes();
    else if (name === "quiz" && arg) viewTheme(arg);
    else viewHome();
  }

  // The academy page ships without bottom navigation; the stats come from bootstrap.js.
  document.body.append(
    h("nav", { class: "nav", id: "nav", "aria-label": "Hauptnavigation" }, [
      h(
        "div",
        { class: "nav-in" },
        NAV.map(([r, icon, label]) =>
          h("a", { href: "#/" + r, "data-r": r }, [
            h("span", { class: "ni", text: icon, "aria-hidden": "true" }),
            label,
          ]),
        ),
      ),
    ]),
  );
  window.addEventListener("hashchange", route);
  route();
  fetch(resqlyAssetRoot + "assets/data/fragen.csv")
    .then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    })
    .then((csv) => {
      const loaded = Q.load(csv);
      if (loaded.errors.length) console.warn("fragen.csv:", loaded.errors.join("\n"));
      if (!loaded.questions.length) throw new Error("no questions");
      bank = { questions: loaded.questions, themes: Q.themes(loaded.questions) };
    })
    .catch(() => {
      bank = { failed: true };
    })
    .then(() => {
      // A quiz cannot be running yet: it needs the bank this just delivered.
      route();
    });
})();
