const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/js/roentgen/content.js');
const K = require('../assets/js/roentgen/core.js');
test('all lessons, clinical media, references and answer keys are valid', () => {
  assert.deepEqual(K.validate(C), []);
  assert.equal(C.lessons.length, 12);
  assert.equal(C.lessons.flatMap(l => l.questions).length, 37);
  assert.equal(C.media.length, 5);
  for (const m of C.media) {
    const bytes = fs.readFileSync(path.join(__dirname, '../assets/media/roentgen', m.file));
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
  }
  assert.ok(K.validate({ ...C, lessons: [{ ...C.lessons[0], refs: ['missing'] }] }).length);
});
test('grading requires exact ordered steps and a concrete choice', () => {
  const qs = C.lessons.flatMap(l => l.questions);
  for (const q of qs) {
    assert.equal(K.evaluate(q, q.type === 'spot' ? { x: q.target.x, y: q.target.y } : q.correct), true);
    assert.equal(K.evaluate(q, null), false);
    if (q.type === 'order') {
      assert.equal(K.evaluate(q, [0, 1, 1, 3]), false);
      assert.equal(K.evaluate(q, [0, 1, 2]), false);
      assert.equal(K.evaluate(q, [3, 2, 1, 0]), false);
    } else assert.equal(K.evaluate(q, String(q.correct)), false);
  }
});
test('every exercise has a preceding explanation and Colles is taught before testing', () => {
  const lesson = C.lessons.find(l => l.id === 'handgelenk');
  const colles = lesson.teaching.find(section => section.covers.includes('handgelenk-colles'));
  assert.match(colles.title, /Colles/);
  assert.match(colles.body, /distale Radius/);
  assert.match(colles.body, /dorsal/);
  assert.match(colles.body, /Handrückenseite/);
  const replaceFirst = change => ({ ...C, lessons: [{ ...C.lessons[0], ...change }, ...C.lessons.slice(1)] });
  assert.ok(K.validate(replaceFirst({ teaching: [] })).some(e => e.includes('Missing teaching page')));
  assert.ok(K.validate(replaceFirst({ teaching: C.lessons[0].teaching.slice(1) })).some(e => e.includes('no preceding explanation')));
  assert.ok(K.validate(replaceFirst({ teaching: [{ title: 'Example', body: 'Explanation', covers: ['not-a-question'] }] })).some(e => e.includes('Unknown teaching reference')));
});
test('image hits use an anatomical ellipse and reject arbitrary points or old choices', () => {
  const spots = C.lessons.flatMap(l => l.questions).filter(q => q.type === 'spot');
  for (const q of spots) {
    const t = q.target;
    assert.equal(K.evaluate(q, { x: t.x + t.rx, y: t.y }), true);
    assert.equal(K.evaluate(q, { x: t.x + t.rx * 0.7, y: t.y + t.ry * 0.7 }), true);
    assert.equal(K.evaluate(q, { x: t.x + t.rx, y: t.y + t.ry }), false);
    assert.equal(K.evaluate(q, { x: 5, y: 5 }), false);
    for (const bad of [0, 1, 2, {}, { x: String(t.x), y: t.y }, { x: t.x, y: NaN }, { x: -1, y: 5 }, { x: 5, y: 101 }]) assert.equal(K.evaluate(q, bad), false);
    const badTarget = { ...q, target: { ...t, rx: 0 } };
    assert.ok(K.validate({ ...C, lessons: [{ ...C.lessons[0], questions: [badTarget, ...C.lessons[0].questions] }] }).some(e => e.includes('Invalid image target')));
  }
});
test('image coordinates remain correct after resizing, zooming and scrolling', () => {
  for (const point of [K.imagePoint({ left: 10, top: 20, width: 200, height: 400 }, 90, 240), K.imagePoint({ left: -30, top: -240, width: 400, height: 800 }, 130, 200)]) {
    assert.ok(Math.abs(point.x - 40) < 1e-10);
    assert.ok(Math.abs(point.y - 55) < 1e-10);
  }
  assert.equal(K.imagePoint({ left: 10, top: 20, width: 200, height: 400 }, 9, 40), null);
  assert.equal(K.imagePoint({ left: 10, top: 20, width: 0, height: 400 }, 10, 40), null);
});
test('locks enforce the preceding lesson; practice uses the unlocked pool', () => {
  const s = K.restore(null);
  assert.equal(K.unlocked(C, s, 'bildstart'), true);
  assert.equal(K.unlocked(C, s, 'systematik'), false);
  assert.equal(K.unlocked(C, s, 'missing'), false);
  assert.equal(K.practiceQuestions(C, s).length, 3);
  s.done.bildstart = { best: 100 };
  assert.equal(K.unlocked(C, s, 'systematik'), true);
  assert.equal(K.unlocked(C, s, 'normalbild'), false);
  assert.equal(K.practiceQuestions(C, s).length, 6);
});
test('mistakes stay available until corrected and persist through restore', () => {
  const s = K.restore(null), q = C.lessons[0].questions[0];
  K.record(s, q, false);
  assert.deepEqual(K.practiceQuestions(C, s, true), [q]);
  const restored = K.restore(JSON.stringify(s));
  assert.equal(restored.answers[q.id].last, false);
  K.record(restored, q, true);
  assert.deepEqual(K.practiceQuestions(C, restored, true), []);
  assert.equal(restored.answers[q.id].n, 2);
});
test('completion awards XP and daily streak once per day without losing best score', () => {
  const s = K.restore(null);
  assert.equal(K.finish(s, 'bildstart', 3, 3, new Date(2026, 10, 1, 23, 30)), 15);
  K.finish(s, 'bildstart', 1, 3, new Date(2026, 10, 1, 23, 45));
  assert.equal(s.streak, 1);
  assert.equal(s.done.bildstart.best, 100);
  K.finish(s, 'systematik', 3, 3, new Date(2026, 10, 2, 0, 5));
  assert.equal(s.streak, 2);
  K.finish(s, null, 3, 3, new Date(2026, 10, 4), true);
  assert.equal(s.streak, 1);
  assert.equal(s.xp, 55);
  assert.deepEqual(Object.keys(s.done), ['bildstart', 'systematik']);
});
test('invalid local storage recovers without granting progress', () => {
  assert.deepEqual(K.restore('{bad'), K.restore(null));
  assert.deepEqual(K.restore('{"version":2}'), K.restore(null));
  const s = K.restore({ version: 1, xp: -1, streak: '999', done: { '../bad': { best: 100 }, good: { best: 1000 } } });
  assert.equal(s.xp, 0); assert.equal(s.streak, 0);
  assert.deepEqual(s.done, { good: { best: 0 } });
});
