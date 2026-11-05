(function () {
  'use strict';
  const C = XRAY_CONTENT, K = XRAY, h = UI.h;
  const root = document.getElementById('app'), nav = document.getElementById('nav');
  const text = (tag, value, cls = '') => h(tag, { text: value, class: cls });
  const asset = (m) => resqlyAssetRoot + 'assets/media/roentgen/' + m.file;
  let state = K.restore(null), storageFailed = false, cleanup = null;
  try { state = K.restore(localStorage.getItem(K.STORE)); } catch (_) { storageFailed = true; }
  function save() {
    try { localStorage.setItem(K.STORE, JSON.stringify(state)); } catch (_) { storageFailed = true; }
    window.ResqlyAccount?.saveProgress('roentgen', state);
    // XP and learning days count towards the academy-wide rating in the top bar.
    window.ResqlyProfile?.report('roentgen', state.xp);
  }
  const button = (label, onclick, cls = 'btn') => h('button', { type: 'button', class: cls, text: label, onclick });
  const link = (label, href, cls = 'btn') => h('a', { class: cls, text: label, href });
  function heading(kicker, title, desc) {
    return h('div', { class: 'xr-heading' }, [text('p', kicker, 'q-kicker'), text('h1', title), desc ? text('p', desc, 'xr-muted') : null]);
  }
  function footnote() {
    return text('p', 'Lernmaterial · keine klinische Befundung · fachärztliche Prüfung ausstehend', 'xr-footnote');
  }
  function sourceLinks(ids) {
    return h('details', { class: 'xr-refs' }, [h('summary', { text: 'Quellen und Einordnung' }),
      ...ids.map((id) => { const s = C.sources.find((s) => s.id === id); return h('p', {}, [h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.title })]); }),
      text('p', 'Stand: 02.11.2026 · Fachärztliche Prüfung der Kursinhalte ausstehend.'),
    ]);
  }
  function imagePanel(id, onSelect = null) {
    const m = C.media.find((m) => m.id === id);
    const frame = h('figure', { class: 'xr-viewer' });
    const toolbar = h('div', { class: 'xr-toolbar' }, [text('span', m.title)]);
    const controls = h('div', { class: 'xr-tools' });
    const scroll = h('div', { class: 'xr-film-scroll', tabindex: '0', 'aria-label': 'Röntgenbild, bei Vergrößerung scrollbar' });
    const film = h('div', { class: 'xr-film' });
    const width = Math.min(620, 440 * m.width / m.height);
    film.style.width = width + 'px';
    const img = h('img', { src: asset(m), alt: m.title + (m.annotated ? ' · Original mit Markierungen' : ''), width: m.width, height: m.height, draggable: 'false' });
    film.append(img);
    const fail = text('p', 'Das Bild konnte nicht geladen werden. Bitte die Seite neu laden.', 'xr-image-error');
    fail.hidden = true;
    img.addEventListener('error', () => { fail.hidden = false; });
    let zoomed = false;
    const zoom = button('⊕ Vergrößern', () => {
      zoomed = !zoomed;
      film.style.width = width * (zoomed ? 2 : 1) + 'px';
      film.style.maxWidth = zoomed ? 'none' : '100%';
      zoom.textContent = zoomed ? '⊖ Gesamtbild' : '⊕ Vergrößern';
      zoom.setAttribute('aria-pressed', String(zoomed));
    }, 'btn-ghost');
    zoom.setAttribute('aria-pressed', 'false');
    const contrast = h('input', { type: 'range', min: '80', max: '180', value: '100', 'aria-label': 'Bildkontrast' });
    contrast.oninput = () => { img.style.filter = 'contrast(' + contrast.value + '%)'; };
    controls.append(zoom, h('label', { class: 'xr-contrast' }, [text('span', 'Kontrast'), contrast]));
    toolbar.append(controls);
    let picked = null, pin = null, locked = false;
    const status = text('p', 'Noch keine Stelle markiert.', 'xr-spot-status');
    status.setAttribute('role', 'status');
    function pick(point) {
      if (locked || !point) return;
      picked = point;
      if (!pin) { pin = h('span', { class: 'xr-pick', 'aria-hidden': 'true' }); film.append(pin); }
      pin.style.left = point.x + '%'; pin.style.top = point.y + '%';
      film.setAttribute('aria-pressed', 'true');
      status.textContent = 'Stelle markiert. Klicke erneut, um deine Markierung zu verschieben.';
      onSelect(point);
    }
    if (onSelect) {
      film.classList.add('xr-spot-surface');
      film.setAttribute('role', 'button');
      film.setAttribute('tabindex', '0');
      film.setAttribute('aria-label', 'Fundstelle im Röntgenbild markieren');
      film.setAttribute('aria-pressed', 'false');
      const instructions = text('span', 'Mit den Pfeiltasten die Markierung bewegen, mit Umschalt in kleineren Schritten. Mit Enter oder Leertaste eine Markierung in der Bildmitte setzen.', 'sr-only');
      instructions.id = 'xr-spot-keyboard-help';
      film.setAttribute('aria-describedby', instructions.id);
      film.append(instructions);
      film.addEventListener('click', (event) => {
        if (img.naturalWidth) pick(K.imagePoint(img.getBoundingClientRect(), event.clientX, event.clientY));
      });
      film.addEventListener('keydown', (event) => {
        const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (!directions[event.key] && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); event.stopPropagation();
        if (locked || !img.naturalWidth) return;
        const point = picked || { x: 50, y: 50 }, direction = directions[event.key] || [0, 0];
        const step = event.shiftKey ? 0.5 : 2;
        pick({ x: Math.max(0, Math.min(100, point.x + direction[0] * step)), y: Math.max(0, Math.min(100, point.y + direction[1] * step)) });
      });
    }
    scroll.append(film, fail);
    frame.append(toolbar, scroll);
    if (onSelect) frame.append(status);
    frame.append(h('figcaption', {}, [
      text('span', m.annotated ? 'Originalaufnahme mit bereits vorhandenen Markierungen. ' : 'Originalaufnahme. '),
      text('span', m.author + ' · '),
      h('a', { href: m.licenseURL, target: '_blank', rel: 'noopener noreferrer', text: m.license }),
      text('span', ' · '), h('a', { href: m.source, target: '_blank', rel: 'noopener noreferrer', text: 'Bildquelle' }),
    ]));
    function showResult(target, ok) {
      locked = true;
      film.setAttribute('aria-disabled', 'true');
      pin?.classList.add(ok ? 'right' : 'wrong');
      const solution = h('span', { class: 'xr-solution', 'aria-hidden': 'true' });
      solution.style.left = target.x + '%'; solution.style.top = target.y + '%';
      solution.style.width = 2 * target.rx + '%'; solution.style.height = 2 * target.ry + '%';
      film.append(solution);
      status.textContent = ok ? 'Treffer! Die grüne Umrandung zeigt die gesuchte Stelle.' : 'Deine Markierung: rot. Die grüne Umrandung zeigt die gesuchte Stelle.';
    }
    return { element: frame, showResult };
  }
  function patterns() {
    // Intentionally schematic, never used as a clinical recording.
    return h('figure', { class: 'xr-patterns' }, [h('div', { html: '<svg viewBox="0 0 600 180" role="img" aria-label="Schematischer Vergleich einer Querfraktur und einer Schrägfraktur"><g fill="#dce5f5" stroke="#7184a7" stroke-width="3"><path d="M100 15h60v65h-60zM100 93h60v65h-60z"/><path d="M300 15h60v50l-60 38zM300 117l60-38v79h-60z"/></g><g fill="#5c3fd4" font-family="system-ui" font-size="15" text-anchor="middle"><text x="130" y="178">Quer</text><text x="330" y="178">Schräg</text></g><path d="M440 35l20 20-20 20 20 20-20 20" fill="none" stroke="#7c5cff" stroke-width="4"/><text x="490" y="80" fill="#64769a" font-family="system-ui" font-size="13">Verlauf zur</text><text x="490" y="100" fill="#64769a" font-family="system-ui" font-size="13">Knochenachse</text></svg>' }), text('figcaption', 'Vereinfachtes Lehrschema · keine Röntgenaufnahme')]);
  }
  function path() {
    const next = C.lessons.find((l) => !state.done[l.id]) || C.lessons[0];
    const done = C.lessons.filter((l) => state.done[l.id]).length;
    const heroText = h('div', {}, [
      text('p', '12 LEKTIONEN · ECHTE RÖNTGENBILDER', 'xr-eyebrow'),
      text('h1', 'Röntgen verstehen — Schritt für Schritt'),
      text('p', 'Trainiere deinen Blick. Lies Bilder mit System, finde Frakturen und lerne, einen Befund klar zu beschreiben.'),
      h('div', { class: 'hero-actions' }, [link(done ? 'Weiterlernen →' : 'Lernen starten →', '#/lektion/' + next.id, 'btn violet')]),
    ]);
    const preview = h('div', { class: 'xr-preview', 'aria-hidden': 'true' }, [
      text('span', 'DEIN NÄCHSTER GENAUER BLICK', 'xr-preview-label'),
      h('div', { class: 'xr-preview-films' }, ['normal-pa', 'clavicle'].map((id) => h('img', { src: asset(C.media.find((m) => m.id === id)), alt: '' }))),
      text('span', 'Ansehen  →  Erkennen  →  Verstehen', 'xr-preview-label'),
    ]);
    root.append(h('section', { class: 'hero xr-hero' }, [heroText, preview]));
    root.append(h('div', { class: 'xr-progress card' }, [text('span', '🦴 ' + done + ' von 12 Lektionen geschafft'), h('progress', { max: '12', value: done, 'aria-label': 'Abgeschlossene Lektionen' }), text('span', '⭐ ' + Math.round(done / C.lessons.length * 100) + ' %')]));
    for (const u of C.units) {
      const unit = h('section', { class: 'unit' });
      unit.style.setProperty('--u', u.color); unit.style.setProperty('--u-dk', u.dark); unit.style.setProperty('--u-lt', u.light);
      const lessons = C.lessons.filter((l) => l.unit === u.number);
      unit.append(h('div', { class: 'unit-head' }, [text('div', u.number, 'unit-badge'), h('div', {}, [text('h2', u.title), text('p', u.desc)]), text('span', lessons.filter((l) => state.done[l.id]).length + '/3', 'unit-prog')]));
      const nodes = h('div', { class: 'path' });
      lessons.forEach((l, i) => {
        const available = K.unlocked(C, state, l.id), completed = !!state.done[l.id];
        const node = button(completed ? '⭐' : available ? l.icon : '🔒', () => { location.hash = '#/lektion/' + l.id; }, 'node' + (completed ? ' done' : available ? ' current' : ' locked'));
        node.disabled = !available;
        node.setAttribute('aria-label', l.title + (available ? '' : ' (gesperrt)'));
        node.append(text('span', l.title, 'node-label'));
        if (completed) node.append(text('span', state.done[l.id].best + ' %', 'node-crowns'));
        nodes.append(h('div', { class: 'path-row', 'data-side': ['', 'fr', 'r'][i] }, [node]));
      });
      unit.append(nodes); root.append(unit);
    }
    root.append(footnote());
  }
  function trainer() {
    const questions = C.lessons.flatMap((l) => l.questions);
    const mistakes = questions.filter((q) => state.answers[q.id]?.last === false).length;
    root.append(heading('FRAKTUR-TRAINER', 'Ein Bild. Dein nächster Treffer.', 'Übe die Inhalte deiner freigeschalteten Lektionen. Neue Lektionen ergänzen deinen Trainingspool.'));
    root.append(h('div', { class: 'xr-training-grid' }, [
      h('section', { class: 'card xr-training-card' }, [text('span', '🎯', 'xr-card-icon'), text('h2', 'Gemischte Runde'), text('p', 'Bis zu 8 Bild- und Wissensaufgaben. Mit Erklärungen, 5 Herzen und XP.'), link('Training starten', '#/runde/mix', 'btn violet')]),
      h('section', { class: 'card xr-training-card' }, [text('span', '💪', 'xr-card-icon'), text('h2', 'Fehler festigen'), text('p', mistakes ? mistakes + ' Aufgaben warten auf einen neuen Versuch.' : 'Hier landen Aufgaben, die du zuletzt falsch beantwortet hast.'), mistakes ? link('Fehler üben', '#/runde/fehler') : text('span', 'Noch keine offenen Fehler', 'xr-empty-tag')]),
    ]));
    root.append(footnote());
  }
  function atlas(id) {
    if (id) {
      const m = C.media.find((m) => m.id === id);
      if (!m) return notFound();
      root.append(link('← Zum Bildatlas', '#/atlas', 'btn-ghost'), heading('BILDATLAS', m.title), imagePanel(id).element,
        h('section', { class: 'card xr-atlas-finding' }, [text('h2', 'So liest du dieses Bild'), text('p', m.focus), text('h3', 'Bildbefund'), text('p', m.finding), text('h3', 'Was offenbleibt'), text('p', m.limits)]), footnote());
      return;
    }
    root.append(heading('BILDATLAS', 'Genau hinsehen. Besser verstehen.', 'Fünf Aufnahmen aus vier Untersuchungen: normale Referenzen und Frakturbeispiele mit Bildbefund, Suchhilfe und Quellen.'));
    const grid = h('div', { class: 'xr-atlas-grid' });
    const filters = h('div', { class: 'xr-filters', role: 'group', 'aria-label': 'Bildatlas filtern' });
    function update(filter) {
      grid.replaceChildren(...C.media.filter((m) => filter === 'all' || (filter === 'normal') === !!m.normal).map((m) => h('a', { href: '#/atlas/' + m.id, class: 'card xr-atlas-card' }, [
        h('div', { class: 'xr-thumbnail' }, [h('img', { src: asset(m), alt: m.title, loading: 'lazy' })]),
        text('span', m.normal ? 'NORMALBILD' : 'FRAKTUR', 'q-kicker'), text('h2', m.title), text('p', m.annotated ? 'Original mit Markierungen' : 'Originalaufnahme'), text('span', 'Bild erkunden →', 'xr-atlas-cta'),
      ])));
      Array.from(filters.children).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    }
    for (const [filter, label] of [['all', 'Alle Bilder'], ['normal', 'Normalbilder'], ['fracture', 'Frakturen']]) {
      const b = button(label, () => update(filter), 'chip'); b.dataset.filter = filter; filters.append(b);
    }
    root.append(filters, grid, footnote()); update('all');
  }
  function knowledge() {
    root.append(heading('DEINE CHECKLISTE', 'Ein fester Ablauf. Ein klarer Befund.', 'Nimm diese vier Schritte in jede Bildbetrachtung mit.'));
    const cards = [
      ['1', 'Zuordnen', 'Identität, Datum, Körperregion, Seitenmarker, Projektion und Bildqualität prüfen. Ist alles Wichtige abgebildet?'],
      ['2', 'Achsstellung', 'Verlauf und Stellung der Knochen ansehen. Achte auf Versatz, Abkippung und eine mögliche Verkürzung.'],
      ['3', 'Knochen', 'Jede Kortikalis fortlaufend verfolgen. Frakturlinien, Stufen und Fragmente suchen. Den zweiten Knochen nicht vergessen.'],
      ['4', 'Gelenke und Weichteile', 'Gelenkflächen, Gelenkstellung und sichtbare Weichteile durchmustern. Danach die Aussagegrenzen benennen.'],
    ];
    root.append(h('div', { class: 'xr-checklist' }, cards.map(([n, title, desc]) => h('section', { class: 'card' }, [text('span', n, 'xr-check-number'), h('div', {}, [text('h2', title), text('p', desc)])]))));
    root.append(h('div', { class: 'keybox' }, [text('h2', 'Dein Befund in einem Satz'), text('p', 'Knochen + Lokalisation + Bruchverlauf + Fragmentstellung + Gelenkbeteiligung. Ergänze Begleitbefunde und Einschränkungen.')]));
    root.append(sourceLinks(C.sources.map((s) => s.id)), footnote());
  }
  function notFound() {
    root.append(heading('NICHT GEFUNDEN', 'Dieser Lerninhalt ist nicht verfügbar.'), link('Zum Lernpfad', '#/pfad'));
  }
  function session(id, mode) {
    const practice = !!mode, lesson = C.lessons.find((l) => l.id === id);
    if (!practice && (!lesson || !K.unlocked(C, state, id))) {
      root.append(heading('SCHRITT FÜR SCHRITT', lesson ? 'Diese Lektion ist noch gesperrt.' : 'Lektion nicht gefunden.', 'Schließe zuerst die vorherige Lektion ab.'), link('Zum Lernpfad', '#/pfad')); return;
    }
    const original = practice ? K.practiceQuestions(C, state, mode === 'fehler') : lesson.questions;
    if (!original.length) {
      root.append(heading('ALLES FESTIGT SICH', 'Keine offenen Fehler.', 'Deine zuletzt falsch beantworteten Aufgaben erscheinen hier.'), link('Zum Trainer', '#/trainer')); return;
    }
    nav.hidden = true;
    document.body.classList.add('xr-in-session');
    let index = 0, hearts = 5, right = 0, selected = null, checked = false, teaching = !practice;
    let choices = [], imageExercise = null;
    const queue = original.map((q) => ({ q, repeat: false }));
    const progress = h('i'), heartsEl = h('div', { class: 'hearts', 'aria-live': 'polite' });
    const top = h('div', { class: 'lesson-top' }, [link('✕', practice ? '#/trainer' : '#/pfad', 'iconbtn'), h('div', { class: 'pbar', role: 'progressbar', 'aria-label': 'Lektionsfortschritt', 'aria-valuemin': '0', 'aria-valuemax': '100' }, [progress]), heartsEl]);
    top.firstChild.setAttribute('aria-label', 'Lektion verlassen');
    const stage = h('div', { class: 'q-wrap xr-stage' });
    const action = button('Weiter', advance);
    const bar = h('div', { class: 'actionbar' }, [h('div', { class: 'ab-in' }, [text('span', 'Kleine Schritte. Ein klarer Blick.', 'xr-bar-note'), action])]);
    document.body.append(bar); root.append(top, stage);
    const feedback = h('section', { class: 'xr-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    cleanup = () => { bar.remove(); document.body.classList.remove('xr-in-session'); document.removeEventListener('keydown', keyboard); };
    function updateTop() {
      const percent = teaching ? 0 : Math.round(index / queue.length * 100);
      progress.style.width = percent + '%'; progress.parentElement.setAttribute('aria-valuenow', percent);
      heartsEl.replaceChildren(...Array.from({ length: 5 }, (_, i) => text('b', '♥', i < hearts ? '' : 'gone')));
      heartsEl.setAttribute('aria-label', hearts + ' von 5 Herzen');
    }
    function render() {
      selected = null; checked = false; choices = []; imageExercise = null;
      feedback.className = 'xr-feedback'; feedback.replaceChildren();
      stage.replaceChildren();
      updateTop();
      if (teaching) {
        stage.append(text('p', 'ZUERST VERSTEHEN · DANACH ÜBEN', 'q-kicker'), text('h1', lesson.title, 'q-title'), text('p', lesson.intro, 'xr-intro'));
        stage.append(h('section', { class: 'teach xr-teaching', 'aria-label': 'Erklärung zur Lektion' }, lesson.teaching.map((section) =>
          h('div', { class: 'card xr-teach-card' }, [text('h2', section.title), text('p', section.body)]),
        )));
        if (lesson.image || lesson.diagram) stage.append(text('h2', 'Schau es dir am Beispiel an', 'xr-example-title'));
        if (lesson.image) stage.append(imagePanel(lesson.image).element);
        if (lesson.diagram) stage.append(patterns());
        stage.append(h('div', { class: 'keybox' }, [text('h2', 'Merk dir'), text('p', lesson.tip)]), sourceLinks(lesson.refs));
        action.textContent = 'Los geht’s'; action.disabled = false;
      } else {
        const item = queue[index], q = item.q;
        stage.dataset.question = q.id;
        stage.append(text('p', (item.repeat ? 'NOCH EINMAL FESTIGEN' : practice ? 'TRAININGSRUNDE' : lesson.title) + ' · ' + (index + 1) + '/' + queue.length, 'q-kicker'), text('h1', q.title, 'q-title'));
        if (q.type === 'spot') stage.append(text('p', 'Klicke oder tippe direkt auf die gesuchte Stelle. Vergrößere die Aufnahme bei Bedarf.', 'q-sub'));
        if (q.image) {
          const viewer = imagePanel(q.image, q.type === 'spot' ? choose : null);
          stage.append(viewer.element);
          if (q.type === 'spot') imageExercise = viewer;
        }
        const options = h('div', { class: 'opts', role: 'group', 'aria-label': q.type === 'order' ? 'Schritte in Reihenfolge wählen' : 'Antwort auswählen' });
        if (q.type === 'order') {
          selected = [];
          const result = h('ol', { class: 'xr-order-result', 'aria-label': 'Deine Reihenfolge', 'aria-live': 'polite' });
          stage.append(text('p', 'Tippe die Schritte nacheinander an.', 'q-sub'), result);
          choices = UI.shuffle(q.options.map((label, i) => ({ label, i })), 31 + index).map(({ label, i }) => {
            const b = button(label, () => {
              if (checked || selected.includes(i)) return;
              selected.push(i); b.disabled = true; b.classList.add('sel');
              result.append(text('li', label)); action.disabled = selected.length !== q.options.length;
            }, 'opt');
            b.dataset.answer = i; options.append(b); return b;
          });
          stage.append(options, button('Reihenfolge zurücksetzen', () => { if (!checked) render(); }, 'btn-ghost'));
        } else if (q.type === 'mc') {
          const entries = UI.shuffle(q.options.map((label, i) => ({ label, i })), Math.floor(Math.random() * 100000) + 1);
          choices = entries.map(({ label, i }, position) => {
            const b = h('button', { type: 'button', class: 'opt', 'aria-pressed': 'false', 'data-answer': i, onclick: () => choose(i) }, [text('span', String(position + 1), 'key'), text('span', label)]);
            options.append(b); return b;
          });
          stage.append(options);
        }
        stage.append(feedback);
        action.textContent = 'Prüfen'; action.disabled = true;
      }
      window.scrollTo(0, 0);
    }
    function choose(value) {
      if (checked) return;
      selected = value;
      choices.forEach((b) => { const active = Number(b.dataset.answer) === value; b.classList.toggle('sel', active); b.setAttribute('aria-pressed', String(active)); });
      action.disabled = false;
    }
    function check() {
      checked = true;
      const { q, repeat } = queue[index], ok = K.evaluate(q, selected);
      if (ok && !repeat) right++;
      if (!ok) { hearts--; queue.push({ q, repeat: true }); }
      K.record(state, q, ok); save(); updateTop();
      choices.forEach((b) => {
        b.disabled = true; b.classList.add('locked');
        if (q.type !== 'order') {
          b.classList.toggle('right', Number(b.dataset.answer) === q.correct);
          b.classList.toggle('wrong', !ok && Number(b.dataset.answer) === selected);
        }
      });
      if (q.type === 'spot') imageExercise.showResult(q.target, ok);
      feedback.className = 'xr-feedback ' + (ok ? 'good' : 'bad');
      feedback.append(text('h2', ok ? '✓ Gut gesehen!' : 'Noch nicht ganz.'), text('p', q.explanation));
      if (q.type === 'order' && !ok) feedback.append(text('p', 'So geht’s: ' + q.correct.map((i) => q.options[i]).join(' → ')));
      if (!ok && hearts > 0) feedback.append(text('p', 'Diese Aufgabe kommt zum Festigen noch einmal.'));
      action.textContent = hearts <= 0 ? 'Zur Auswertung' : 'Weiter';
      UI.Sound[ok ? 'right' : 'wrong']();
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function complete(failed) {
      cleanup(); cleanup = null; nav.hidden = false; root.replaceChildren();
      if (!failed) { var gain = K.finish(state, id, right, original.length, new Date(), practice); save(); UI.Sound.win(); }
      const done = h('section', { class: 'done-wrap xr-done' }, [text('div', failed ? '💪' : right === original.length ? '🏆' : '🎉', 'done-emoji'), text('h1', failed ? 'Ein neuer Versuch wartet.' : 'Runde geschafft!'), text('p', failed ? 'Deine Fehler sind gespeichert. Starte mit 5 neuen Herzen und probiere es noch einmal.' : 'Du hast alle Aufgaben gelöst und deine Fehler noch einmal gefestigt.'),
        h('div', { class: 'done-stats' }, [metric('Erfahrung', failed ? '+0 XP' : '+' + gain + ' XP'), metric('Auf Anhieb', right + '/' + original.length), metric('Herzen', hearts + '/5')]),
      ]);
      const actions = h('div', { class: 'xr-done-actions' });
      if (failed) actions.append(button('Noch einmal', () => { root.replaceChildren(); session(id, mode); }, 'btn violet'));
      else if (!practice) {
        const next = C.lessons[C.lessons.findIndex((l) => l.id === id) + 1];
        if (next) actions.append(link('Nächste Lektion', '#/lektion/' + next.id, 'btn violet'));
      }
      actions.append(link(practice ? 'Zum Trainer' : 'Zum Lernpfad', practice ? '#/trainer' : '#/pfad', 'btn gray'));
      done.append(actions); root.append(done);
      window.scrollTo(0, 0);
    }
    function advance() {
      if (action.disabled) return;
      if (teaching) { teaching = false; render(); return; }
      if (!checked) { check(); return; }
      if (hearts <= 0) { complete(true); return; }
      index++;
      if (index >= queue.length) complete(false); else render();
    }
    function keyboard(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'Enter') { event.preventDefault(); advance(); }
      if (!teaching && !checked && /^[1-9]$/.test(event.key)) { event.preventDefault(); choices[Number(event.key) - 1]?.click(); }
    }
    document.addEventListener('keydown', keyboard); render();
  }
  function metric(label, value) { return h('div', { class: 'dstat' }, [h('div', { class: 'in' }, [text('span', label, 't'), text('div', value, 'v')])]); }
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    root.replaceChildren(); nav.hidden = false;
    const [view = 'pfad', id] = location.hash.replace(/^#\/?/, '').split('/');
    nav.replaceChildren(h('div', { class: 'nav-in' }, [['pfad', '≋', 'Lernpfad'], ['trainer', '🎯', 'Trainer'], ['atlas', '▧', 'Bildatlas'], ['wissen', '◇', 'Wissen']].map(([route, icon, label]) => h('a', { href: '#/' + route, class: view === route || route === 'trainer' && view === 'runde' ? 'on' : '', 'aria-current': view === route ? 'page' : null }, [text('span', icon, 'ni'), text('span', label)]))));
    if (storageFailed) root.append(h('p', { id: 'xr-storage', role: 'status', class: 'pill-note', text: 'Dein Browser speichert hier keinen Lernstand. Du kannst für diesen Besuch weiterlernen.' }));
    switch (view) {
      case 'pfad': case '': path(); break;
      case 'trainer': trainer(); break;
      case 'atlas': atlas(id); break;
      case 'wissen': knowledge(); break;
      case 'lektion': session(id); break;
      case 'runde': if (['mix', 'fehler'].includes(id)) session(null, id); else notFound(); break;
      default: notFound();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route); route();
})();
