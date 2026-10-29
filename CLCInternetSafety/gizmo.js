/* ===== GIZMO: character, voice and sound effects (host screen only) ===== */
const GIZMO_SVG = `
<svg viewBox="0 0 200 230" class="giz-svg" aria-label="Gizmo the robot">
  <defs>
    <radialGradient id="gzHead" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#fb923c"/><stop offset="1" stop-color="#d9581b"/></radialGradient>
    <radialGradient id="gzBody" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#7ff0e0"/><stop offset="1" stop-color="#0d9488"/></radialGradient>
    <radialGradient id="gzBulb"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fde047"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
  </defs>
  <g class="giz-jet"><path d="M88 196 Q100 232 112 196 Z" fill="#fde047"/><path d="M93 196 Q100 220 107 196 Z" fill="#fff7c2"/></g>
  <g class="giz-arm giz-arm-l"><path d="M64 160 Q40 158 34 136" stroke="#0f766e" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="33" cy="132" r="10" fill="#fb923c"/></g>
  <g class="giz-arm giz-arm-r"><path d="M136 160 Q160 158 166 136" stroke="#0f766e" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="167" cy="132" r="10" fill="#fb923c"/></g>
  <rect x="64" y="138" width="72" height="58" rx="24" fill="url(#gzBody)" stroke="#0f766e" stroke-width="3"/>
  <path class="giz-heart" d="M100 178 C86 168 88 156 96 156 C99 156 100 159 100 160 C100 159 101 156 104 156 C112 156 114 168 100 178 Z" fill="#f472b6"/>
  <line x1="100" y1="44" x2="100" y2="18" stroke="#0f766e" stroke-width="5" stroke-linecap="round"/>
  <circle class="giz-bulb" cx="100" cy="13" r="10" fill="url(#gzBulb)"/>
  <circle cx="34" cy="92" r="11" fill="#0f766e"/><circle cx="166" cy="92" r="11" fill="#0f766e"/>
  <rect x="34" y="40" width="132" height="104" rx="46" fill="url(#gzHead)" stroke="#c2410c" stroke-width="3"/>
  <rect x="50" y="58" width="100" height="70" rx="28" fill="#0f172a"/>
  <g class="giz-eyes">
    <g class="eyes-normal"><ellipse class="giz-eye" cx="80" cy="88" rx="10" ry="13" fill="#5eead4"/><ellipse class="giz-eye" cx="120" cy="88" rx="10" ry="13" fill="#5eead4"/><circle cx="84" cy="83" r="3.5" fill="#fff"/><circle cx="124" cy="83" r="3.5" fill="#fff"/></g>
    <g class="eyes-happy"><path d="M70 92 Q80 76 90 92" stroke="#5eead4" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M110 92 Q120 76 130 92" stroke="#5eead4" stroke-width="6" fill="none" stroke-linecap="round"/></g>
    <g class="eyes-oops"><path d="M72 80 L88 88 L72 96" stroke="#5eead4" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M128 80 L112 88 L128 96" stroke="#5eead4" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="eyes-think"><ellipse cx="84" cy="80" rx="9" ry="11" fill="#5eead4"/><ellipse cx="124" cy="80" rx="9" ry="11" fill="#5eead4"/><circle cx="87" cy="75" r="3" fill="#fff"/><circle cx="127" cy="75" r="3" fill="#fff"/></g>
    <g class="eyes-wow"><circle cx="80" cy="88" r="13" fill="#5eead4"/><circle cx="120" cy="88" r="13" fill="#5eead4"/><circle cx="80" cy="88" r="5" fill="#0f172a"/><circle cx="120" cy="88" r="5" fill="#0f172a"/></g>
  </g>
  <g class="giz-cheeks"><ellipse cx="62" cy="108" rx="8" ry="5" fill="#f472b6" opacity=".8"/><ellipse cx="138" cy="108" rx="8" ry="5" fill="#f472b6" opacity=".8"/></g>
  <path class="giz-mouth-smile" d="M86 110 Q100 122 114 110" stroke="#5eead4" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse class="giz-mouth-open" cx="100" cy="113" rx="9" ry="7" fill="#5eead4"/>
  <path class="giz-mouth-wobble" d="M86 114 Q93 108 100 114 Q107 120 114 114" stroke="#5eead4" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g class="giz-sparks"><path d="M20 30 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#fde047"/><path d="M178 50 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#fde047"/><path d="M170 200 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#fde047"/></g>
  <g class="giz-thinkdots"><circle cx="160" cy="34" r="5" fill="#cbd5e1"/><circle cx="174" cy="22" r="7" fill="#cbd5e1"/><circle cx="190" cy="8" r="9" fill="#cbd5e1"/></g>
</svg>`;

