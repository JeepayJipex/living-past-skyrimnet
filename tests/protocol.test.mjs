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
