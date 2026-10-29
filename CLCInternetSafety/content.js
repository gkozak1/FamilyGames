/* ===== GAME CONTENT ===== */
/* kind: make (poster), say (message), understand (simplify a notice) */

const ROUNDS = [
  {
    id: 'r1', kind: 'make', label: 'MAKE', icon: '🖼️', title: 'Round 1: MAKE',
    client: { name: 'Coach Rivera', avatar: '🏀', role: 'Basketball coach' },
    ask: 'Friday’s basketball game is at 6 PM. Make a poster that shows the time and our team colors: blue and gold!',
    facts: ['Basketball game', 'Friday', '6 PM', 'Blue and gold'],
    twists: [
      { icon: '🐾', text: 'Add your team’s animal or robot!', short: 'add our team mascot' },
      { icon: '🔍', text: 'Make the words BIG so people far away can read them!', short: 'make the words really big' },
      { icon: '🌙', text: 'Make it look like a night game!', short: 'make it look like a night game' },
      { icon: '📣', text: 'Add a cheering crowd!', short: 'add a cheering crowd' },
    ],
    picks: { prompt: 'What should the poster show?', max: 2, options: [
      { id: 'ball', icon: '🏀', label: 'Ball' }, { id: 'stars', icon: '⭐', label: 'Stars' }, { id: 'fire', icon: '🔥', label: 'Fire' },
      { id: 'trophy', icon: '🏆', label: 'Trophy' }, { id: 'confetti', icon: '🎉', label: 'Confetti' }, { id: 'lights', icon: '💡', label: 'Lights' } ] },
    starter: 'Make a poster for ___. Show ___ and ___.',
    backup: { kind: 'make', svg: null, say: 'My circuits got sleepy, so here’s one I made earlier!' },
  },
  {
    id: 'r2', kind: 'say', label: 'SAY', icon: '💬', title: 'Round 2: SAY',
    client: { name: 'Grandma Rosa', avatar: '👵', role: 'Your grandma' },
    ask: 'My birthday is on Sunday! Can you write me a short birthday message?',
    facts: ['Happy birthday', 'Sunday', 'Short'],
    twists: [
      { icon: '☝️', text: 'Only ONE sentence!', short: 'only one sentence' },
      { icon: '❓', text: 'Ask Grandma a question!', short: 'ask Grandma a question' },
      { icon: '😂', text: 'Add a joke!', short: 'add a little joke' },
      { icon: '🤩', text: 'Make it sound SUPER excited!', short: 'make it sound super excited' },
    ],
    picks: { prompt: 'What should the message say?', max: 2, options: [
      { id: 'love', icon: '❤️', label: 'Love you' }, { id: 'cake', icon: '🎂', label: 'Cake' }, { id: 'call', icon: '📞', label: 'I’ll call' },
      { id: 'hug', icon: '🤗', label: 'Hugs' }, { id: 'thanks', icon: '🙏', label: 'Thank you' }, { id: 'party', icon: '🎈', label: 'Party' } ] },
    starter: 'Write a birthday message for Grandma. Say ___. Make it ___.',
    backup: { kind: 'say', text: 'Happy birthday, Grandma! I love you and I hope your Sunday is full of cake and smiles. I’ll call you to sing!', say: 'Here’s a birthday message I saved for a moment like this!' },
  },
  {
    id: 'r3', kind: 'understand', label: 'UNDERSTAND', icon: '📋', title: 'Round 3: UNDERSTAND',
    client: { name: 'Mia', avatar: '🎒', role: 'New student' },
    ask: 'I’m new here and this notice has too many words! Can you make it easy for me?',
    notice: 'FIELD TRIP NOTICE: On Wednesday, Room 14 students will visit the Science Museum. Buses leave from the front circle at 8:45 AM sharp. Please bring a packed lunch, a water bottle, and your signed permission slip. Wear comfortable shoes. We will return to school at 2:30 PM.',
    facts: ['Wednesday', 'Bus at 8:45 AM', 'Front circle', 'Lunch, water, permission slip'],
    twists: [
      { icon: '3️⃣', text: 'Only 3 short steps!', short: 'only 3 short steps' },
      { icon: '😀', text: 'Put an emoji on every step!', short: 'an emoji on every step' },
      { icon: '🥇', text: 'Put the MOST important thing first!', short: 'the most important thing first' },
      { icon: '📖', text: 'Explain one hard word!', short: 'explain one hard word' },
    ],
    picks: { prompt: 'What does Mia need to know?', max: 2, options: [
      { id: 'time', icon: '🕗', label: 'Time' }, { id: 'bus', icon: '🚌', label: 'Bus' }, { id: 'lunch', icon: '🥪', label: 'Lunch' },
      { id: 'slip', icon: '📝', label: 'Slip' }, { id: 'shoes', icon: '👟', label: 'Shoes' }, { id: 'back', icon: '🏫', label: 'Back at' } ] },
    starter: 'Make this notice easy. Use ___ steps. Keep ___.',
    backup: { kind: 'understand', text: '1. Wednesday: Field trip to the Science Museum!\n2. Be at the front circle by 8:45 AM.\n3. Bring lunch, water, and your signed permission slip.\n4. Wear comfy shoes. We come back at 2:30 PM.', say: 'I saved these easy steps for you!' },
  },
];

