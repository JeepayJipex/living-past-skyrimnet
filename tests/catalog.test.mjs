import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog } from '../tools/catalog/validate.ts';

const actor = { reference: { plugin: 'Example.esl', localId: '000ABC' }, base: { plugin: 'Example.esp', localId: '012345' }, name: 'Éowyn', editorId: 'ExampleNPC', location: 'ExampleCell' };
const catalog = () => ({ schemaVersion: 1, actors: [structuredClone(actor)], exclusions: Object.fromEntries(['deleted', 'initiallyDisabled', 'nonPersistent', 'invalidBase', 'unnamed', 'nonUnique', 'conditional', 'ambiguous'].map(key => [key, 0])) });

test('accepts plugin-qualified full and light identities', () => {
  assert.doesNotThrow(() => validateCatalog(catalog()));
});

test('rejects malformed envelopes, identities and counts', () => {
  for (const mutate of [
    c => { c.schemaVersion = 2; },
    c => { c.actors[0].reference.localId = 'FE000ABC'; },
    c => { c.actors[0].base.plugin = '../Bad.esp'; },
    c => { c.actors[0].name = ' '; },
    c => { c.actors[0].reference.plugin = 'Bad\nName.esp'; },
    c => { c.actors[0].extra = true; },
    c => { c.exclusions.deleted = -1; },
    c => { delete c.exclusions.ambiguous; },
  ]) {
    const value = catalog(); mutate(value);
    assert.throws(() => validateCatalog(value));
  }
});

test('rejects duplicate reference or base regardless of plugin name case', () => {
  for (const field of ['reference', 'base']) {
    const value = catalog();
    const duplicate = structuredClone(actor);
    duplicate[field].plugin = duplicate[field].plugin.toUpperCase();
    value.actors.push(duplicate);
    assert.throws(() => validateCatalog(value));
  }
});
