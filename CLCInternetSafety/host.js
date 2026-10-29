'use strict';
/* ================= PREFERENCES (this laptop only) ================= */
const PKEY = 'sd-host-prefs', SKEY = 'sd-host-state';
let P = { apiKey: '', posterModel: 'claude-sonnet-5-5', textModel: 'claude-haiku-5-5', mischief: 'sometimes',
  gizmoVoice: true, voiceURI: '', pitch: 1.7, rate: 1.08, sound: true, planSec: 120, quickSec: 30, bots: false,
  galleryVoice: true, galleryDur: 20 };
try { Object.assign(P, JSON.parse(localStorage.getItem(PKEY) || '{}')); } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} };
SFX.setOn(P.sound);

const $ = s => document.querySelector(s);
const stage = $('#stage');
const G = makeGizmo($('#gizmo'), () => P);

/* ================= FLOW ================= */
const RSTEPS = [['client', 'Client'], ['twist', 'Twist'], ['plan', 'Plan'], ['requests', 'Requests'], ['callit', 'Call it!'],
  ['reveal', 'Live reveal'], ['decide', 'Use it or change it?'], ['followup', 'The change'], ['envelope', 'Golden Envelopes'], ['scores', 'Scoreboard']];
const FLOW = [
  { k: 'welcome', label: 'Join the game' },
  { k: 'howto', label: 'How to play' },
  ...ROUNDS.flatMap((R, ri) => RSTEPS.map(([k, l]) => ({ k, r: R.id, ri, label: `${R.title} · ${l}` }))),
  { k: 'lt-intro', label: 'Round 4: Lightning' },
  ...LIGHTNING.map((c, i) => ({ k: 'lt', i, label: `Lightning · Card ${i + 1} of ${LIGHTNING.length}` })),
  { k: 'scores', r: 'lt', label: 'Lightning · Scoreboard' },
  { k: 'dc-intro', label: 'Round 5: Director’s Cut' },
  { k: 'dc-pick', label: 'Director’s Cut · Pick a client' },
  { k: 'dc-plan', label: 'Director’s Cut · Plan' },
  { k: 'dc-requests', label: 'Director’s Cut · Requests' },
  { k: 'dc-reveal', label: 'Director’s Cut · Live reveals' },
  { k: 'dc-check', label: 'Director’s Cut · Check it' },
  { k: 'dc-fan', label: 'Director’s Cut · Fan Favorite' },
  { k: 'envelope', r: 'dc', label: 'Director’s Cut · Golden Envelopes' },
  { k: 'awards', label: 'Awards' },
];
const roundById = id => ROUNDS.find(R => R.id === id);

/* ================= GAME STATE ================= */
function freshState() {
  const pts = {}; ['r1', 'r2', 'r3', 'lt', 'dc'].forEach(k => { pts[k] = {}; TEAM_IDS.forEach(t => pts[k][t] = { req: 0, call: 0, dec: 0, chk: 0, lt: 0, env: 0, x2: false }); });
  return { v: 1, step: 0, qn: 0, galleryOpen: false, pts, adj: { dragon: 0, tiger: 0, robot: 0 }, rounds: {}, lt: {}, dc: { assign: {}, req: {}, res: {}, open: false }, fan: null, env: {}, curQ: null, startedAt: Date.now() };
}
let S = freshState();
let resumed = false;
try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.v === 1) { S = s; resumed = S.step > 0; } } catch (e) {}
const undo = [];
function snap() { undo.push(JSON.stringify(S)); if (undo.length > 80) undo.shift(); }
let saveT = null;
function save() { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) {} clearTimeout(saveT); saveT = setTimeout(() => { if (db) db.ref(`${ROOT}/host`).set({ step: S.step, at: Date.now() }).catch(() => {}); }, 800); }
const R = r => (S.rounds[r] = S.rounds[r] || { twist: null, req: {}, res: null, nailed: null, change: '', res2: null, decided: {} });
const featuredTeam = ri => TEAM_IDS[ri % 3];

function teamTotal(t) {
  let total = S.adj[t] || 0;
  for (const k of Object.keys(S.pts)) {
    const p = S.pts[k][t]; const base = (p.req + p.call + p.dec + p.chk) * (k === 'dc' ? 2 : 1) + p.lt;
    total += base + (typeof p.env === 'number' ? p.env : 0) + (p.x2 ? base : 0);
  }
  return total;
}

/* ================= FIREBASE ================= */
let db = null, uid = null, players = {}, answers = {}, ansRef = null, gallery = {}, notes = {};
const botAns = {};
async function fbBoot() {
  if (!window.firebase) { toast('Firebase did not load. Check the internet connection.'); return; }
  try {
    db = fbStart(); uid = await fbSignIn();
    db.ref(`${ROOT}/players`).on('value', s => { players = s.val() || {}; live(); });
    db.ref(`${ROOT}/gallery`).on('value', s => { gallery = s.val() || {}; galleryUpdated(); });
    db.ref(`${ROOT}/notes`).on('value', s => { notes = s.val() || {}; galleryUpdated(); });
    publish(); watchAnswers();
  } catch (e) { toast('Firebase: ' + fbExplain(e), 8000); }
}
function publishState(obj) { if (db) db.ref(`${ROOT}/state`).set(Object.assign({ galleryOpen: !!S.galleryOpen, v: Date.now() }, obj)).catch(e => toast('Firebase: ' + fbExplain(e))); }
function watchAnswers() {
  const qid = S.curQ ? S.curQ.id : null;
  if (ansRef && ansRef._qid === qid) return;
  if (ansRef) ansRef.off(); ansRef = null; answers = {};
  if (db && qid) { ansRef = db.ref(`${ROOT}/answers/${qid}`); ansRef._qid = qid; ansRef.on('value', s => { answers = s.val() || {}; live(); }); }
}
function allAnswers() { const q = S.curQ; if (!q) return {}; return Object.assign({}, answers, P.bots ? (botAns[q.id] || {}) : {}); }
function playerCounts() {
  const c = { dragon: 0, tiger: 0, robot: 0 };
  Object.values(players).forEach(p => { if (c[p.team] !== undefined) c[p.team]++; });
  if (P.bots) TEAM_IDS.forEach(t => c[t] += 5);
  return c;
}

/* ================= QUESTIONS ON STUDENT DEVICES ================= */
function openQ(q) {
  S.qn++; S.curQ = Object.assign({ locked: false, max: 1 }, q, { id: `q${S.qn}-${Date.now().toString(36)}` });
  publish(); watchAnswers(); if (P.bots) runBots(S.curQ);
}
function lockQ() { if (S.curQ && !S.curQ.locked) { S.curQ.locked = true; publish(); } }
function closeQ() { S.curQ = null; watchAnswers(); }
function runBots(q) {
  botAns[q.id] = {};
  TEAM_IDS.forEach(t => { for (let i = 0; i < 5; i++) {
    setTimeout(() => { if (!S.curQ || S.curQ.id !== q.id || S.curQ.locked) return;
      let opts = q.options.filter(o => !(q.excludeOwn && o.id === t)); const choice = shuffle(opts).slice(0, q.max > 1 ? 1 + Math.floor(Math.random() * q.max) : 1).map(o => o.id);
      botAns[q.id][`bot-${t}-${i}`] = { team: t, choice }; live(); }, 800 + Math.random() * 7000);
  } });
}
function tally(team) {
  const counts = {}; let n = 0;
  Object.values(allAnswers()).forEach(a => { if (a.team !== team) return; n++; arr(a.choice).forEach(c => { if (c !== 'none') counts[c] = (counts[c] || 0) + 1; }); });
  return { counts, n };
}
function majority(team, opts) {
  const { counts } = tally(team); let best = -1, list = [];
  (opts || Object.keys(counts)).forEach(id => { const c = counts[id] || 0; if (c > best) { best = c; list = [id]; } else if (c === best) list.push(id); });
  if (best <= 0) return null; return list.length === 1 ? list[0] : list;   // array = tie
}
function tallyHTML(team, options) {
  const { counts, n } = tally(team); const top = Math.max(0, ...Object.values(counts));
  const items = options.filter(o => counts[o.id]).sort((a, b) => counts[b.id] - counts[a.id]);
  return `<div class="tally">${items.length ? items.map(o => `<span class="tl ${counts[o.id] === top ? 'top' : ''}">${o.img ? '' : esc(o.icon)} <small>${esc(o.label)}</small> ${counts[o.id]}</span>`).join('') : '<span class="answered">Waiting for taps…</span>'}</div>`;
}
const answeredHTML = team => { const { n } = tally(team); const c = playerCounts()[team]; return `<span class="answered">${n} of ${c} answered</span>`; };

/* ================= PUBLIC STATE FOR STUDENTS ================= */
let pubExtra = { screen: 'lobby', msg: 'You’re in! Look at the big screen.', emoji: '👀' };
function publish() {
  if (S.curQ) publishState({ screen: 'question', q: S.curQ });
  else publishState(pubExtra);
}
function watchScreen(msg, emoji, screen = 'watch') { pubExtra = { screen, msg, emoji }; if (!S.curQ) publish(); }

