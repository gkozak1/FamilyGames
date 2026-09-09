import { epochOf, reconcile } from './sync-core.mjs';

async function loadSdk() {
  const modules = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js')
  ]);
  return Object.assign({}, ...modules);
}

export function createConnectionsSync({ sessionId, facet, facets, config, puzzleId,
  facilitator = false, onState = () => {}, onStatus = () => {}, sdkLoader = loadSdk,
  storage = globalThis.localStorage }) {
  const key = `${puzzleId}:${sessionId}:${facilitator ? 'facilitator' : facet.id}:sync`;
  const read = () => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
  let local = { epoch: null, pending: null, ...read() };
  let sdk, db, uid, connected = false, ready = false, stopped = false;
  let writing = false, retryTimer, starting = false, unsubscribes = [];
  let remote = {}, failure = '';
  const base = `connectionsSessions/${sessionId}`;
  const persist = () => { try { storage.setItem(key, JSON.stringify(local)); } catch {} };
  function status() {
    onStatus({ connected: connected && ready && !failure, pending: !!local.pending,
      message: failure || (!connected || !ready ? 'Connecting — your progress is saved on this device.' :
        local.pending ? 'Sharing your fragment…' : 'Connected to the other sleuths.') });
  }
  function scheduleStart() {
    if (!stopped) { clearTimeout(retryTimer); retryTimer = setTimeout(start, 5000); }
  }
  function fail(error) {
    failure = /permission|denied/i.test(`${error.code} ${error.message}`)
      ? 'Sharing is blocked. Ask the assistant to publish the Connections database rules.'
      : 'Connection interrupted — progress saved. Retrying automatically.';
    status();
  }
  async function start() {
    if (starting || stopped) return;
    starting = true;
    unsubscribes.forEach(off => off()); unsubscribes = [];
    ready = false; connected = false; failure = ''; status();
    try {
      sdk = await sdkLoader();
      if (stopped) return;
      const app = sdk.getApps().find(a => a.name === '[DEFAULT]') || sdk.initializeApp(config);
      uid = (await sdk.signInAnonymously(sdk.getAuth(app))).user.uid;
      db = sdk.getDatabase(app, config.databaseURL);
      if (stopped) return;
      const identity = facilitator ? `facilitators/${uid}` : `participants/${uid}/${facet.id}`;
      await sdk.set(sdk.ref(db, `${base}/${identity}`), true);
      if (stopped) return;
      unsubscribes.push(sdk.onValue(sdk.ref(db, '.info/connected'), snap => {
        connected = !!snap.val();
        // Never flush an offline queue until a current server read succeeds.
        ready = false; status();
        if (connected) refresh();
      }));
      unsubscribes.push(sdk.onValue(sdk.ref(db, base), snap => receive(snap.val() || {}), error => {
        ready = false; fail(error); scheduleStart();
      }));
    } catch (error) { fail(error); scheduleStart(); }
    finally { starting = false; }
  }
  function receive(value) {
    // A late read must never move a client back into an earlier round.
    if (local.epoch !== null && epochOf(value) < local.epoch) return;
    remote = value;
    const next = reconcile(local, remote, facets);
    local.epoch = next.epoch; local.pending = next.pending;
    // Firebase listeners include optimistic local writes. Wait for the server
    // acknowledgement before counting this phone's fragment as shared.
    if (facet && local.pending) next.assembly[facet.partNumber - 1] = '';
    persist();
    onState({ ...next, remote, ownPublished: !!facet && next.assembly[facet.partNumber - 1] === facet.code });
    status();
  }
  async function refresh() {
    try {
      // SDK get may return cache offline;
      // connected is checked again below, and epoch is enforced by database rules.
      const snapshot = await sdk.get(sdk.ref(db, base));
      if (!connected || stopped) return;
      receive(snapshot.val() || {}); ready = true; failure = ''; status(); flush();
    } catch (error) { fail(error); scheduleStart(); }
  }
  async function flush() {
    if (!connected || !ready || writing || !local.pending || facilitator || stopped) return;
    const existing = remote?.fragments?.[facet.id];
    if (existing?.code === facet.code && existing.epoch === local.epoch) {
      local.pending = null; persist(); receive(remote); status(); return;
    }
    writing = true;
    const pending = local.pending;
    try {
      await sdk.set(sdk.ref(db, `${base}/fragments/${facet.id}`), {
        code: pending.code, uid, epoch: local.epoch
      });
      if (local.pending === pending) { local.pending = null; persist(); }
      failure = '';
      receive(remote);
    } catch (error) { fail(error); scheduleStart(); }
    finally { writing = false; status(); }
  }
  function publish() {
    if (facilitator || !facet) return;
    if (remote?.fragments?.[facet.id]?.code === facet.code &&
        remote.fragments[facet.id].epoch === local.epoch) return;
    local.pending = { code: facet.code }; persist(); status(); flush();
  }
  function cancelPending() { local.pending = null; persist(); status(); }
  async function resetSession() {
    if (!facilitator || !connected || !ready) throw new Error('Wait until the facilitator is connected before resetting.');
    await sdk.update(sdk.ref(db, base), {
      fragments: null, 'meta/epoch': sdk.increment(1), 'meta/resetAt': sdk.serverTimestamp()
    });
  }
  start();
  return { publish, cancelPending, resetSession,
    stop() { stopped = true; clearTimeout(retryTimer); unsubscribes.forEach(off => off()); },
    getEpoch: () => local.epoch, getState: () => ({ epoch: epochOf(remote), remote }) };
}
