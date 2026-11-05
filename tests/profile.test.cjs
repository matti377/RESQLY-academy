const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/js/profile.js');
const day = (y, m, d) => new Date(y, m - 1, d, 12);

test('courses feed one total; reports only count what is new', () => {
  const s = R.restore(null);
  assert.equal(R.reportXp(s, 'ekg', 12, day(2026, 11, 2)), 12);
  assert.equal(R.reportXp(s, 'ekg', 12, day(2026, 11, 2)), 0);
  assert.equal(R.reportXp(s, 'ekg', 5, day(2026, 11, 2)), 0, 'a course reset does not take XP away');
  assert.equal(R.reportXp(s, 'roentgen', 15, day(2026, 11, 2)), 15);
  assert.equal(R.addXp(s, 'academy', 2, day(2026, 11, 2)), 2);
  assert.equal(R.addXp(s, 'sono', 2), 0, 'unknown sources are ignored');
  const sum = R.summarize(s, day(2026, 11, 2));
  assert.equal(sum.xp, 29);
  assert.equal(sum.today, 29);
  assert.deepEqual(sum.bySource, { academy: 2, ekg: 12, roentgen: 15 });
});

test('one streak across courses survives until the end of the next day', () => {
  const s = R.restore(null);
  R.addXp(s, 'ekg', 2, day(2026, 10, 30));
  R.addXp(s, 'roentgen', 2, day(2026, 10, 31));
  R.addXp(s, 'academy', 2, day(2026, 11, 1));
  assert.equal(R.streak(s, day(2026, 11, 1)), 3);
  assert.equal(R.streak(s, day(2026, 11, 2)), 3);
  assert.equal(R.streak(s, day(2026, 11, 3)), 0);
});

test('levels grow with XP', () => {
  assert.deepEqual(R.level(0), { n: 1, title: 'Einstieg', into: 0, span: 50 });
  assert.equal(R.level(49).n, 1);
  assert.equal(R.level(50).n, 2);
  assert.deepEqual(R.level(160), { n: 3, title: 'Grundlagen', into: 10, span: 150 });
  assert.equal(R.level(25 * 15 * 14).title, 'Expertise');
});

test('older course progress is taken over without counting as today', () => {
  const s = R.restore(null);
  R.absorb(s, 'ekg', 120);
  R.absorb(s, 'ekg', 80);
  R.backfill(s, '2026-11-1', 3); // EKG writes unpadded days
  const sum = R.summarize(s, day(2026, 11, 2));
  assert.equal(sum.xp, 120);
  assert.equal(sum.today, 0);
  assert.equal(sum.streak, 3);
});

test('corrupt or foreign data restores to an empty profile', () => {
  for (const raw of ['{', '{"version":2,"xp":{"ekg":5}}', 'null'])
    assert.deepEqual(R.restore(raw), { version: 1, xp: {}, days: {} });
  const s = R.restore({ version: 1, xp: { ekg: -4, roentgen: 7, other: 9 }, days: { '2026-11-02': 3, bad: 1 } });
  assert.deepEqual(s, { version: 1, xp: { roentgen: 7 }, days: { '2026-11-02': 3 } });
});