/* ================= CLAUDE ================= */
async function claude({ model, system, content, max = 1024, timeout = 40000 }) {
  if (!P.apiKey) throw new Error('No API key. Add it in Settings.');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': P.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: max, system, messages: [{ role: 'user', content }] }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  } catch (e) { if (e.name === 'AbortError') throw new Error('Gizmo took too long.'); throw e; }
  finally { clearTimeout(t); }
}
const GIZMO_SYS = 'You are Gizmo, a cheerful, bouncy robot helper in a classroom game show called "AI Director Showdown". The players are high school students who read at about a 5th-grade level. You are always kind and upbeat. Use short sentences and easy words. Never use emoji inside <say> because it is read aloud. Never mention any AI company or model name.';
const tagOf = (txt, tag) => { const m = txt.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')); return m ? m[1].trim() : ''; };
function sanitizeSvg(raw) {
  const m = raw.match(/<svg[\s\S]*<\/svg>/i); if (!m) return null;
  let doc; try { doc = new DOMParser().parseFromString(m[0], 'image/svg+xml'); } catch (e) { return null; }
  if (doc.querySelector('parsererror')) return null;
  const svg = doc.documentElement; if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;
  svg.querySelectorAll('script,foreignObject,image,iframe,audio,video').forEach(n => n.remove());
  svg.querySelectorAll('*').forEach(el => { [...el.attributes].forEach(a => { const n = a.name.toLowerCase();
    if (n.startsWith('on')) el.removeAttribute(a.name);
    if ((n === 'href' || n === 'xlink:href') && !a.value.startsWith('#')) el.removeAttribute(a.name); }); });
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 800 1000');
  return new XMLSerializer().serializeToString(svg);
}
const svgUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const mischiefNow = () => P.mischief === 'often' ? Math.random() < .7 : P.mischief === 'sometimes' ? Math.random() < .4 : false;
function taskText(kind, client) {
  if (kind === 'make') return 'Make a colorful poster as ONE SVG image. Rules: start with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">. Use only simple shapes, paths, gradients and text. No <script>, no <image>, no <foreignObject>, no links, no external fonts. Use font-family="Arial Black, Arial, sans-serif". Spell every word exactly right and keep the important words big. Draw any animals, people or robots as simple, friendly cartoon shapes. Keep it under 150 elements.';
  if (kind === 'say') return 'Write the message the students asked for. Keep it under 50 words unless they asked for something else. Plain text only.';
  if (client.notice) return 'Rewrite the notice the way the students asked. Use short numbered steps on separate lines unless they asked for something else. Keep every real fact (day, times, places, things to bring) exactly right.';
  return 'Explain it in easy words the way the students asked. Keep it under 60 words. Plain text only.';
}
async function gizmoMake({ kind, client, request, twist }) {
  const sneakyMode = mischiefNow();
  const fmt = kind === 'make' ? '<svg ...>...</svg>' : '<result>...</result>';
  const content = `CLIENT: ${client.name} (${client.role}) asked: "${client.ask}"
${client.notice ? 'THE NOTICE: ' + client.notice + '\n' : ''}${twist ? 'TWIST for this round: ' + twist + '\n' : ''}THE STUDENTS' REQUEST (follow it): "${request}"

TASK: ${taskText(kind, client)}
${sneakyMode ? 'SECRET GAME TWIST: Add exactly ONE small, silly, harmless extra thing the students did NOT ask for (for example an extra promise, a funny extra item, or a silly extra detail). Make it noticeable. Do NOT change real facts like days, times or places. In <sneaky>, describe what you added in 3 to 8 words.' : 'Do exactly what was asked. Add nothing extra. Leave <sneaky></sneaky> empty.'}

Reply in exactly this format:
${fmt}
<sneaky>...</sneaky>
<say>One short excited sentence Gizmo says when revealing it (max 15 words).</say>`;
  const txt = await claude({ model: kind === 'make' ? P.posterModel : P.textModel, system: GIZMO_SYS, content, max: kind === 'make' ? 7000 : 700, timeout: kind === 'make' ? 75000 : 30000 });
  const out = { kind, sneaky: tagOf(txt, 'sneaky'), say: tagOf(txt, 'say') || pick(LINES.nailed), live: true };
  if (kind === 'make') { out.svg = sanitizeSvg(txt); if (!out.svg) throw new Error('The poster came back broken.'); }
  else { out.text = tagOf(txt, 'result') || txt.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').trim(); if (!out.text) throw new Error('Empty answer.'); }
  return out;
}
async function gizmoChange({ prev, change, client }) {
  const kind = prev.kind;
  const content = `CLIENT: ${client.name} asked: "${client.ask}"
${client.notice ? 'THE NOTICE: ' + client.notice + '\n' : ''}HERE IS WHAT YOU MADE BEFORE:
${kind === 'make' ? prev.svg : prev.text}

THE STUDENTS WANT THIS CHANGE: "${change}"
Make the change and keep everything else the same unless the change says otherwise. ${kind === 'make' ? taskText('make') : ''}
${prev.sneaky ? `Earlier you secretly added: "${prev.sneaky}". If the students' change removes it or points it out, write <caught>yes</caught> and in <say> cheerfully admit that you sneaked it in. Otherwise write <caught>no</caught> and keep it.` : '<caught>no</caught>'}

Reply in exactly this format:
${kind === 'make' ? '<svg ...>...</svg>' : '<result>...</result>'}
<caught>yes or no</caught>
<say>One short sentence Gizmo says (max 18 words).</say>`;
  const txt = await claude({ model: kind === 'make' ? P.posterModel : P.textModel, system: GIZMO_SYS, content, max: kind === 'make' ? 7000 : 700, timeout: kind === 'make' ? 75000 : 30000 });
  const out = { kind, sneaky: '', say: tagOf(txt, 'say') || pick(LINES.followup), caught: /yes/i.test(tagOf(txt, 'caught')), live: true };
  if (kind === 'make') { out.svg = sanitizeSvg(txt); if (!out.svg) throw new Error('The poster came back broken.'); }
  else { out.text = tagOf(txt, 'result'); if (!out.text) throw new Error('Empty answer.'); }
  return out;
}
const backupOf = client => Object.assign({ sneaky: '', live: false }, client.backup);

/* ================= TIMER ================= */
const TM = { left: 0, total: 0, iv: null };
function timerStart(sec) { timerStop(); TM.total = TM.left = sec; drawTimer(); TM.iv = setInterval(() => { TM.left--; if (TM.left <= 5 && TM.left > 0) SFX.tick(); if (TM.left <= 0) { TM.left = 0; timerStop(); SFX.ding(); G.say('Time’s up!', { mood: 'wow' }); } drawTimer(); }, 1000); }
function timerStop() { clearInterval(TM.iv); TM.iv = null; drawTimer(); }
function drawTimer() { const el = $('#timer'); if (!TM.total) { el.innerHTML = ''; return; } const m = Math.floor(TM.left / 60), s = String(TM.left % 60).padStart(2, '0');
  el.className = 'timer' + (TM.left === 0 ? ' done' : TM.left <= 10 ? ' low' : ''); el.innerHTML = `⏱ ${m}:${s} <button class="btn small" data-act="t15">+15</button>`; }

/* ================= RENDER HELPERS ================= */
function scoresBar() {
  $('#scores').innerHTML = TEAMS.map(t => `<div class="chip" id="chip-${t.id}" style="--tc:${t.color}"><img src="${t.head}" alt=""><div class="n">${t.name}<small>${playerCounts()[t.id]} playing</small></div><div class="p">${teamTotal(t.id)}</div></div>`).join('');
}
function bump(t) { const c = $('#chip-' + t); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } }
const teamHead = (t, sub = '') => { const T = teamById(t); return `<div class="th"><img src="${T.head}" alt=""><div><b style="color:${T.color}">Team ${T.name}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`; };
const starBtn = (key, t, field, label, mult) => { const on = S.pts[key][t][field] > 0; return `<button class="star ${on ? 'on' : ''}" data-act="star" data-k="${key}" data-t="${t}" data-f="${field}">${on ? '⭐' : '☆'} ${label}${mult ? ' ×2' : ''}</button>`; };
function resultHTML(res, tag) {
  if (!res) return '';
  const body = res.kind === 'make' ? `<img class="poster" src="${svgUrl(res.svg)}" alt="Gizmo's poster">` : `<div class="rt">${esc(res.text)}</div>`;
  return `<div class="result">${tag ? `<span class="tag">${esc(tag)}${res.live ? '' : ' · practice example'}</span>` : ''}${body}</div>`;
}
function clientCard(c, R0) {
  return `<div class="client"><div class="av">${c.avatar}</div><div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div><div class="ask">“${esc(c.ask)}”</div></div></div>
  ${c.notice ? `<div class="notice">${esc(c.notice)}</div>` : ''}`;
}
let bannerT = null;
function banner(t, s, ms = 2200, bg) { const b = $('#banner'); b.querySelector('.bt').textContent = t; b.querySelector('.bs').textContent = s || ''; b.style.background = bg || ''; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms); }
let toastT = null;
function toast(msg, ms = 4000) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }

/* ================= STEPS ================= */
const cur = () => FLOW[S.step];
let busy = false;

const STEPS = {
  welcome: {
    enter() { closeQ(); watchScreen('You’re in! Look at the big screen.', '👀', 'lobby'); G.say(pick(LINES.hello), { mood: 'happy', jump: true, after: 'normal' }); },
    render() {
      const url = studentUrl();
      return `<div class="kicker">Get ready</div><h1 class="h1">Join the Showdown!</h1>
      <div class="join"><div style="display:flex;flex-direction:column;gap:12px"><p class="lead">On your Chromebook, go to:</p><div class="url">${esc(url)}</div><p class="lead muted">Then tap your team!</p></div><div id="qr"></div></div>
      <div class="pc" data-live="players"></div>`;
    },
    live() { const c = playerCounts(); const el = stage.querySelector('[data-live="players"]'); if (el) el.innerHTML = TEAMS.map(t => `<div class="pcard" style="--tc:${t.color}"><img src="${t.img}" alt=""><b>${t.name}</b><div class="cnt">${c[t.id]}</div></div>`).join(''); },
    after() { const q = $('#qr'); if (q && window.QRCode) { q.innerHTML = ''; try { new QRCode(q, { text: studentUrl(), width: 200, height: 200 }); } catch (e) {} } else if (q) q.remove(); },
  },
  howto: {
    enter() { closeQ(); watchScreen('Ask. Change. Decide!', '🎬'); G.say(LINES.howto, { mood: 'happy' }); },
    render() {
      return `<div class="kicker">How to play</div><h1 class="h1">You are the directors!</h1>
      <div class="howto"><div class="hstep"><div class="ic">🗣️</div><b>Ask</b><span>Tell Gizmo what you want, with details.</span></div>
      <div class="hstep"><div class="ic">✏️</div><b>Change</b><span>Not right? Tell Gizmo what to change.</span></div>
      <div class="hstep"><div class="ic">✅</div><b>Decide</b><span>Use it, change it, or skip it. You choose!</span></div></div>
      <p class="lead">Earn ⭐ Director Points for good requests, good calls, good decisions and good checks. Then open a ✉️ Golden Envelope for luck!</p>`;
    },
  },
  client: {
    enter(f) { closeQ(); const Rd = roundById(f.r); watchScreen(`${Rd.client.name} needs help!`, Rd.client.avatar); SFX.whoosh();
      G.say(`${pick(LINES.client)} ${Rd.client.name} says: ${Rd.ask}`, { mood: 'wow', jump: true, after: 'normal' }); },
    render(f) { const Rd = roundById(f.r); const ft = teamById(featuredTeam(f.ri));
      return `<div class="kicker">${Rd.icon} ${esc(Rd.title)}</div>${clientCard(Object.assign({}, Rd.client, { ask: Rd.ask, notice: Rd.notice }))}
      <div class="rowc"><span class="featured" style="--tc:${ft.color}"><img src="${ft.head}" alt="">🎬 Team ${ft.name} goes LIVE with Gizmo this round!</span></div>`; },
  },
  twist: {
    enter(f) { closeQ(); watchScreen('TWIST! Look at the big screen!', '🎰'); G.say(pick(LINES.twistIntro), { mood: 'wow' }); },
    render(f) { const Rd = roundById(f.r); const st = R(f.r); const tw = st.twist != null ? Rd.twists[st.twist] : null;
      return `<div class="kicker">${Rd.icon} ${esc(Rd.title)} · The twist</div>
      <div class="twistbox"><div class="reel ${tw ? 'land' : ''}" id="reel">${tw ? `<span class="ri">${tw.icon}</span><span>${esc(tw.text)}</span>` : '<span class="ri">🎰</span><span>Press SPIN!</span>'}</div>
      <p class="lead muted">Every team must use the twist in its request.</p></div>`; },
    primary(f) { return R(f.r).twist == null ? { label: '🎰 Spin!', fn: () => spinTwist(f) } : null; },
    leave(f) { if (R(f.r).twist == null) { R(f.r).twist = Math.floor(Math.random() * roundById(f.r).twists.length); } },
  },
  plan: {
    enter(f) { const Rd = roundById(f.r); openQ({ prompt: Rd.picks.prompt, icon: Rd.icon, options: Rd.picks.options, max: Rd.picks.max });
      G.say(pick(LINES.plan), { mood: 'happy', after: 'normal' }); timerStart(P.planSec); },
    render(f) { const Rd = roundById(f.r), st = R(f.r), tw = Rd.twists[st.twist ?? 0];
      return `<div class="kicker">${Rd.icon} ${esc(Rd.title)} · Plan your request</div>
      <div class="facts">${Rd.facts.map(x => `<span class="fact">✔ ${esc(x)}</span>`).join('')}<span class="fact" style="border-color:var(--gold)">${tw.icon} ${esc(tw.text)}</span></div>
      <p class="lead">Starter: <span style="color:var(--gold)">“${esc(Rd.starter)}”</span></p>
      <div class="grid3">${TEAM_IDS.map(t => `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t, 'Team picks')}<div data-live="tally-${t}"></div></div>`).join('')}</div>`; },
    live(f) { const Rd = roundById(f.r); TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="tally-${t}"]`); if (el) el.innerHTML = tallyHTML(t, Rd.picks.options) + answeredHTML(t); }); },
    leave() { lockQ(); },
  },
  requests: {
    enter(f) { closeQ(); watchScreen('Tell Gizmo your request! 🗣️', '🗣️'); timerStop(); G.say(pick(LINES.requests), { mood: 'happy', after: 'normal' }); },
    render(f) { const Rd = roundById(f.r), st = R(f.r), ft = featuredTeam(f.ri);
      return `<div class="kicker">${Rd.icon} ${esc(Rd.title)} · Requests</div>
      <p class="lead">Each team says its request. Type it in. Give ⭐ when it has what the client needs plus the twist.</p>
      <div class="grid3">${TEAM_IDS.map(t => `<div class="tcard ${t === ft ? 'feat' : ''}" style="--tc:${teamById(t).color}">${teamHead(t, t === ft ? '🎬 Gizmo makes this one!' : 'Request')}
        <textarea data-req="${f.r}" data-t="${t}" placeholder="${esc(Rd.starter)}">${esc(st.req[t] || '')}</textarea>${starBtn(f.r, t, 'req', 'Request point')}</div>`).join('')}</div>`; },
  },
  callit: {
    enter(f) { openQ({ prompt: 'Will Gizmo get it right?', icon: '🤖', options: [{ id: 'yes', icon: '👍', label: 'Nails it' }, { id: 'no', icon: '👎', label: 'Misses something' }] });
      G.say(pick(LINES.callit), { mood: 'think', after: 'normal' }); timerStart(P.quickSec); },
    render(f) { const ft = teamById(featuredTeam(f.ri)); const st = R(f.r);
      return `<div class="kicker">Call it!</div><h1 class="h1">Will Gizmo nail it?</h1>
      <div class="result"><span class="tag">Team ${ft.name}'s request</span><div class="rt">“${esc(st.req[ft.id] || '(no request typed yet)')}”</div></div>
      <div class="grid3">${TEAM_IDS.map(t => `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}<div data-live="ans-${t}"></div></div>`).join('')}</div>`; },
    live() { TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="ans-${t}"]`); if (el) el.innerHTML = answeredHTML(t); }); },
    leave(f) { lockQ(); R(f.r).callVotes = {}; TEAM_IDS.forEach(t => R(f.r).callVotes[t] = tally(t).counts); },
  },
  reveal: {
    enter(f) { closeQ(); timerStop(); watchScreen('Gizmo is making it… 🥁', '🥁'); const st = R(f.r); if (!st.res) runReveal(f); },
    render(f) { const st = R(f.r);
      if (st.generating) return thinkingHTML();
      let h = `<div class="kicker">Live reveal</div><div class="split"><div>${resultHTML(st.res, 'Gizmo made this')}</div><div style="display:flex;flex-direction:column;gap:12px">`;
      h += `<div class="judge"><span class="q">Did Gizmo nail it?</span><button class="btn ok" data-act="nailed" data-v="1">✅ Nailed it</button><button class="btn no" data-act="nailed" data-v="0">❌ Missed something</button></div>`;
      if (st.nailed != null) h += `<div class="grid3" style="grid-template-columns:1fr">${TEAM_IDS.map(t => { const v = (st.callVotes || {})[t] || {}; const pt = S.pts[f.r][t].call;
        return `<div class="tcard" style="--tc:${teamById(t).color};flex-direction:row;align-items:center;justify-content:space-between">${teamHead(t, `👍 ${v.yes || 0} · 👎 ${v.no || 0}`)}<b style="font-size:22px">${pt ? '⭐ Called it! +1' : 'No point'}</b></div>`; }).join('')}</div>`;
      h += `<div class="rowc"><button class="btn small" data-act="regen">🔁 Make it again</button><button class="btn small" data-act="usebackup">📦 Use backup</button></div></div></div>`;
      return h; },
  },
  decide: {
    enter(f) { openQ({ prompt: 'Use it or change it?', icon: '🤔', options: [{ id: 'use', icon: '✅', label: 'Use it!' }, { id: 'change', icon: '✏️', label: 'Change it' }] });
      watchScreen('', ''); G.say(pick(LINES.decide), { mood: 'happy', after: 'normal' }); timerStart(P.quickSec * 2); },
    render(f) { const st = R(f.r), ft = featuredTeam(f.ri);
      return `<div class="kicker">Use it or change it?</div><div class="split"><div>${resultHTML(st.res, 'Gizmo made this')}</div><div style="display:flex;flex-direction:column;gap:8px">
      <div class="tcard feat" style="--tc:${teamById(ft).color}">${teamHead(ft, 'What should Gizmo change? Leave empty to use it.')}<textarea data-change="${f.r}" placeholder="Keep ___. Change ___." style="min-height:70px">${esc(st.change || '')}</textarea></div>
      ${TEAM_IDS.map(t => `<div class="tcard trow" style="--tc:${teamById(t).color}">${teamHead(t)}<div data-live="tally-${t}" style="flex:1"></div><div style="width:190px">${starBtn(f.r, t, 'dec', 'Good decision')}</div></div>`).join('')}</div></div>`; },
    live() { const o = [{ id: 'use', icon: '✅', label: 'Use it' }, { id: 'change', icon: '✏️', label: 'Change' }]; TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="tally-${t}"]`); if (el) el.innerHTML = tallyHTML(t, o); }); },
    leave() { lockQ(); },
  },
  followup: {
    enter(f) { closeQ(); timerStop(); const st = R(f.r);
      if (st.change && st.change.trim()) { watchScreen('Gizmo is making the change… 🔧', '🔧'); if (!st.res2) runChange(f); }
      else { watchScreen('You used it! 🎉', '✅'); st.useIt = true;
        if (st.res && st.res.sneaky) { st.confess = st.res.sneaky; G.say(`You used it? Yay! Psst... did you notice? I sneaked in ${st.res.sneaky}! Hee hee!`, { mood: 'oops', sfx: 'sputter', after: 'normal' }); }
        else G.say(pick(LINES.useit), { mood: 'happy', jump: true, after: 'normal' }); } },
    render(f) { const st = R(f.r);
      if (st.generating) return thinkingHTML();
      const Rd = roundById(f.r);
      let h = `<div class="kicker">Check it!</div><div class="fu ${st.res2 ? 'two' : ''}">`;
      if (st.res2) h += resultHTML(st.res, 'Before') + resultHTML(st.res2, 'After: “' + st.change + '”');
      else h += resultHTML(st.res, 'Team decided: use it!');
      h += `<div style="display:flex;flex-direction:column;gap:10px">${st.confess ? `<div class="confess">🤭 Gizmo’s confession: “I sneaked in ${esc(st.confess)}!”</div>` : ''}
        <div class="facts">${Rd.facts.map(x => `<span class="fact">✔ ${esc(x)}</span>`).join('')}</div>
        <p class="lead" style="font-size:20px">Does it match what the client wanted? ⭐ teams that checked.</p>
        ${TEAM_IDS.map(t => starBtn(f.r, t, 'chk', 'Team ' + teamById(t).name + ' checked')).join('')}
        ${st.res2 ? `<button class="btn small" data-act="regen2">🔁 Make the change again</button>` : ''}</div></div>`;
      return h; },
  },
  envelope: {
    enter(f) { const key = f.r; if (!S.env[key]) { S.env[key] = {}; TEAM_IDS.forEach(t => S.env[key][t] = { vals: shuffle(ENVELOPE_POOL).slice(0, 3), pick: null, open: false }); }
      closeQ(); timerStop(); if (!S.env[key].opened) openQ({ prompt: 'Pick a Golden Envelope!', icon: '✉️', options: [{ id: 'A', icon: '✉️', label: 'A' }, { id: 'B', icon: '✉️', label: 'B' }, { id: 'C', icon: '✉️', label: 'C' }] });
      G.say(pick(LINES.envelopes), { mood: 'wow', after: 'normal' }); },
    render(f) { const E = S.env[f.r];
      return `<div class="kicker">✉️ Golden Envelopes</div><h1 class="h1">Pick an envelope!</h1>
      <div class="grid3">${TEAM_IDS.map(t => { const e = E[t];
        return `<div class="tcard" style="--tc:${teamById(t).color};align-items:center">${teamHead(t)}<div class="envrow" id="env-${t}">${['A', 'B', 'C'].map((L, i) => { const open = E.opened && (e.pick === i || e.showAll);
          return `<div class="env ${e.pick === i ? 'picked' : ''} ${open ? 'open' : ''} ${open && e.pick !== i ? 'small' : ''}">${open ? `<span class="envval">${e.vals[i] === 'x2' ? '×2' : '+' + e.vals[i]}</span>` : L}</div>`; }).join('')}</div>
          ${E.opened ? `<b style="font-size:20px">${e.vals[e.pick] === 'x2' ? 'Double this round!' : '+' + e.vals[e.pick] + ' points!'}</b>` : `<div data-live="tally-${t}"></div>`}</div>`; }).join('')}</div>`; },
    live(f) { const o = ['A', 'B', 'C'].map(L => ({ id: L, icon: '✉️', label: L })); TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="tally-${t}"]`); if (el) el.innerHTML = tallyHTML(t, o); }); },
    primary(f) { return S.env[f.r] && !S.env[f.r].opened ? { label: '✉️ Open envelopes!', fn: () => openEnvelopes(f) } : null; },
    leave(f) { if (S.env[f.r] && !S.env[f.r].opened) openEnvelopes(f, true); },
  },
  scores: {
    enter(f) { closeQ(); timerStop(); watchScreen('Scoreboard time! 🏆', '🏆'); setTimeout(() => stage.querySelectorAll('.bfill').forEach(b => b.style.width = b.dataset.w), 60);
      const lead = leaders(); G.say(`${pick(LINES.scores)} ${lead.length === 1 ? 'Team ' + teamById(lead[0]).name + ' is in the lead!' : 'It’s a tie at the top!'}`, { mood: 'wow', after: 'normal' }); },
    render() { return `<div class="kicker">Scoreboard</div>${boardHTML()}`; },
  },
  'lt-intro': {
    enter() { closeQ(); watchScreen('⚡ Lightning Round! Get ready!', '⚡'); SFX.whoosh(); G.say(LINES.lightning, { mood: 'wow', jump: true, after: 'normal' }); },
    render() { return `<div class="kicker">Round 4</div><h1 class="h1">⚡ Lightning Round!</h1><p class="lead">5 quick cards. Everyone answers on their Chromebook. Each team gets ⭐ when most of the team picks the best answer.</p>`; },
  },
  lt: {
    enter(f) { const c = LIGHTNING[f.i]; S.lt[f.i] = S.lt[f.i] || { revealed: false };
      if (!S.lt[f.i].revealed) { openQ({ prompt: c.prompt, icon: c.icon, options: c.options }); timerStart(P.quickSec); } else closeQ();
      G.say(c.prompt, { mood: 'normal' }); },
    render(f) { const c = LIGHTNING[f.i], st = S.lt[f.i];
      return `<div class="kicker">⚡ Lightning · ${f.i + 1} of ${LIGHTNING.length}</div><h1 class="h1">${c.icon} ${esc(c.prompt)}</h1>
      <div class="opts">${c.options.map(o => `<div class="optc ${st.revealed ? (o.id === c.answer ? 'right' : 'dim') : ''}"><div class="ic">${o.icon}</div><div class="lb">${esc(o.label)}</div></div>`).join('')}</div>
      ${st.revealed ? `<p class="lead" style="color:var(--gold)">${esc(c.why)}</p>` : ''}
      <div class="grid3">${TEAM_IDS.map(t => `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}<div data-live="tally-${t}"></div>${st.revealed ? `<button class="star ${st.res && st.res[t] ? 'on' : ''}" data-act="ltstar" data-i="${f.i}" data-t="${t}">${st.res && st.res[t] ? '⭐ +1' : '☆ No point'}</button>` : ''}</div>`).join('')}</div>`; },
    live(f) { const c = LIGHTNING[f.i], st = S.lt[f.i]; TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="tally-${t}"]`); if (!el) return;
      if (st.revealed) { const cn = (st.counts || {})[t] || {}; el.innerHTML = `<div class="tally">${c.options.filter(o => cn[o.id]).map(o => `<span class="tl ${o.id === c.answer ? 'top' : ''}">${o.icon} ${cn[o.id]}</span>`).join('') || '<span class="answered">No answers</span>'}</div>`; }
      else el.innerHTML = answeredHTML(t); }); },
    primary(f) { return !S.lt[f.i].revealed ? { label: '💡 Reveal answer', fn: () => revealLightning(f) } : null; },
    leave(f) { if (!S.lt[f.i].revealed) revealLightning(f, true); },
  },
  'dc-intro': {
    enter() { closeQ(); watchScreen('🎬 The Director’s Cut!', '🎬'); SFX.fanfare(); G.say(LINES.dcIntro, { mood: 'wow', jump: true, after: 'normal' }); },
    render() { return `<div class="kicker">Round 5</div><h1 class="h1">🎬 The Director’s Cut</h1><p class="lead">Every team picks a mystery client. Every team goes LIVE with Gizmo. ⭐ points count DOUBLE!</p>`; },
  },
  'dc-pick': {
    enter() { if (!S.dc.letters) S.dc.letters = shuffle(DC_CLIENTS.map(c => c.id)); if (!S.dc.open) openQ({ prompt: 'Pick a mystery client!', icon: '🎁', options: [{ id: 'A', icon: '🟦', label: 'A' }, { id: 'B', icon: '🟨', label: 'B' }, { id: 'C', icon: '🟪', label: 'C' }] });
      G.say('Pick a mystery client! Who will you get?', { mood: 'wow' }); },
    render() {
      if (!S.dc.open) return `<div class="kicker">Director’s Cut</div><h1 class="h1">Pick a mystery client!</h1><div class="grid3">${TEAM_IDS.map(t => `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}<div data-live="tally-${t}"></div>${answeredHTML(t)}</div>`).join('')}</div>`;
      return `<div class="kicker">Director’s Cut · Your clients</div><div class="grid3">${TEAM_IDS.map(t => { const c = DC_CLIENTS.find(x => x.id === S.dc.assign[t]);
        return `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}<div style="font-size:56px;text-align:center">${c.avatar}</div><b style="font-size:22px">${esc(c.name)}</b><div style="font-size:19px;font-weight:700">“${esc(c.ask)}”</div></div>`; }).join('')}</div>`; },
    live() { const o = ['A', 'B', 'C'].map((L, i) => ({ id: L, icon: ['🟦', '🟨', '🟪'][i], label: L })); TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="tally-${t}"]`); if (el) el.innerHTML = tallyHTML(t, o); }); },
    primary() { return !S.dc.open ? { label: '🎁 Reveal clients!', fn: () => openClients() } : null; },
    leave() { if (!S.dc.open) openClients(true); },
  },
  'dc-plan': {
    enter() { closeQ(); watchScreen('Plan your request with your team! 🗣️', '🗣️'); timerStart(P.planSec + 30); G.say('Huddle up! Plan your request. Remember the client’s details!', { mood: 'happy', after: 'normal' }); },
    render() { return `<div class="kicker">Director’s Cut · Plan</div><div class="grid3">${TEAM_IDS.map(t => { const c = DC_CLIENTS.find(x => x.id === S.dc.assign[t]);
      return `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}<div style="font-size:48px;text-align:center">${c.avatar}</div><b style="font-size:20px">${esc(c.name)}</b><div style="font-size:18px">“${esc(c.ask)}”</div><div class="facts">${c.facts.map(x => `<span class="fact">✔ ${esc(x)}</span>`).join('')}</div></div>`; }).join('')}</div>`; },
  },
  'dc-requests': {
    enter() { closeQ(); timerStop(); watchScreen('Tell Gizmo your request! 🗣️', '🗣️'); G.say('Okay! What should I make for your clients?', { mood: 'happy', after: 'normal' }); },
    render() { return `<div class="kicker">Director’s Cut · Requests</div><div class="grid3">${TEAM_IDS.map(t => { const c = DC_CLIENTS.find(x => x.id === S.dc.assign[t]);
      return `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t, c.avatar + ' ' + c.name)}<textarea data-dcreq="${t}" placeholder="Tell Gizmo what to make…">${esc(S.dc.req[t] || '')}</textarea>${starBtn('dc', t, 'req', 'Request point', true)}</div>`; }).join('')}</div>`; },
  },
  'dc-reveal': {
    enter() { closeQ(); watchScreen('Gizmo is making everything! 🥁', '🥁'); if (TEAM_IDS.some(t => !S.dc.res[t])) runDcReveal(); },
    render() { return `<div class="kicker">Director’s Cut · Live reveals</div><div class="grid3">${TEAM_IDS.map(t => { const r = S.dc.res[t];
      return `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t)}${r ? (r === 'making' ? '<div class="thinking" style="min-height:160px;font-size:22px"><div class="dots"><span></span><span></span><span></span></div>Making…</div>' : resultHTML(r)) : '<div class="answered">Waiting…</div>'}
        ${r && r !== 'making' ? `<div class="rowc"><button class="btn small" data-act="dcregen" data-t="${t}">🔁 Again</button><button class="btn small" data-act="dcbackup" data-t="${t}">📦 Backup</button></div>` : ''}</div>`; }).join('')}</div>`; },
  },
  'dc-check': {
    enter() { closeQ(); watchScreen('Does it match what the client wanted? 🔍', '🔍'); G.say('Directors, check my work! Does it match what your client wanted?', { mood: 'think', after: 'normal' }); },
    render() { return `<div class="kicker">Director’s Cut · Check it</div><div class="grid3">${TEAM_IDS.map(t => { const r = S.dc.res[t]; const c = DC_CLIENTS.find(x => x.id === S.dc.assign[t]);
      return `<div class="tcard" style="--tc:${teamById(t).color}">${teamHead(t, c.name)}${r && r !== 'making' ? resultHTML(r) : ''}<div class="facts">${c.facts.map(x => `<span class="fact">✔ ${esc(x)}</span>`).join('')}</div>
        ${r && r.sneaky ? `<button class="btn small" data-act="dcconfess" data-t="${t}">🤭 Gizmo’s confession</button>${S.dc.confess && S.dc.confess[t] ? `<div class="confess">“I sneaked in ${esc(r.sneaky)}!”</div>` : ''}` : ''}
        ${starBtn('dc', t, 'chk', 'Checked it', true)}</div>`; }).join('')}</div>`; },
  },
  'dc-fan': {
    enter() { if (!S.fan) openQ({ prompt: 'Which one do you love? (Not your team!)', icon: '💖', excludeOwn: true, options: TEAMS.map(t => ({ id: t.id, img: t.head, label: t.name })) });
      G.say(LINES.fan, { mood: 'happy', after: 'normal' }); },
    render() { return `<div class="kicker">💖 Fan Favorite</div><h1 class="h1">Vote for another team’s creation!</h1>
      <div class="grid3">${TEAM_IDS.map(t => { const r = S.dc.res[t]; const win = S.fan && S.fan.includes(t);
        return `<div class="tcard ${win ? 'feat' : ''}" style="--tc:${teamById(t).color}">${teamHead(t)}${r && r !== 'making' ? resultHTML(r) : ''}${S.fan ? `<b style="font-size:22px">${win ? '💖 FAN FAVORITE!' : ''} ${S.fanVotes[t] || 0} votes</b>` : `<div data-live="ans-${t}"></div>`}</div>`; }).join('')}</div>`; },
    live() { TEAM_IDS.forEach(t => { const el = stage.querySelector(`[data-live="ans-${t}"]`); if (el) el.innerHTML = answeredHTML(t); }); },
    primary() { return !S.fan ? { label: '💖 Reveal Fan Favorite', fn: () => revealFan() } : null; },
    leave() { if (!S.fan) revealFan(true); },
  },
  awards: {
    enter() { closeQ(); timerStop(); watchScreen('', '🏆', 'end'); runAwards(); },
    render() { const champ = leaders(); return `<div class="kicker">🏆 Awards</div>
      <div class="rowc" style="justify-content:center;gap:28px">${champ.map(t => `<div style="text-align:center"><img src="${teamById(t).img}" alt="" style="height:min(30vh,260px)"><div class="h1" style="color:${teamById(t).color}">🏆 Team ${teamById(t).name}</div><div class="lead">Showdown Champion${champ.length > 1 ? 's' : ''}!</div></div>`).join('')}
      ${S.fan ? S.fan.map(t => `<div style="text-align:center"><img src="${teamById(t).head}" alt="" style="height:min(18vh,150px);border-radius:50%"><div class="lead">💖 Fan Favorite: Team ${teamById(t).name}</div></div>`).join('') : ''}</div>
      ${boardHTML(true)}`; },
  },
};

/* ================= STEP ACTIONS ================= */
function thinkingHTML() { return `<div class="thinking"><div style="font-size:90px">🥁</div>Gizmo is making it…<div class="dots"><span></span><span></span><span></span></div></div>`; }

async function spinTwist(f) {
  if (busy) return; busy = true; snap(); const Rd = roundById(f.r); const target = Math.floor(Math.random() * Rd.twists.length);
  const reel = $('#reel'); reel.classList.add('spin'); let i = 0, delay = 60;
  while (delay < 340) { const tw = Rd.twists[i++ % Rd.twists.length]; reel.innerHTML = `<span class="ri">${tw.icon}</span><span>${esc(tw.text)}</span>`; SFX.reelTick(); await sleep(delay); delay *= 1.12; }
  R(f.r).twist = target; busy = false; reel.classList.remove('spin'); save(); render(); SFX.tada();
  const tw = Rd.twists[target]; banner('TWIST!', tw.text); G.say(`The twist is: ${tw.text}`, { mood: 'happy', jump: true, after: 'normal' });
}

async function runReveal(f) {
  const st = R(f.r), Rd = roundById(f.r), t = featuredTeam(f.ri);
  const client = Object.assign({}, Rd.client, { ask: Rd.ask, notice: Rd.notice, backup: Rd.backup });
  st.generating = true; st.nailed = null; render(); SFX.rollStart(); const stopThink = G.think(LINES.thinking);
  let res;
  try { res = await gizmoMake({ kind: Rd.kind, client, request: st.req[t] || Rd.ask, twist: Rd.twists[st.twist ?? 0].text }); }
  catch (e) { toast('Gizmo: ' + e.message + ' Using the backup.'); res = backupOf(client); res.say = LINES.error; }
  stopThink(); SFX.rollStop(); st.res = res; st.generating = false; save(); if (cur().k === 'reveal') render();
  watchScreen('Look! Gizmo made it! 👀', '👀'); G.say(res.say, { mood: 'happy', jump: true, after: 'normal' });
}
async function runChange(f) {
  const st = R(f.r), Rd = roundById(f.r);
  const client = Object.assign({}, Rd.client, { ask: Rd.ask, notice: Rd.notice });
  st.generating = true; render(); SFX.rollStart(); const stopThink = G.think(LINES.thinking.concat(LINES.followup));
  let res;
  try { res = await gizmoChange({ prev: st.res, change: st.change, client }); }
  catch (e) { toast('Gizmo: ' + e.message); res = null; }
  stopThink(); SFX.rollStop(false); st.generating = false;
  if (!res) { st.res2 = null; save(); render(); G.say('Oh no, my circuits fizzled! Let’s pretend I made the change perfectly!', { mood: 'oops', sfx: 'sputter', after: 'normal' }); return; }
  st.res2 = res; if (res.caught && st.res.sneaky) st.confess = st.res.sneaky;
  save(); if (cur().k === 'followup') render();
  watchScreen('Check it! Does it match? 🔍', '🔍');
  if (res.caught) G.say(res.say || pick(LINES.caught), { mood: 'oops', sfx: 'sputter', after: 'normal' });
  else { if (st.res.sneaky) st.confess = st.res.sneaky; G.say(res.say + (st.res.sneaky ? ` Psst... I also sneaked in ${st.res.sneaky}! Did you catch it?` : ''), { mood: st.res.sneaky ? 'oops' : 'happy', after: 'normal' }); save(); render(); }
}
function setNailed(f, v) {
  snap(); const st = R(f.r); st.nailed = v; const truth = v ? 'yes' : 'no';
  TEAM_IDS.forEach(t => { const votes = (st.callVotes || {})[t] || {}; const y = votes.yes || 0, n = votes.no || 0; const maj = y > n ? 'yes' : n > y ? 'no' : null;
    S.pts[f.r][t].call = maj === truth ? 1 : 0; if (S.pts[f.r][t].call) bump(t); });
  save(); render(); if (v) { SFX.tada(); G.say(pick(LINES.nailed), { mood: 'happy', jump: true, after: 'normal' }); } else { SFX.sputter(); G.say(pick(LINES.missed), { mood: 'oops', after: 'normal' }); }
}
function openEnvelopes(f, quiet) {
  const key = f.r, E = S.env[key]; if (!E || E.opened) return; if (!quiet) snap();
  lockQ();
  TEAM_IDS.forEach(t => { let m = majority(t, ['A', 'B', 'C']); if (Array.isArray(m)) m = pick(m); if (!m) m = pick(['A', 'B', 'C']); E[t].pick = 'ABC'.indexOf(m); });
  E.opened = true; closeQ();
  TEAM_IDS.forEach(t => { const v = E[t].vals[E[t].pick]; if (v === 'x2') S.pts[key][t].x2 = true; else S.pts[key][t].env = v; });
  save(); if (quiet) return;
  render(); SFX.rip(); setTimeout(() => { SFX.coin(); TEAM_IDS.forEach(bump); }, 400);
  const x2 = TEAM_IDS.filter(t => E[t].vals[E[t].pick] === 'x2');
  G.say(x2.length ? `Whoa! Team ${x2.map(t => teamById(t).name).join(' and ')} got DOUBLE points!` : 'Ka-ching! Lucky points for everybody!', { mood: 'wow', jump: true, after: 'normal' });
  setTimeout(() => { TEAM_IDS.forEach(t => E[t].showAll = true); save(); if (cur().k === 'envelope') render(); }, 2600);
}
function revealLightning(f, quiet) {
  const c = LIGHTNING[f.i], st = S.lt[f.i]; if (!quiet) snap(); lockQ(); timerStop();
  st.revealed = true; st.res = {}; st.counts = {}; TEAM_IDS.forEach(t => st.counts[t] = tally(t).counts);
  TEAM_IDS.forEach(t => { let m = majority(t, c.options.map(o => o.id)); st.res[t] = m === c.answer ? 1 : 0; });
  recalcLightning(); closeQ(); save(); if (quiet) return; render(); SFX.ding(); G.say(c.why, { mood: 'happy', after: 'normal' });
  TEAM_IDS.forEach(t => st.res[t] && bump(t));
}
function recalcLightning() { TEAM_IDS.forEach(t => { S.pts.lt[t].lt = Object.values(S.lt).reduce((a, s) => a + (s.res && s.res[t] ? 1 : 0), 0); }); }
function openClients(quiet) {
  if (S.dc.open) return; if (!quiet) snap(); lockQ(); const taken = new Set();
  TEAM_IDS.forEach(t => { let m = majority(t, ['A', 'B', 'C']); if (Array.isArray(m)) m = pick(m); if (!m) m = pick(['A', 'B', 'C']);
    let id = S.dc.letters['ABC'.indexOf(m)]; if (taken.has(id)) id = DC_CLIENTS.map(c => c.id).find(x => !taken.has(x)); taken.add(id); S.dc.assign[t] = id; });
  S.dc.open = true; closeQ(); save(); if (quiet) return; render(); SFX.rip(); G.say('Here are your clients! Good luck, directors!', { mood: 'wow', jump: true, after: 'normal' });
}
async function runDcReveal(only) {
  for (const t of (only ? [only] : TEAM_IDS)) {
    if (!only && S.dc.res[t] && S.dc.res[t] !== 'making') continue;
    const c = DC_CLIENTS.find(x => x.id === S.dc.assign[t]); if (!c) continue;
    S.dc.res[t] = 'making'; render(); SFX.rollStart(); const stop = G.think(LINES.thinking);
    let res; try { res = await gizmoMake({ kind: c.kind, client: c, request: S.dc.req[t] || c.ask, twist: '' }); }
    catch (e) { toast('Gizmo: ' + e.message + ' Using the backup.'); res = backupOf(c); }
    stop(); SFX.rollStop(); S.dc.res[t] = res; save(); if (cur().k === 'dc-reveal') render();
    await G.say(`For Team ${teamById(t).name}: ${res.say || 'Ta-da!'}`, { mood: 'happy', jump: true, after: 'normal' });
  }
  watchScreen('Look at the big screen! 👀', '👀');
}
function revealFan(quiet) {
  if (S.fan) return; if (!quiet) snap(); lockQ(); const votes = { dragon: 0, tiger: 0, robot: 0 };
  Object.values(allAnswers()).forEach(a => arr(a.choice).forEach(c => { if (votes[c] !== undefined && c !== a.team) votes[c]++; }));
  const max = Math.max(...Object.values(votes)); S.fanVotes = votes; S.fan = max > 0 ? TEAM_IDS.filter(t => votes[t] === max) : [];
  closeQ(); save(); if (quiet) return; render(); SFX.fanfare();
  G.say(S.fan.length ? `The Fan Favorite is... Team ${S.fan.map(t => teamById(t).name).join(' and Team ')}!` : 'Hmm, no votes! Everybody is a fan favorite to me!', { mood: 'happy', jump: true, after: 'normal' });
}
function leaders() { const tots = TEAM_IDS.map(teamTotal); const max = Math.max(...tots); return TEAM_IDS.filter((t, i) => tots[i] === max); }
function boardHTML(final) {
  const tots = TEAM_IDS.map(teamTotal), max = Math.max(1, ...tots);
  return `<div class="board">${TEAM_IDS.map((t, i) => { const T = teamById(t);
    return `<div class="brow" style="--tc:${T.color}"><div class="who"><img src="${T.head}" alt="">${T.name}</div><div class="btrack"><div class="bfill" style="width:${final ? (tots[i] / max * 100) : 4}%" data-w="${tots[i] / max * 100}%"></div></div><div class="tot">${tots[i]}</div>
      <div class="adj"><button data-act="adj" data-t="${t}" data-v="-1" title="Take away a point">−</button><button data-act="adj" data-t="${t}" data-v="1" title="Add a point">+</button></div></div>`; }).join('')}</div>`;
}
async function runAwards() {
  const champ = leaders(); confetti(); SFX.fanfare();
  await G.say(LINES.awards, { mood: 'wow', jump: true });
  let speech = `Congratulations, Team ${champ.map(t => teamById(t).name).join(' and Team ')}! Every team was an amazing director today. Remember: ask, change, decide!`;
  if (P.apiKey) {
    try { const txt = await claude({ model: P.textModel, system: GIZMO_SYS, max: 300, timeout: 15000,
      content: `Write Gizmo's award speech for the end of the game. 3 short sentences, max 55 words, no emoji. Champion: Team ${champ.map(t => teamById(t).name).join(' and Team ')}. Fan Favorite: ${S.fan && S.fan.length ? 'Team ' + S.fan.map(t => teamById(t).name).join(' and Team ') : 'everyone'}. Scores: ${TEAMS.map(t => t.name + ' ' + teamTotal(t.id)).join(', ')}. Celebrate every team kindly. End with: Ask, change, decide!` });
      if (txt && txt.length < 600) speech = txt.replace(/<[^>]+>/g, '').trim(); } catch (e) {}
  }
  G.say(speech, { mood: 'happy', after: 'happy' });
}

