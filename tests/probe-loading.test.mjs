import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProbeClient } from '../ui/probe-client.ts';
import { splitNarrative } from '../ui/narrative.ts';
import { bytes } from '../ui/protocol.ts';

const fixture = 'Unicode 😀 é\r\n\\%0A|'.repeat(80);
const narrative = fixture + 'x'.repeat(2048 - bytes(fixture));
const session = '0123456789abcdef';

function bridge({ delay = 0, alter = values => values } = {}) {
  const operations = [];
  const client = new ProbeClient(session, frame => {
    const op = frame[23];
    operations.push(op);
    const wide = op === 'L' || op === 'P';
    const payload = frame.slice(wide ? 32 : 31);
    const chunks = splitNarrative(narrative);
    const reply = (status, value) => frame.slice(0, 25) + status + '|'
      + String(bytes(value)).padStart(wide ? 4 : 3, '0') + '|' + value;
    let responses;
    if (op === 'O') responses = [reply('S', '1')];
    if (op === 'L') responses = [reply('S', '2|1|' + narrative)];
    if (op === 'P') responses = [reply('S', payload)];
    if (op === 'J') {
      const offset = Number(payload.slice(1));
      let next = 0;
      const chunk = chunks.find(value => {
        const start = next;
        next += bytes(value);
        return start === offset;
      });
      responses = [reply('S', '2|1|' + (chunk ?? ''))];
    }
    if (op === 'T') {
      let offset = 0;
      responses = chunks.map(chunk => {
        const frame = reply('C', offset + '|' + chunk);
        offset += bytes(chunk);
        return frame;
      });
      responses.push(reply('S', '2|1|' + offset));
    }
    const deliver = () => alter(responses, op).forEach(response => client.receive(response));
    if (delay) setTimeout(deliver, delay);
    else queueMicrotask(deliver);
  }, 100);
  return { client, operations };
}

test('index loads alone and each transport preserves an exact 2 KiB selection', async t => {
  for (const mode of ['baseline', 'batch', 'large']) {
    const { client, operations } = bridge({ delay: 8 });
    assert.equal(await client.openIndex(), 1);
    assert.deepEqual(operations, ['O']);
    const metrics = await client.load(mode);
    assert.equal(metrics.text, narrative);
    if (mode === 'baseline') {
      assert.equal(metrics.roundTrips, splitNarrative(narrative).length + 1);
      assert.equal(metrics.reads, metrics.roundTrips);
    } else {
      assert.equal(metrics.roundTrips, 1);
      assert.equal(metrics.reads, 1);
      assert.equal(metrics.replies, mode === 'batch' ? splitNarrative(narrative).length + 1 : 1);
    }
    t.diagnostic(mode + ': ' + Math.round(metrics.transferMs) + ' ms with simulated 8 ms per request');
    client.close();
  }
});

test('batch rejects missing chunks, a wrong final length, duplicates and reordering', async () => {
  for (const [alter, expected] of [
    [frames => frames.slice(0, -2).concat(frames.at(-1)), /Incomplete batch/],
    [frames => frames.slice(0, -1).concat(frames.at(-1).replace(/2048$/, '2047')), /Incomplete batch/],
    [frames => [frames[0], ...frames], /Session closed/],
    [frames => [frames[1], frames[0], ...frames.slice(2)], /Session closed/],
  ]) {
    const { client } = bridge({ alter: (responses, op) => op === 'T' ? alter(responses) : responses });
    await client.openIndex();
    await assert.rejects(client.load('batch'), expected);
  }
});

test('closing a batch prevents late frames from satisfying a new session', async () => {
  let late;
  const { client } = bridge({ alter: (responses, op) => {
    if (op !== 'T') return responses;
    late = responses;
    return responses.slice(0, 1);
  } });
  await client.openIndex();
  const pending = client.load('batch');
  await Promise.resolve();
  client.close();
  await assert.rejects(pending, /Session closed/);
  for (const frame of late) client.receive(frame);
  await assert.rejects(client.load('batch'), /Bridge unavailable/);
  const reopened = new ProbeClient('fedcba9876543210', () => {}, 10);
  const request = reopened.load('batch');
  for (const frame of late) reopened.receive(frame);
  await assert.rejects(request, /No response/);
});

test('wide echo supports the bounded test envelope and detects corruption', async () => {
  const { client } = bridge();
  await client.openIndex();
  await client.measurePayload(narrative.repeat(2));
  await assert.rejects(client.measurePayload(narrative.repeat(2) + 'x'), /Bridge unavailable/);
  const corrupt = bridge({ alter: (frames, op) => op === 'P' ? frames.map(frame => frame.slice(0, -1) + '?') : frames });
  await corrupt.client.openIndex();
  await assert.rejects(corrupt.client.measurePayload(narrative), /Payload echo mismatch/);
  const truncated = bridge({ alter: (frames, op) => op === 'L' ? frames.map(frame => frame.slice(0, -1)) : frames });
  await truncated.client.openIndex();
  await assert.rejects(truncated.client.load('large'), /No response/);
});
