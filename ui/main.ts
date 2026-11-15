import './style.css';
import { splitNarrative } from './narrative';
import { bytes } from './protocol';

declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
const description = document.querySelector<HTMLTextAreaElement>('#description')!;
const status = document.querySelector<HTMLElement>('#status')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const close = document.querySelector<HTMLButtonElement>('#close')!;
const count = document.querySelector<HTMLElement>('#count')!;
let session = '';
let sequence = 0;
let ready = false;
let busy = false;
let pending: { id: string; op: string; resolve: (text: string) => void; reject: (reason: Error) => void; timer: number } | undefined;

function update(): void {
  count.textContent = `${bytes(description.value)} / 2048 bytes`;
  apply.disabled = !ready || busy;
  close.disabled = !ready || busy;
}
function request(op: string, value = ''): Promise<string> {
  if (!window.magelight || !session || pending || bytes(value) > 160) return Promise.reject(new Error('Bridge unavailable'));
  const id = session + String(++sequence).padStart(4, '0');
  if (sequence > 9999) return Promise.reject(new Error('Session exhausted'));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { pending = undefined; reject(new Error('No response. Reopen to check active state.')); }, 5000);
    pending = { id, op, resolve, reject, timer };
    window.magelight!.send('lpEvent', `3|${id}|${op}|Q|${String(bytes(value)).padStart(3, '0')}|${value}`);
  });
}
window.lpReceive = (frame: string): void => {
  const match = /^3\|([0-9a-f]{16}[0-9]{4})\|([OBDSRK])\|([SE])\|([0-9]{3})\|/.exec(frame);
  if (!match || !pending || pending.id !== match[1] || pending.op !== match[2]) return;
  const value = frame.slice(match[0].length);
  if (bytes(value) !== Number(match[4]) || bytes(value) > 160) return;
  const current = pending;
  pending = undefined;
  clearTimeout(current.timer);
  if (match[3] === 'E') current.reject(new Error('Game rejected the request.'));
  else current.resolve(value);
};
async function read(slot: string): Promise<string> {
  let result = '';
  while (true) {
    const part = await request('R', slot + String(bytes(result)).padStart(4, '0'));
    if (!part) return result;
    result += part;
    if (bytes(result) > 2048) throw new Error('Stored narrative exceeds limit');
  }
}
async function open(): Promise<void> {
  if (pending) { clearTimeout(pending.timer); pending.reject(new Error('Session closed')); pending = undefined; }
  session = ''; ready = false; busy = false; description.value = ''; update();
  if (!window.magelight) { status.textContent = 'Browser preview'; return; }
  const random = new Uint8Array(8); crypto.getRandomValues(random);
  session = Array.from(random, value => value.toString(16).padStart(2, '0')).join('');
  sequence = 0;
  try {
    await request('O');
    description.value = await read('0');
    ready = true; status.textContent = 'Connected';
    feedback.textContent = 'Active probe loaded. Save your game after activation.';
  } catch (error) { status.textContent = 'Unavailable'; feedback.textContent = String(error); }
  update();
}
apply.addEventListener('click', async () => {
  try {
    const text = description.value;
    const chunks = splitNarrative(text);
    busy = true; update();
    await request('B', String(bytes(text)).padStart(4, '0'));
    let offset = 0;
    for (const chunk of chunks) {
      const payload = String(offset).padStart(4, '0') + chunk;
      if (await request('D', payload) !== payload) throw new Error('Chunk mismatch');
      offset += bytes(chunk);
    }
    await request('S');
    if (await read('3') !== text) throw new Error('Storage readback mismatch');
    await request('K');
    if (await read('0') !== text) throw new Error('Activation readback mismatch');
    feedback.textContent = 'Probe activated and read back. Save your game.';
  } catch (error) { ready = false; feedback.textContent = String(error) + ' Reopen to check active state.'; }
  busy = false; update();
});
description.addEventListener('input', update);
close.addEventListener('click', () => window.magelight?.send('lpClose', 'close'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void open(); else { session = ''; ready = false; update(); } });
if (document.visibilityState === 'visible') void open();
