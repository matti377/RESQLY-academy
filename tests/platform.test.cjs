const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/js/platform.js');
const loc = (url) => new URL(url);
test('academy remains the root; EKG and Röntgen have explicit course entries', () => {
  for (const url of ['https://academy.resqly.lu/', 'http://localhost:8000/', 'http://localhost/?app=constructor', 'file:///tmp/index.html']) assert.equal(P.legacy(loc(url)), null);
  assert.equal(P.legacyURL(loc('https://ekg.resqly.lu/#/lektion/l1_1')), 'https://ekg.resqly.lu/ekg/#/lektion/l1_1');
  assert.equal(P.legacyURL(loc('http://localhost/?app=roentgen')), '/roentgen/#/pfad');
  assert.equal(P.legacyURL(loc('https://roentgen.resqly.lu/')), '/roentgen/#/pfad');
  assert.equal(P.legacy(loc('https://ekg.resqly.lu/?app=roentgen')), 'ekg');
});
test('Sono entries return to academy, including old domains and file previews', () => {
  assert.equal(P.legacyURL(loc('https://sono.resqly.lu/?app=ekg#/home')), 'https://academy.resqly.lu/');
  assert.equal(P.legacyURL(loc('http://localhost/?app=sono#/modul/lunge')), '/');
  assert.equal(P.legacyURL(loc('http://sono.localhost/')), '/');
  assert.equal(P.legacyURL(loc('file:///tmp/index.html?app=sono#/home')), 'index.html');
  assert.equal(P.legacy(loc('https://ekg.resqly.lu/?app=sono')), 'ekg');
  assert.throws(() => P.switchURL('sono', loc('http://localhost/'), 'ekg'));
});
test('course switching works without provisioning a new domain', () => {
  assert.equal(P.switchURL('roentgen', loc('https://ekg.resqly.lu/ekg/'), 'ekg'), '/roentgen/#/pfad');
  assert.equal(P.switchURL('ekg', loc('https://roentgen.resqly.lu/roentgen/'), 'roentgen'), 'https://ekg.resqly.lu/ekg/#/pfad');
  assert.equal(P.switchURL('roentgen', loc('http://localhost/'), 'academy'), '/roentgen/#/pfad');
  assert.equal(P.switchURL('roentgen', loc('file:///tmp/ekg/index.html'), 'ekg'), '../roentgen/index.html#/pfad');
  assert.equal(P.switchURL('ekg', loc('file:///tmp/index.html'), 'academy'), 'ekg/index.html#/pfad');
  assert.throws(() => P.switchURL('other', loc('http://localhost/')));
});
test('course deep links, empty folders and hash precedence', () => {
  for (const app of ['ekg', 'roentgen']) {
    assert.equal(P.route(loc('http://localhost/' + app + '/'), app), 'pfad');
    assert.equal(P.route(loc('http://localhost/' + app + '/index.html'), app), 'pfad');
    assert.equal(P.route(loc('http://localhost/' + app + '/lektion/bildstart'), app), 'lektion/bildstart');
    assert.equal(P.route(loc('http://localhost/' + app + '/atlas#/trainer'), app), 'trainer');
  }
  for (const route of ['pfad', 'trainer', 'bibliothek', 'labor', 'ableitungen', 'challenge', 'lektion/test']) assert.equal(P.route(loc('https://ekg.resqly.lu/ekg/#/' + route), 'ekg'), route);
});
test('every page links home to the academy start page', () => {
  assert.equal(P.homeURL(loc('http://localhost/ekg/'), 'ekg'), '/#/home');
  assert.equal(P.homeURL(loc('https://ekg.resqly.lu/ekg/'), 'ekg'), 'https://academy.resqly.lu/#/home');
  assert.equal(P.homeURL(loc('file:///tmp/roentgen/index.html'), 'roentgen'), '../index.html#/home');
  assert.equal(P.homeURL(loc('file:///tmp/index.html'), 'academy'), 'index.html#/home');
});