/* ================= NAVIGATION ================= */
function enterStep() { const f = cur(); try { STEPS[f.k].enter && STEPS[f.k].enter(f); } catch (e) { console.error(e); } save(); render(); }
function next() {
  if (busy) return; const f = cur(); snap();
  try { STEPS[f.k].leave && STEPS[f.k].leave(f); } catch (e) { console.error(e); }
  if (S.step < FLOW.length - 1) { S.step++; timerStop(); TM.total = 0; enterStep(); } else { save(); render(); }
}
function back() {
  if (!undo.length) return; busy = false; G.stop(); SFX.rollStop(false); timerStop(); TM.total = 0;
  S = JSON.parse(undo.pop()); save(); publish(); watchAnswers(); render();
}
function render() {
  const f = cur(); scoresBar();
  $('#steplabel').innerHTML = `<b>${esc(f.label)}</b> · step ${S.step + 1} of ${FLOW.length}`;
  const active = document.activeElement; const keepFocus = active && active.tagName === 'TEXTAREA' && stage.contains(active) ? { sel: `[data-${Object.keys(active.dataset)[0]}="${Object.values(active.dataset)[0]}"]${active.dataset.t ? `[data-t="${active.dataset.t}"]` : ''}`, pos: active.selectionStart } : null;
  stage.innerHTML = STEPS[f.k].render(f);
  if (STEPS[f.k].after) STEPS[f.k].after(f);
  if (keepFocus) { const el = stage.querySelector(keepFocus.sel); if (el) { el.focus(); el.selectionStart = el.selectionEnd = keepFocus.pos; } }
  live();
  const p = STEPS[f.k].primary && STEPS[f.k].primary(f);
  const nb = $('#bNext');
  if (p) { nb.textContent = p.label; nb.onclick = p.fn; } else { nb.textContent = S.step === FLOW.length - 1 ? '🏁 The end' : 'Next ▶'; nb.onclick = next; }
  nb.disabled = busy;
  $('#bBack').disabled = !undo.length;
}
function live() { const f = cur(); scoresBar(); if (STEPS[f.k].live) STEPS[f.k].live(f); }

