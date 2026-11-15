import { bytes } from './protocol.ts';
import { splitNarrative } from './narrative.ts';

type Pending = { id: string; op: string; chunks: string; resolve: (value: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
export type LoadMode = 'baseline' | 'batch' | 'large';
const wideFrame = (op: string) => op === 'L' || op === 'P';

export class ProbeClient {
  private sequence = 0;
  private pending: Pending | undefined;
  private closed = false;
  private session: string;
  private send: (frame: string) => void;
  private timeoutMs: number;
  private replies = 0;
  constructor(session: string, send: (frame: string) => void, timeoutMs = 5000) {
    if (!/^[0-9a-f]{16}$/.test(session)) throw new Error('Invalid session');
    this.session = session;
    this.send = send;
    this.timeoutMs = timeoutMs;
  }
  close(): void {
    this.closed = true;
    const pending = this.pending;
    this.pending = undefined;
    if (pending) { clearTimeout(pending.timer); pending.reject(new Error('Session closed; reopen to check active state')); }
  }
  request(op: string, value = ''): Promise<string> {
    const wide = wideFrame(op);
    if (this.closed || this.pending || bytes(value) > (wide ? 4096 : 160) || this.sequence >= 9999) return Promise.reject(new Error('Bridge unavailable'));
    const id = this.session + String(++this.sequence).padStart(4, '0');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending = undefined; this.closed = true; reject(new Error('No response; reopen to check active state')); }, this.timeoutMs);
      this.pending = { id, op, chunks: '', resolve, reject, timer };
      try { this.send(`3|${id}|${op}|Q|${String(bytes(value)).padStart(wide ? 4 : 3, '0')}|${value}`); }
      catch (error) { this.close(); }
    });
  }
  receive(frame: string): void {
    const match = /^3\|([0-9a-f]{16}[0-9]{4})\|([OBDSRKXTJLP])\|([SEC])\|([0-9]{3,4})\|/.exec(frame);
    const pending = this.pending;
    if (!match || !pending || pending.id !== match[1] || pending.op !== match[2]) return;
    const value = frame.slice(match[0].length);
    const wide = wideFrame(pending.op);
    if (match[4].length !== (wide ? 4 : 3) || bytes(value) !== Number(match[4]) || bytes(value) > (wide ? 4096 : 160)) return;
    this.replies += 1;
    if (match[3] === 'C') {
      const chunk = /^(\d{1,4})\|([\s\S]+)$/.exec(value);
      if (pending.op !== 'T' || !chunk || Number(chunk[1]) !== bytes(pending.chunks) || bytes(chunk[2]) > 128 || bytes(pending.chunks + chunk[2]) > 2048) {
        this.close();
        return;
      }
      pending.chunks += chunk[2];
      return;
    }
    this.pending = undefined;
    clearTimeout(pending.timer);
    if (match[3] === 'E') { this.closed = true; pending.reject(new Error('Game rejected the request')); }
    else if (pending.op === 'T') {
      const end = /^(\d+\|\d+\|)(\d+)$/.exec(value);
      if (!end || Number(end[2]) !== bytes(pending.chunks)) {
        this.closed = true;
        pending.reject(new Error('Incomplete batch read'));
      } else pending.resolve(end[1] + pending.chunks);
    } else pending.resolve(value);
  }
  async read(slot: string): Promise<string> {
    let result = '';
    while (true) {
      const part = await this.request('R', slot + String(bytes(result)).padStart(4, '0'));
      if (!part) return result;
      result += part;
      if (bytes(result) > 2048) { this.close(); throw new Error('Stored narrative exceeds limit'); }
    }
  }
  async openIndex(): Promise<number> {
    const value = await this.request('O');
    if (!/^[012]$/.test(value)) throw new Error('Invalid active slot');
    return Number(value);
  }
  async open(): Promise<string> { await this.openIndex(); return this.read('0'); }
  async load(mode: LoadMode) {
    const started = performance.now();
    const startSequence = this.sequence;
    const startReplies = this.replies;
    let text = '';
    let storageMs = 0;
    let reads = 0;
    do {
      const reply = mode === 'baseline'
        ? await this.request('J', '0' + String(bytes(text)).padStart(4, '0'))
        : await this.request(mode === 'batch' ? 'T' : 'L');
      const parts = /^(\d+)\|([01])\|([\s\S]*)$/.exec(reply);
      if (!parts) throw new Error('Invalid load metrics');
      storageMs += Number(parts[1]);
      reads += Number(parts[2]);
      text += parts[3];
      if (bytes(text) > 2048) throw new Error('Stored narrative exceeds limit');
      if (mode !== 'baseline' || !parts[3]) break;
    } while (true);
    return { text, storageMs, reads, roundTrips: this.sequence - startSequence, replies: this.replies - startReplies, transferMs: performance.now() - started };
  }
  async measurePayload(value: string): Promise<void> {
    if (await this.request('P', value) !== value) throw new Error('Payload echo mismatch');
  }
  async diagnose(): Promise<string> { return this.request('X'); }
  async activate(text: string): Promise<void> {
    const chunks = splitNarrative(text);
    try {
      await this.request('B', String(bytes(text)).padStart(4, '0'));
      let offset = 0;
      for (const chunk of chunks) {
        const payload = String(offset).padStart(4, '0') + chunk;
        if (await this.request('D', payload) !== payload) throw new Error('Chunk mismatch');
        offset += bytes(chunk);
      }
      await this.request('S');
      if (await this.read('3') !== text) throw new Error('Storage readback mismatch');
      await this.request('K');
      if (await this.read('0') !== text) throw new Error('Activation readback mismatch');
    } catch (error) { this.close(); throw error; }
  }
}
