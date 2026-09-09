import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createConnectionsSync } from './firebase-sync.mjs';
import { reconcile, fragmentsOf } from './sync-core.mjs';
const directory = new URL('./', import.meta.url);
const source = n => fs.readFileSync(new URL(n, directory), 'utf8');
const cfgContext = { window: {} }; vm.runInNewContext(source('game-config.js'), cfgContext);
const config = JSON.parse(JSON.stringify(cfgContext.window.CONNECTIONS_CONFIG));
const facets = config.facets;
const sorted = facets.slice().sort((a,b)=>a.partNumber-b.partNumber);
assert.equal(config.finalCode, 'MAKE3PUTSONHOLE1');
assert.equal(sorted.map(f=>f.code).join(''), config.finalCode);
for (const f of facets) {
  assert.equal(f.orderedItems.map(s=>s.match(/\((.)\)$/)[1]).join(''), f.code);
  assert(config.categories[f.categoryIndex].items.some(i=>i.text===f.anchorText));
  assert.deepEqual(f.orderedItems.slice().sort(), config.categories[f.categoryIndex].items.map(i=>i.text).sort());
}
const memory = () => { const map = new Map(); return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; };
const clone = x => JSON.parse(JSON.stringify(x));
const tick = async () => { for(let i=0;i<30;i++) await Promise.resolve(); };
const base = 'connectionsSessions/'+config.sessionId;
class Server {
  value = {}; clients = []; writes = [];
  client(uid) {
    const c = {uid, online:true, listeners:[], defer:false, deferred:[]}; this.clients.push(c);
    const snap = value => ({val:()=>clone(value)});
    const notify = () => {for(const client of this.clients) if(client.online) for(const l of client.listeners) if(l.path===base) l.cb(snap(this.value));};
    const commit = (path,value) => {
      if(path.includes('/fragments/')) {
        assert.equal(value.epoch, this.value.meta?.epoch || 0, 'server rejects stale epoch');
        const pid=path.split('/').at(-1);
        assert(this.value.participants?.[uid]?.[pid]);
        this.value.fragments ||= {}; this.value.fragments[pid]=clone(value); this.writes.push({path,value});
      } else if(path.includes('/participants/')) {
        const pid=path.split('/').at(-1); this.value.participants ||= {}; this.value.participants[uid] ||= {};this.value.participants[uid][pid]=value;
      } else if(path.includes('/facilitators/')) {
        this.value.facilitators ||= {};this.value.facilitators[uid]=value;
      } else throw Error('Unexpected path '+path);
      notify();
    };
    c.sdk = {
      getApps:()=>[],initializeApp:()=>({}),getAuth:()=>({}),signInAnonymously:async()=>({user:{uid}}),getDatabase:()=>({}),ref:(_,path)=>path,
      set:async(path,value)=> {
        if(c.defer && path.includes('/fragments/')) return new Promise((resolve,reject)=>c.deferred.push(()=>{try{commit(path,value);resolve()}catch(e){reject(e)}}));
        commit(path,value);
      },
      get:async()=>snap(this.value),
      onValue:(path,cb)=>{const l={path,cb};c.listeners.push(l);if(c.online||path==='.info/connected')cb(snap(path==='.info/connected'?c.online:this.value));return()=>{c.listeners=c.listeners.filter(x=>x!==l)};},
      update:async(path,updates)=>{assert.equal(path,base);assert(this.value.facilitators?.[uid]);assert.equal(updates.fragments,null);delete this.value.fragments;this.value.meta={epoch:(this.value.meta?.epoch||0)+1,resetAt:Date.now()};notify();},
      increment:x=>({increment:x}),serverTimestamp:()=>({timestamp:true})
    };
    c.connect = online => {c.online=online;for(const l of c.listeners)if(l.path==='.info/connected')l.cb(snap(online));if(online)notify()};
    return c;
  }
}
// Minimal event harness: exercises the existing game functions without a browser.
function dom() {
  let elements=[];
  class Element {
    constructor(attrs='',inner='') {
      this.listeners={};this.dataset={};this.disabled=/\bdisabled\b/.test(attrs);this.value='';this.textContent=inner;
      for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){if(m[1]==='id')this.id=m[2];if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];}
    }
    addEventListener(n,f){this.listeners[n]=f;}
    click(){assert(!this.disabled, 'Click disabled '+this.id);return this.listeners.click?.();}
  }
  const app = new Element();
  Object.defineProperty(app,'innerHTML',{get:()=>app.html||'',set:html=>{app.html=html;elements=[];for(const m of html.matchAll(/<(button|textarea|input|p)[^>]*>/g))elements.push(new Element(m[0]));}});
  app.querySelectorAll = selector => {const key=selector.match(/^\[data-(.*)\]$/)?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return elements.filter(e=>key in e.dataset);};
  const document={getElementById:id=>id==='app'?app:elements.find(e=>e.id===id)||null};
  return {document,app};
}
const server=new Server();const games=[];const allApis=[];
for(const facet of sorted) {
  const client=server.client(facet.id), storage=memory(), d=dom();let api;
  const ctx={window:{CONNECTIONS_CONFIG:config,CONNECTIONS_FIREBASE_CONFIG:{},location:{search:'?facet='+facet.id},confirm:()=>true},document:d.document,localStorage:storage,URLSearchParams,setTimeout,clearTimeout,console,
    testImport:()=>Promise.resolve({createConnectionsSync:opts=>(api=createConnectionsSync({...opts,sdkLoader:async()=>client.sdk,storage}))})};
  const gameSource=source('game.js').replace('import("./firebase-sync.mjs")','testImport()');
  vm.runInNewContext(gameSource,ctx);await tick();allApis.push(api);
  games.push({facet,client,storage,d,api,ctx,gameSource});
}
for(let index=0;index<games.length;index++) {
  const g=games[index],{facet,d}=g;
  assert(d.app.innerHTML.includes('Recover your connection'));
  assert(!d.app.innerHTML.includes('continuous-code'));
  for(const b of d.app.querySelectorAll('[data-tile-id]').filter(b=>b.dataset.tileId.startsWith(facet.categoryIndex+'-'))) {
    const item=config.categories[facet.categoryIndex].items[Number(b.dataset.tileId.split('-')[1])];
    if(item.text!==facet.anchorText) d.app.querySelectorAll('[data-tile-id]').find(e=>e.dataset.tileId===b.dataset.tileId).click();
  }
  d.document.getElementById('submit-button').click();
  const textarea=d.document.getElementById('category-answer');textarea.value=facet.acceptedKeywordSets[0].join(' ');textarea.listeners.input();
  d.document.getElementById('identify-button').click();
  for(const text of facet.orderedItems)d.app.querySelectorAll('[data-order-item]').find(e=>e.dataset.orderItem===text).click();
  d.document.getElementById('check-order').click();await tick();
  for(const h of games.slice(0,index+1))assert(h.d.app.innerHTML.includes(facet.code));
  for(const h of games.slice(index+1))assert(h.d.app.innerHTML.includes('Recover your connection'),'other players stay in their puzzle');
}
for(const g of games){assert(g.d.app.innerHTML.includes('The four facets are united.'));assert(g.d.app.innerHTML.includes(config.finalCode));assert(g.d.app.innerHTML.includes('state it to his erstwhile assistant.'));assert(!g.d.app.innerHTML.includes('assemble-code'));assert(!g.d.app.innerHTML.includes('<input'));}
assert.equal(server.writes.length,4);
// Reload a completed player's code: restores automatically from shared state.
games[0].api.stop();vm.runInNewContext(games[0].gameSource,games[0].ctx);await tick();assert(games[0].d.app.innerHTML.includes(config.finalCode));
// Admin reset and offline-device stale progress.
const adminClient=server.client('admin');let adminState;
const admin=createConnectionsSync({sessionId:config.sessionId,facets,config:{},puzzleId:config.puzzleId,facilitator:true,storage:memory(),sdkLoader:async()=>adminClient.sdk,onState:s=>adminState=s});allApis.push(admin);await tick();
games[3].client.connect(false);await admin.resetSession();await tick();
for(const g of games.slice(0,3))assert(g.d.app.innerHTML.includes('Recover your connection'));
games[3].client.connect(true);await tick();assert(games[3].d.app.innerHTML.includes('Recover your connection'));assert(!server.value.fragments);assert.equal(adminState.epoch,1);
// Queued offline solve is purged when a reset occurs before reconnection.
const p=games[1];p.client.connect(false);p.api.publish();await admin.resetSession();await tick();p.client.connect(true);await tick();assert(!server.value.fragments);assert.equal(server.writes.length,4);
// A racing write that was sent before reset must be rejected by epoch rules.
p.client.defer=true;p.api.publish();await tick();await admin.resetSession();await tick();for(const complete of p.client.deferred)complete();await tick();assert(!server.value.fragments);
assert.equal(reconcile({epoch:0,pending:{code:'MAKE'}},{meta:{epoch:1}},facets).pending,null);
assert.deepEqual(fragmentsOf({meta:{epoch:2},fragments:{mustard:{code:'MAKE',epoch:1}}},facets),['','','','']);
const adminSource=source('admin.mjs');assert(!/\b(confirm|prompt)\s*\(/.test(adminSource));assert(!source('game.js').includes('params.get("session")'));
const rules=JSON.parse(source('firebase.rules.json'));assert(rules.rules.sessions);assert(rules.rules.connectionsSessions);assert(rules.rules.connectionsSessions.$session.fragments.$persona['.write'].includes("child('epoch')"));
for(const api of allApis)api.stop();for(const c of server.clients)c.listeners=[];
console.log('PASS: fragment mapping; all four complete puzzle flows; automatic sharing/reveal; unsolved-player gating; reload; admin reset; offline reset; stale queued/racing writes; single-session configuration.');
process.exit(0);
