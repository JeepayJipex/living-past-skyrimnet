import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Protocol } from '../ui/protocol.ts';

const payload = { origin: 'Whiterun', biography: 'Test "text"' };
const echo = request => JSON.stringify({ protocol: 1, correlationId: request.id, type: 'echo', status: 'ok', request });

test('correlates concurrent responses in any order and ignores duplicates', () => {
  const p = new Protocol('session');
  const a = p.request('open', payload), b = p.request('validate', payload);
  assert.equal(p.receive(echo(b)).kind, 'verified');
  assert.equal(p.receive(echo(a)).kind, 'verified');
  assert.equal(p.receive(echo(a)).kind, 'unknown');
});

test('rejects mismatched, malformed and unknown replies without consuming a request', () => {
  const p = new Protocol('session');
  const a = p.request('apply', payload);
  assert.equal(p.receive('{').kind, 'invalid');
  assert.equal(p.receive('null').kind, 'invalid');
  assert.equal(p.receive(echo({ ...a, payload: { ...payload, origin: 'Riften' } })).kind, 'mismatch');
  assert.equal(p.receive(echo({ ...a, id: 'other' })).kind, 'unknown');
  assert.equal(p.receive(echo(a)).kind, 'verified');
});

test('timeout affects only its request; late and previous-session replies are ignored', () => {
  const p = new Protocol('first');
  const a = p.request('open', payload), b = p.request('validate', payload);
  assert.equal(p.connected, false);
  assert.equal(p.receive(echo(b)).kind, 'verified');
  assert.equal(p.connected, true);
  assert.equal(p.timeout(a.id), true);
  assert.equal(p.connected, true);
  assert.equal(p.timeout(a.id), false);
  assert.equal(p.receive(echo(a)).kind, 'unknown');
  assert.equal(p.receive('{').kind, 'invalid');
  assert.equal(p.connected, true);
  const next = new Protocol('second');
  assert.equal(next.connected, false);
  next.request('open', payload);
  assert.equal(next.receive(echo(a)).kind, 'unknown');
});
