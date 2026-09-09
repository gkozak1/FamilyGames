const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const CONFIG=require('./config.js'),COORD=require('./coordination-core.js');
const read=n=>fs.readFileSync(__dirname+'/'+n,'utf8');
const source=read('firebase-sync.js').replace('export async function','async function').replace(/import\('https:[^']+'\)/g,'Promise.resolve(SDK)');
const base='sessions/'+CONFIG.sessionId;let remote={},stamp=1000;const clients=[];
const snap=v=>({val:()=>JSON.parse(JSON.stringify(v))});
function at(path){return path.split('/').slice(2).reduce((v,k)=>v?.[k],remote)??null;}
function put(path,value){let obj=remote;const keys=path.split('/').slice(2);for(const k of keys.slice(0,-1))obj=obj[k] ||= {};if(value===null)delete obj[keys.at(-1)];else obj[keys.at(-1)]=value;}
function emit(){for(const c of clients)if(c.online)for(const l of c.listeners)if(l.path===base)l.fn(snap(remote));}
async function tick(){for(let i=0;i<30;i++)await Promise.resolve();}
async function make(persona,role='player'){
 const c={online:true,listeners:[],state:null,defer:false,deferred:[]};clients.push(c);const uid=persona;const map=new Map();
 const commit=(path,val)=>{if(/\/(evidence|synthesis|ciphers|engine)\//.test(path)&&val!==null)assert.equal(val.round,remote.meta?.resetAt||0,'stale write rejected');put(path,val);emit();};
 const SDK={initializeApp:()=>({}),getAuth:()=>({}),signInAnonymously:async()=>({user:{uid}}),getDatabase:()=>({}),ref:(_,p)=>p,
 set:async(p,v)=>{if(c.defer&&p.includes('/evidence/'))return new Promise((resolve,reject)=>c.deferred.push(()=>{try{commit(p,v);resolve()}catch(e){reject(e)}}));commit(p,v);},
 get:async()=>snap(remote),serverTimestamp:()=>({timestamp:true}),
 onValue:(path,fn)=>{c.listeners.push({path,fn});fn(snap(path==='.info/connected'?c.online:path==='.info/serverTimeOffset'?0:remote));},
 update:async(p,updates)=>{assert.equal(p,base);for(const [k,v] of Object.entries(updates))put(p+'/'+k,v?.timestamp?++stamp:v);emit();},
 runTransaction:async(p,fn)=>{const v=fn(at(p));if(v!==undefined)commit(p,v);return{snapshot:snap(at(p))};}};
 const ctx={window:{FIELD_APP_CONFIG:CONFIG,FIELD_COORDINATION_CORE:COORD},SDK,localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},console:{error:console.error,warn:()=>{}},setTimeout:()=>0,clearTimeout,Date,Map,JSON};
 vm.runInNewContext(source,ctx);c.api=await ctx.createFieldSync({sessionId:'IGNORED-OLD-ID',persona,role,config:{apiKey:'test',appId:'test',projectId:'test',databaseURL:'test'},onState:s=>c.state=s});
 c.connect=v=>{c.online=v;for(const l of c.listeners)if(l.path==='.info/connected')l.fn(snap(v));if(v)emit();};return c;
}
(async()=>{
 const players=[];for(const p of CONFIG.personaOrder)players.push(await make(p));const admin=await make('facilitator','facilitator');
 for(const p of players)assert.equal(p.api.sessionId,'JEWEL-FIELD-DOSSIER');
 for(let i=0;i<4;i++)await players[i].api.writeEvidence('silver-fox',CONFIG.personaOrder[i],{complete:true,value:i});
 assert.equal(Object.keys(remote.evidence['silver-fox']).length,4);
 for(const p of players)await p.api.pressEngine('silver-fox');await tick();assert.equal(remote.engine['silver-fox'].status,'success');
 await players[0].api.writeCipher('silver-fox',{letter:'D',number:4});assert(remote.ciphers['silver-fox']);
 players[3].connect(false);await admin.api.resetSession();await tick();assert(!remote.evidence&&!remote.ciphers&&!remote.engine);for(const p of players.slice(0,3))assert.equal(Object.keys(p.state.evidence).length,0);
 await players[3].api.writeEvidence('silver-fox','plum',{complete:true,value:99});players[3].connect(true);await tick();assert(!remote.evidence,'offline queue must not restore old round');
 await players[0].api.writeEvidence('silver-fox','scarlet',{complete:true,value:2});assert.equal(remote.evidence['silver-fox'].scarlet.round,remote.meta.resetAt);
 players[0].defer=true;const write=players[0].api.writeEvidence('silver-fox','scarlet',{complete:true,value:3});await tick();await admin.api.resetSession();for(const f of players[0].deferred)f();await write;await tick();assert(!remote.evidence,'in-flight old-round write rejected');
 const adminText=read('facilitator.js');const reset=adminText.slice(adminText.indexOf('async function resetCurrentSession'));
 assert(!/\b(prompt|confirm|alert)\(/.test(reset));assert(!adminText.includes('data-session-input'));assert(!read('app.js').includes("qp('session')"));
 assert(read('app.js').includes('engineOverlay !== overlay || Number(team.meta?.resetAt || 0) !== round'));
 const rules=JSON.parse(read('firebase.rules.json'));assert(rules.rules.connectionsSessions);assert(rules.rules.sessions.$session.evidence.$site.$persona['.validate'].includes("child('round')"));
 console.log('PASS: fixed session; four-player evidence/engine; one-click reset; offline reconnect; new-round writes; stale in-flight rejection; admin UI; animation reset guard; combined rules.');
})().catch(e=>{console.error(e);process.exitCode=1;});
