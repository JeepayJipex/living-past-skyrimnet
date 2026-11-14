import './style.css';
import { Protocol, type EventName } from './protocol';
declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
const origin = document.querySelector<HTMLInputElement>('#origin')!;
const biography = document.querySelector<HTMLTextAreaElement>('#biography')!;
const status = document.querySelector<HTMLElement>('#bridge-status')!;
const feedback = document.querySelector<HTMLElement>('#draft-feedback')!;
const eventLog = document.querySelector<HTMLOListElement>('#event-log')!;
const closeButton = document.querySelector<HTMLButtonElement>('#close')!;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let protocol: Protocol | undefined;
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
  if (!protocol || document.visibilityState !== 'visible') return;
  const current = protocol;
  const request = current.request(type, { origin: origin.value, biography: biography.value });
  const serialized = JSON.stringify(request);
  const timer = setTimeout(() => { timers.delete(request.id); if (current.timeout(request.id)) log(`Timed out: ${type} (${request.id})`); }, 5000);
  timers.set(request.id, timer);
  window.magelight.send('lpEvent', serialized);
  log(`Sent: ${type} (${request.id})`);
}
window.lpReceive = (raw: string): void => {
  const result = protocol?.receive(raw);
  if (!result) return;
  if (result.kind !== 'verified') { log(`Ignored response: ${result.kind}`); return; }
  const { request } = result;
  clearTimeout(timers.get(request.id)); timers.delete(request.id); connection(protocol?.connected === true);
  log(`Verified: ${request.type} (${request.id})`);
  if (request.type === 'close') window.magelight?.send('lpClose', JSON.stringify({ protocol: 1, id: request.id, type: 'close' }));
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
function reset(): void {
  clearTimeout(draftTimer); draftTimer = undefined;
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear(); protocol = undefined; lastDraft = ''; connection(false);
}
function opened(): void {
  reset();
  protocol = new Protocol(`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
  send('open');
}
if (document.visibilityState === 'visible' && window.magelight) opened();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') opened();
  else reset();
});
