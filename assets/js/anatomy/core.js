(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Anatomy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const STORE = 'resqly-anatomy-v1';
  const MODES = ['recall', 'learn', 'timed'];
  function shuffle(values, random = Math.random) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function targets(content, region) { return content.bones.filter(b => region === 'all' || b.region === region); }
  function create(content, mode, region, now = 0, random = Math.random) {
    if (!MODES.includes(mode) || !content.regions.some(r => r.id === region)) throw new Error('Ungültiger Trainingsmodus oder Region');
    const ids = targets(content, region).map(b => b.id);
    return { mode, region, ids, remaining: ids.slice(), queue: shuffle(ids, random), selected: null, first: {}, mistakes: 0, started: now, ended: null, finished: false, feedback: null };
  }
  function select(session, id) {
    if (session.finished || session.feedback || !session.remaining.includes(id)) return false;
    // A revealed recall card must be assessed before a different bone opens.
    if (session.mode !== 'learn' && session.selected) return false;
    session.selected = id;
    return true;
  }
  function recall(session, knew, now) {
    const id = session.selected;
    if (session.mode === 'learn' || session.finished || !id || !session.remaining.includes(id)) return null;
    if (!(id in session.first)) session.first[id] = !!knew;
    if (knew) session.remaining = session.remaining.filter(b => b !== id);
    else session.mistakes++;
    session.selected = null;
    if (!session.remaining.length) finish(session, now);
    return id;
  }
  function answer(session, id) {
    if (session.mode !== 'learn' || session.finished || session.feedback || !session.remaining.includes(id)) return null;
    const target = session.queue[0];
    const ok = id === target;
    if (!(target in session.first)) session.first[target] = ok;
    if (ok) session.remaining = session.remaining.filter(b => b !== target);
    else session.mistakes++;
    session.feedback = { ok, target, chosen: id };
    return session.feedback;
  }
  function next(session, now) {
    if (!session.feedback || session.finished) return;
    const { ok } = session.feedback;
    const target = session.queue.shift();
    if (!ok) session.queue.push(target);
    session.feedback = null; session.selected = null;
    if (!session.remaining.length) finish(session, now);
  }
  function finish(session, now) {
    if (session.finished) return;
    session.ended = Math.max(session.started, now); session.finished = true;
  }
  function result(session, date = new Date().toISOString()) {
    if (!session.finished) return null;
    const correct = Object.values(session.first).filter(Boolean).length;
    return { version: 1, mode: session.mode, region: session.region, total: session.ids.length, mastered: session.ids.length - session.remaining.length, correct, mistakes: session.mistakes, accuracy: Math.round(correct / session.ids.length * 100), elapsed: Math.max(0, session.ended - session.started), complete: session.remaining.length === 0, date };
  }
  function rank(rows, region) {
    return rows.filter(r => r.mode === 'timed' && r.complete && r.region === region)
      .slice().sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct || a.elapsed - b.elapsed || a.date.localeCompare(b.date));
  }
  function empty() { return { version: 1, known: {}, results: [] }; }
  function restore(raw, content) {
    const state = empty();
    const ids = new Set(content.bones.map(b => b.id));
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || data.version !== 1) return state;
      for (const [id, value] of Object.entries(data.known || {})) if (ids.has(id) && typeof value === 'boolean') state.known[id] = value;
      if (Array.isArray(data.results)) state.results = data.results.filter(r => {
        if (!r || r.version !== 1 || !MODES.includes(r.mode) || !content.regions.some(region => region.id === r.region)) return false;
        const total = targets(content, r.region).length;
        return r.total === total && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= total && Number.isInteger(r.mastered) && r.mastered >= 0 && r.mastered <= total && Number.isInteger(r.mistakes) && r.mistakes >= 0 && r.mistakes <= 100000 && r.accuracy === Math.round(r.correct / total * 100) && typeof r.complete === 'boolean' && r.complete === (r.mastered === total) && Number.isFinite(r.elapsed) && r.elapsed >= 0 && r.elapsed <= 604800000 && typeof r.date === 'string' && Number.isFinite(Date.parse(r.date));
      }).slice(-200);
    } catch (_) { /* Recover gracefully from disabled storage or corrupt data. */ }
    return state;
  }
  function formatTime(ms) {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0') + '.' + Math.floor(Math.max(0, ms) % 1000 / 100);
  }
  return { STORE, MODES, targets, shuffle, create, select, recall, answer, next, finish, result, rank, empty, restore, formatTime };
});