const GIZMO_CSS = `
.giz{position:relative;display:flex;align-items:flex-end;gap:14px;pointer-events:none}
.giz-body{width:var(--gsize,150px);flex:0 0 auto;animation:gizBob 2.6s ease-in-out infinite;transform-origin:50% 90%}
.giz-svg{width:100%;height:auto;overflow:visible;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35))}
@keyframes gizBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.giz-jet{animation:gizJet .18s ease-in-out infinite alternate;transform-origin:100px 196px}
@keyframes gizJet{from{transform:scaleY(.75)}to{transform:scaleY(1.15)}}
.giz-bulb{animation:gizBulb 1.4s ease-in-out infinite}
@keyframes gizBulb{0%,100%{opacity:1}50%{opacity:.55}}
.giz .eyes-happy,.giz .eyes-oops,.giz .eyes-think,.giz .eyes-wow,.giz .giz-cheeks,.giz .giz-mouth-open,.giz .giz-mouth-wobble,.giz .giz-sparks,.giz .giz-thinkdots{display:none}
.giz.m-happy .eyes-normal,.giz.m-oops .eyes-normal,.giz.m-think .eyes-normal,.giz.m-wow .eyes-normal{display:none}
.giz.m-happy .eyes-happy,.giz.m-oops .eyes-oops,.giz.m-think .eyes-think,.giz.m-wow .eyes-wow{display:inline}
.giz.m-happy .giz-sparks,.giz.m-wow .giz-sparks{display:inline;animation:gizSpark .8s ease-in-out infinite alternate}
@keyframes gizSpark{from{opacity:.3}to{opacity:1}}
.giz.m-oops .giz-cheeks{display:inline}
.giz.m-oops .giz-mouth-smile{display:none}.giz.m-oops .giz-mouth-wobble{display:inline}
.giz.m-think .giz-thinkdots{display:inline;animation:gizSpark .6s ease-in-out infinite alternate}
.giz.talking .giz-mouth-smile,.giz.talking .giz-mouth-wobble{display:none}
.giz.talking .giz-mouth-open{display:inline;animation:gizTalk .16s ease-in-out infinite alternate;transform-origin:100px 113px}
@keyframes gizTalk{from{transform:scaleY(.3)}to{transform:scaleY(1.1)}}
.giz.blink .giz-eye{transform:scaleY(.1);transform-origin:center;transform-box:fill-box}
.giz.m-think .giz-body{animation:gizTilt 1.2s ease-in-out infinite}
@keyframes gizTilt{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg) translateY(-6px)}}
.giz.jump .giz-body{animation:gizJump .7s cubic-bezier(.3,1.6,.5,1)}
@keyframes gizJump{0%{transform:translateY(0) scale(1)}30%{transform:translateY(-46px) scale(1.06,.94) rotate(-8deg)}60%{transform:translateY(-20px) rotate(8deg)}100%{transform:none}}
.giz.m-happy .giz-arm-l{animation:gizWaveL .5s ease-in-out infinite alternate;transform-origin:64px 160px}
.giz.m-happy .giz-arm-r{animation:gizWaveR .5s ease-in-out infinite alternate;transform-origin:136px 160px}
@keyframes gizWaveL{to{transform:rotate(18deg)}}@keyframes gizWaveR{to{transform:rotate(-18deg)}}
.giz-bubble{position:relative;max-width:min(560px,52vw);background:#fff;color:#14203f;border-radius:22px;padding:14px 20px;font-size:clamp(18px,1.6vw,26px);font-weight:700;line-height:1.3;box-shadow:0 10px 30px rgba(0,0,0,.35);margin-bottom:60px;opacity:0;transform:translateY(8px) scale(.96);transition:opacity .2s,transform .2s}
.giz-bubble.show{opacity:1;transform:none}
.giz-bubble::before{content:"";position:absolute;left:-14px;bottom:22px;border:10px solid transparent;border-right:16px solid #fff;border-left:0}
@media (prefers-reduced-motion: reduce){.giz *,.giz-body{animation:none!important}}
`;

