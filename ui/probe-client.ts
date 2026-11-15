import { bytes } from './protocol.ts';
import { splitNarrative } from './narrative.ts';

type Pending = { id: string; op: string; resolve: (value: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

export class ProbeClient {
  private sequence = 0;
  private pending: Pending | undefined;
  private closed = false;
  private session: string;
  private send: (frame: string) => void;
  private timeoutMs: number;
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
    if (this.closed || this.pending || bytes(value) > 160 || this.sequence >= 9999) return Promise.reject(new Error('Bridge unavailable'));
    const id = this.session + String(++this.sequence).padStart(4, '0');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending = undefined; this.closed = true; reject(new Error('No response; reopen to check active state')); }, this.timeoutMs);
      this.pending = { id, op, resolve, reject, timer };
      try { this.send(`3|${id}|${op}|Q|${String(bytes(value)).padStart(3, '0')}|${value}`); }
      catch (error) { this.close(); }
    });
  }
  receive(frame: string): void {
    const match = /^3\|([0-9a-f]{16}[0-9]{4})\|([OBDSRK])\|([SE])\|([0-9]{3})\|/.exec(frame);
    const pending = this.pending;
    if (!match || !pending || pending.id !== match[1] || pending.op !== match[2]) return;
    const value = frame.slice(match[0].length);
    if (bytes(value) !== Number(match[4]) || bytes(value) > 160) return;
    this.pending = undefined;
    clearTimeout(pending.timer);
    if (match[3] === 'E') { this.closed = true; pending.reject(new Error('Game rejected the request')); }
    else pending.resolve(value);
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
  async open(): Promise<string> { await this.request('O'); return this.read('0'); }
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