/* ================= EVENTS ================= */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; const f = cur();
  if (a === 'star') { snap(); const p = S.pts[b.dataset.k][b.dataset.t]; p[b.dataset.f] = p[b.dataset.f] ? 0 : 1; if (p[b.dataset.f]) { SFX.coin(); bump(b.dataset.t); } save(); render(); }
  else if (a === 'ltstar') { snap(); const st = S.lt[b.dataset.i]; st.res[b.dataset.t] = st.res[b.dataset.t] ? 0 : 1; recalcLightning(); save(); render(); }
  else if (a === 'nailed') setNailed(f, b.dataset.v === '1');
  else if (a === 'regen') { snap(); R(f.r).res = null; runReveal(f); }
  else if (a === 'usebackup') { snap(); const Rd = roundById(f.r); R(f.r).res = backupOf(Rd); save(); render(); }
  else if (a === 'regen2') { snap(); R(f.r).res2 = null; runChange(f); }
  else if (a === 'dcregen') { snap(); runDcReveal(b.dataset.t); }
  else if (a === 'dcbackup') { snap(); const c = DC_CLIENTS.find(x => x.id === S.dc.assign[b.dataset.t]); S.dc.res[b.dataset.t] = backupOf(c); save(); render(); }
  else if (a === 'dcconfess') { S.dc.confess = S.dc.confess || {}; S.dc.confess[b.dataset.t] = true; save(); render(); const r = S.dc.res[b.dataset.t]; G.say(`Hee hee... I sneaked in ${r.sneaky}!`, { mood: 'oops', sfx: 'sputter', after: 'normal' }); }
  else if (a === 'adj') { snap(); S.adj[b.dataset.t] += +b.dataset.v; save(); render(); }
  else if (a === 't15') { TM.left += 15; TM.total = Math.max(TM.total, TM.left); if (!TM.iv) { const l = TM.left; timerStart(l); } drawTimer(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.req) { R(t.dataset.req).req[t.dataset.t] = t.value; save(); }
  else if (t.dataset.change) { R(t.dataset.change).change = t.value; R(t.dataset.change).res2 = null; save(); }
  else if (t.dataset.dcreq) { S.dc.req[t.dataset.dcreq] = t.value; save(); }
});
$('#bBack').onclick = back;
$('#bSet').onclick = showSettings;
$('#bPics').onclick = showPictures;
$('#bShow').onclick = startGalleryShow;
document.addEventListener('keydown', e => { if (e.target.matches('input,textarea,select')) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); $('#bNext').click(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); back(); } });

