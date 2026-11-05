/* Pure course logic; storage and UI failures must not change grading. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.XRAY = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const STORE = 'roentgen-learning-v1';
  const number = (n, max = 1000000000) => Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
  const validID = (id) => /^[a-z0-9-]+$/.test(id);
  const dayKey = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  function restore(raw) {
    const empty = { version: 1, done: {}, answers: {}, xp: 0, streak: 0, lastDay: null };
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || data.version !== 1) return empty;
      for (const [id, result] of Object.entries(data.done || {}))
        if (validID(id) && result && typeof result === 'object') empty.done[id] = { best: number(result.best, 100) };
      for (const [id, answer] of Object.entries(data.answers || {}))
        if (validID(id) && answer && typeof answer.last === 'boolean') empty.answers[id] = { n: number(answer.n, 100000), last: answer.last };
      empty.xp = number(data.xp);
      empty.streak = number(data.streak, 100000);
      empty.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(data.lastDay) ? data.lastDay : null;
    } catch (_) { /* Recover a corrupt or unavailable local state. */ }
    return empty;
  }
  function unlocked(content, state, id) {
    const i = content.lessons.findIndex((l) => l.id === id);
    return i >= 0 && (i === 0 || !!state.done[id] || !!state.done[content.lessons[i - 1].id]);
  }
  function evaluate(question, selected) {
    if (question.type === 'spot') {
      if (!selected || !['x', 'y'].every((key) => Number.isFinite(selected[key]) && selected[key] >= 0 && selected[key] <= 100)) return false;
      const t = question.target;
      return !!t && ((selected.x - t.x) / t.rx) ** 2 + ((selected.y - t.y) / t.ry) ** 2 <= 1;
    }
    return question.type === 'order'
      ? Array.isArray(selected) && selected.length === question.correct.length && selected.every((v, i) => v === question.correct[i])
      : Number.isInteger(selected) && selected === question.correct;
  }
  // Percentages of the actual image keep hits stable through resize, zoom and scroll.
  function imagePoint(rect, clientX, clientY) {
    if (!(rect.width > 0 && rect.height > 0) || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const x = (clientX - rect.left) / rect.width * 100;
    const y = (clientY - rect.top) / rect.height * 100;
    return x >= 0 && x <= 100 && y >= 0 && y <= 100 ? { x, y } : null;
  }
  function record(state, question, ok) {
    const prior = state.answers[question.id];
    state.answers[question.id] = { n: Math.min(100000, (prior?.n || 0) + 1), last: ok === true };
  }
  function finish(state, id, right, total, now = new Date(), practice = false) {
    const perfect = right === total;
    const gain = 10 + (perfect ? 5 : 0);
    if (!practice) state.done[id] = { best: Math.max(state.done[id]?.best || 0, Math.round(right / Math.max(1, total) * 100)) };
    state.xp += gain;
    const today = dayKey(now);
    if (state.lastDay !== today) {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      state.streak = state.lastDay === dayKey(yesterday) ? state.streak + 1 : 1;
      state.lastDay = today;
    }
    return gain;
  }
  function practiceQuestions(content, state, review = false, random = Math.random) {
    const available = content.lessons.filter((l) => unlocked(content, state, l.id)).flatMap((l) => l.questions);
    const pool = review ? available.filter((q) => state.answers[q.id]?.last === false) : available;
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 8);
  }
  function validate(content) {
    const errors = [], ids = new Set();
    const add = (id) => { if (!validID(id) || ids.has(id)) errors.push('Invalid or duplicate ID: ' + id); ids.add(id); };
    for (const m of content.media) {
      add(m.id);
      if (!m.author || !m.source?.startsWith('https://') || !m.license || !m.licenseURL?.startsWith('https://')) errors.push('Missing media attribution: ' + m.id);
    }
    for (const l of content.lessons) {
      add(l.id);
      if (!content.units.some((u) => u.number === l.unit) || !l.intro || l.questions.length < 3) errors.push('Incomplete lesson: ' + l.id);
      if (!l.refs?.length || l.refs.some((id) => !content.sources.some((s) => s.id === id))) errors.push('Missing sources: ' + l.id);
      const teaching = Array.isArray(l.teaching) ? l.teaching : [];
      const questionIDs = new Set(l.questions.map((q) => q.id)), taught = new Set();
      if (!teaching.length) errors.push('Missing teaching page: ' + l.id);
      for (const section of teaching) {
        if (typeof section?.title !== 'string' || !section.title.trim() || typeof section.body !== 'string' || !section.body.trim()) errors.push('Incomplete teaching section: ' + l.id);
        if (!Array.isArray(section?.covers) || !section.covers.length) errors.push('Missing teaching references: ' + l.id);
        else for (const id of section.covers) {
          if (!questionIDs.has(id)) errors.push('Unknown teaching reference: ' + id);
          else taught.add(id);
        }
      }
      for (const q of l.questions) {
        add(q.id);
        if (!taught.has(q.id)) errors.push('Exercise has no preceding explanation: ' + q.id);
        if (!q.explanation || !['mc', 'spot', 'order'].includes(q.type)) errors.push('Incomplete exercise: ' + q.id);
        if (q.image && !content.media.some((m) => m.id === q.image)) errors.push('Missing image: ' + q.id);
        if (q.type === 'spot') {
          if (content.media.find((m) => m.id === q.image)?.annotated) errors.push('Annotated image in localization exercise: ' + q.id);
          const t = q.target;
          if (!q.image || !t || !['x', 'y', 'rx', 'ry'].every((key) => Number.isFinite(t[key])) ||
              t.rx <= 0 || t.ry <= 0 || t.x - t.rx < 0 || t.x + t.rx > 100 || t.y - t.ry < 0 || t.y + t.ry > 100)
            errors.push('Invalid image target: ' + q.id);
          continue;
        }
        const options = q.options;
        if (q.type === 'order' ? q.correct.length !== options.length || new Set(q.correct).size !== options.length || q.correct.some((i) => !Number.isInteger(i) || i < 0 || i >= options.length) : !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= options.length) errors.push('Invalid answer: ' + q.id);
      }
    }
    return errors;
  }
  return { STORE, restore, unlocked, evaluate, imagePoint, record, finish, practiceQuestions, validate, dayKey };
});
