export type EventName = 'open' | 'draft.changed' | 'validate' | 'apply' | 'close';
export type Request = { protocol: 1; id: string; type: EventName; payload: { origin: string; biography: string } };

// One instance belongs to one visible session. The UI owns timeout scheduling.
export class Protocol {
  private pending = new Map<string, string>();
  private sequence = 0;
  private session: string;
  connected = false;
  constructor(session: string) { this.session = session; }

  request(type: EventName, payload: Request['payload']): Request {
    const request: Request = { protocol: 1, id: `${this.session}-${++this.sequence}`, type, payload };
    this.pending.set(request.id, JSON.stringify(request));
    return request;
  }

  timeout(id: string): boolean { return this.pending.delete(id); }

  receive(raw: string): { kind: 'verified'; request: Request } | { kind: 'invalid' | 'unknown' | 'mismatch' } {
    let response: { protocol?: unknown; correlationId?: unknown; type?: unknown; status?: unknown; request?: Request };
    try { response = JSON.parse(raw); } catch { return { kind: 'invalid' }; }
    if (!response || typeof response !== 'object' || response.protocol !== 1 || response.type !== 'echo' || response.status !== 'ok' || typeof response.correlationId !== 'string') return { kind: 'invalid' };
    const expected = this.pending.get(response.correlationId);
    if (!expected) return { kind: 'unknown' };
    if (!response.request || response.request.id !== response.correlationId || JSON.stringify(response.request) !== expected) return { kind: 'mismatch' };
    this.pending.delete(response.correlationId);
    this.connected = true;
    return { kind: 'verified', request: response.request };
  }
}
