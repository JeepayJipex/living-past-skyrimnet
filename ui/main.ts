import './style.css';
import { splitNarrative } from './narrative';
import { bytes } from './protocol';
import { ProbeClient } from './probe-client';

declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void } }
const description = document.querySelector<HTMLTextAreaElement>('#description')!;
const replaceDraft = document.querySelector<HTMLButtonElement>('#replace-draft')!;
const exactText = document.querySelector<HTMLInputElement>('#exact-text')!;
const status = document.querySelector<HTMLElement>('#status')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const close = document.querySelector<HTMLButtonElement>('#close')!;
const count = document.querySelector<HTMLElement>('#count')!;
const diagnostic = document.querySelector<HTMLElement>('#diagnostic')!;
const refreshDiagnostic = document.querySelector<HTMLButtonElement>('#refresh-diagnostic')!;
const index = document.querySelector<HTMLElement>('#relationship-index')!;
const loadNarrative = document.querySelector<HTMLButtonElement>('#load-narrative')!;
const loadMetrics = document.querySelector<HTMLElement>('#load-metrics')!;
let client: ProbeClient | undefined;
let diagnosticClient: ProbeClient | undefined;
let ready = false;
let busy = false;
let activeSlot = 0;
let loaded = false;
let draft = '';
function showDraft(text: string): void {
  draft = text;
  description.value = text;
  description.readOnly = text.includes('\r');
  replaceDraft.hidden = !description.readOnly;
  exactText.value = JSON.stringify(text);
}
function update(): void {
  count.textContent = `${bytes(draft)} / 2048 bytes`;
  apply.disabled = !ready || busy || (activeSlot !== 0 && !loaded);
  close.disabled = false;
  refreshDiagnostic.disabled = busy || !window.magelight;
  loadNarrative.disabled = !ready || busy || activeSlot === 0;
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
  const started = performance.now();
  client?.close();
  client = undefined; ready = false; busy = false; activeSlot = 0; loaded = false; showDraft('');
  index.textContent = 'Loading relationship index.';
  loadMetrics.textContent = '';
  update();
  if (!window.magelight) { status.textContent = 'Browser preview'; return; }
  const current = new ProbeClient(newSession(), frame => window.magelight!.send('lpEvent', frame));
  client = current;
  try {
    const requestStarted = performance.now();
    const slot = await current.openIndex();
    if (client !== current) return;
    activeSlot = slot;
    ready = true;
    status.textContent = 'Connected';
    index.textContent = (slot ? 'Ysolda has a saved narrative.' : 'Ysolda has no saved narrative.')
      + ' Index ready in ' + Math.round(performance.now() - started) + ' ms'
      + ' (session request ' + Math.round(performance.now() - requestStarted) + ' ms, 1 round trip).';
    feedback.textContent = slot ? 'Load the saved narrative to inspect it.' : 'Enter a narrative to activate the probe.';
  } catch (error) {
    if (client !== current) return;
    status.textContent = 'Unavailable'; feedback.textContent = String(error);
  }
  update();
}
loadNarrative.addEventListener('click', async () => {
  let current = client;
  if (!current || !ready || busy) return;
  const expectedSlot = activeSlot;
  const started = performance.now();
  busy = true;
  update();
  try {
    const result = await current.loadPreferred(expectedSlot, () => {
      if (client !== current) throw new Error('View session changed');
      current = new ProbeClient(newSession(), frame => window.magelight!.send('lpEvent', frame));
      client = current;
      return current;
    });
    if (client !== current) return;
    showDraft(result.text);
    loaded = true;
    const editorMs = Math.round(performance.now() - started);
    loadMetrics.textContent = [result.mode, bytes(result.text) + ' bytes', result.roundTrips + ' round trips',
      result.replies + ' replies', result.reads + ' slot reads/decodes', result.storageMs + ' ms in storage/decode',
      Math.round(result.transferMs) + ' ms transfer', editorMs + ' ms to populate the editor',
      result.fallbackReason].filter(Boolean).join(' · ');
    feedback.textContent = 'Saved narrative read back.';
  } catch (error) {
    if (client !== current) return;
    current.close();
    ready = false;
    loadMetrics.textContent = 'Load failed after ' + Math.round(performance.now() - started) + ' ms. ' + String(error);
    feedback.textContent = 'Could not load the saved narrative. Reopen to retry.';
  }
  busy = false;
  update();
});
apply.addEventListener('click', async () => {
  const current = client;
  const text = draft;
  if (!current || !ready || busy || (activeSlot !== 0 && !loaded)) return;
  try { splitNarrative(text); } catch (error) { feedback.textContent = String(error); return; }
  busy = true; update();
  try {
    await current.activate(text);
    if (client !== current) return;
    activeSlot = activeSlot === 1 ? 2 : 1;
    loaded = true;
    index.textContent = 'Ysolda has a saved narrative.';
    feedback.textContent = 'Probe activated and read back. Save your game.';
  } catch (error) {
    if (client !== current) return;
    ready = false; feedback.textContent = String(error) + ' Reopen to check active state.';
  }
  busy = false; update();
});
description.addEventListener('input', () => {
  draft = description.value;
  exactText.value = JSON.stringify(draft);
  update();
});
description.addEventListener('paste', event => {
  if (!event.clipboardData || description.readOnly) return;
  const pasted = event.clipboardData.getData('text/plain');
  if (!pasted.includes('\r')) return;
  event.preventDefault();
  showDraft(draft.slice(0, description.selectionStart) + pasted + draft.slice(description.selectionEnd));
  update();
});
replaceDraft.addEventListener('click', () => { showDraft(''); update(); description.focus(); });
document.querySelector<HTMLButtonElement>('#load-exact-text')!.addEventListener('click', () => {
  try {
    const text: unknown = JSON.parse(exactText.value);
    if (typeof text !== 'string') throw new Error('Enter a JSON string.');
    splitNarrative(text);
    showDraft(text);
    update();
    feedback.textContent = 'Exact draft loaded. Activate to save it to the probe.';
  } catch (error) {
    feedback.textContent = String(error);
  }
});
function cancelSession(): void { const current = client; client = undefined; const diagnostics = diagnosticClient; diagnosticClient = undefined; ready = false; busy = false; current?.close(); diagnostics?.close(); update(); }
refreshDiagnostic.addEventListener('click', () => void diagnose());
close.addEventListener('click', () => { cancelSession(); window.magelight?.send('lpClose', 'close'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void open(); else cancelSession(); });
if (document.visibilityState === 'visible') void open();
