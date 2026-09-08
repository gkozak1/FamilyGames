const COORD = window.FIELD_COORDINATION_CORE;
const LOCAL_PREFIX = 'jotl-fielddossier-cache-v3';
const FAILURE_GRACE_MS = 1400;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function pathSet(obj, parts, value) {
  let cur = obj;
  parts.slice(0,-1).forEach(k => { cur[k] ||= {}; cur = cur[k]; });
  if (value === null) delete cur[parts[parts.length-1]];
  else cur[parts[parts.length-1]] = clone(value);
}
function cleanSessionId(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,64) || 'JOTL-2026-FIELD';
}
function configured(cfg) { return Boolean(cfg && cfg.apiKey && cfg.projectId && cfg.databaseURL && cfg.appId); }
function engineWindowSeconds() { return Math.round(Number(window.FIELD_APP_CONFIG?.engineWindowMs || 20000) / 1000); }

export async function createFieldSync({ sessionId, persona, role='player', config, onState, onConnection }) {
  const sid = cleanSessionId(sessionId);
  const localKey = `${LOCAL_PREFIX}:${sid}`;
  const pendingKey = `${localKey}:pending`;
  const resetKey = `${localKey}:resetAt`;
  let pending = loadLocal(pendingKey) || {};
  let lastResetAt = Number(loadLocal(resetKey) || 0);
  let state = loadLocal(localKey) || { evidence:{}, synthesis:{}, ciphers:{}, engine:{}, participants:{}, meta:{} };
  let connected = false;
  let hasRemoteSnapshot = false;
  let serverOffset = 0;
  let uid = `offline-${persona || role}`;
  let db = null;
  let firebaseFns = null;
  let firebaseReady = false;
  const timers = new Map();

  const emit = () => { saveLocal(localKey, state); onState?.(clone(state)); };
  emit();

  if (!configured(config)) {
    onConnection?.({ connected:false, mode:'setup-required', message:'Firebase configuration required for four-phone sync.' });
    return makeOfflineApi();
  }

  try {
    const [appSdk, authSdk, dbSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js')
    ]);
    const { initializeApp } = appSdk;
    const { getAuth, signInAnonymously } = authSdk;
    const { getDatabase, ref, onValue, set, update, runTransaction } = dbSdk;
    firebaseFns = { ref, onValue, set, update, runTransaction };

    const fbApp = initializeApp(config);
    const auth = getAuth(fbApp);

    let credential;
    try {
      credential = await signInAnonymously(auth);
    } catch (error) {
      const code = error?.code ? ` (${error.code})` : '';
      throw new Error(`Firebase anonymous sign-in failed${code}: ${error?.message || 'unknown authentication error'}`);
    }

    uid = credential.user.uid;
    db = getDatabase(fbApp, config.databaseURL);
    firebaseReady = true;

    onValue(ref(db, '.info/serverTimeOffset'), snap => { serverOffset = Number(snap.val() || 0); });
    onValue(ref(db, '.info/connected'), snap => {
      connected = Boolean(snap.val());
      onConnection?.({ connected, mode:'firebase', message: connected ? 'Team sync online' : 'Offline — device cache active' });
      // Pending writes are intentionally NOT flushed here. We wait for the
      // first current session snapshot so a facilitator reset can invalidate
      // stale offline data before it is re-sent.
      if (connected && hasRemoteSnapshot) flushPending();
    });

    // Keep facilitator authorization separate from the player's persona
    // identity. A browser can therefore have joined the hunt as a player and
    // still open the Facilitator Console later without overwriting its role.
    const identityPath = role === 'facilitator'
      ? `sessions/${sid}/facilitators/${uid}`
      : `sessions/${sid}/participants/${uid}`;
    try {
      await firebaseFns.set(firebaseFns.ref(db, identityPath), {
        persona: role === 'facilitator' ? 'facilitator' : persona,
        role,
        joinedAt: Date.now()
      });
    } catch (error) {
      const label = role === 'facilitator' ? 'facilitator access' : `${persona || 'player'} identity`;
      const code = error?.code ? ` (${error.code})` : '';
      throw new Error(`Firebase signed in, but ${label} could not be registered${code}: ${error?.message || 'database permission error'}`);
    }

    firebaseFns.onValue(firebaseFns.ref(db, `sessions/${sid}`), snap => {
      const remote = snap.val() || {};
      const remoteResetAt = Number(remote?.meta?.resetAt || 0);

      if (remoteResetAt > lastResetAt) {
        // A facilitator reset occurred. Discard local/queued run data so an
        // old test run cannot repopulate the freshly reset Firebase session.
        pending = {};
        saveLocal(pendingKey, pending);
        lastResetAt = remoteResetAt;
        saveLocal(resetKey, lastResetAt);
      }

      state = {
        evidence: remote.evidence || {},
        synthesis: remote.synthesis || {},
        ciphers: remote.ciphers || {},
        engine: remote.engine || {},
        participants: remote.participants || {},
        meta: remote.meta || {}
      };

      // Only overlay queued data when it belongs to the current reset epoch.
      Object.entries(pending).forEach(([path, value]) => pathSet(state, path.split('/'), value));
      hasRemoteSnapshot = true;
      emit();
      Object.entries(state.engine || {}).forEach(([siteId, attempt]) => evaluateAttempt(siteId, attempt));
      if (connected) flushPending();
    }, error => {
      onConnection?.({ connected:false, mode:'firebase-error', message:error.message || 'Team sync unavailable' });
    });
  } catch (error) {
    console.error('Firebase initialization failed', error);
    const detail = error?.message || 'Firebase initialization failed';
    onConnection?.({ connected:false, mode:'firebase-error', message:`${detail}. Device cache remains available.` });
    return makeOfflineApi();
  }

  function serverNow() { return Date.now() + serverOffset; }

  function queuePending(path, value) {
    pending[path] = clone(value);
    saveLocal(pendingKey, pending);
  }

  async function flushPending() {
    if (!firebaseReady || !connected || !hasRemoteSnapshot || role !== 'player') return;
    for (const [path, value] of Object.entries({ ...pending })) {
      try {
        await firebaseFns.set(firebaseFns.ref(db, `sessions/${sid}/${path}`), value);
        if (JSON.stringify(pending[path]) === JSON.stringify(value)) delete pending[path];
        saveLocal(pendingKey, pending);
      } catch (error) {
        console.warn('Deferred field write remains queued', path, error);
        break;
      }
    }
  }

  async function write(path, value) {
    pathSet(state, path.split('/'), value);
    queuePending(path, value);
    emit();
    if (firebaseReady && connected) await flushPending();
  }

  async function writeEvidence(siteId, pid, record) {
    return write(`evidence/${siteId}/${pid}`, { ...record, updatedAt: serverNow(), uid });
  }
  async function clearEvidence(siteId, pid) { return write(`evidence/${siteId}/${pid}`, null); }
  async function writeSynthesis(siteId, record) {
    return write(`synthesis/${siteId}`, { ...record, updatedAt: serverNow(), uid });
  }
  async function clearSynthesis(siteId) { return write(`synthesis/${siteId}`, null); }
  async function writeCipher(siteId, cipher) {
    const existing = state?.ciphers?.[siteId];
    if (existing?.letter === cipher.letter && Number(existing?.number) === Number(cipher.number)) return;
    return write(`ciphers/${siteId}`, { letter:cipher.letter, number:Number(cipher.number), createdAt:serverNow() });
  }

  async function pressEngine(siteId) {
    if (!firebaseReady || role !== 'player') return { accepted:false, reason:'offline' };
    const now = serverNow();
    const attemptId = `${uid.slice(0,8)}-${now}-${Math.random().toString(36).slice(2,7)}`;
    const engineRef = firebaseFns.ref(db, `sessions/${sid}/engine/${siteId}`);
    const result = await firebaseFns.runTransaction(engineRef, current => COORD.applyPress(current, {
      attemptId, now, persona, uid, windowMs: window.FIELD_APP_CONFIG.engineWindowMs
    }));
    const attempt = result.snapshot.val();
    const accepted = Boolean(attempt?.presses?.[persona] && Math.abs(Number(attempt.presses[persona].at)-now) < 25);
    evaluateAttempt(siteId, attempt);
    return { accepted, attempt };
  }

  async function evaluateAttempt(siteId, attempt) {
    if (!firebaseReady || role !== 'player' || !attempt || attempt.status !== 'arming') return;
    clearTimeout(timers.get(siteId));
    if (COORD.qualifies(attempt, window.FIELD_APP_CONFIG.engineWindowMs)) {
      const engineRef = firebaseFns.ref(db, `sessions/${sid}/engine/${siteId}`);
      await firebaseFns.runTransaction(engineRef, current => {
        if (!current || current.attemptId !== attempt.attemptId || current.status !== 'arming') return current;
        if (!COORD.qualifies(current, window.FIELD_APP_CONFIG.engineWindowMs)) return current;
        return { ...current, status:'success', successAt:serverNow() };
      });
      return;
    }
    const delay = Math.max(0, Number(attempt.deadlineAt) + FAILURE_GRACE_MS - serverNow());
    timers.set(siteId, setTimeout(() => failAttempt(siteId, attempt.attemptId), delay));
  }

  async function failAttempt(siteId, attemptId) {
    if (!firebaseReady || role !== 'player') return;
    const engineRef = firebaseFns.ref(db, `sessions/${sid}/engine/${siteId}`);
    await firebaseFns.runTransaction(engineRef, current => {
      if (!current || current.attemptId !== attemptId || current.status !== 'arming') return current;
      if (COORD.qualifies(current, window.FIELD_APP_CONFIG.engineWindowMs)) {
        return { ...current, status:'success', successAt:serverNow() };
      }
      if (serverNow() <= Number(current.deadlineAt) + FAILURE_GRACE_MS) return current;
      return { ...current, status:'failed', failedAt:serverNow(), message:`All four sleuths must ingest evidence within ${engineWindowSeconds()} seconds of each other.` };
    });
  }

  async function resetSession() {
    if (!firebaseReady || !connected || role !== 'facilitator') {
      return { ok:false, message:'Facilitator reset requires an online Firebase connection.' };
    }
    const now = serverNow();
    const updates = {
      evidence: null,
      synthesis: null,
      ciphers: null,
      engine: null,
      'meta/resetAt': now,
      'meta/resetBy': uid
    };
    await firebaseFns.update(firebaseFns.ref(db, `sessions/${sid}`), updates);
    return { ok:true, resetAt:now };
  }

  function getServerNow() { return serverNow(); }
  function getState() { return clone(state); }
  function getConnection() { return { connected, firebaseReady }; }

  return {
    sessionId:sid, uid, role,
    writeEvidence, clearEvidence, writeSynthesis, clearSynthesis, writeCipher,
    pressEngine, resetSession,
    getServerNow, getState, getConnection, mode:'firebase'
  };

  function makeOfflineApi() {
    async function localWrite(path, value) { pathSet(state, path.split('/'), value); emit(); }
    return {
      sessionId:sid, uid, role, mode:'offline',
      getState:()=>clone(state), getServerNow:()=>Date.now(), getConnection:()=>({connected:false,firebaseReady:false}),
      writeEvidence:(siteId,pid,record)=>localWrite(`evidence/${siteId}/${pid}`,record),
      clearEvidence:(siteId,pid)=>localWrite(`evidence/${siteId}/${pid}`,null),
      writeSynthesis:(siteId,record)=>localWrite(`synthesis/${siteId}`,record),
      clearSynthesis:(siteId)=>localWrite(`synthesis/${siteId}`,null),
      writeCipher:(siteId,cipher)=>localWrite(`ciphers/${siteId}`,cipher),
      pressEngine:async()=>({accepted:false,reason:'offline'}),
      resetSession:async()=>({ok:false,message:'Facilitator reset requires Firebase.'})
    };
  }
}

function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
function saveLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
