import { createConnectionsSync } from './firebase-sync.mjs';
const config = window.CONNECTIONS_CONFIG;
const reset = document.getElementById('reset-game');
const result = document.getElementById('reset-result');
let online = false, busy = false;
const sync = createConnectionsSync({
  sessionId: config.sessionId, facets: config.facets,
  config: window.CONNECTIONS_FIREBASE_CONFIG, puzzleId: config.puzzleId, facilitator: true,
  onState: value => {
    document.getElementById('progress').textContent = `${value.assembly.filter(Boolean).length} of 4 fragments recovered`;
  },
  onStatus: value => {
    online = value.connected;
    document.getElementById('connection').textContent = value.message;
    reset.disabled = !online || busy;
  }
});
for (const facet of config.facets.slice().sort((a, b) => a.partNumber - b.partNumber)) {
  const li = document.createElement('li'), a = document.createElement('a');
  a.href = `index.html?facet=${facet.id}`;
  a.textContent = facet.label.replace(' Facet', ''); li.appendChild(a);
  document.getElementById('player-links').appendChild(li);
}
reset.addEventListener('click', async () => {
  if (busy || !online) return;
  busy = true; reset.disabled = true; reset.textContent = 'Resetting…'; result.textContent = '';
  try {
    await sync.resetSession();
    result.textContent = 'Game reset. All four players can begin again.';
  } catch (error) {
    result.textContent = `Reset was not confirmed. ${error.message || 'Check the connection and try again.'}`;
  } finally { busy = false; reset.disabled = !online; reset.textContent = 'Reset game'; }
});
