import './style.css';

type MagelightBridge = {
  send: (channel: string, payload: string) => void;
};

declare global {
  interface Window {
    magelight?: MagelightBridge;
    lpReceive?: (payload: string) => void;
  }
}

type EventName = 'open' | 'draft.changed' | 'validate' | 'apply' | 'close';

const origin = document.querySelector<HTMLInputElement>('#origin')!;
const biography = document.querySelector<HTMLTextAreaElement>('#biography')!;
const status = document.querySelector<HTMLElement>('#bridge-status')!;
const feedback = document.querySelector<HTMLElement>('#draft-feedback')!;
const eventLog = document.querySelector<HTMLOListElement>('#event-log')!;
let papyrusReady = false;

function log(message: string): void {
  const item = document.createElement('li');
  item.textContent = message;
  eventLog.prepend(item);
  while (eventLog.children.length > 8) eventLog.lastElementChild?.remove();
}

function emit(type: EventName): void {
  const payload = JSON.stringify({
    protocol: 1,
    type,
    draft: { origin: origin.value.trim(), biography: biography.value.trim() },
  });
  if (!window.magelight) {
    log(`Preview only: ${type}`);
    return;
  }
  window.magelight.send('lpEvent', payload);
  if (type === 'close') window.magelight.send('lpClose', '{"protocol":1,"type":"close"}');
  log(`Sent: ${type}`);
  if (!papyrusReady) status.textContent = 'Papyrus bridge pending';
}

window.lpReceive = (payload: string): void => {
  try {
    const response: unknown = JSON.parse(payload);
    if (typeof response !== 'object' || response === null || !('type' in response)) {
      throw new Error('Missing response type');
    }
    const type = (response as { type: unknown }).type;
    if (typeof type !== 'string') throw new Error('Invalid response type');
    if (type === 'bridge.ready') {
      papyrusReady = true;
      status.textContent = 'Papyrus bridge connected';
    }
    log(`Received: ${type}`);
  } catch {
    log('Received an invalid bridge response');
  }
};

status.textContent = window.magelight ? 'Papyrus bridge pending' : 'Browser preview';
log(window.magelight ? 'Magelight host detected' : 'Browser preview: no game bridge');

for (const field of [origin, biography]) {
  field.addEventListener('input', () => emit('draft.changed'));
}

document.querySelector<HTMLButtonElement>('#validate')!.addEventListener('click', () => {
  feedback.textContent = origin.value.trim() && biography.value.trim()
    ? 'The draft has content. Awaiting game-side validation in a later stage.'
    : 'Enter an origin and a short biography for this UI check.';
  emit('validate');
});
document.querySelector<HTMLButtonElement>('#apply')!.addEventListener('click', () => {
  feedback.textContent = 'Dry run only. No profile or game state was changed.';
  emit('apply');
});
document.querySelector<HTMLButtonElement>('#close')!.addEventListener('click', () => emit('close'));

let wasVisible = document.visibilityState === 'visible';
if (wasVisible && window.magelight) emit('open');
document.addEventListener('visibilitychange', () => {
  const visible = document.visibilityState === 'visible';
  if (visible && !wasVisible) emit('open');
  wasVisible = visible;
});
