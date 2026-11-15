import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProbeClient } from '../ui/probe-client.ts';
import { bytes } from '../ui/protocol.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
class PapyrusProbe {
  active = 'previous';
  staged = '';
  draft = '';
  frames = [];
  client;
  hook;
  connect(session = '0123456789abcdef') {
    this.client = new ProbeClient(session, frame => this.handle(frame), 20);
    return this.client;
  }
  handle(frame) {
    this.frames.push(frame);
    const id = frame.slice(2, 22);
    const op = frame[23];
    const value = frame.slice(31);
    let result = '';
    if (op === 'O') { this.draft = ''; result = '1'; }
    if (op === 'B') this.draft = '';
    if (op === 'D') { this.draft += value.slice(4); result = value; }
    if (op === 'S') this.staged = this.draft;
    if (op === 'R') {
      const text = value[0] === '3' ? this.staged : this.active;
      const offset = Number(value.slice(1));
      let used = 0;
      for (const character of text) {
        const size = bytes(character);
        if (used >= offset && bytes(result) + size <= 128) result += character;
        else if (used >= offset) break;
        used += size;
      }
    }
    if (op === 'K') this.active = this.staged;
    const reply = `3|${id}|${op}|S|${String(bytes(result)).padStart(3, '0')}|${result}`;
    if (this.hook?.({ op, frame, reply, server: this })) return;
    queueMicrotask(() => this.client?.receive(reply));
  }
}

test('round trips long Unicode through the client and staged readback', async () => {
  const server = new PapyrusProbe(); const client = server.connect();
  assert.equal(await client.open(), 'previous');
  const text = 'é😀\n'.repeat(290);
  await client.activate(text);
  assert.equal(server.active, text);
  assert.ok(server.frames.every(frame => bytes(frame.slice(31)) <= 160));
});

test('diagnostic request is independently correlated and does not change active state', async () => {
  const frames = [];
  const client = new ProbeClient('0123456789abcdef', frame => frames.push(frame), 30);
  const pending = client.diagnose();
  const frame = frames[0];
  assert.equal(frame[23], 'X');
  const result = 'ref=True;base=True;match=True;marker=False;active=0;s1=True,2048;s2=False,0;read=no-active';
  client.receive(frame.slice(0, 25) + 'S|' + String(bytes(result)).padStart(3, '0') + '|' + result);
  assert.equal(await pending, result);
  assert.equal(frames.length, 1);
});

test('ignores stale, duplicate, reordered and malformed replies', async () => {
  const frames = []; const client = new ProbeClient('0123456789abcdef', frame => frames.push(frame), 30);
  const opening = client.open();
  const request = frames[0];
  const correct = request.slice(0, 25) + 'S|001|1';
  client.receive(correct.replace('0123456789abcdef', 'fedcba9876543210'));
  client.receive(correct.replace('|O|', '|R|'));
  client.receive(correct.replace('|001|', '|002|'));
  client.receive('invalid');
  assert.equal(frames.length, 1);
  client.receive(correct);
  await tick();
  client.receive(correct);
  assert.equal(frames.length, 2);
  const read = frames[1];
  client.receive(read.slice(0, 25) + 'S|000|');
  assert.equal(await opening, '');
});

test('missing chunk response times out and preserves active value', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  server.hook = ({ op }) => op === 'D';
  await assert.rejects(client.activate('A'.repeat(200)), /No response/);
  assert.equal(server.active, 'previous');
  assert.equal(server.frames.some(frame => frame[23] === 'K'), false);
});

test('mismatched storage readback prevents activation', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  server.hook = ({ op, frame, reply, server: peer }) => {
    if (op === 'R' && frame.slice(31, 32) === '3' && frame.endsWith('0000')) {
      queueMicrotask(() => peer.client.receive(reply.slice(0, 25) + 'S|005|wrong'));
      return true;
    }
    return false;
  };
  await assert.rejects(client.activate('new history'), /readback mismatch/);
  assert.equal(server.active, 'previous');
  assert.equal(server.frames.some(frame => frame[23] === 'K'), false);
});

test('rejected and truncated staged readbacks preserve the active history', async () => {
  for (const failure of ['error', 'truncated']) {
    const server = new PapyrusProbe(); const client = server.connect(); await client.open();
    server.hook = ({ op, frame, reply, server: peer }) => {
      if (op !== 'R' || frame.slice(31, 32) !== '3') return false;
      const response = failure === 'error' ? reply.slice(0, 25) + 'E|000|' : reply.slice(0, 25) + 'S|000|';
      queueMicrotask(() => peer.client.receive(response));
      return true;
    };
    await assert.rejects(client.activate('new history'));
    assert.equal(server.active, 'previous');
    assert.equal(server.frames.some(frame => frame[23] === 'K'), false);
  }
});

test('interrupting transfer leaves the committed value and ignores late replies', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  let late;
  server.hook = ({ op, reply }) => { if (op === 'D') { late = reply; return true; } return false; };
  const activation = client.activate('new history'); await tick(); client.close();
  await assert.rejects(activation, /Session closed/);
  client.receive(late);
  assert.equal(server.active, 'previous');
  server.hook = undefined;
  assert.equal(await server.connect('fedcba9876543210').open(), 'previous');
});

test('interrupted staged readback cannot activate or change the prior value', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  server.hook = ({ op, frame }) => {
    if (op === 'R' && frame.slice(31, 32) === '3') { client.close(); return true; }
    return false;
  };
  await assert.rejects(client.activate('new history'), /Session closed/);
  assert.equal(server.active, 'previous');
  assert.equal(server.frames.some(frame => frame[23] === 'K'), false);
  server.hook = undefined;
  assert.equal(await server.connect('fedcba9876543210').open(), 'previous');
});

test('closing immediately after activation reconciles the committed value on reopen', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  let late;
  server.hook = ({ op, reply }) => { if (op === 'K') { late = reply; client.close(); return true; } return false; };
  await assert.rejects(client.activate('new history'), /Session closed/);
  assert.equal(server.active, 'new history');
  server.hook = undefined;
  const reopened = server.connect('fedcba9876543210');
  const opening = reopened.open();
  reopened.receive(late);
  assert.equal(await opening, 'new history');
});

test('lost activation acknowledgement remains uncertain and reconnect reads committed state', async () => {
  const server = new PapyrusProbe(); const client = server.connect(); await client.open();
  server.hook = ({ op }) => op === 'K';
  await assert.rejects(client.activate('new history'), /No response/);
  assert.equal(server.active, 'new history');
  server.hook = undefined;
  assert.equal(await server.connect('fedcba9876543210').open(), 'new history');
});
