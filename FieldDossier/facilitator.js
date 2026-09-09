import { createFieldSync } from './firebase-sync.js?v=single1';

const CONFIG = window.FIELD_APP_CONFIG;
const app = document.getElementById('app');
let state = { evidence:{}, synthesis:{}, ciphers:{}, engine:{}, participants:{}, meta:{} };
let sync = null;
let connection = { connected:false, message:'Connecting…' };
let resetting = false;
let resetMessage = '';

function sessionId() { return CONFIG.sessionId; }
function escapeHtml(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function logo(size=64) { return `<img src="diamond-logo.svg" class="diamond-logo" width="${size}" height="${size}" alt="The Jewel of the Lochs" />`; }
function basePlayerUrl(persona) {
  const base = new URL('index.html', location.href);
  base.search = '';
  base.searchParams.set('persona', persona);
  return base.href;
}
function countEvidence() {
  return CONFIG.sites.reduce((sum, site) => sum + CONFIG.personaOrder.filter(pid => state.evidence?.[site.id]?.[pid]?.complete).length, 0);
}
function activePlayers() {
  const byPersona = {};
  Object.values(state.participants || {}).forEach(p => {
    if (p?.role === 'player' && CONFIG.personas[p.persona]) byPersona[p.persona] = (byPersona[p.persona] || 0) + 1;
  });
  return byPersona;
}
function formatTime(ms) {
  if (!ms) return 'Never';
  try { return new Date(Number(ms)).toLocaleString(); } catch (_) { return String(ms); }
}

async function start() {
  renderLoading();
  sync = await createFieldSync({
    sessionId: sessionId(),
    persona: 'facilitator',
    role: 'facilitator',
    config: window.FIELD_FIREBASE_CONFIG,
    onState: next => { state = next || state; render(); },
    onConnection: next => { connection = next; render(); }
  });
  render();
}

function renderLoading() {
  app.innerHTML = `<main class="loading-shell">${logo(84)}<h1>Facilitator Console</h1><p>Connecting to the field game…</p></main>`;
}

function render() {
  if (!sync) return;
  const players = activePlayers();
  const cipherCount = Object.keys(state.ciphers || {}).length;
  const evidence = countEvidence();
  app.innerHTML = `
    <main class="facilitator-shell">
      <section class="facilitator-card">
        <header class="facilitator-heading">${logo(78)}<div><p class="eyebrow">THE JEWEL OF THE LOCHS</p><h1>Facilitator Console</h1></div></header>
        <div class="facilitator-status ${connection.connected?'online':'offline'}">
          <strong>${connection.connected?'Firebase online':'Firebase offline'}</strong>
          <span>${escapeHtml(connection.message || '')}</span>
        </div>

        <section class="facilitator-metrics">
          <div><span>Evidence</span><strong>${evidence}/28</strong></div>
          <div><span>Ciphers</span><strong>${cipherCount}/7</strong></div>
          <div><span>Last reset</span><strong>${escapeHtml(formatTime(state.meta?.resetAt))}</strong></div>
        </section>

        <section class="facilitator-section">
          <h2>Field Devices</h2>
          <div class="facilitator-personas">
            ${CONFIG.personaOrder.map(pid=>{
              const p=CONFIG.personas[pid], n=players[pid]||0;
              return `<div style="--persona:${p.color}" class="${n?'present':''}"><i></i><span>${p.short}</span><strong>${n ? `${n} connected identity${n===1?'':'s'}` : 'not joined'}</strong></div>`;
            }).join('')}
          </div>
        </section>

        <section class="facilitator-section">
          <h2>Four Player Links</h2>
          <p class="muted">All four links join the same field game.</p>
          <div class="player-links">
            ${CONFIG.personaOrder.map(pid=>`<button class="text-button" data-copy-url="${escapeHtml(basePlayerUrl(pid))}">Copy ${CONFIG.personas[pid].short} URL</button>`).join('')}
          </div>
        </section>

        <section class="facilitator-section danger-zone">
          <h2>Reset Field Dossier</h2>
          <p>This clears evidence, team convergence, Cipher Engine attempts, and recovered ciphers for all four players. The four player identities stay connected.</p>
          <p class="muted">One click starts a fresh field game. Connections progress is unaffected.</p>
          <button class="danger-button" data-reset ${(!connection.connected || resetting)?'disabled':''}>${resetting?'Resetting…':'Reset game'}</button>
          <p role="status" aria-live="polite">${escapeHtml(resetMessage)}</p>
        </section>
      </section>
    </main>`;
  bind();
}

function bind() {
  document.querySelectorAll('[data-copy-url]').forEach(btn => btn.addEventListener('click', async () => {
    const old = btn.textContent;
    try { await navigator.clipboard.writeText(btn.dataset.copyUrl); btn.textContent='Copied'; }
    catch (_) { prompt('Copy this URL:', btn.dataset.copyUrl); }
    setTimeout(()=>{ btn.textContent=old; }, 1200);
  }));
  document.querySelector('[data-reset]')?.addEventListener('click', resetCurrentSession);
}

async function resetCurrentSession() {
  if (resetting || !sync) return;
  if (!connection.connected) return;
  resetMessage = '';
  resetting = true; render();
  try {
    const result = await sync.resetSession();
    if (!result.ok) throw new Error(result.message || 'Reset failed');
    resetMessage = 'Field Dossier reset. All four players can begin again.';
  } catch (error) {
    resetMessage = `Reset failed: ${error.message || error}`;
  } finally {
    resetting = false; render();
  }
}

start();
