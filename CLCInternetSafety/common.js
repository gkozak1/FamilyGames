/* Shared by host.html and index.html */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA8z6WaaA3cP4QLgCxdCvQsyslvH7bdYXc",
  authDomain: "clcinternetsafety.firebaseapp.com",
  databaseURL: "https://clcinternetsafety-default-rtdb.firebaseio.com",
  projectId: "clcinternetsafety",
  storageBucket: "clcinternetsafety.firebasestorage.app",
  messagingSenderId: "35026260769",
  appId: "1:35026260769:web:8b5fe6dd9fd8382be0a460"
};
const ROOT = 'showdown';
const TEAMS = [
  { id: 'dragon', name: 'Dragon', color: '#38bdf8', img: 'img/dragon.jpg', head: 'img/dragon-head.jpg' },
  { id: 'tiger',  name: 'Tiger',  color: '#fb923c', img: 'img/tiger.jpg',  head: 'img/tiger-head.jpg' },
  { id: 'robot',  name: 'Robot',  color: '#a78bfa', img: 'img/robot.jpg',  head: 'img/robot-head.jpg' },
];
const TEAM_IDS = TEAMS.map(t => t.id);
const teamById = id => TEAMS.find(t => t.id === id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const arr = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
const pick = a => a[Math.floor(Math.random() * a.length)];

function fbStart() {
  firebase.initializeApp(FIREBASE_CONFIG);
  return firebase.database();
}
async function fbSignIn() {
  const cred = await firebase.auth().signInAnonymously();
  return cred.user.uid;
}
function fbExplain(e) {
  const c = (e && (e.code || e.message)) || String(e);
  if (/operation-not-allowed|admin-restricted/.test(c)) return 'Anonymous sign-in is off. Firebase → Authentication → Sign-in method → Anonymous → Enable.';
  if (/unauthorized-domain/.test(c)) return 'Add ' + location.hostname + ' in Firebase → Authentication → Settings → Authorized domains.';
  if (/PERMISSION_DENIED|permission/i.test(c)) return 'The database rules need updating. Paste database.rules.json into Realtime Database → Rules and Publish.';
  if (/network/i.test(c)) return 'Network problem: ' + c;
  return c;
}
