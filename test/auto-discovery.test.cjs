const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

// Only stand in for the browser host; discovery, signature checks and rendering are real.
const elements = new Map();
const source = join(__dirname, '..', 'dracula-air-quality-card.js');
runInNewContext(readFileSync(source, 'utf8'), {
  window: {},
  customElements: { get: name => elements.get(name), define: (name, ctor) => elements.set(name, ctor) },
  HTMLElement: class {
    attachShadow() { this.shadowRoot = { appendChild() {}, addEventListener() {} }; }
    setAttribute() {}
  },
  document: { createElement: () => ({ writes: 0, set innerHTML(html) { this.html = html; this.writes++; } }) },
}, { filename: source });

function makeCard(config = { auto_discover: true }) {
  const Card = elements.get('dracula-air-quality-card');
  const card = new Card();
  card.setConfig({ ...config, show_sparklines: false });
  return card;
}
const on = { state: 'on', attributes: {} };
const off = { state: 'off', attributes: {} };

test('overview discovers an unwatched replacement and drops a removed purifier', () => {
  const card = makeCard();
  card.hass = { states: { 'fan.study': on, 'light.hall': off } };
  assert.deepEqual([...card._watchedIds], ['fan.study']);
  card.hass = { states: { 'fan.study': on, 'fan.loft': off } };
  assert.ok(card._root.html.includes('Loft'), 'new purifier should appear despite unchanged watched values');
  card.hass = { states: { 'fan.study': on, 'fan.den': off } };
  assert.ok(card._root.html.includes('Den') && !card._root.html.includes('Loft'));
});

test('a retained purifier resolves its renamed companion sensor', () => {
  const card = makeCard({ entity: 'fan.study' });
  const pm = { state: '12', attributes: { device_class: 'pm25' } };
  card.hass = { states: { 'fan.study': on, 'sensor.study_pm25': pm } };
  assert.deepEqual([...card._watchedIds], ['fan.study', 'sensor.study_pm25']);
  card.hass = { states: { 'fan.study': on, 'sensor.study_particles': pm } };
  assert.deepEqual([...card._watchedIds], ['fan.study', 'sensor.study_particles']);
});

test('stable membership preserves discovery and skips only unrelated updates', () => {
  const card = makeCard();
  card.hass = { states: { 'fan.study': on, 'light.hall': off } };
  const { writes } = card._root;
  const list = card._getOverviewList();
  const purifier = card._discoveryCache.get('fan.study');
  card.hass = { states: { 'light.hall': off, 'fan.study': on } }; // reorder only
  assert.equal(card._root.writes, writes);
  card.hass = { states: { 'light.hall': on, 'fan.study': on } }; // unrelated change
  assert.equal(card._root.writes, writes);
  card.hass = { states: { 'light.hall': on, 'fan.study': off } }; // watched change
  assert.equal(card._root.writes, writes + 1);
  assert.equal(card._getOverviewList(), list);
  assert.equal(card._discoveryCache.get('fan.study'), purifier);
});
