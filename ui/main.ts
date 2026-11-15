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
const diagnostic = document.querySelector<HTMLElement>('#diagnostic')!;
const refreshDiagnostic = document.querySelector<HTMLButtonElement>('#refresh-diagnostic')!;
let client: ProbeClient | undefined;
let diagnosticClient: ProbeClient | undefined;
let ready = false;
let busy = false;
function update(): void {
  count.textContent = `${bytes(description.value)} / 2048 bytes`;
  apply.disabled = !ready || busy;
  close.disabled = false;
  refreshDiagnostic.disabled = busy || !window.magelight;
}
window.lpReceive = frame => { client?.receive(frame); diagnosticClient?.receive(frame); };
function newSession(): string {
  const random = new Uint8Array(8); crypto.getRandomValues(random);
  return Array.from(random, value => value.toString(16).padStart(2, '0')).join('');
}
async function diagnose(): Promise<void> {
  if (!window.magelight || diagnosticClient) return;
  const current = new ProbeClient(newSession(), frame => window.magelight!.send('lpEvent', frame));
  diagnosticClient = current;
  try {
    const result = await current.diagnose();
    if (diagnosticClient === current) diagnostic.textContent = `Storage diagnostic: ${result}`;
  } catch (error) {
    if (diagnosticClient === current) diagnostic.textContent = `Storage diagnostic unavailable: ${String(error)}`;
  } finally {
    if (diagnosticClient === current) diagnosticClient = undefined;
    current.close();
  }
}
async function open(): Promise<void> {
  client?.close();
  client = undefined; ready = false; busy = false; description.value = ''; update();
  if (!window.magelight) { status.textContent = 'Browser preview'; return; }
  const current = new ProbeClient(newSession(), frame => window.magelight!.send('lpEvent', frame));
  client = current;
  await diagnose();
  if (client !== current) return;
  try {
    const active = await current.open();
    if (client !== current) return;
    description.value = active; ready = true; status.textContent = 'Connected';
    feedback.textContent = `Active probe readback: ${bytes(active)} bytes. Save your game after activation.`;
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
function cancelSession(): void { const current = client; client = undefined; const diagnostics = diagnosticClient; diagnosticClient = undefined; ready = false; busy = false; current?.close(); diagnostics?.close(); update(); }
refreshDiagnostic.addEventListener('click', () => void diagnose());
close.addEventListener('click', () => { cancelSession(); window.magelight?.send('lpClose', 'close'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void open(); else cancelSession(); });
if (document.visibilityState === 'visible') void open();
