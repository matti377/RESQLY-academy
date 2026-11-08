(async function () {
  'use strict';
  const C = ANATOMY_CONTENT, K = Anatomy, h = UI.h;
  const root = document.getElementById('app'), nav = document.getElementById('nav');
  try { await AnatomyModel.ready; }
  catch (_) {
    root.replaceChildren(h('h1', { text: 'Das anatomische Modell konnte nicht geladen werden.' }), h('p', { text: 'Bitte die lokale Verbindung prüfen und die Seite neu laden.' }), h('button', { class: 'btn', text: 'Erneut laden', onclick: () => location.reload() }));
    return;
  }
  const byId = new Map(C.bones.map(b => [b.id, b]));
  const text = (tag, value, cls = '') => h(tag, { text: value, class: cls });
  const button = (label, action, cls = 'btn') => h('button', { type: 'button', text: label, class: cls, onclick: action });
  const link = (label, href, cls = '') => h('a', { text: label, href, class: cls });
  let state = K.empty(), storageFailed = false;
  try { state = K.restore(localStorage.getItem(K.STORE), C); } catch (_) { storageFailed = true; }
  let mode = 'recall', region = 'all', session = null, model = null, clock = 0, cleanup = null, atlas = false;
  let inspected = null, notice = '', resultSaved = false;
  const MODES = [
    { id: 'recall', icon: '◎', title: 'Freies Abfragen', sub: 'Anklicken. Benennen. Einschätzen.', desc: 'Überlege dir den Namen, bevor du einen Knochen anklickst. Danach schätzt du dich ein: Gewusste Knochen verschwinden, die anderen bleiben zum Wiederholen.' },
    { id: 'learn', icon: '⌖', title: 'Knochen finden', sub: 'Den Namen lesen, den Knochen finden.', desc: 'Du bekommst einen Namen und suchst den passenden Knochen am Skelett. Nach einem Fehler siehst du die Lösung und bekommst den Knochen später noch einmal.' },
    { id: 'timed', icon: '◷', title: 'Auf Zeit', sub: 'Dein Wissen gegen die Uhr.', desc: 'Wie beim freien Abfragen, mit Stoppuhr. Räume das Skelett leer. Für die Bestenliste zählen zuerst die beim ersten Versuch gewussten Knochen, danach die Zeit.' },
  ];
  function save() {
    try { localStorage.setItem(K.STORE, JSON.stringify(state)); }
    catch (_) { storageFailed = true; }
  }
  function heading(kicker, title, description) {
    return h('div', { class: 'an-heading' }, [text('p', kicker, 'an-eyebrow'), text('h1', title), text('p', description, 'an-intro')]);
  }
  function sources() {
    return h('details', { class: 'an-sources' }, [
      h('summary', { text: 'Zum Modell & den Quellen' }),
      text('p', 'Importiertes anatomisches Skelett: Écorché / BodyParts3D. ' + C.model.boneMeshCount + ' benannte Knochen-Meshes, zusammengefasst zu ' + C.bones.length + ' Lernzielen. Rechts und links beziehen sich auf die dargestellte Person. Steißbein, Zungenbein, Gehörknöchelchen und Dreiecksbeine sind im Quelldatensatz nicht enthalten.'),
      text('p', 'Deutsch und anatomische Fachbegriffe · Quellen: OpenStax, Anatomy & Physiology 2e, Kapitel 7–8. Fachärztliche Prüfung ausstehend.'),
      h('div', { class: 'an-source-links' }, C.sources.map(([title, url]) => h('a', { text: title, href: url, target: '_blank', rel: 'noopener noreferrer' }))),
      h('p', {}, [text('span', 'Modell: '), h('a', { text: 'Écorché', href: 'https://github.com/Charleeh/ecorche', target: '_blank', rel: 'noopener noreferrer' }), text('span', ', CC BY-SA 4.0. Basierend auf BodyParts3D, © The Database Center for Life Science, CC BY 4.0, und Z-Anatomy von Gauthier Kervyn, CC BY-SA 4.0. Lokaler Skelettauszug; Original-Meshdaten unverändert übernommen.')]),
      h('div', { class: 'an-source-links' }, [link('Modell herunterladen (.glb)', resqlyAssetRoot + 'assets/media/anatomy/skeleton.glb'), link('Modell-Lizenz', resqlyAssetRoot + 'assets/media/anatomy/CC-BY-SA-4.0.txt')]),
    ]);
  }
  function stopClock() { clearInterval(clock); clock = 0; }
  function dispose() { stopClock(); cleanup?.(); cleanup = null; model?.destroy(); model = null; }
  function shell(route) {
    nav.replaceChildren(...[['training', '◎', 'Training'], ['atlas', '◇', 'Knochenatlas'], ['bestenliste', '♜', 'Bestenliste']].map(([id, icon, label]) => {
      const a = link('', '#/' + id, route === id ? 'on' : '');
      const symbol = text('span', icon, 'ni'); symbol.setAttribute('aria-hidden', 'true');
      a.append(symbol, text('span', label));
      if (route === id) a.setAttribute('aria-current', 'page');
      return a;
    }));
  }
  function showTraining(isAtlas = false) {
    atlas = isAtlas; session = null; inspected = null; notice = ''; resultSaved = false;
    root.append(heading(isAtlas ? 'ANATOMIE / KNOCHENATLAS' : 'ANATOMIE / OSTEOLOGIE', isAtlas ? 'Ein Skelett. Viele Entdeckungen.' : 'Knochen für Knochen.', isAtlas ? 'Drehen, zoomen und erkunden. Wähle einen Knochen und lerne seinen Namen und seine Lage kennen.' : 'Lerne den Bauplan des Körpers kennen. Interaktiv in 3D, in deinem Tempo oder gegen die Uhr.'));
    const modeCards = h('div', { class: 'an-modes', role: 'group', 'aria-label': 'Trainingsmodus' });
    if (!isAtlas) {
      for (const [i, m] of MODES.entries()) {
        const b = h('button', { type: 'button', class: 'an-mode', 'aria-pressed': String(mode === m.id), 'data-mode': m.id, onclick: () => { if (!session) { mode = m.id; refresh(); } } }, [
          text('span', m.icon, 'an-mode-icon'), h('span', { class: 'an-mode-copy' }, [text('strong', m.title), text('span', m.sub)]), text('span', '0' + (i + 1), 'an-mode-number'),
        ]); modeCards.append(b);
      }
      root.append(modeCards);
    }
    const workspace = h('div', { class: 'an-workspace' });
    const viewerCard = h('section', { class: 'an-viewer-card', 'aria-label': 'Interaktives Skelett' });
    const regionLabel = text('span', '', 'an-viewer-title');
    const viewerTag = text('span', 'OSTEOLOGIE', 'an-viewer-tag');
    const viewerTop = h('div', { class: 'an-viewer-top' }, [h('div', {}, [text('span', 'DER MENSCHLICHE KÖRPER', 'an-viewer-kicker'), regionLabel]), viewerTag]);
    const surface = h('div', { class: 'an-model' });
    const orientation = text('span', 'R', 'an-orientation'); orientation.title = 'Rechte Körperhälfte bei Ansicht von vorne';
    const viewerButtons = h('div', { class: 'an-view-controls', role: 'group', 'aria-label': 'Modellansicht' });
    for (const [id, label] of [['front', 'Vorne'], ['back', 'Hinten'], ['side', 'Seite']]) {
      const b = button(label, () => {
        model.view(id);
        for (const child of viewerButtons.children) child.setAttribute('aria-pressed', String(child === b));
        orientation.hidden = id !== 'front';
      }, 'an-view-button'); b.setAttribute('aria-pressed', 'false'); viewerButtons.append(b);
    }
    const zoomTools = h('div', { class: 'an-zoom-controls' }, [
      button('+', () => model.zoom(.8), 'an-tool'), button('−', () => model.zoom(1.25), 'an-tool'), button('↺', () => {
        model.reset(); for (const b of viewerButtons.children) b.setAttribute('aria-pressed', 'false'); orientation.hidden = true;
      }, 'an-tool'),
    ]);
    ['Vergrößern', 'Verkleinern', 'Ansicht zurücksetzen'].forEach((label, i) => { zoomTools.children[i].setAttribute('aria-label', label); zoomTools.children[i].title = label; });
    surface.append(orientation, zoomTools);
    const modelHint = text('p', 'Ziehen zum Drehen · Scrollen oder zwei Finger zum Zoomen · Knochen anklicken', 'an-model-hint');
    const progressLabel = text('span', '', 'an-progress-label');
    const progress = h('progress', { value: '0', max: '1', 'aria-label': 'In dieser Runde gewusste Knochen' });
    const legend = h('div', { class: 'an-legend' }, [text('span', '●', 'an-dot'), text('span', 'Zum Auswählen'), text('span', '●', 'an-dot selected'), text('span', 'Ausgewählt')]);
    const progressBox = h('div', { class: 'an-progress-box' }, [progressLabel, progress]);
    viewerCard.append(viewerTop, surface, h('div', { class: 'an-viewer-bottom' }, [viewerButtons, modelHint]), h('div', { class: 'an-viewer-footer' }, [legend, progressBox]));
    const sidebar = h('aside', { class: 'an-sidebar', 'aria-label': isAtlas ? 'Knochen entdecken' : 'Training einstellen' });
    const regionSelect = h('select', { id: 'an-region', class: 'an-select', 'aria-label': 'Körperregion' }, C.regions.map(r => h('option', { value: r.id, text: r.name })));
    regionSelect.value = region;
    const countLabel = text('p', '', 'an-region-count');
    const regionBox = h('div', { class: 'an-region-box' }, [text('p', 'DEIN FOKUS', 'an-eyebrow'), h('label', { for: 'an-region', text: 'Welche Region möchtest du lernen?' }), regionSelect, countLabel]);
    const panel = h('section', { class: 'an-task', 'aria-label': 'Aufgabe', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const timer = text('span', '00:00.0', 'an-timer'); timer.setAttribute('aria-label', 'Vergangene Zeit');
    const timerBox = h('div', { class: 'an-timer-box' }, [text('span', 'DEINE ZEIT', 'an-eyebrow'), timer]); timerBox.hidden = true;
    const controls = h('div', { class: 'an-session-controls' });
    const storageNotice = text('p', '', 'an-storage-note');
    const tip = h('div', { class: 'an-study-tip' }, [text('span', '✦', 'an-tip-icon'), h('div', {}, [text('strong', 'Ein kleiner Perspektivwechsel'), text('p', 'Drehe das Skelett. Schulterblätter und Wirbel erkennst du von hinten oft besser.')])]);
    sidebar.append(regionBox, timerBox, panel, controls, storageNotice, tip);
    workspace.append(viewerCard, sidebar); root.append(workspace);
    const keyboard = h('details', { class: 'an-keyboard' }, [h('summary', { text: 'Knochen mit der Tastatur auswählen' }), text('p', 'Tab zum gewünschten Lernziel, Enter zum Auswählen. Beim Fokussieren leuchtet es am Modell auf. Die Nummern benennen keine Lösungen.'), h('div', { class: 'an-bone-list' })]);
    const list = keyboard.querySelector('.an-bone-list');
    root.append(keyboard, sources());
    model = AnatomyModel.create(surface, C, pick);
    model.focusRegion(region); orientation.hidden = true;
    regionSelect.addEventListener('change', () => { if (session) return; region = regionSelect.value; inspected = null; model.focusRegion(region); refresh(); });
    function showModel() { surface.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    function showTask() { if (matchMedia('(max-width: 700px)').matches) panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    function updateClock() {
      if (!session || mode !== 'timed') return;
      const value = K.formatTime((session.finished ? session.ended : performance.now()) - session.started);
      timer.textContent = value; viewerTag.textContent = value;
    }
    function selectedBones() { return K.targets(C, region); }
    function boneCard(id) {
      const b = byId.get(id);
      return h('div', { class: 'an-bone-card', 'data-bone': id }, [text('p', C.regions.find(r => r.id === b.region).short, 'an-task-kicker'), text('h2', b.name), text('p', b.latin, 'an-latin'), text('p', b.note, 'an-bone-note')]);
    }
    function start() {
      inspected = null; notice = ''; resultSaved = false;
      session = K.create(C, mode, region, performance.now());
      if (mode === 'timed') clock = setInterval(updateClock, 100);
      refresh();
      if (mode !== 'learn' && matchMedia('(max-width: 700px)').matches) showModel();
      else panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function pick(id) {
      if (!session) { inspected = id; refresh(); showTask(); return; }
      if (session.finished || !session.remaining.includes(id)) return;
      if (mode === 'learn') {
        const feedback = K.answer(session, id); if (!feedback) return;
        state.known[feedback.target] = feedback.ok; save(); refresh(); showTask();
      } else if (K.select(session, id)) { refresh(); showTask(); }
    }
    function assess(knew) {
      const id = K.recall(session, knew, performance.now()); if (!id) return;
      state.known[id] = knew; save(); notice = knew ? 'Gewusst! Der Knochen ist ausgeblendet.' : 'Bleibt sichtbar. Du kannst ihn später noch einmal anklicken.';
      refresh();
      if (!session.finished && matchMedia('(max-width: 700px)').matches) showModel();
    }
    function recordResult() {
      if (resultSaved) return;
      resultSaved = true; stopClock();
      const result = K.result(session);
      state.results.push(result); state.results = state.results.slice(-200); save();
      updateClock();
    }
    function refresh() {
      const bones = selectedBones(), running = session && !session.finished;
      regionSelect.disabled = !!session;
      for (const b of modeCards.children) { b.disabled = !!session; b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); }
      regionLabel.textContent = C.regions.find(r => r.id === region).name;
      const known = bones.filter(b => state.known[b.id]).length;
      countLabel.textContent = bones.length + ' Lernziele · ' + known + ' zuletzt gewusst';
      timerBox.hidden = mode !== 'timed' || !session;
      if (mode !== 'timed' || !session) viewerTag.textContent = 'OSTEOLOGIE';
      controls.replaceChildren(); panel.replaceChildren();
      panel.className = 'an-task' + (session?.feedback ? session.feedback.ok ? ' an-good' : ' an-wrong' : '');
      if (!session) {
        if (inspected) {
          panel.append(text('p', 'ENTDECKT', 'an-eyebrow'), boneCard(inspected));
          if (!isAtlas) panel.append(text('p', 'Starte eine Runde, um dein Wissen zu testen.', 'an-task-description'));
        } else {
          const m = MODES.find(m => m.id === mode);
          panel.append(text('span', isAtlas ? '◇' : m.icon, 'an-task-icon'), text('h2', isAtlas ? 'Neugier ist der Anfang.' : m.title), text('p', isAtlas ? 'Klicke auf einen Knochen. Hier erscheinen sein deutscher Name, der Fachbegriff und ein kurzer Merksatz.' : m.desc, 'an-task-description'));
        }
        if (!isAtlas) controls.append(button(mode === 'timed' ? 'Zeit starten →' : 'Runde starten →', start, 'btn wide an-start'));
        else controls.append(link('Jetzt Wissen testen →', '#/training', 'btn wide'));
        progressBox.hidden = true;
      } else if (session.finished) {
        recordResult();
        const r = K.result(session), complete = r.complete;
        panel.append(text('span', complete ? '✦' : '◷', 'an-task-icon'), text('p', complete ? 'RUNDE GESCHAFFT' : 'ZWISCHENSTAND', 'an-eyebrow'), text('h2', complete ? 'Alles aufgedeckt. Alles gelernt.' : 'Jeder Knochen zählt.'),
          h('div', { class: 'an-result-score' }, [text('strong', r.accuracy + '%'), text('span', 'beim ersten Versuch gewusst')]),
          text('p', r.correct + ' von ' + r.total + ' direkt gewusst · ' + r.mastered + ' gemeistert', 'an-task-description'));
        if (mode === 'timed') {
          panel.append(text('p', 'Deine Zeit: ' + K.formatTime(r.elapsed), 'an-result-time'));
          if (complete) { const rank = K.rank(state.results, region).indexOf(state.results[state.results.length - 1]) + 1; panel.append(text('p', 'Platz ' + rank + ' in deiner persönlichen Bestenliste.', 'an-result-rank')); }
          else panel.append(text('p', 'Nur vollständig geleerte Skelette kommen in die Bestenliste.', 'an-task-description'));
        }
        controls.append(button('Neue Runde →', () => { session = null; inspected = null; notice = ''; model.focusRegion(region); refresh(); }, 'btn wide'));
        if (mode === 'timed') controls.append(link('Zur Bestenliste', '#/bestenliste', 'an-text-link'));
        if (session.remaining.length) {
          const review = h('details', { class: 'an-review' }, [h('summary', { text: session.remaining.length + ' offene Lernziele' })]);
          for (const id of session.remaining) review.append(text('p', byId.get(id).name + ' — ' + byId.get(id).latin));
          panel.append(review);
        }
      } else if (mode === 'learn') {
        const target = byId.get(session.queue[0]);
        panel.append(text('p', session.feedback ? session.feedback.ok ? 'RICHTIG GEFUNDEN' : 'NOCH NICHT GANZ' : 'FINDE DIESEN KNOCHEN', 'an-eyebrow'), text('h2', target.name), text('p', target.latin, 'an-latin'));
        if (session.feedback) {
          if (!session.feedback.ok) panel.append(text('p', 'Du hast ' + byId.get(session.feedback.chosen).name + ' gewählt. Die gesuchte Stelle leuchtet grün. Dieser Knochen kommt später noch einmal.', 'an-task-description'));
          else panel.append(text('p', target.note, 'an-task-description'));
          controls.append(button('Weiter →', () => { K.next(session, performance.now()); refresh(); }, 'btn wide'));
        } else {
          panel.append(text('p', 'Wähle den passenden Knochen am Modell. Rechts und links gelten aus Sicht des Skeletts.', 'an-task-description'));
          controls.append(button('Am Skelett suchen ↑', showModel, 'an-secondary an-mobile-model-link'));
        }
      } else if (session.selected) {
        panel.append(text('p', 'HATTEST DU DEN NAMEN GEWUSST?', 'an-eyebrow'), boneCard(session.selected));
        controls.append(button('✓ Gewusst', () => assess(true), 'btn ok wide'), button('Noch nicht gewusst', () => assess(false), 'an-secondary'));
      } else {
        panel.append(text('span', '◎', 'an-task-icon'), text('p', 'DU BIST DRAN', 'an-eyebrow'), text('h2', 'Wie heißt dieser Knochen?'), text('p', 'Wähle einen sichtbaren Knochen. Überlege dir zuerst den Namen, dann klicke ihn an.', 'an-task-description'));
        if (notice) panel.append(text('p', notice, 'an-inline-notice'));
      }
      if (running) controls.append(button('Runde auswerten', () => { K.finish(session, performance.now()); refresh(); }, 'an-text-link an-end'));
      if (session) {
        const mastered = session.ids.length - session.remaining.length;
        progressBox.hidden = false; progress.max = session.ids.length; progress.value = mastered;
        progressLabel.textContent = mastered + ' / ' + session.ids.length + ' gemeistert';
      }
      const active = session ? session.ids : bones.map(b => b.id);
      // A correct learning answer stays highlighted until the learner continues.
      const hidden = session ? session.ids.filter(id => !session.remaining.includes(id) && session.feedback?.target !== id) : [];
      model.setState({ active, hidden, selected: session?.selected || inspected, feedback: session?.feedback });
      list.replaceChildren(...bones.filter(b => !hidden.includes(b.id)).map(b => {
        const label = isAtlas ? b.name : 'Knochen ' + String(b.number).padStart(2, '0');
        const item = button(label, () => pick(b.id), 'an-bone-option');
        item.dataset.bone = b.id;
        item.disabled = !!session && (session.finished || !!session.feedback || !!session.selected);
        item.addEventListener('focus', () => model.highlight(b.id));
        item.addEventListener('blur', () => model.highlight(null));
        item.addEventListener('mouseenter', () => model.highlight(b.id));
        item.addEventListener('mouseleave', () => model.highlight(null));
        return item;
      }));
      storageNotice.textContent = storageFailed ? 'Speichern ist hier nicht verfügbar. Deine Ergebnisse bleiben für diesen Besuch erhalten.' : 'Fortschritt & Bestenliste bleiben in diesem Browser.';
      if (session?.selected || session?.feedback || session?.finished) {
        const action = controls.querySelector('button:not(.an-end)');
        action?.focus({ preventScroll: true });
      }
    }
    refresh();
    // A tab switch never pauses the timed run; performance.now counts the gap.
    const visibility = () => { if (!document.hidden && session?.mode === 'timed') updateClock(); };
    document.addEventListener('visibilitychange', visibility);
    cleanup = () => document.removeEventListener('visibilitychange', visibility);
  }
  function leaderboard() {
    session = null;
    root.append(heading('ANATOMIE / BESTENLISTE', 'Dein Wissen. Deine Bestzeit.', 'Vergleiche deine abgeschlossenen Runden auf Zeit. Erst zählt dein Wissen beim ersten Versuch, dann deine Geschwindigkeit.'));
    const filter = h('select', { class: 'an-select', 'aria-label': 'Bestenliste nach Region filtern' }, C.regions.map(r => h('option', { value: r.id, text: r.name })));
    filter.value = region;
    const body = h('div', { class: 'an-leaderboard-body' });
    const regionHeading = text('h2', '');
    const card = h('section', { class: 'card an-leaderboard', 'aria-label': 'Persönliche Bestenliste' }, [h('div', { class: 'an-leaderboard-head' }, [h('div', {}, [text('p', 'DEINE PERSÖNLICHE BESTENLISTE', 'an-eyebrow'), regionHeading]), filter]), body]);
    root.append(card, text('p', 'Lokal in diesem Browser gespeichert · keine globale Rangliste · Selbsteinschätzung im Modus „Auf Zeit“', 'an-leaderboard-note'), link('Eine neue Bestzeit setzen →', '#/training', 'btn'), sources());
    function update() {
      region = filter.value;
      regionHeading.textContent = C.regions.find(r => r.id === region).name;
      const rows = K.rank(state.results, region).slice(0, 20);
      if (!rows.length) {
        body.replaceChildren(h('div', { class: 'an-empty' }, [text('span', '♜', 'an-task-icon'), text('h3', 'Hier ist Platz für deine erste Runde.'), text('p', 'Wähle „Auf Zeit“ und meistere alle Lernziele dieser Region. Dann erscheint dein Ergebnis hier.')])); return;
      }
      const table = h('table', { class: 'an-table' });
      table.append(h('caption', { class: 'sr-only', text: 'Rangfolge nach Erstversuch-Genauigkeit, dann Zeit. ' + regionHeading.textContent }), h('thead', {}, [h('tr', {}, ['Platz', 'Erster Versuch', 'Zeit', 'Datum'].map(label => h('th', { scope: 'col', text: label })))]));
      const tbody = h('tbody');
      rows.forEach((r, i) => tbody.append(h('tr', {}, [text('td', String(i + 1), i === 0 ? 'an-first-place' : ''), h('td', {}, [text('strong', r.accuracy + '%'), text('span', r.correct + ' / ' + r.total, 'an-table-detail')]), text('td', K.formatTime(r.elapsed), 'an-table-time'), text('td', new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(r.date)))])));
      table.append(tbody); body.replaceChildren(table);
    }
    filter.addEventListener('change', update); update();
  }
  function route() {
    dispose(); root.replaceChildren();
    const route = location.hash.replace(/^#\/?/, '') || 'training';
    shell(route);
    if (route === 'bestenliste') leaderboard();
    else if (route === 'training' || route === 'atlas') showTraining(route === 'atlas');
    else root.append(heading('ANATOMIE', 'Diese Seite gibt es nicht.', 'Über die Navigation kommst du zurück zum Skelett.'), link('Zum Training', '#/training', 'btn'));
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', dispose);
  // Restore the model after returning from the browser back/forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) route(); });
  route();
})();
