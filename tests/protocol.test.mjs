import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Protocol, validText, bytes } from '../ui/protocol.ts';
const session = '0123456789abcdef';
const response = (request, status, text) => request.frame.slice(0, 25) + status + '|' + String(bytes(text)).padStart(3, '0') + '|' + text;
test('round trips UTF-8 and separators with correlated readback', () => {
  const p = new Protocol(session);
  const text = 'Élodie "ami" \\ | encore';
  const r = p.request('A', text);
  assert.equal(p.receive(response(r, 'S', text + '!')).kind, 'mismatch');
  assert.equal(p.receive(response(r, 'S', text)).kind, 'verified');
  assert.equal(p.receive(response(r, 'S', text)).kind, 'unknown');
});
test('bounds text and rejects malformed and stale frames', () => {
  assert.equal(validText('é'.repeat(80)), true);
  assert.equal(validText('é'.repeat(80) + 'a'), false);
  assert.equal(validText('a\nb'), false);
  const p = new Protocol(session);
  const r = p.request('O');
  assert.equal(p.receive(response(r, 'S', 'test').replace('|004|', '|003|')).kind, 'invalid');
  assert.equal(p.timeout(r.id), true);
  assert.equal(p.receive(response(r, 'S', '')).kind, 'unknown');
});

test('rejects blank and control input and enforces byte limits', () => {
  for (const value of ['', '   ', '\u00a0\u3000', 'a\u0001b', 'a\u007fb', 'a\u0085b', 'a\u2028b']) {
    assert.equal(validText(value), false, JSON.stringify(value));
  }
  assert.equal(validText('é'.repeat(80)), true);
  assert.equal(validText('é'.repeat(80) + 'a'), false);
  assert.throws(() => new Protocol(session).request('A', 'é'.repeat(80) + 'a'));
});

test('rejects malformed frames, mismatched operations, and preserves pending requests', () => {
  const p = new Protocol(session);
  const r = p.request('A', 'Élodie | \\');
  const good = response(r, 'S', 'Élodie | \\');
  for (const frame of ['', 'null', good.replace('2|', '3|'), good.replace('|S|', '|Q|'), good.replace(/\|\d{3}\|/, '|000|')]) {
    assert.equal(p.receive(frame).kind, 'invalid');
  }
  assert.equal(p.receive(good.replace('|A|S|', '|O|S|')).kind, 'mismatch');
  assert.equal(p.receive(good).kind, 'verified');
  assert.equal(p.receive(good).kind, 'unknown');
});

test('rejects stale sessions and processes error replies without success', () => {
  const old = new Protocol(session);
  const r = old.request('A', 'A');
  const next = new Protocol('fedcba9876543210');
  const current = next.request('A', 'A');
  assert.equal(next.receive(response(r, 'S', 'A')).kind, 'unknown');
  assert.deepEqual(next.receive(response(current, 'E', '')), {
    kind: 'verified', id: current.id, operation: 'A', status: 'E', text: ''
  });
  assert.equal(next.receive(response(current, 'E', '')).kind, 'unknown');
});
