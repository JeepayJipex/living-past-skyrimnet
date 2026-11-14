import './style.css';
declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
type EventName = 'open' | 'draft.changed' | 'validate' | 'apply' | 'close';
type Request = { protocol: 1; id: string; type: EventName; payload: { origin: string; biography: string } };
const origin = document.querySelector<HTMLInputElement>('#origin')!;
const biography = document.querySelector<HTMLTextAreaElement>('#biography')!;
const status = document.querySelector<HTMLElement>('#bridge-status')!;
const feedback = document.querySelector<HTMLElement>('#draft-feedback')!;
const eventLog = document.querySelector<HTMLOListElement>('#event-log')!;
const closeButton = document.querySelector<HTMLButtonElement>('#close')!;
const pending = new Map<string, { request: string; timer: ReturnType<typeof setTimeout> }>();
const session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
let sequence = 0;
let draftTimer: ReturnType<typeof setTimeout> | undefined;
let lastDraft = '';
function log(message: string): void {
  const item = document.createElement('li'); item.textContent = message; eventLog.prepend(item);
  while (eventLog.children.length > 8) eventLog.lastElementChild?.remove();
}
function connection(value: boolean): void {
  closeButton.disabled = !value;
  status.textContent = value ? 'Papyrus bridge connected' : window.magelight ? 'Papyrus bridge unavailable — use Insert or Escape to close' : 'Browser preview';
}
function send(type: EventName): void {
  if (!window.magelight) { log(`Preview only: ${type}`); return; }
  const request: Request = { protocol: 1, id: `${session}-${++sequence}`, type, payload: { origin: origin.value, biography: biography.value } };
  const serialized = JSON.stringify(request);
  const timer = setTimeout(() => { pending.delete(request.id); connection(false); log(`Timed out: ${type} (${request.id})`); }, 5000);
  pending.set(request.id, { request: serialized, timer });
  window.magelight.send('lpEvent', serialized);
  log(`Sent: ${type} (${request.id})`);
}
window.lpReceive = (raw: string): void => {
  try {
    const response = JSON.parse(raw) as { protocol: number; correlationId: string; type: string; status: string; request: Request };
    if (response.protocol !== 1 || response.type !== 'echo' || response.status !== 'ok' || typeof response.correlationId !== 'string') throw new Error();
    const entry = pending.get(response.correlationId);
    if (!entry) { log('Ignored duplicate or unknown response'); return; }
    if (JSON.stringify(response.request) !== entry.request || response.request.id !== response.correlationId) throw new Error();
    clearTimeout(entry.timer); pending.delete(response.correlationId); connection(true);
    log(`Verified: ${response.request.type} (${response.correlationId})`);
    if (response.request.type === 'close') window.magelight?.send('lpClose', JSON.stringify({ protocol: 1, id: response.correlationId, type: 'close' }));
  } catch { connection(false); log('Invalid response or payload mismatch'); }
};
connection(false);
for (const field of [origin, biography]) field.addEventListener('input', () => {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const draft = JSON.stringify([origin.value, biography.value]);
    if (draft !== lastDraft) { lastDraft = draft; send('draft.changed'); }
  }, 300);
});
document.querySelector<HTMLButtonElement>('#validate')!.addEventListener('click', () => {
  feedback.textContent = origin.value.trim() && biography.value.trim() ? 'Draft contains both fields; game validation is not implemented.' : 'Enter an origin and a short biography.';
  send('validate');
});
document.querySelector<HTMLButtonElement>('#apply')!.addEventListener('click', () => { feedback.textContent = 'Dry run only. No profile or game state was changed.'; send('apply'); });
closeButton.addEventListener('click', () => send('close'));
function opened(): void { connection(false); send('open'); }
if (document.visibilityState === 'visible' && window.magelight) opened();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') opened();
  else { connection(false); for (const entry of pending.values()) clearTimeout(entry.timer); pending.clear(); }
});
