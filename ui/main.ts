import './style.css';
import { Protocol, validText, bytes, type Operation } from './protocol';
declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
const description = document.querySelector<HTMLTextAreaElement>('#description')!;
const status = document.querySelector<HTMLElement>('#status')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const close = document.querySelector<HTMLButtonElement>('#close')!;
const count = document.querySelector<HTMLElement>('#count')!;
let protocol: Protocol | undefined;
let ready = false;
let busy = false;
let uncertain = false;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function update(): void {
  count.textContent = `${bytes(description.value)} / 160 bytes`;
  apply.disabled = !ready || busy || uncertain || !validText(description.value);
  close.disabled = !ready;
}
function send(operation: Operation, text = ''): void {
  if (!protocol || !window.magelight || document.visibilityState !== 'visible') return;
  const current = protocol;
  const request = current.request(operation, text);
  if (operation === 'A') busy = true;
  update();
  timers.set(request.id, setTimeout(() => {
    timers.delete(request.id);
    if (current.timeout(request.id)) {
      if (operation === 'A') { busy = false; uncertain = true; }
      feedback.textContent = 'No response. Reopen the editor to check the stored relationship.';
      update();
    }
  }, 5000));
  window.magelight.send('lpEvent', request.frame);
}
window.lpReceive = (frame: string): void => {
  const result = protocol?.receive(frame);
  if (!result || result.kind !== 'verified') return;
  clearTimeout(timers.get(result.id)); timers.delete(result.id);
  if (result.status === 'E') {
    busy = false;
    feedback.textContent = 'Relationship unavailable. Check the game dependencies and logs.';
  } else if (result.operation === 'O') {
    description.value = result.text; ready = true; status.textContent = 'Connected';
    feedback.textContent = result.text ? 'Stored relationship loaded.' : 'No relationship has been applied.';
  } else if (result.operation === 'A') {
    busy = false; feedback.textContent = 'Applied. Save your game to keep it.';
  } else {
    window.magelight?.send('lpClose', 'close');
  }
  update();
};
function reset(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear(); protocol = undefined; ready = false; busy = false; uncertain = false; description.value = '';
  status.textContent = window.magelight ? 'Connecting' : 'Browser preview'; update();
}
function open(): void {
  reset();
  if (!window.magelight) return;
  const random = new Uint8Array(8); crypto.getRandomValues(random);
  protocol = new Protocol(Array.from(random, value => value.toString(16).padStart(2, '0')).join(''));
  send('O');
}
description.addEventListener('input', update);
apply.addEventListener('click', () => send('A', description.value));
close.addEventListener('click', () => send('C'));
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? open() : reset());
if (document.visibilityState === 'visible') open(); else reset();
