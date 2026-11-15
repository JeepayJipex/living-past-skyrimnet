import './style.css';
import { splitNarrative } from './narrative';
import { bytes } from './protocol';
import { ProbeClient } from './probe-client';

declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
const description = document.querySelector<HTMLTextAreaElement>('#description')!;
const status = document.querySelector<HTMLElement>('#status')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const close = document.querySelector<HTMLButtonElement>('#close')!;
const count = document.querySelector<HTMLElement>('#count')!;
let client: ProbeClient | undefined;
let ready = false;
let busy = false;
function update(): void {
  count.textContent = `${bytes(description.value)} / 2048 bytes`;
  apply.disabled = !ready || busy;
  close.disabled = false;
}
window.lpReceive = frame => client?.receive(frame);
async function open(): Promise<void> {
  client?.close();
  client = undefined; ready = false; busy = false; description.value = ''; update();
  if (!window.magelight) { status.textContent = 'Browser preview'; return; }
  const random = new Uint8Array(8); crypto.getRandomValues(random);
  const session = Array.from(random, value => value.toString(16).padStart(2, '0')).join('');
  const current = new ProbeClient(session, frame => window.magelight!.send('lpEvent', frame));
  client = current;
  try {
    const active = await current.open();
    if (client !== current) return;
    description.value = active; ready = true; status.textContent = 'Connected';
    feedback.textContent = 'Active probe loaded. Save your game after activation.';
  } catch (error) {
    if (client !== current) return;
    status.textContent = 'Unavailable'; feedback.textContent = String(error);
  }
  update();
}
apply.addEventListener('click', async () => {
  const current = client;
  const text = description.value;
  if (!current || !ready || busy) return;
  try { splitNarrative(text); } catch (error) { feedback.textContent = String(error); return; }
  busy = true; update();
  try {
    await current.activate(text);
    if (client !== current) return;
    feedback.textContent = 'Probe activated and read back. Save your game.';
  } catch (error) {
    if (client !== current) return;
    ready = false; feedback.textContent = String(error) + ' Reopen to check active state.';
  }
  busy = false; update();
});
description.addEventListener('input', update);
function cancelSession(): void { const current = client; client = undefined; ready = false; busy = false; current?.close(); update(); }
close.addEventListener('click', () => { cancelSession(); window.magelight?.send('lpClose', 'close'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void open(); else cancelSession(); });
if (document.visibilityState === 'visible') void open();
