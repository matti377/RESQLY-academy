const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/anatomy/content.js');
const K = require('../assets/js/anatomy/core.js');
const P = require('../assets/js/platform.js');

test('targets cover five regions, unique bones, all free vertebrae and twelve rib pairs', () => {
  assert.equal(C.bones.length, 88);
  assert.equal(new Set(C.bones.map(b => b.id)).size, C.bones.length);
  assert.equal(K.targets(C, 'all').length, 88);
  assert.equal(K.targets(C, 'wirbelsaeule').length, 25);
  assert.equal(C.bones.filter(b => b.id.startsWith('rib-')).length, 24);
  for (const b of C.bones) {
    assert.ok(b.name && b.latin && C.regions.some(r => r.id === b.region));
    assert.equal(b.center.length, 3);
  }
  assert.equal(P.switchURL('anatomie', new URL('http://localhost/ekg/'), 'ekg'), '/anatomie/#/training');
  assert.equal(P.switchURL('anatomie', new URL('file:///tmp/ekg/index.html'), 'ekg'), '../anatomie/index.html#/training');
  assert.equal(P.route(new URL('http://localhost/anatomie/bestenliste'), 'anatomie'), 'bestenliste');
  assert.equal(P.route(new URL('http://localhost/anatomie/'), 'anatomie'), 'training');
  assert.equal(P.route(new URL('file:///tmp/anatomie/index.html'), 'anatomie'), 'training');
});
test('imported GLB matches its checksum, embedded preview and named training targets', () => {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const path = require('node:path');
  const asset = fs.readFileSync(path.resolve(__dirname, '../assets/media/anatomy/skeleton.glb'));
  assert.equal(crypto.createHash('sha256').update(asset).digest('hex'), C.model.assetSha256);
  assert.equal(asset.toString('ascii', 0, 4), 'glTF');
  const gltf = JSON.parse(asset.toString('utf8', 20, 20 + asset.readUInt32LE(12)));
  const meshes = gltf.nodes.filter(n => n.mesh !== undefined);
  assert.equal(meshes.length, 267);
  assert.equal(meshes.filter(n => n.extras.tissue === 'bone').length, 198);
  assert.ok(meshes.every(n => n.extras.source === 'BodyParts3D'));
  assert.deepEqual(new Set(meshes.map(n => n.extras.targetId)), new Set(C.bones.map(b => b.id)));
  for (const b of C.bones) {
    assert.ok(C.model.targets[b.id].vertices > 0 && C.model.targets[b.id].triangles > 0);
    const names = C.model.targets[b.id].names;
    if (b.side) assert.ok(names.every(name => name.toLowerCase().includes(b.side === 'l' ? 'left' : 'right')), b.id);
  }
  const embedded = fs.readFileSync(path.resolve(__dirname, '../assets/media/anatomy/skeleton-data.js'), 'utf8');
  const base64 = JSON.parse(embedded.match(/window.ANATOMY_GLB_BASE64=("[^"]+");/)[1]);
  assert.deepEqual(Buffer.from(base64, 'base64'), asset);
  assert.ok(!C.bones.some(b => b.id === 'coccyx'));
});
test('recall requires assessment, hides only known bones and preserves first misses after retry', () => {
  const s = K.create(C, 'recall', 'kopf', 100);
  assert.equal(K.select(s, 'femur-l'), false);
  assert.equal(K.select(s, 'frontal'), true);
  assert.equal(K.select(s, 'mandible'), false);
  K.recall(s, false, 200);
  assert.ok(s.remaining.includes('frontal'));
  K.select(s, 'frontal'); K.recall(s, true, 300);
  assert.ok(!s.remaining.includes('frontal'));
  assert.equal(s.first.frontal, false);
  for (const id of s.remaining.slice()) { K.select(s, id); K.recall(s, true, 400); }
  assert.equal(s.finished, true);
  const r = K.result(s);
  assert.equal(r.correct, 5); assert.equal(r.accuracy, 83); assert.equal(r.mastered, 6);
  assert.equal(K.select(s, 'frontal'), false);
  assert.equal(K.recall(s, true, 500), null);
});
test('guided learning reveals one result, repeats misses and excludes known targets from later guesses', () => {
  const s = K.create(C, 'learn', 'kopf', 0, () => .5);
  const target = s.queue[0], wrong = s.queue[1];
  assert.equal(K.answer(s, 'femur-r'), null);
  assert.equal(K.answer(s, wrong).ok, false);
  assert.equal(K.answer(s, target), null);
  K.next(s, 100);
  assert.equal(s.queue.at(-1), target);
  while (s.queue.length) {
    const id = s.queue[0]; assert.equal(K.answer(s, id).ok, true); K.next(s, 200);
    assert.equal(K.answer(s, id), null);
  }
  const r = K.result(s); assert.equal(r.complete, true); assert.equal(r.correct, 5); assert.equal(r.mistakes, 1);
});
test('leaderboard separates regions, excludes incomplete attempts and ranks knowledge before speed', () => {
  function run(region, miss, duration, finishEarly = false) {
    const s = K.create(C, 'timed', region, 100);
    if (!finishEarly) for (const [i, id] of s.ids.entries()) {
      if (i === 0 && miss) { K.select(s, id); K.recall(s, false, 110); }
      K.select(s, id); K.recall(s, true, 100 + duration);
    }
    else K.finish(s, 100 + duration);
    return K.result(s, '2026-11-08T10:00:00Z');
  }
  const fastMiss = run('kopf', true, 100), perfectSlow = run('kopf', false, 4000), perfectFast = run('kopf', false, 2000);
  const rows = [fastMiss, perfectSlow, run('thorax', false, 10), run('kopf', false, 1, true), perfectFast];
  assert.deepEqual(K.rank(rows, 'kopf'), [perfectFast, perfectSlow, fastMiss]);
  const s = K.create(C, 'timed', 'kopf', 100); K.finish(s, 999); K.finish(s, 2000);
  assert.equal(s.ended, 999);
});
test('stored progress recovers from malformed data and rejects invalid leaderboard rows', () => {
  assert.deepEqual(K.restore('{', C), K.empty());
  const s = K.create(C, 'timed', 'kopf', 0);
  for (const id of s.ids) { K.select(s, id); K.recall(s, true, 1000); }
  const valid = K.result(s), forged = { ...valid, elapsed: -1 }, incompatible = { ...valid, total: 999 };
  const state = K.restore({ version: 1, known: { frontal: true, fake: true, mandible: 'yes' }, results: [valid, forged, incompatible, null] }, C);
  assert.deepEqual(state.known, { frontal: true }); assert.deepEqual(state.results, [valid]);
  assert.equal(K.formatTime(61234), '01:01.2');
});
