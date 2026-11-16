import { ChronicleClient } from './chronicle-client';
import { splitNarrative } from './narrative';

type Candidate = { index: number; plugin: string; name: string; search: string };

const start = document.querySelector<HTMLButtonElement>('#discover')!;
const search = document.querySelector<HTMLInputElement>('#discovery-search')!;
const results = document.querySelector<HTMLSelectElement>('#discovery-result')!;
const history = document.querySelector<HTMLTextAreaElement>('#discovery-history')!;
const save = document.querySelector<HTMLButtonElement>('#discovery-save')!;
const clear = document.querySelector<HTMLButtonElement>('#discovery-clear')!;
const metrics = document.querySelector<HTMLElement>('#discovery-metrics')!;
const status = document.querySelector<HTMLElement>('#discovery-state')!;
let client: ChronicleClient | undefined;
let candidates: Candidate[] = [];
let scanSummary = '';

const escapes: Record<string, string> = { '25': '%', '20': ' ', '09': '\t', '0A': '\n', '0D': '\r', '7C': '|' };
const decode = (text: string, field = false) => text.replace(field ? /%(25|20|09|0A|0D|7C)/g : /%(25|20|09|0A|0D)/g, (_, code: string) => escapes[code]);

function renderSearch() {
  const started = performance.now();
  const query = search.value.trim().toLowerCase();
  const matches = candidates.filter(candidate => candidate.search.includes(query));
  const elapsed = performance.now() - started;
  const previous = results.value;
  results.replaceChildren(...matches.slice(0, 30).map(candidate => {
    const option = document.createElement('option');
    option.value = String(candidate.index);
    option.textContent = candidate.plugin ? `${candidate.name} · ${candidate.plugin}` : candidate.name;
    return option;
  }));
  results.value = previous;
  metrics.textContent = `${scanSummary} Search matched ${matches.length} in ${elapsed.toFixed(2)} ms. Showing up to 30.`;
  updateButtons();
}

function updateButtons() {
  save.disabled = !client || start.disabled || results.value === '';
  clear.disabled = !client || start.disabled;
}

async function showSnapshot(current: ChronicleClient) {
  const raw = await current.request('U');
  const match = /^(\d+)\|([^|]*)\|([^|]*)\|([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('Invalid persisted snapshot');
  if (client !== current) return;
  const [, revision, npc, plugin, text] = match;
  history.value = decode(text);
  status.textContent = revision === '0'
    ? 'No active test history.'
    : `Revision ${revision} read back for ${decode(npc, true) || 'unavailable actor base'} (${decode(plugin, true) || 'unknown plugin'}).`;
}

function reset() {
  client?.close();
  client = undefined;
  candidates = [];
  scanSummary = '';
  start.disabled = false;
  search.disabled = true;
  search.value = '';
  results.replaceChildren();
  history.value = '';
  metrics.textContent = '';
  status.textContent = '';
  updateButtons();
}

start.addEventListener('click', async () => {
  reset();
  if (!window.magelight) return;
  const random = crypto.getRandomValues(new Uint8Array(8));
  const session = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
  const current = new ChronicleClient(session, frame => window.magelight!.send('lpEvent', frame), 15000);
  client = current;
  start.disabled = true;
  let phase = 'Magelight handshake';
  metrics.textContent = 'Checking the Magelight bridge…';
  try {
    await current.request('G');
    if (client !== current) return;
    phase = 'GetAllForms(43)';
    metrics.textContent = 'Magelight handshake passed. Enumerating loaded NPC bases…';
    const started = performance.now();
    const summary = /^(\d+)\|(\d+)$/.exec(await current.request('N'));
    if (!summary) throw new Error('Invalid enumeration reply');
    const total = Number(summary[1]);
    const enumeration = performance.now() - started;
    let cursor = 0;
    let pages = 0;
    let filterMs = 0;
    let slowestPage = 0;
    metrics.textContent = `${total} loaded NPC bases. Native call ${summary[2]} ms, enumeration round trip ${enumeration.toFixed(0)} ms.`;
    while (cursor < total && client === current) {
      phase = `Catalog page at index ${cursor}`;
      const pageStarted = performance.now();
      const reply = /^(\d+)\|(\d+)\|([\s\S]*)$/.exec(await current.request('F', String(cursor)));
      if (client !== current) return;
      if (!reply) throw new Error('Invalid catalog page');
      const next = Number(reply[1]);
      if (next <= cursor || next > total) throw new Error('Invalid catalog cursor');
      for (const row of reply[3].split('\n').filter(Boolean)) {
        const [indexText, pluginText, nameText, extra] = row.split('|');
        const index = Number(indexText);
        if (extra !== undefined || !nameText || !/^\d+$/.test(indexText) || index < cursor || index >= next) throw new Error('Invalid catalog row');
        const plugin = decode(pluginText, true);
        const name = decode(nameText, true);
        candidates.push({ index, plugin, name, search: `${name} ${plugin}`.toLowerCase() });
      }
      cursor = next;
      pages++;
      filterMs += Number(reply[2]);
      slowestPage = Math.max(slowestPage, performance.now() - pageStarted);
      scanSummary = `${cursor}/${total} bases, ${candidates.length} named unique. Native call ${summary[2]} ms, enumeration round trip ${enumeration.toFixed(0)} ms. ${pages} pages in ${(performance.now() - started - enumeration).toFixed(0)} ms, ${filterMs} ms in Papyrus, slowest page ${slowestPage.toFixed(0)} ms.`;
      search.disabled = false;
      renderSearch();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    phase = 'Persisted test history readback';
    if (client === current) await showSnapshot(current);
  } catch (error) {
    if (client === current) {
      current.close();
      client = undefined;
      start.disabled = false;
      status.textContent = `${phase} failed. ${String(error)}`;
      updateButtons();
    }
  } finally {
    if (client === current) { start.disabled = false; updateButtons(); }
  }
});

search.addEventListener('input', renderSearch);
results.addEventListener('change', updateButtons);
for (const [button, operation] of [[save, 'W'], [clear, 'Y']] as const) {
  button.addEventListener('click', async () => {
    const current = client;
    if (!current || start.disabled) return;
    start.disabled = true;
    updateButtons();
    try {
      if (operation === 'W') splitNarrative(history.value);
      await current.request(operation, operation === 'W' ? `${results.value}|${history.value}` : '');
      if (client === current) await showSnapshot(current);
    } catch (error) {
      if (client === current) status.textContent = String(error);
    } finally {
      if (client === current) { start.disabled = false; updateButtons(); }
    }
  });
}

const receive = window.lpReceive;
window.lpReceive = frame => { receive?.(frame); client?.receive(frame); };
const loaded = window.lpGameLoaded;
window.lpGameLoaded = () => { reset(); loaded?.(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') reset(); });