/* ---------- Sound effects (Web Audio, no files) ---------- */
const SFX = (() => {
  let ctx = null, on = true;
  const ac = () => { if (!on) return null; try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch (e) { return null; } };
  function tone(f, d, o = {}) { const c = ac(); if (!c) return; const { type = 'sine', v = .15, t = 0, to = null } = o;
    const os = c.createOscillator(), g = c.createGain(), s = c.currentTime + t; os.type = type; os.frequency.setValueAtTime(f, s);
    if (to) os.frequency.exponentialRampToValueAtTime(to, s + d); g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(v, s + .02); g.gain.exponentialRampToValueAtTime(.0001, s + d);
    os.connect(g).connect(c.destination); os.start(s); os.stop(s + d + .05); }
  function noise(d, o = {}) { const c = ac(); if (!c) return; const { v = .2, t = 0, f = 1200, q = .8 } = o; const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = b; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = v; s.connect(bp).connect(g).connect(c.destination); s.start(c.currentTime + t); }
  let rollTimer = null;
  const fx = {
    setOn(v) { on = v; },
    boing() { tone(180, .35, { to: 520, type: 'sine', v: .2 }); tone(520, .25, { t: .2, to: 260, type: 'sine', v: .12 }); },
    sparkle() { [1568, 2093, 2637, 3136, 2637].forEach((f, i) => tone(f, .18, { t: i * .06, type: 'triangle', v: .06 })); },
    ding() { tone(1046, .5, { type: 'triangle', v: .14 }); tone(1568, .5, { t: .08, type: 'triangle', v: .1 }); },
    tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, { t: i * .09, type: 'triangle', v: .14 })); },
    buzz() { tone(150, .45, { type: 'sawtooth', v: .07, to: 110 }); },
    sputter() { for (let i = 0; i < 7; i++) tone(260 - i * 18, .09, { t: i * .07, type: 'square', v: .05, to: 140 }); tone(600, .4, { t: .5, to: 120, v: .1 }); },
    tick() { tone(1200, .03, { type: 'square', v: .04 }); },
    whoosh() { noise(.5, { f: 900, q: .4, v: .25 }); },
    rip() { noise(.35, { f: 3000, q: 1.5, v: .3 }); tone(900, .15, { t: .25, type: 'triangle', v: .08 }); },
    coin() { tone(988, .08, { type: 'square', v: .06 }); tone(1319, .3, { t: .08, type: 'square', v: .06 }); },
    fanfare() { const n = [523, 523, 523, 659, 784, 659, 784, 1047], tt = [0, .15, .3, .45, .75, .95, 1.1, 1.3]; n.forEach((f, i) => tone(f, .4, { t: tt[i], type: 'triangle', v: .15 })); },
    rollStart() { fx.rollStop(); let i = 0; rollTimer = setInterval(() => { noise(.06, { f: 220 + (i % 2) * 40, q: 1, v: .35 }); i++; }, 70); },
    rollStop(withCrash = true) { if (rollTimer) { clearInterval(rollTimer); rollTimer = null; if (withCrash) { noise(1.2, { f: 6000, q: .3, v: .25 }); tone(110, .5, { v: .25 }); } } },
    reelTick() { tone(700 + Math.random() * 300, .04, { type: 'square', v: .05 }); },
  };
  return fx;
})();

