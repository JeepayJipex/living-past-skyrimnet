import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChronicleClient } from '../ui/chronicle-client.ts';
import { bytes } from '../ui/protocol.ts';

class Game {
  actors = new Map([['1', { revision: 0, label: '', text: '' }], ['2', { revision: 0, label: '', text: '' }]]);
  selected = '';
  staged = '';
  draft = '';
  label = '';
  client;
  failRead = false;
  connect(id = '0123456789abcdef') { this.client = new ChronicleClient(id, frame => this.handle(frame), 100); return this.client; }
  handle(frame) {
    const id = frame.slice(2, 22), op = frame[23];
    const value = frame.slice(op === 'L' || op === 'P' ? 32 : 31);
    if (op === 'O') this.selected = value;
    const actor = this.actors.get(this.selected);
    let result = '', ok = !!actor;
    if (actor) {
      if (op === 'O') result = `${actor.revision}|${actor.label}`;
      if (op === 'H') { this.label = value; result = value; }
      if (op === 'B') this.draft = '';
      if (op === 'D') { this.draft += value.slice(4); result = value; }
      if (op === 'S') this.staged = this.draft;
      if (op === 'R') {
        const text = value[0] === '3' ? this.staged : actor.text;
        const offset = Number(value.slice(1));
        let used = 0;
        for (const ch of text) { const size = bytes(ch); if (used >= offset && bytes(result) + size <= 128) result += ch; else if (used >= offset) break; used += size; }
        if (this.failRead && value[0] === '3') result = '';
      }
      if (op === 'K') { actor.text = this.staged; actor.label = this.label; actor.revision++; }
      if (op === 'L') result = `0|1|${bytes(actor.text)}|${actor.text}`;
    }
    const wide = op === 'L' || op === 'P';
    const reply = `4|${id}|${op}|${ok ? 'S' : 'E'}|${String(bytes(result)).padStart(wide ? 4 : 3, '0')}|${result}`;
    queueMicrotask(() => this.client?.receive(reply));
  }
}

test('two actors keep independent labels, histories and revisions', async () => {
  const game = new Game(); let client = game.connect();
  assert.deepEqual(await client.openIndex('1'), { revision: 0, label: '' });
  await client.activate('Old friend', 'A shared past.');
  client = game.connect('fedcba9876543210'); await client.openIndex('2');
  await client.activate('Rival', 'A different past.');
  client = game.connect('aaaaaaaaaaaaaaaa');
  assert.deepEqual(await client.openIndex('1'), { revision: 1, label: 'Old friend' });
  assert.equal((await client.load('large')).text, 'A shared past.');
  client = game.connect('bbbbbbbbbbbbbbbb');
  assert.deepEqual(await client.openIndex('2'), { revision: 1, label: 'Rival' });
  assert.equal((await client.load('large')).text, 'A different past.');
});

test('failed staged readback preserves both active relationships', async () => {
  const game = new Game(); let client = game.connect(); await client.openIndex('1'); await client.activate('Friend', 'Original');
  client = game.connect('fedcba9876543210'); await client.openIndex('2'); await client.activate('Rival', 'Other');
  client = game.connect('aaaaaaaaaaaaaaaa'); await client.openIndex('1'); game.failRead = true;
  await assert.rejects(client.activate('New label', 'Changed'), /readback mismatch/);
  assert.deepEqual(game.actors.get('1'), { revision: 1, label: 'Friend', text: 'Original' });
  assert.deepEqual(game.actors.get('2'), { revision: 1, label: 'Rival', text: 'Other' });
});

test('unknown actor is rejected', async () => {
  const game = new Game(); await assert.rejects(game.connect().openIndex('3'), /rejected/);
});

test('fallback checks the same actor and revision before retrying', async () => {
  const game = new Game(); let first = game.connect(); await first.openIndex('1'); await first.activate('Friend', 'Original');
  first = game.connect('aaaaaaaaaaaaaaaa'); const entry = await first.openIndex('1');
  first.load = async () => { throw new Error('Large reply failed'); };
  game.actors.get('1').revision++;
  await assert.rejects(first.loadPreferred('1', entry.revision, () => game.connect('bbbbbbbbbbbbbbbb')), /changed/);
});