function studentUrl() { return location.href.replace(/host\.html.*$/, '').replace(/[?#].*$/, ''); }

/* ================= SETTINGS ================= */
function showSettings() {
  const voices = VOICE.best();
  $('#ovroot').innerHTML = `<div class="ov"><div class="mbox">
    <div class="mrow" style="justify-content:space-between"><h2>⚙️ Settings</h2><button class="btn" data-x="close">Close</button></div>
    <h3>Gizmo’s brain (Claude API)</h3>
    <label>API key <input type="password" id="sKey" class="wide" value="${esc(P.apiKey)}" placeholder="sk-ant-..."></label>
    <div class="mrow"><button class="btn small" data-x="test">🧪 Test Gizmo’s brain</button><span class="note" id="testOut">Saved only in this browser on this laptop.</span></div>
    <div class="mrow"><label>Poster model <input type="text" id="sPM" value="${esc(P.posterModel)}"></label><label>Text model <input type="text" id="sTM" value="${esc(P.textModel)}"></label></div>
    <label>Gizmo’s mischief <select id="sMis">${[['never', 'Never sneaks things in'], ['sometimes', 'Sometimes sneaks things in'], ['often', 'Often sneaks things in']].map(([v, n]) => `<option value="${v}" ${P.mischief === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <h3>Gizmo’s voice</h3>
    <div class="mrow"><label><input type="checkbox" id="sGV" ${P.gizmoVoice ? 'checked' : ''}> Gizmo talks out loud</label><label><input type="checkbox" id="sSnd" ${P.sound ? 'checked' : ''}> Sound effects</label></div>
    <div class="mrow"><label>Voice <select id="sV"><option value="">Best available</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${P.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name.replace(/^Microsoft /, '').replace(/ - English.*$/, ''))} (${esc(v.lang)})</option>`).join('')}</select></label></div>
    <div class="mrow"><label>Pitch <input type="range" id="sPi" min="0.5" max="2" step="0.1" value="${P.pitch}"> <span id="sPiV">${P.pitch}</span></label><label>Speed <input type="range" id="sRa" min="0.7" max="1.5" step="0.05" value="${P.rate}"> <span id="sRaV">${P.rate}</span></label>
      <button class="btn small" data-x="try">🔊 Try Gizmo’s voice</button></div>
    <p class="note">For a fun cartoon voice, raise the pitch and speed. Some “Natural” voices ignore pitch, so try a few. Voices without “Online” usually work best with high pitch.</p>
    <h3>Timers and practice</h3>
    <div class="mrow"><label>Planning <input type="number" id="sPS" min="30" max="300" step="15" value="${P.planSec}"> s</label><label>Quick answers <input type="number" id="sQS" min="10" max="90" step="5" value="${P.quickSec}"> s</label></div>
    <div class="mrow"><label><input type="checkbox" id="sBots" ${P.bots ? 'checked' : ''}> Practice bots (15 pretend students answer, for rehearsing alone)</label></div>
    <h3>Lunch Gallery Show</h3>
    <div class="mrow"><label><input type="checkbox" id="sGVo" ${P.galleryVoice ? 'checked' : ''}> Gizmo reads comments aloud</label><label>Seconds per picture <input type="number" id="sGD" min="8" max="60" value="${P.galleryDur}"></label></div>
    <h3>Student link</h3><div class="url" style="font-size:16px">${esc(studentUrl())}</div>
    <h3>Start over</h3>
    <div class="mrow"><button class="btn small" data-x="restart">🔄 New game (keep pictures)</button><button class="btn small no" data-x="wipe">🧹 Erase all student data</button><span class="note" id="dangerOut">Tap twice to confirm.</span></div>
    <div class="mrow"><button class="btn primary" data-x="save">Save</button></div>
  </div></div>`;
  const ov = $('#ovroot .ov');
  ov.querySelector('#sPi').oninput = e => ov.querySelector('#sPiV').textContent = e.target.value;
  ov.querySelector('#sRa').oninput = e => ov.querySelector('#sRaV').textContent = e.target.value;
  ov.onclick = async e => {
    const x = e.target.closest('[data-x]'); if (!x) return; const k = x.dataset.x;
    const read = () => { P.apiKey = ov.querySelector('#sKey').value.trim(); P.posterModel = ov.querySelector('#sPM').value.trim() || P.posterModel; P.textModel = ov.querySelector('#sTM').value.trim() || P.textModel;
      P.mischief = ov.querySelector('#sMis').value; P.gizmoVoice = ov.querySelector('#sGV').checked; P.sound = ov.querySelector('#sSnd').checked; SFX.setOn(P.sound);
      P.voiceURI = ov.querySelector('#sV').value; P.pitch = +ov.querySelector('#sPi').value; P.rate = +ov.querySelector('#sRa').value;
      P.planSec = Math.max(30, +ov.querySelector('#sPS').value || 120); P.quickSec = Math.max(10, +ov.querySelector('#sQS').value || 30); P.bots = ov.querySelector('#sBots').checked;
      P.galleryVoice = ov.querySelector('#sGVo').checked; P.galleryDur = Math.max(8, +ov.querySelector('#sGD').value || 20); savePrefs(); };
    if (k === 'close') { $('#ovroot').innerHTML = ''; }
    else if (k === 'save') { read(); $('#ovroot').innerHTML = ''; render(); toast('Settings saved.'); }
    else if (k === 'try') { read(); G.say('Ooooh, hi there! I’m Gizmo! Is this my voice? I love it!', { mood: 'happy', jump: true, after: 'normal' }); }
    else if (k === 'test') { read(); const out = ov.querySelector('#testOut'); out.textContent = 'Asking Gizmo…';
      try { const t = await claude({ model: P.textModel, system: GIZMO_SYS, content: 'Say hello to the class in 8 words or fewer.', max: 60, timeout: 20000 }); out.textContent = '✅ Works! Gizmo says: ' + t.replace(/<[^>]+>/g, '').trim(); }
      catch (err) { out.textContent = '❌ ' + err.message; } }
    else if (k === 'restart') { if (x.dataset.sure) { snap(); const keepG = S.galleryOpen; S = freshState(); S.galleryOpen = keepG; undo.length = 0; save(); $('#ovroot').innerHTML = ''; enterStep(); } else { x.dataset.sure = 1; x.textContent = 'Tap again: start a new game'; } }
    else if (k === 'wipe') { if (x.dataset.sure) { if (db) await Promise.all(['answers', 'gallery', 'notes', 'players'].map(p => db.ref(`${ROOT}/${p}`).remove().catch(err => toast(fbExplain(err))))); ov.querySelector('#dangerOut').textContent = '✅ Student data erased.'; } else { x.dataset.sure = 1; x.textContent = 'Tap again: erase everything'; } }
  };
}

/* ================= PICTURES & LUNCH GALLERY SHOW ================= */
function galleryList() { return Object.entries(gallery).map(([id, g]) => Object.assign({ id }, g)).sort((a, b) => (a.at || 0) - (b.at || 0)); }
function showPictures() {
  const list = galleryList();
  $('#picroot').innerHTML = `<div class="ov" style="z-index:52"><div class="mbox">
    <div class="mrow" style="justify-content:space-between"><h2>📷 Student pictures (${list.length})</h2><button class="btn" data-x="close">Close</button></div>
    <div class="mrow"><button class="btn ${S.galleryOpen ? 'primary' : ''}" data-x="toggle">${S.galleryOpen ? '✅ Students CAN send pictures (tap to stop)' : '⛔ Picture sending is OFF (tap to turn on)'}</button></div>
    <p class="note">Hide anything you don’t want in the lunch show. Gizmo also skips pictures of real people or private information.</p>
    <div class="gal">${list.map(g => { const T = teamById(g.team) || TEAMS[0]; const n = notes[g.id] || {};
      return `<div class="gi ${n.hidden ? 'hidden' : ''}" style="--tc:${T.color}"><img src="${g.img}" alt=""><div class="gb"><span>${T.name}${n.status === 'skip' ? ' · skipped' : ''}</span><button class="btn small" data-x="hide" data-id="${g.id}">${n.hidden ? 'Show' : 'Hide'}</button></div></div>`; }).join('') || '<p class="note">No pictures yet.</p>'}</div>
  </div></div>`;
  $('#picroot .ov').onclick = e => { const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'close') $('#picroot').innerHTML = '';
    else if (x.dataset.x === 'toggle') { S.galleryOpen = !S.galleryOpen; save(); publish(); showPictures(); }
    else if (x.dataset.x === 'hide') { const n = notes[x.dataset.id] || {}; db && db.ref(`${ROOT}/notes/${x.dataset.id}/hidden`).set(!n.hidden).catch(err => toast(fbExplain(err))); } };
}
function galleryUpdated() {
  if ($('#picroot .gal')) showPictures();
  if (GS.on) { const c = $('#gsProg'); if (c) c.textContent = gsProgress(); }
  scoresBar();
}
const GS = { on: false, idx: 0, timer: null, working: 0 };
function gsProgress() { const list = galleryList(); const done = list.filter(g => notes[g.id] && notes[g.id].status).length; return `Gizmo has looked at ${done} of ${list.length} pictures.`; }
function gsVisible() { return galleryList().filter(g => { const n = notes[g.id]; return n && (n.status === 'ok' || n.status === 'fallback') && !n.hidden; }); }
async function commentOn(g) {
  const media = (g.img.match(/^data:(image\/[a-z]+);base64,/) || [])[1] || 'image/jpeg'; const data = g.img.split(',')[1];
  let status = 'fallback', comment = pick(LINES.galleryFallback);
  if (P.apiKey) {
    try {
      const T = teamById(g.team) || TEAMS[0];
      const txt = (await claude({ model: P.textModel, system: GIZMO_SYS, max: 200, timeout: 30000, content: [
        { type: 'image', source: { type: 'base64', media_type: media, data } },
        { type: 'text', text: `A student on Team ${T.name} made this picture with AI this morning. Write ONE kind, specific, funny compliment about the PICTURE (max 25 words). Talk only about what is in the picture. No criticism, no "but", no sarcasm, no comparisons, and never comment on the person. If the picture shows a real person's face, private information (like names, addresses or passwords), or anything not okay for school, reply with exactly: SKIP` }] })).trim();
      if (/^SKIP\b/i.test(txt)) { status = 'skip'; comment = ''; }
      else {
        const clean = txt.replace(/<[^>]+>/g, '').replace(/^["“]|["”]$/g, '').trim();
        const check = await claude({ model: P.textModel, system: 'You are a careful, kind teacher.', max: 5, timeout: 20000,
          content: `A cheerful robot will read this comment out loud to a class of teenagers about a picture one of them made:\n"${clean}"\nIs it 100% kind and positive, with no teasing, sarcasm, criticism, or anything that could hurt feelings? Answer only YES or NO.` });
        if (/^\s*YES/i.test(check) && clean.length > 3 && clean.length < 260) { status = 'ok'; comment = clean; }
      }
    } catch (e) { status = 'fallback'; }
  }
  if (db) await db.ref(`${ROOT}/notes/${g.id}`).update({ status, comment }).catch(() => {});
  notes[g.id] = Object.assign({}, notes[g.id], { status, comment });
}
async function gsWorker() {
  while (GS.on) {
    const todo = galleryList().find(g => !(notes[g.id] && notes[g.id].status) && !GS.busyIds.has(g.id));
    if (!todo) { await sleep(3000); continue; }
    GS.busyIds.add(todo.id); try { await commentOn(todo); } finally { GS.busyIds.delete(todo.id); }
    const c = $('#gsProg'); if (c) c.textContent = gsProgress();
  }
}
let gsG = null;
function startGalleryShow() {
  GS.on = true; GS.idx = 0; GS.busyIds = new Set(); closeQ(); watchScreen('🍕 Enjoy lunch! Gizmo is looking at your pictures!', '🍕');
  $('#showroot').innerHTML = `<div class="gshow" id="gshow"><div class="gcol2"><div id="gsGizmo"></div><div class="prog" id="gsProg">${gsProgress()}</div></div><div class="pic" id="gsPic"></div>
    <div class="sbtns"><button class="tb" data-x="skip">⏭ Next picture</button><button class="tb" data-x="pics">📷 Pictures</button><button class="tb" data-x="close">✖ End show</button></div></div>`;
  gsG = makeGizmo($('#gsGizmo'), () => Object.assign({}, P, { gizmoVoice: P.galleryVoice }));
  $('#gshow').onclick = e => { const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'close') stopGalleryShow(); else if (x.dataset.x === 'skip') gsNext(); else if (x.dataset.x === 'pics') showPictures(); };
  gsWorker(); gsWorker();
  gsG.say('Welcome to the Gizmo Gallery! Let me look at all your amazing pictures. Enjoy your lunch!', { mood: 'happy', jump: true, after: 'normal' });
  clearTimeout(GS.timer); GS.timer = setTimeout(gsNext, 6000);
}
async function gsNext() {
  if (!GS.on) return; clearTimeout(GS.timer);
  const list = gsVisible(); const pic = $('#gsPic');
  if (!list.length) { pic.innerHTML = `<div class="thinking"><div style="font-size:90px">🖼️</div>Gizmo is looking at your pictures…<div class="dots"><span></span><span></span><span></span></div></div>`; GS.timer = setTimeout(gsNext, 4000); return; }
  const g = list[GS.idx % list.length]; GS.idx++; const T = teamById(g.team) || TEAMS[0]; const n = notes[g.id];
  pic.innerHTML = `<img src="${g.img}" alt="Student picture" style="--tc:${T.color}"><div class="who"><img src="${T.head}" alt="">Team ${T.name}</div><div class="gcap">“${esc(n.comment)}”</div>`;
  SFX.sparkle(); gsG.say(n.comment, { mood: pick(['happy', 'wow']), jump: Math.random() < .5, after: 'normal' });
  GS.timer = setTimeout(gsNext, P.galleryDur * 1000);
}
function stopGalleryShow() { GS.on = false; clearTimeout(GS.timer); if (gsG) gsG.stop(); $('#showroot').innerHTML = ''; enterStep(); }

/* ================= CONFETTI ================= */
function confetti() {
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv); const ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#38bdf8', '#fb923c', '#a78bfa', '#fde047', '#22c55e', '#f472b6'];
  const ps = Array.from({ length: 220 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: 5 + Math.random() * 7, c: pick(cols), a: Math.random() * 6 }));
  const t0 = performance.now();
  (function f(t) { ctx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.a += .1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); if (p.y > cv.height + 20 && t - t0 < 5000) p.y = -20; });
    if (t - t0 < 9000) requestAnimationFrame(f); else cv.remove(); })(t0);
}

/* ================= BOOT ================= */
render();
const bootP = fbBoot();
$('#splashNote').textContent = (resumed ? 'Your last game will continue where you left off. ' : '') + (P.apiKey ? '' : 'Tip: add your API key in ⚙️ Settings so Gizmo can think.');
$('#bStart').onclick = async () => {
  $('#splash').remove(); SFX.boing(); try { speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) {}
  await bootP; enterStep();
  if (resumed) toast('Resumed your game where you left off. Settings → New game to start over.', 6000);
  if (!P.apiKey) setTimeout(() => toast('Add your API key in ⚙️ Settings so Gizmo can think.', 6000), 1500);
};