/* ---------- Voice ---------- */
const VOICE = {
  ok: 'speechSynthesis' in window, voices: [], seq: 0, speaking: false,
  load() { try { this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); } catch (e) { this.voices = []; } },
  score(v) { let s = 0; if (/natural|neural/i.test(v.name)) s += 10; if (/online/i.test(v.name)) s += 3; if (/google/i.test(v.name)) s += 2; if (/ana|aria|jenny|emma|ava|zira/i.test(v.name)) s += 2; return s; },
  best() { return this.voices.slice().sort((a, b) => this.score(b) - this.score(a)); },
  find(uri) { return this.voices.find(v => v.voiceURI === uri) || this.best()[0] || null; },
  stop() { this.seq++; this.speaking = false; try { speechSynthesis.cancel(); } catch (e) {} },
  speak(text, opt = {}) {
    return new Promise(resolve => {
      this.stop(); const my = this.seq;
      if (!this.ok || !text || opt.mute) { setTimeout(resolve, Math.min(6000, 600 + text.length * 45)); return; }
      const parts = (text.match(/[^.!?]+[.!?]*\s*/g) || [text]).map(s => s.trim()).filter(Boolean);
      const v = this.find(opt.voice); let i = 0; this.speaking = true;
      const fallback = setTimeout(done, (text.split(/\s+/).length / 2.4 / (opt.rate || 1)) * 1000 + 4000);
      function done() { if (my !== VOICE.seq) return; clearTimeout(fallback); VOICE.speaking = false; VOICE.seq++; resolve(); }
      const next = () => { if (my !== VOICE.seq) { resolve(); return; } if (i >= parts.length) { done(); return; }
        const u = new SpeechSynthesisUtterance(parts[i++]); if (v) { u.voice = v; u.lang = v.lang; }
        u.pitch = opt.pitch ?? 1; u.rate = opt.rate ?? 1; u.onend = next; u.onerror = next; try { speechSynthesis.speak(u); } catch (e) { done(); } };
      next();
    });
  },
};
if (VOICE.ok) { VOICE.load(); try { speechSynthesis.addEventListener('voiceschanged', () => VOICE.load()); } catch (e) {} }

/* ---------- The Gizmo controller ---------- */
function makeGizmo(host, getPrefs) {
  if (!document.getElementById('giz-css')) { const st = document.createElement('style'); st.id = 'giz-css'; st.textContent = GIZMO_CSS; document.head.appendChild(st); }
  host.innerHTML = `<div class="giz m-normal"><div class="giz-body">${GIZMO_SVG}</div><div class="giz-bubble"></div></div>`;
  const root = host.querySelector('.giz'), bubble = host.querySelector('.giz-bubble');
  let blinkT = null, typeT = null, sayId = 0;
  (function blink() { blinkT = setTimeout(() => { root.classList.add('blink'); setTimeout(() => root.classList.remove('blink'), 140); blink(); }, 2500 + Math.random() * 3000); })();
  const api = {
    mood(m) { root.className = root.className.replace(/m-\w+/, 'm-' + (m || 'normal')); },
    jump() { root.classList.remove('jump'); void root.offsetWidth; root.classList.add('jump'); SFX.boing(); },
    hush() { bubble.classList.remove('show'); },
    stop() { VOICE.stop(); root.classList.remove('talking'); },
    async say(text, opt = {}) {
      const id = ++sayId; const p = getPrefs();
      if (opt.mood) api.mood(opt.mood); if (opt.jump) api.jump(); if (opt.sfx && SFX[opt.sfx]) SFX[opt.sfx]();
      clearInterval(typeT); bubble.textContent = ''; bubble.classList.add('show');
      let k = 0; typeT = setInterval(() => { k += 2; bubble.textContent = text.slice(0, k); if (k >= text.length) clearInterval(typeT); }, 18);
      root.classList.add('talking');
      await VOICE.speak(text, { voice: p.voiceURI, pitch: p.pitch, rate: p.rate, mute: !p.gizmoVoice });
      if (id !== sayId) return; root.classList.remove('talking'); bubble.textContent = text;
      if (opt.after) api.mood(opt.after);
    },
    think(lines) { api.mood('think'); let i = 0; const show = () => { bubble.textContent = lines[i++ % lines.length]; bubble.classList.add('show'); };
      show(); const t = setInterval(show, 2200); return () => clearInterval(t); },
  };
  return api;
}