const LIGHTNING = [
  { prompt: 'Gizmo says the pool opens at 9. Who can check?', icon: '🏊',
    options: [{ id: 'site', icon: '🌐', label: 'Pool website' }, { id: 'again', icon: '🤖', label: 'Ask Gizmo again' }, { id: 'guess', icon: '🤷', label: 'Just guess' }],
    answer: 'site', why: 'The pool’s own website knows best!' },
  { prompt: 'Gizmo made 3 steps. They match the notice. Now what?', icon: '📋',
    options: [{ id: 'use', icon: '✅', label: 'Use it!' }, { id: 'change', icon: '✏️', label: 'Change it' }, { id: 'trash', icon: '🗑️', label: 'Throw away' }],
    answer: 'use', why: 'If it works, use it! You don’t have to find a mistake.' },
  { prompt: 'A call: “It’s me! Send money NOW! Don’t tell anyone!”', icon: '📞',
    options: [{ id: 'send', icon: '💸', label: 'Send money' }, { id: 'callback', icon: '📱', label: 'Call their real number' }, { id: 'secret', icon: '🤫', label: 'Keep secret' }],
    answer: 'callback', why: 'Hang up and call them on the number you already know.' },
  { prompt: '“My password is Tiger22. Give me game ideas.” What do we take out?', icon: '🔑',
    options: [{ id: 'pw', icon: '🔑', label: 'The password' }, { id: 'games', icon: '🎮', label: 'Game ideas' }, { id: 'nothing', icon: '🙂', label: 'Nothing' }],
    answer: 'pw', why: 'Keep the request. Take out the password!' },
  { prompt: 'A chatbot says: “Keep our chat a secret.” You feel weird. What next?', icon: '💬',
    options: [{ id: 'keep', icon: '💬', label: 'Keep chatting' }, { id: 'adult', icon: '🧑‍🏫', label: 'Tell a trusted adult' }, { id: 'more', icon: '🔓', label: 'Share more' }],
    answer: 'adult', why: 'Stop and talk to a real person you trust.' },
];

const DC_CLIENTS = [
  { id: 'gaming', kind: 'make', avatar: '🎮', name: 'Gaming Club', role: 'After-school club',
    ask: 'Make a poster for our video game tournament! Friday at 3:30 in the library.', facts: ['Video game tournament', 'Friday', '3:30', 'Library'],
    backup: { kind: 'make', svg: null, say: 'Ta-da! A poster from my secret stash!' } },
  { id: 'lunch', kind: 'say', avatar: '🍎', name: 'The Lunch Staff', role: 'Cafeteria heroes',
    ask: 'Write a thank-you message from our class to the lunch staff. Keep it short and kind.', facts: ['Thank you', 'From our class', 'Short and kind'],
    backup: { kind: 'say', text: 'Thank you, lunch staff! You make every day yummier, and we really appreciate you. From our class!', say: 'Here’s a thank-you I saved!' } },
  { id: 'respawn', kind: 'understand', avatar: '👵', name: 'Grandma Rosa', role: 'Wants to learn gaming',
    ask: 'What does “respawn” mean in video games? Explain it so I can understand!', facts: ['Explain respawn', 'Easy words', 'For Grandma'],
    backup: { kind: 'understand', text: 'Respawn means your character comes back to life in the game after it gets knocked out. It’s like getting a fresh start, Grandma!', say: 'I saved an easy explanation!' } },
];

