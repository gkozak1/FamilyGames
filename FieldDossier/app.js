import { createFieldSync } from './firebase-sync.js';

const CONFIG = window.FIELD_APP_CONFIG;
const CORE = window.FIELD_APP_CORE;
const app = document.getElementById('app');
const UI_KEY = 'jotl-fielddossier-ui-v2';

let ui = loadUi();
let team = { evidence:{}, synthesis:{}, ciphers:{}, engine:{}, participants:{} };
let sync = null;
let connection = { connected:false, mode:'starting', message:'Connecting…' };
let engineOverlay = null;
let countdownTimer = null;

function loadUi() {
  try { return { currentSiteId: CONFIG.sites[0].id, persona:null, ...JSON.parse(localStorage.getItem(UI_KEY)||'{}') }; }
  catch (_) { return { currentSiteId:CONFIG.sites[0].id, persona:null }; }
}
function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_) {} }
function qp(name) { return new URLSearchParams(location.search).get(name); }
function sessionId() { return qp('session') || CONFIG.defaultSessionId; }
function escapeHtml(v) { return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function logo(size=48) { return `<img src="diamond-logo.svg" class="diamond-logo" width="${size}" height="${size}" alt="The Jewel of the Lochs" />`; }

async function start(persona) {
  ui.persona = persona;
  saveUi();
  renderLoading();
  sync = await createFieldSync({
    sessionId: sessionId(), persona, role:'player', config: window.FIELD_FIREBASE_CONFIG,
    onState: state => {
      team = state || team;
      if (engineOverlay) updateEngineOverlay();
      if (!document.activeElement?.matches('input,textarea,select')) renderMain();
    },
    onConnection: value => { connection = value; updateConnectionBadge(); }
  });
  renderMain();
}

function renderLoading() {
  app.innerHTML = `<main class="loading-shell">${logo(84)}<h1>Field Dossier</h1><p>Opening encrypted field record…</p></main>`;
}

function renderChooser() {
  app.innerHTML = `<main class="chooser-shell"><section class="chooser-card">${logo(112)}<p class="eyebrow">THE JEWEL OF THE LOCHS</p><h1>Field Dossier</h1><p>Select the field identity assigned to this device.</p><div class="persona-grid">${CONFIG.personaOrder.map(pid=>{const p=CONFIG.personas[pid];return `<button data-persona="${pid}" class="persona-select" style="--persona:${p.color}"><i></i><strong>${p.name}</strong></button>`}).join('')}</div><small>Session: ${escapeHtml(sessionId())}</small></section></main>`;
  document.querySelectorAll('[data-persona]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.persona)));
}

function engineWindowSeconds() { return Math.round(Number(CONFIG.engineWindowMs || 20000) / 1000); }
function engineWindowInstruction() { return `All four sleuths must ingest evidence within ${engineWindowSeconds()} seconds of each other.`; }

function header() {
  const p = CONFIG.personas[ui.persona];
  return `<header class="app-header"><button class="brand" data-home>${logo(44)}<span><strong>${CONFIG.title}</strong><small>${CONFIG.subtitle}</small></span></button><div class="header-right"><span id="connectionBadge" class="connection-badge ${connection.connected?'online':'offline'}">${connection.connected?'SYNC':'LOCAL'}</span><span class="persona-chip" style="--persona:${p.color}"><i></i>${p.short}</span><button class="cipher-library-button" data-recall aria-label="Cipher Library">Cipher Library</button></div></header>`;
}
function updateConnectionBadge() {
  const el=document.getElementById('connectionBadge'); if(!el)return;
  el.textContent=connection.connected?'SYNC':'LOCAL'; el.className=`connection-badge ${connection.connected?'online':'offline'}`; el.title=connection.message||'';
}

function available(site) {
  if (site.order === 1) return true;
  const prior = CONFIG.sites.find(s=>s.order===site.order-1);
  return Boolean(team.ciphers?.[prior.id]);
}
function currentSite() {
  let s=CONFIG.sites.find(x=>x.id===ui.currentSiteId)||CONFIG.sites[0];
  if(!available(s)) s=CONFIG.sites.find(x=>available(x)&&!team.ciphers?.[x.id])||CONFIG.sites[0];
  ui.currentSiteId=s.id; saveUi(); return s;
}
function evidenceCount(site) { return CONFIG.personaOrder.filter(pid=>team.evidence?.[site.id]?.[pid]?.complete).length; }

function renderMain() {
  if (!ui.persona) return renderChooser();
  const site=currentSite();
  app.innerHTML = `${header()}<main class="dashboard"><nav class="site-tabs" aria-label="Evidence stops">${CONFIG.sites.map(s=>`<button data-site="${s.id}" ${available(s)?'':'disabled'} class="site-tab ${s.id===site.id?'active':''} ${team.ciphers?.[s.id]?'complete':''}"><span>${s.order}</span></button>`).join('')}</nav><section class="site-panel theme-${site.theme}">${renderSite(site)}</section></main><footer class="app-footer">${logo(24)}<span>McINTYRE FIELD ARCHIVE</span><button data-settings>⚙</button></footer>`;
  bindMain(site);
}

function renderSite(site) {
  const p=CONFIG.personas[ui.persona];
  const own=team.evidence?.[site.id]?.[ui.persona];
  const allFour=CORE.allEvidenceComplete(CONFIG,site,team);
  const ready=CORE.siteComplete(CONFIG,site,team);
  const cipher=team.ciphers?.[site.id];
  return `<div class="site-title"><span class="stop-badge">${site.order}</span><div><p class="eyebrow">STOP ${site.order} OF 7</p><h1>Evidence Gathering</h1></div></div>
    <div class="progress-row">${CONFIG.personaOrder.map(pid=>`<span class="progress-dot ${team.evidence?.[site.id]?.[pid]?.complete?'done':''}" style="--persona:${CONFIG.personas[pid].color}" title="${CONFIG.personas[pid].name}"></span>`).join('')}<strong>${evidenceCount(site)}/4 secured</strong></div>
    <section class="own-assignment" style="--persona:${p.color}"><header><span class="persona-bar"></span><div><p>${p.name}</p><h2>Your Evidence</h2></div></header><p class="challenge">${site.challenges[ui.persona].prompt}</p>${renderOwnInput(site,ui.persona,own)}</section>
    <section class="team-convergence ${allFour?'ready':''}"><p class="eyebrow">TEAM CONVERGENCE</p>${renderTeamConvergence(site,allFour)}</section>
    <section class="engine-card ${ready?'ready':''}"><div>${logo(54)}<div><p class="eyebrow">McINTYRE MECHANICAL UNIT</p><h2>Cipher Engine</h2><p>${cipher?'Cipher already created. The engine can be replayed whenever all four sleuths are present.':ready?'Four evidence streams are ready for processing.':'The engine remains locked until the site evidence is complete.'}</p></div></div><button class="primary" data-open-engine ${ready?'':'disabled'}>${cipher?'Replay Cipher Engine':'Open Cipher Engine'}</button></section>`;
}

function renderOwnInput(site,pid,record) {
  const c=site.challenges[pid];
  if(record?.complete) return `<div class="recorded"><span>${escapeHtml(c.capture)}</span><strong>${escapeHtml(record.override?'ASSISTANT VERIFIED':CORE.formatEvidence(c,record))}</strong>${record.note?`<p>${escapeHtml(record.note)}</p>`:''}<button class="text-button" data-edit-own>Edit evidence</button></div>`;
  return `<div class="evidence-entry">${inputControl(c,pid)}<label class="note-field">Optional field note<textarea data-note rows="2" placeholder="Short note, if useful later"></textarea></label><div class="validation" data-validation></div><div class="button-row"><button class="secondary" data-override-own>Assistant Override</button><button class="primary" data-save-own>Record Evidence</button></div></div>`;
}
function inputControl(c,pid) {
  if(['triple','pair','twoText'].includes(c.type)) return `<div class="multi-fields">${c.fields.map((f,i)=>`<label>${f}<input data-part="${i}" ${c.type==='twoText'?'type="text"':'type="number" inputmode="numeric"'}></label>`).join('')}</div>`;
  if(c.type==='list') return `<div class="list-fields" data-list>${Array.from({length:c.minItems},(_,i)=>`<label><span>${i+1}</span><input data-list-item="${i}" type="text"></label>`).join('')}</div><button class="text-button" data-add-list>+ Add another feature</button>`;
  const t=['number','positiveNumber'].includes(c.type)?'number':'text';
  return `<label class="single-field">${c.capture}<input data-value type="${t}" ${t==='number'?'inputmode="decimal"':''}></label>`;
}
function collectInput(site,pid) {
  const c=site.challenges[pid];
  if(['triple','pair','twoText'].includes(c.type)) return [...document.querySelectorAll('[data-part]')].sort((a,b)=>a.dataset.part-b.dataset.part).map(x=>x.value);
  if(c.type==='list') return [...document.querySelectorAll('[data-list-item]')].map(x=>x.value);
  return document.querySelector('[data-value]')?.value;
}

function renderTeamConvergence(site,allFour) {
  if(!allFour) return `<h2>Waiting for the other sleuths</h2><div class="team-status">${CONFIG.personaOrder.map(pid=>{const p=CONFIG.personas[pid],r=team.evidence?.[site.id]?.[pid];return `<div style="--persona:${p.color}" class="${r?.complete?'done':''}"><i></i><span>${p.short}</span><strong>${r?.complete?'SECURED':'WAITING'}</strong></div>`}).join('')}</div><p class="muted">Evidence is synchronized across the four field devices.</p>`;
  const cards=CONFIG.personaOrder.map(pid=>{const p=CONFIG.personas[pid],c=site.challenges[pid],r=team.evidence[site.id][pid];return `<article style="--persona:${p.color}"><header><i></i>${p.short}</header><strong>${escapeHtml(r.override?'ASSISTANT VERIFIED':CORE.formatEvidence(c,r))}</strong>${r.note?`<small>${escapeHtml(r.note)}</small>`:''}</article>`}).join('');
  if(!site.synthesis) return `<h2>Evidence set complete</h2><div class="evidence-grid">${cards}</div><p class="convergence-ok">All four evidence streams are ready for the Cipher Engine.</p>`;
  const syn=team.synthesis?.[site.id];
  if(syn?.complete) return `<h2>Team evidence reconciled</h2><div class="evidence-grid">${cards}</div><div class="synthesis-complete">${syn.override?'ASSISTANT VERIFIED':site.synthesis.kind==='kopps'?`Team result: ${syn.value}`:'Paired field observations confirmed'}</div><button class="text-button" data-edit-synthesis>Edit team convergence</button>`;
  if(site.synthesis.kind==='kopps') {
    const vals=CORE.deriveKopps(team.evidence[site.id]);
    return `<h2>${site.synthesis.title}</h2><div class="evidence-grid">${cards}</div><p>${site.synthesis.prompt}</p>${vals?`<div class="pair-results"><div><span>Peacock + Plum</span><strong>${vals.pairOne}</strong></div><div><span>Scarlet + Mustard</span><strong>${vals.pairTwo}</strong></div></div>`:''}<label class="single-field">${site.synthesis.label}<input data-synthesis-number type="number" inputmode="numeric"></label><div class="validation" data-synthesis-validation></div><div class="button-row"><button class="secondary" data-override-synthesis>Assistant Override</button><button class="primary" data-save-synthesis>Confirm Team Result</button></div>`;
  }
  return `<h2>${site.synthesis.title}</h2><div class="evidence-grid">${cards}</div><p>${site.synthesis.prompt}</p><label class="check-row"><input type="checkbox" data-different> Scarlet and Plum recovered different animal evidence.</label><div class="multi-fields"><label>Earlier vegetation stage<select data-earlier><option value="">Choose…</option><option value="peacock">Peacock’s stabilized dune</option><option value="mustard">Mustard’s woodland</option></select></label><label>Later vegetation stage<select data-later><option value="">Choose…</option><option value="peacock">Peacock’s stabilized dune</option><option value="mustard">Mustard’s woodland</option></select></label></div><div class="validation" data-synthesis-validation></div><div class="button-row"><button class="secondary" data-override-synthesis>Assistant Override</button><button class="primary" data-save-synthesis>Confirm Team Result</button></div>`;
}

function bindMain(site) {
  document.querySelector('[data-home]')?.addEventListener('click',()=>renderMain());
  document.querySelector('[data-recall]')?.addEventListener('click',showRecall);
  document.querySelector('[data-settings]')?.addEventListener('click',showSettings);
  document.querySelectorAll('[data-site]').forEach(b=>b.addEventListener('click',()=>{ui.currentSiteId=b.dataset.site;saveUi();renderMain();}));
  document.querySelector('[data-add-list]')?.addEventListener('click',()=>{
    const wrap=document.querySelector('[data-list]'), c=site.challenges[ui.persona], n=wrap.querySelectorAll('label').length; if(n>=(c.maxItems||10))return;
    const label=document.createElement('label'); label.innerHTML=`<span>${n+1}</span><input data-list-item="${n}" type="text">`; wrap.appendChild(label);
  });
  document.querySelector('[data-save-own]')?.addEventListener('click',async()=>{
    const c=site.challenges[ui.persona], result=CORE.validateChallenge(c,collectInput(site,ui.persona));
    if(!result.ok){const v=document.querySelector('[data-validation]');v.textContent=result.message;v.className='validation error';return;}
    await sync.writeEvidence(site.id,ui.persona,{complete:true,value:result.canonical,note:document.querySelector('[data-note]')?.value?.trim()||'',override:false});
  });
  document.querySelector('[data-override-own]')?.addEventListener('click',async()=>{if(confirm('Use Assistant Override for this evidence task?'))await sync.writeEvidence(site.id,ui.persona,{complete:true,value:'Assistant override',note:'',override:true});});
  document.querySelector('[data-edit-own]')?.addEventListener('click',async()=>{if(confirm('Reopen your evidence entry? This will also reopen team convergence for this stop.')){await sync.clearEvidence(site.id,ui.persona);await sync.clearSynthesis(site.id);}});
  document.querySelector('[data-save-synthesis]')?.addEventListener('click',async()=>{
    let raw=site.synthesis.kind==='kopps'?document.querySelector('[data-synthesis-number]')?.value:{differentAnimals:document.querySelector('[data-different]')?.checked,earlier:document.querySelector('[data-earlier]')?.value,later:document.querySelector('[data-later]')?.value};
    const result=CORE.validateSynthesis(site,team.evidence[site.id],raw); if(!result.ok){const v=document.querySelector('[data-synthesis-validation]');v.textContent=result.message;v.className='validation error';return;}
    await sync.writeSynthesis(site.id,{complete:true,value:result.canonical,override:false});
  });
  document.querySelector('[data-override-synthesis]')?.addEventListener('click',async()=>{if(confirm('Use Assistant Override for team convergence?'))await sync.writeSynthesis(site.id,{complete:true,value:'Assistant override',override:true});});
  document.querySelector('[data-edit-synthesis]')?.addEventListener('click',async()=>sync.clearSynthesis(site.id));
  document.querySelector('[data-open-engine]')?.addEventListener('click',()=>openEngine(site));
}

function openEngine(site) {
  if(!CORE.siteComplete(CONFIG,site,team)) return;
  engineOverlay=document.createElement('div'); engineOverlay.className='engine-overlay'; engineOverlay.dataset.siteId=site.id; engineOverlay.dataset.mode='ready';
  engineOverlay.innerHTML=`<section class="engine-modal theme-${site.theme}"><button class="engine-close">×</button><div class="engine-heading">${logo(56)}<div><p class="eyebrow">McINTYRE MECHANICAL UNIT</p><h2>Cipher Engine</h2></div></div><div class="engine-inputs">${CONFIG.personaOrder.map((pid,i)=>{const p=CONFIG.personas[pid],r=team.evidence[site.id][pid],c=site.challenges[pid];return `<div class="engine-input input-${i+1}" style="--persona:${p.color}"><span>${p.short}</span><strong>${escapeHtml(r.override?'ASSISTANT VERIFIED':CORE.formatEvidence(c,r))}</strong></div>`}).join('')}</div><div class="machine"><div class="gear g1"></div><div class="gear g2"></div><div class="gear g3"></div><div class="machine-plate">CIPHER<br><b>ENGINE</b></div><div class="reels"><span data-letter>?</span><span data-number>?</span></div></div><div class="quorum"><div class="quorum-lights">${CONFIG.personaOrder.map(pid=>`<span data-quorum="${pid}" style="--persona:${CONFIG.personas[pid].color}"><i></i>${CONFIG.personas[pid].short}</span>`).join('')}</div><p data-engine-status>${engineWindowInstruction()}</p><strong data-countdown></strong></div><div class="engine-message" data-engine-message></div><div class="engine-actions"><button class="primary" data-ingest>Ingest Evidence</button><button class="secondary hidden" data-replay>Replay Cipher Engine</button><button class="secondary hidden" data-return>Return to Evidence Gathering</button></div></section>`;
  document.body.appendChild(engineOverlay);
  engineOverlay.querySelector('.engine-close').addEventListener('click',closeEngine);
  engineOverlay.addEventListener('click',e=>{if(e.target===engineOverlay)closeEngine();});
  engineOverlay.querySelector('[data-ingest]').addEventListener('click',pressIngest);
  engineOverlay.querySelector('[data-replay]').addEventListener('click',()=>{engineOverlay.dataset.mode='ready'; resetEngineView();});
  engineOverlay.querySelector('[data-return]').addEventListener('click',()=>{closeEngine();renderMain();});
  updateEngineOverlay();
}
function closeEngine(){clearInterval(countdownTimer);countdownTimer=null;engineOverlay?.remove();engineOverlay=null;}

async function pressIngest() {
  if(!engineOverlay||!sync) return;
  const btn=engineOverlay.querySelector('[data-ingest]'); btn.disabled=true;
  const result=await sync.pressEngine(engineOverlay.dataset.siteId);
  if(!result.accepted){btn.disabled=false;const msg=engineOverlay.querySelector('[data-engine-message]');msg.textContent=result.reason==='offline'?'Team synchronization is offline. Firebase must be connected for the four-sleuth Cipher Engine.':`The ${engineWindowSeconds()}-second window had already closed. Wait for the reset and try again.`;msg.className='engine-message error';}
}

function updateEngineOverlay() {
  if(!engineOverlay) return;
  const siteId=engineOverlay.dataset.siteId, attempt=team.engine?.[siteId], mode=engineOverlay.dataset.mode;
  if(mode==='result' && attempt?.status!=='success') return;
  CONFIG.personaOrder.forEach(pid=>engineOverlay.querySelector(`[data-quorum="${pid}"]`)?.classList.toggle('pressed',Boolean(attempt?.status==='arming'&&attempt?.presses?.[pid])));
  if(!attempt || attempt.status==='failed') {
    if(mode!=='result') {
      resetEngineView();
      if(attempt?.status==='failed'){const m=engineOverlay.querySelector('[data-engine-message]');m.textContent=attempt.message||engineWindowInstruction();m.className='engine-message error';}
    }
    return;
  }
  if(attempt.status==='arming') {
    engineOverlay.dataset.mode='arming';
    const mine=Boolean(attempt.presses?.[ui.persona]);
    const btn=engineOverlay.querySelector('[data-ingest]'); btn.disabled=mine; btn.textContent=mine?'Evidence Queued':'Ingest Evidence';
    const count=CONFIG.personaOrder.filter(pid=>attempt.presses?.[pid]).length;
    engineOverlay.querySelector('[data-engine-status]').textContent=`${count} of 4 sleuths ready`;
    startCountdown(attempt);
    return;
  }
  if(attempt.status==='success' && attempt.presses?.[ui.persona]) {
    clearInterval(countdownTimer);countdownTimer=null;
    if(engineOverlay.dataset.animatedAttempt!==attempt.attemptId) runEngineAnimation(attempt);
  }
}
function startCountdown(attempt){clearInterval(countdownTimer);const el=engineOverlay.querySelector('[data-countdown]');const tick=()=>{const left=Math.max(0,Number(attempt.deadlineAt)-sync.getServerNow());el.textContent=left>0?`${(left/1000).toFixed(1)}s`:'';};tick();countdownTimer=setInterval(tick,80);}
function resetEngineView(){
  if(!engineOverlay)return; clearInterval(countdownTimer); countdownTimer=null;
  engineOverlay.classList.remove('processing','resolved');
  engineOverlay.querySelector('[data-letter]').textContent='?';engineOverlay.querySelector('[data-number]').textContent='?';
  engineOverlay.querySelector('[data-engine-status]').textContent=engineWindowInstruction();
  engineOverlay.querySelector('[data-countdown]').textContent='';
  const b=engineOverlay.querySelector('[data-ingest]');b.disabled=false;b.textContent='Ingest Evidence';b.classList.remove('hidden');
  engineOverlay.querySelector('[data-replay]').classList.add('hidden');engineOverlay.querySelector('[data-return]').classList.add('hidden');
  engineOverlay.querySelector('[data-engine-message]').textContent='';engineOverlay.querySelector('[data-engine-message]').className='engine-message';
  CONFIG.personaOrder.forEach(pid=>engineOverlay.querySelector(`[data-quorum="${pid}"]`)?.classList.remove('pressed'));
}
function runEngineAnimation(attempt){
  const site=CONFIG.sites.find(s=>s.id===engineOverlay.dataset.siteId); engineOverlay.dataset.animatedAttempt=attempt.attemptId; engineOverlay.dataset.mode='processing';
  engineOverlay.classList.add('processing'); const b=engineOverlay.querySelector('[data-ingest]');b.disabled=true;b.textContent='Processing…';
  const message=engineOverlay.querySelector('[data-engine-message]');const statuses=['INGESTING PERSONA EVIDENCE…','ALIGNING FOUR FIELD STREAMS…','ENGAGING CIPHER WHEELS…','RESOLVING OUTPUT…'];let i=0;message.textContent=statuses[0];
  const letters='ABCDEFG', letter=engineOverlay.querySelector('[data-letter]'), number=engineOverlay.querySelector('[data-number]');
  const msg=setInterval(()=>{i=Math.min(i+1,statuses.length-1);message.textContent=statuses[i];},650);
  const reels=setInterval(()=>{letter.textContent=letters[Math.floor(Math.random()*7)];number.textContent=String(1+Math.floor(Math.random()*7));},85);
  setTimeout(async()=>{clearInterval(msg);clearInterval(reels);letter.textContent=site.cipher.letter;number.textContent=site.cipher.number;engineOverlay.classList.remove('processing');engineOverlay.classList.add('resolved');engineOverlay.dataset.mode='result';message.textContent='CIPHER CREATED';message.className='engine-message success';b.classList.add('hidden');engineOverlay.querySelector('[data-replay]').classList.remove('hidden');engineOverlay.querySelector('[data-return]').classList.remove('hidden');await sync.writeCipher(site.id,site.cipher);},3000);
}

function showRecall(){const list=CORE.sortCiphers(team.ciphers);const o=document.createElement('div');o.className='sheet-overlay';o.innerHTML=`<section class="recall-sheet"><button class="sheet-close">×</button>${logo(64)}<p class="eyebrow">FIELD ARCHIVE</p><h2>Cipher Library</h2><div class="cipher-ledger">${list.length?list.map(c=>`<div><span>${c.number}</span><strong>${c.letter}</strong></div>`).join(''):'<p>No ciphers created.</p>'}</div></section>`;document.body.appendChild(o);o.querySelector('.sheet-close').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove();};}
function showSettings(){const o=document.createElement('div');o.className='sheet-overlay';o.innerHTML=`<section class="settings-sheet"><button class="sheet-close">×</button><p class="eyebrow">FIELD DOSSIER</p><h2>Device Status</h2><dl><dt>Persona</dt><dd>${CONFIG.personas[ui.persona].name}</dd><dt>Session</dt><dd>${escapeHtml(sessionId())}</dd><dt>Team sync</dt><dd>${escapeHtml(connection.message||'')}</dd></dl><button data-change-persona>Change persona on this device</button></section>`;document.body.appendChild(o);o.querySelector('.sheet-close').onclick=()=>o.remove();o.querySelector('[data-change-persona]').onclick=()=>{o.remove();ui.persona=null;saveUi();location.href=location.pathname+`?session=${encodeURIComponent(sessionId())}`;};}

const personaFromUrl=qp('persona');
if(personaFromUrl&&CONFIG.personas[personaFromUrl]) ui.persona=personaFromUrl;
if(ui.persona&&CONFIG.personas[ui.persona]) start(ui.persona); else renderChooser();
