export type Operation = 'O' | 'A' | 'C';
const encoder = new TextEncoder();
export const bytes = (value: string): number => encoder.encode(value).length;
export function validText(value: string): boolean {
  return value.trim().length > 0 && bytes(value) <= 160 && !/[\x00-\x1f\x7f]/.test(value);
}
export class Protocol {
  private sequence = 0;
  private pending = new Map<string, { operation: Operation; text: string }>();
  private session: string;
  constructor(session: string) {
    this.session = session;
    if (!/^[0-9a-f]{16}$/.test(session)) throw new Error('Invalid session');
  }
  request(operation: Operation, text = ''): { id: string; frame: string } {
    if (operation === 'A' && !validText(text)) throw new Error('Invalid relationship');
    if (operation !== 'A' && text !== '') throw new Error('Unexpected text');
    if (this.sequence >= 9999) throw new Error('Session exhausted');
    const id = this.session + String(++this.sequence).padStart(4, '0');
    this.pending.set(id, { operation, text });
    return { id, frame: `2|${id}|${operation}|Q|${String(bytes(text)).padStart(3, '0')}|${text}` };
  }
  timeout(id: string): boolean { return this.pending.delete(id); }
  receive(frame: string): { kind: 'verified'; id: string; operation: Operation; status: string; text: string } | { kind: 'invalid' | 'unknown' | 'mismatch' } {
    const match = /^2\|([0-9a-f]{16}[0-9]{4})\|([OAC])\|([SE])\|([0-9]{3})\|/.exec(frame);
    if (!match) return { kind: 'invalid' };
    const text = frame.slice(match[0].length);
    if (bytes(text) !== Number(match[4]) || bytes(text) > 160 || /[\x00-\x1f\x7f]/.test(text)) return { kind: 'invalid' };
    const pending = this.pending.get(match[1]);
    if (!pending) return { kind: 'unknown' };
    if (pending.operation !== match[2] || (match[3] === 'S' && pending.operation === 'A' && pending.text !== text)) return { kind: 'mismatch' };
    this.pending.delete(match[1]);
    return { kind: 'verified', id: match[1], operation: pending.operation, status: match[3], text };
  }
}
