import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { validateLabel } from '../ui/chronicle-client.ts';
import { bytes } from '../ui/protocol.ts';
import { splitNarrative } from '../ui/narrative.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
class Element {
  value = ''; textContent = ''; hidden = false; disabled = false; children = []; listeners = {};
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute() {}
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  fire(type) { this.listeners[type]?.(); }
}
function setup({ pendingLoad = false } = {}) {
  const elements = Object.fromEntries(['people', 'status', 'feedback', 'editor', 'empty', 'name', 'label', 'description', 'count', 'apply', 'close'].map(id => [id, new Element()]));
  const document = { visibilityState: 'visible', listeners: {}, querySelector: selector => elements[selector.slice(1)], createElement: () => new Element(), addEventListener(type, listener) { this.listeners[type] = listener; } };
  const clients = [];
  let rejectLoad;
  class Client {
    closed = false; activations = [];
    constructor() { clients.push(this); }
    close() { this.closed = true; }
    async openIndex() { return { revision: pendingLoad ? 1 : 0, label: pendingLoad ? 'Friend' : '' }; }
    async loadPreferred(actor, revision, reconnect) {
      try { await new Promise((resolve, reject) => { rejectLoad = reject; }); }
      catch { return reconnect(); }
    }
    async activate(label, text) { this.activations.push({ label, text }); }
    receive() {}
  }
  const window = { magelight: { send() {} } };
  const source = readFileSync(new URL('../ui/main.ts', import.meta.url), 'utf8');
  const js = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''));
  runInNewContext(js, { ChronicleClient: Client, validateLabel, bytes, splitNarrative, window, document, crypto: { getRandomValues: array => array.fill(1) }, confirm: () => true, Error });
  return { elements, document, window, clients, failLoad: () => rejectLoad(new Error('Load interrupted')) };
}
async function edit(view) {
  await tick(); view.elements.people.children[0].fire('click'); await tick();
  view.elements.label.value = 'Friend'; view.elements.label.fire('input');
  view.elements.description.value = 'Draft from save A'; view.elements.description.fire('input');
}

test('invalid label keeps the editor ready and the corrected label saves', async () => {
  const view = setup(); await edit(view);
  const client = view.clients.at(-1);
  view.elements.label.value = 'é'.repeat(49);
  view.elements.apply.fire('click'); await tick();
  assert.match(view.elements.feedback.textContent, /96 UTF-8 bytes/);
  assert.equal(client.closed, false); assert.equal(client.activations.length, 0);
  view.elements.label.value = 'Friend'; view.elements.apply.fire('click'); await tick();
  assert.deepEqual(client.activations, [{ label: 'Friend', text: 'Draft from save A' }]);
});

test('hiding discards a draft even when save B has the same revision and no load callback arrives', async () => {
  const view = setup(); await edit(view); const client = view.clients.at(-1);
  view.document.visibilityState = 'hidden'; view.document.listeners.visibilitychange();
  assert.equal(client.closed, true); assert.equal(view.elements.description.value, ''); assert.equal(view.elements.label.value, ''); assert.equal(view.elements.editor.hidden, true);
  view.document.visibilityState = 'visible'; view.document.listeners.visibilitychange(); await tick();
  view.elements.people.children[0].fire('click'); await tick();
  assert.equal(view.elements.description.value, '');
  view.elements.apply.fire('click'); await tick();
  assert.equal(view.clients.at(-1).activations.length, 0);
});

test('game load clears a visible draft and reloads the index', async () => {
  const view = setup(); await edit(view); const previous = view.clients.at(-1);
  view.window.lpGameLoaded(); await tick();
  assert.equal(previous.closed, true); assert.equal(view.elements.description.value, '');
  assert.equal(view.elements.editor.hidden, true); assert.ok(view.clients.length > 3);
});

test('an interrupted load cannot reconnect after the view is hidden', async () => {
  const view = setup({ pendingLoad: true }); await tick();
  view.elements.people.children[0].fire('click'); await tick();
  const count = view.clients.length;
  view.document.visibilityState = 'hidden'; view.document.listeners.visibilitychange();
  view.failLoad(); await tick();
  assert.equal(view.clients.length, count);
  assert.equal(view.elements.editor.hidden, true);
  assert.equal(view.elements.description.value, '');
});