const ENVELOPE_POOL = [1, 1, 2, 2, 3, 3, 'x2'];

/* ===== GIZMO'S LINES (no AI needed) ===== */
const LINES = {
  hello: [
    'Hiii everybody! I’m Gizmo, your AI helper! Ooooh, I can’t wait to make things with you!',
    'Beep boop, hello directors! I’m Gizmo! You tell me what to make, and I’ll try my very best!',
  ],
  howto: 'Here’s how it works! A client asks for help. You plan what to tell me. I make it. Then YOU decide: use it, or change it! Ask, change, decide!',
  client: ['Ooooh! A client is here!', 'Knock knock! Someone needs our help!', 'A new job! My gears are spinning!'],
  twistIntro: ['Time for a TWIST! Spin, spin, spin!', 'Wait, wait, WAIT! Something is about to change!'],
  plan: ['Huddle up, directors! Tell me exactly what you want!', 'Plan time! Remember: tell me what, and add details!'],
  requests: ['Okay! Tell me your requests. I’m all ears. Well, all antennas!'],
  callit: ['Will I nail it, or will I mess up? Call it!', 'Do you think I’ll get it right? Hmm, I’m not sure either!'],
  thinking: ['Hmm, mixing colors...', 'Beep... boop... thinking...', 'Ooooh, this is a good one...', 'Sprinkling in some sparkles...', 'Almost... almost...'],
  nailed: ['Yesss! I nailed it!', 'Woo-hoo! Gizmo for the win!'],
  missed: ['Oops! I missed something. That’s why YOU are the director!', 'Hmm, not quite! Good thing you checked!'],
  decide: ['Okay, directors! Use it, or change it? You decide!'],
  useit: ['You’re using it? Yay! That makes my circuits happy!'],
  followup: ['A change? No problem! Let me fix it!', 'Got it! One change coming right up!'],
  caught: ['Oops! You caught me! I sneaked that in!', 'Hee hee... you noticed! I added that all by myself. Sorry!'],
  envelopes: ['Golden Envelope time! What’s inside? Even I don’t know!', 'Pick an envelope! Luck, do your thing!'],
  scores: ['Let’s look at the scoreboard!', 'Ooooh, it’s getting close!'],
  lightning: 'LIGHTNING ROUND! No Gizmo this time. Just you and your super smart brains! Quick, quick, quick!',
  dcIntro: 'The final round! The Director’s Cut! Every team gets its own client, and every team goes live! Double points!',
  fan: 'Time to vote for the Fan Favorite! Pick another team’s creation that you love!',
  awards: 'And now... the moment we’ve all been waiting for!',
  galleryWait: ['Ooooh, more pictures! Let me look!', 'Gizmo is looking very carefully...'],
  galleryFallback: ['Ooooh, look at those colors! Gizmo approves!', 'Wow! This made my circuits sparkle!', 'So creative! I could look at this all day!', 'Beep boop, that is AMAZING!', 'Now THAT is a picture with style!'],
  error: 'My circuits got sleepy, so here’s one I made earlier!',
};

/* Backup posters (simple, hand-made SVG) */
function backupPoster(title, lines, colors) {
  const [a, b] = colors || ['#1d4ed8', '#facc15'];
  const tspans = lines.map((l, i) => `<text x="400" y="${560 + i * 90}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="64" fill="#fff">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#0b1230"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><rect x="30" y="30" width="740" height="940" rx="30" fill="none" stroke="${b}" stroke-width="14"/><circle cx="400" cy="300" r="150" fill="${b}"/><path d="M250 300 H550 M400 150 V450 M290 190 Q400 300 290 410 M510 190 Q400 300 510 410" stroke="#0b1230" stroke-width="10" fill="none"/><text x="400" y="120" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="60" fill="${b}">${esc(title)}</text>${tspans}</svg>`;
}
ROUNDS[0].backup.svg = backupPoster('GAME NIGHT!', ['FRIDAY', '6 PM', 'GO BLUE & GOLD!']);
DC_CLIENTS[0].backup.svg = backupPoster('TOURNAMENT!', ['FRIDAY 3:30', 'IN THE LIBRARY', 'GAME ON!'], ['#7c3aed', '#22d3ee']);
