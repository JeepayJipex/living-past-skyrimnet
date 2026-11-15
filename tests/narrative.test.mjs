import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNarrative } from '../ui/narrative.ts';

test('preserves multiline Unicode at chunk boundaries and the 2 KiB limit', () => {
  const text = 'a'.repeat(127) + '😀\né' + 'x'.repeat(1914);
  assert.equal(new TextEncoder().encode(text).length, 2048);
  const chunks = splitNarrative(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => new TextEncoder().encode(chunk).length <= 128));
  assert.throws(() => splitNarrative(text + 'x'));
});

test('rejects invalid Unicode and unsupported control characters', () => {
  assert.throws(() => splitNarrative('\ud800'));
  assert.throws(() => splitNarrative('text\0text'));
  assert.throws(() => splitNarrative('  \n'));
});
