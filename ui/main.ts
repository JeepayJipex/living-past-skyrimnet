import './style.css';
import { ChronicleClient } from './chronicle-client';
import { bytes } from './protocol';
import { splitNarrative } from './narrative';

declare global { interface Window { magelight?: { send(channel: string, payload: string): void }; lpReceive?: (payload: string) => void; lpGameLoaded?: () => void } }
const actors = [{ id: '1', name: 'Ysolda' }, { id: '2', name: 'Carlotta Valentia' }];
const people = document.querySelector<HTMLElement>('#people')!;
const status = document.querySelector<HTMLElement>('#status')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const editor = document.querySelector<HTMLElement>('#editor')!;
const empty = document.querySelector<HTMLElement>('#empty')!;
const name = document.querySelector<HTMLElement>('#name')!;
const label = document.querySelector<HTMLInputElement>('#label')!;
const description = document.querySelector<HTMLTextAreaElement>('#description')!;
const count = document.querySelector<HTMLElement>('#count')!;
const apply = document.querySelector<HTMLButtonElement>('#apply')!;
const close = document.querySelector<HTMLButtonElement>('#close')!;
let client: ChronicleClient | undefined;
let generation = 0;
let selected = '';
let revision = 0;
let dirty = false;
let busy = false;
let originalText = '';
let textEdited = false;
const index = new Map<string, { revision: number; label: string }>();
function session(): ChronicleClient {
  const random = new Uint8Array(8); crypto.getRandomValues(random);
  return new ChronicleClient(Array.from(random, n => n.toString(16).padStart(2, '0')).join(''), frame => window.magelight!.send('lpEvent', frame));
}
window.lpReceive = frame => client?.receive(frame);
window.lpGameLoaded = () => { ++generation; client?.close(); selected = ''; dirty = false; };
function render(): void {
  people.replaceChildren(...actors.map(actor => {
    const button = document.createElement('button');
    button.className = 'person'; button.type = 'button'; button.disabled = busy;
    const title = document.createElement('span'); title.textContent = actor.name;
    const detail = document.createElement('small'); detail.textContent = index.get(actor.id)?.label || 'Add a shared history';
    button.append(title, detail); button.setAttribute('aria-current', String(selected === actor.id));
    button.addEventListener('click', () => void choose(actor.id)); return button;
  }));
  apply.disabled = busy || !selected;
  count.textContent = `${bytes(description.value)} / 2048 bytes`;
}
async function open(): Promise<void> {
  const turn = ++generation; client?.close(); selected = ''; dirty = false; busy = true; index.clear(); editor.hidden = true; empty.hidden = false; render();
  if (!window.magelight) { status.textContent = 'Available in Skyrim'; busy = false; render(); return; }
  try {
    for (const actor of actors) {
      client?.close(); const current = session(); client = current;
      const entry = await current.openIndex(actor.id);
      if (turn !== generation) return;
      index.set(actor.id, entry);
    }
    status.textContent = 'Your chronicle'; feedback.textContent = '';
  } catch (error) { if (turn !== generation) return; status.textContent = 'Unavailable'; feedback.textContent = String(error); }
  busy = false; render();
}
async function choose(id: string): Promise<void> {
  if (busy || (dirty && !confirm('Discard your unsaved changes?'))) return;
  const entry = index.get(id); if (!entry) return;
  const turn = generation; busy = true; render();
  client?.close(); let current = session(); client = current;
  try {
    const fresh = await current.openIndex(id);
    let text = '';
    if (fresh.revision) {
      const result = await current.loadPreferred(id, fresh.revision, () => { current = session(); client = current; return current; });
      text = result.text;
    }
    if (turn !== generation) return;
    selected = id; revision = fresh.revision; index.set(id, fresh);
    name.textContent = actors.find(actor => actor.id === id)!.name;
    label.value = fresh.label; description.value = text; originalText = text; textEdited = false; dirty = false;
    editor.hidden = false; empty.hidden = true; feedback.textContent = '';
  } catch (error) { if (turn !== generation) return; feedback.textContent = `Could not load this history. ${String(error)}`; }
  busy = false; render();
}
apply.addEventListener('click', async () => {
  const current = client; const id = selected; const turn = generation;
  if (!current || !id || busy) return;
  const text = textEdited ? description.value : originalText;
  try { splitNarrative(text); } catch (error) { feedback.textContent = String(error); return; }
  busy = true; render();
  try {
    await current.activate(label.value, text);
    if (turn !== generation) return;
    revision += 1; index.set(id, { revision, label: label.value }); originalText = text; textEdited = false; dirty = false;
    feedback.textContent = 'Your history is active. Save your game to keep it.';
  } catch (error) { if (turn !== generation) return; feedback.textContent = `Could not confirm the save. Copy your draft and reopen the chronicle to check the active history. ${String(error)}`; client?.close(); }
  busy = false; render();
});
for (const input of [label, description]) input.addEventListener('input', () => { dirty = true; render(); });
description.addEventListener('input', () => { textEdited = true; });
close.addEventListener('click', () => { if (dirty && !confirm('Discard your unsaved changes?')) return; ++generation; client?.close(); window.magelight?.send('lpClose', 'close'); });
async function resumeDraft(): Promise<void> {
  const turn = ++generation; busy = true; render();
  try {
    const current = session(); client = current;
    const entry = await current.openIndex(selected);
    if (turn !== generation) return;
    if (entry.revision !== revision) throw new Error('The saved history changed while the chronicle was closed.');
    feedback.textContent = 'Your unsaved draft is still here.';
  } catch (error) { if (turn !== generation) return; feedback.textContent = `${String(error)} Copy your draft before reopening.`; client?.close(); }
  busy = false; render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (dirty && selected) void resumeDraft(); else void open(); } else { ++generation; client?.close(); } });
if (document.visibilityState === 'visible') void open();
