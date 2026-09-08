const CONFIG = require('./config.js');
const CORE = require('./core.js');
const COORD = require('./coordination-core.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('PASS', name); }
  catch (e) { failures++; console.error('FAIL', name, '\n ', e.message); }
}
function assert(cond, msg='assertion failed') { if (!cond) throw new Error(msg); }

function expectedInput(c) {
  switch(c.type) {
    case 'number': return c.expected;
    case 'positiveNumber': return 3;
    case 'text': return Array.isArray(c.expected) ? c.expected[0] : c.expected;
    case 'keywords': return c.expected.join(' and ');
    case 'triple': case 'pair': return c.expected.slice();
    case 'list': return Array.from({length:c.minItems},(_,i)=>`Feature ${i+1}`);
    case 'twoText': return ['Separated fuel storage', 'Ventilation for fumes'];
    case 'textAny': return 'Observed evidence';
    default: return '';
  }
}

test('All 28 persona challenges validate their expected evidence', () => {
  let count=0;
  for (const site of CONFIG.sites) for (const pid of CONFIG.personaOrder) {
    const c=site.challenges[pid];
    const r=CORE.validateChallenge(c, expectedInput(c));
    assert(r.ok, `${site.id}/${pid} did not validate`); count++;
  }
  assert(count===28, `expected 28, got ${count}`);
});

test('Kopps evidence derives 16, 15, and difference 1', () => {
  const values=CORE.deriveKopps({scarlet:{value:19},peacock:{value:8},mustard:{value:[3,4,5]},plum:{value:8}});
  assert(values.pairOne===16,'pair one'); assert(values.pairTwo===15,'pair two'); assert(values.difference===1,'difference');
});

test('Cipher map contains seven unique letters and positions', () => {
  const letters=CONFIG.sites.map(s=>s.cipher.letter), nums=CONFIG.sites.map(s=>s.cipher.number);
  assert(new Set(letters).size===7,'letters not unique'); assert(new Set(nums).size===7,'numbers not unique');
  assert(nums.every(n=>n>=1&&n<=7),'position out of range');
});

test('Recall sorting is numerical', () => {
  const obj={a:{letter:'A',number:7},b:{letter:'B',number:2},c:{letter:'C',number:5}};
  const sorted=CORE.sortCiphers(obj).map(x=>x.number).join(','); assert(sorted==='2,5,7',sorted);
});

test('Four persona presses within five seconds qualify', () => {
  let a=null; const t=100000;
  a=COORD.applyPress(a,{attemptId:'x',now:t,persona:'scarlet',uid:'s',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'y',now:t+900,persona:'peacock',uid:'p',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'z',now:t+2800,persona:'mustard',uid:'m',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'q',now:t+4999,persona:'plum',uid:'l',windowMs:5000});
  assert(COORD.pressCount(a)===4,'press count'); assert(COORD.qualifies(a,5000),'should qualify'); assert(COORD.pressSpreadMs(a)===4999,'spread');
});

test('A press after the five-second deadline does not join the expired attempt', () => {
  const t=200000;
  let a=COORD.applyPress(null,{attemptId:'x',now:t,persona:'scarlet',uid:'s',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'y',now:t+5001,persona:'peacock',uid:'p',windowMs:5000});
  assert(COORD.pressCount(a)===1,'late press should not be added'); assert(COORD.expired(a,t+5001),'attempt should be expired');
});

test('All four distinct personas are required', () => {
  const t=300000;
  let a=COORD.applyPress(null,{attemptId:'x',now:t,persona:'scarlet',uid:'s1',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'x',now:t+500,persona:'scarlet',uid:'s2',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'x',now:t+1000,persona:'peacock',uid:'p',windowMs:5000});
  a=COORD.applyPress(a,{attemptId:'x',now:t+1500,persona:'mustard',uid:'m',windowMs:5000});
  assert(COORD.pressCount(a)===3,'duplicate persona must not count twice'); assert(!COORD.qualifies(a,5000),'should not qualify');
});

test('A replay press starts a new sequence after a successful attempt', () => {
  const old={attemptId:'old',sequence:4,status:'success',startedAt:1,deadlineAt:5001,presses:{}};
  const next=COORD.applyPress(old,{attemptId:'new',now:9000,persona:'plum',uid:'p',windowMs:5000});
  assert(next.status==='arming','new attempt not arming'); assert(next.sequence===5,'sequence not incremented'); assert(next.attemptId==='new','attempt id'); assert(COORD.pressCount(next)===1,'new first press');
});

test('Site completion requires all four evidence records and synthesis where configured', () => {
  const site=CONFIG.sites.find(s=>s.id==='kopps');
  const state={evidence:{kopps:{}},synthesis:{}};
  for(const pid of CONFIG.personaOrder) state.evidence.kopps[pid]={complete:true,value:1};
  assert(!CORE.siteComplete(CONFIG,site,state),'synthesis should be required');
  state.synthesis.kopps={complete:true,value:1}; assert(CORE.siteComplete(CONFIG,site,state),'should complete after synthesis');
});

if (failures) { console.error(`\n${failures} test(s) failed.`); process.exit(1); }
console.log('\nAll tests passed.');
