// ------------------------------------------------------------------
// Service worker
// ------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.error('Service worker registration failed', err);
    });
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

// ------------------------------------------------------------------
// Database
// ------------------------------------------------------------------
const db = new Dexie('SorenPhysio');
db.version(1).stores({
  completions: '[date+exerciseId], date, exerciseId, done',
});
db.version(2).stores({
  completions: '[date+exerciseId], date, exerciseId, done',
  purchases: '++id, type, purchasedAt, expiresAt',
});
db.version(3).stores({
  completions: '[date+exerciseId], date, exerciseId, done',
  purchases: '++id, type, purchasedAt, expiresAt',
  companions: '++id, droidId, unlockedAt',
  settings: 'key',
});

// ------------------------------------------------------------------
// Exercise template (hardcoded; ids are permanent and unique)
// ------------------------------------------------------------------
const TEMPLATE_VERSION = 1;
const EXERCISE_TEMPLATE = [
  { id: 'morning-stretch-quad', time: 'Morning', category: 'Stretches', name: 'Quad stretches',           detail: '' },
  { id: 'morning-stretch-ham',  time: 'Morning', category: 'Stretches', name: 'Hamstring stretches',      detail: '' },
  { id: 'morning-stretch-calf', time: 'Morning', category: 'Stretches', name: 'Calf stretches',            detail: '' },
  { id: 'evening-stretch-quad', time: 'Evening', category: 'Stretches', name: 'Quad stretches',            detail: '' },
  { id: 'evening-stretch-ham',  time: 'Evening', category: 'Stretches', name: 'Hamstring stretches',       detail: '' },
  { id: 'evening-stretch-calf', time: 'Evening', category: 'Stretches', name: 'Calf stretches',             detail: '' },
  { id: 'evening-calf-raises',  time: 'Evening', category: 'Exercise',  name: 'Calf raises on foam roller', detail: 'x6, 5 second hold' },
];
const TIME_ORDER = ['Morning', 'Evening'];
const CATEGORY_ORDER = ['Stretches', 'Exercise'];

// ------------------------------------------------------------------
// Shop
// ------------------------------------------------------------------
const CREDITS_PER_LEVEL = 150;
const SHOP_ITEMS = [
  { id: 'xp-boost',      name: 'XP Boost',      icon: '⚡', cost: 100, desc: '2× XP for 24 hours',                     detail: 'Stacks with Double XP Day for 4×!' },
  { id: 'streak-freeze', name: 'Streak Freeze',  icon: '🧊', cost: 150, desc: 'Protect your streak for one missed day', detail: 'Auto-used if you miss a day'        },
  { id: 'droid-box',     name: 'Droid Box',      icon: '📦', cost: 300, desc: 'Unlock a random Star Wars droid companion', detail: 'Common 60% · Rare 25% · Epic 10% · Mythic 4% · Legendary 1%' },
];

// ------------------------------------------------------------------
// Droids
// ------------------------------------------------------------------
const RARITY = {
  common:    { label: 'Common',    color: '#8a9bb0', weight: 60 },
  rare:      { label: 'Rare',      color: '#4a9eff', weight: 25 },
  epic:      { label: 'Epic',      color: '#b44aff', weight: 10 },
  mythic:    { label: 'Mythic',    color: '#ff8800', weight:  4 },
  legendary: { label: 'Legendary', color: '#ffd700', weight:  1 },
};

const DROIDS = [
  { id:'mouse',    name:'Mouse Droid',        rarity:'common',    quote:'Bleep bloop.' },
  { id:'gonk',     name:'Gonk Droid',         rarity:'common',    quote:'Gonk.' },
  { id:'b1',       name:'B1 Battle Droid',    rarity:'common',    quote:'Roger roger.' },
  { id:'superb2',  name:'Super Battle Droid', rarity:'rare',      quote:'Target acquired.' },
  { id:'r7',       name:'R7 Astromech',       rarity:'rare',      quote:'*excited beeping*' },
  { id:'a7',       name:'A7 Medical Droid',   rarity:'rare',      quote:'Your recovery is progressing nicely.' },
  { id:'medical',  name:'2-1B Surgical',      rarity:'rare',      quote:'I find your pain... fascinating.' },
  { id:'b2emo',    name:'B2EMO',              rarity:'epic',      quote:'I have a bad feeling... about everything.' },
  { id:'spybot',   name:'Spy Probe Droid',    rarity:'epic',      quote:'...' },
  { id:'twotubes', name:'Two Tubes',          rarity:'epic',      quote:'We take what we can get.' },
  { id:'k2so',     name:'K-2SO',              rarity:'mythic',    quote:'The odds of completing your physio are actually quite good. Relative to dying.' },
  { id:'bd1',      name:'BD-1',               rarity:'mythic',    quote:'*excited chirping and head tilts*' },
  { id:'chopper',  name:'Chopper',            rarity:'mythic',    quote:'Bwaaah! (Translation: do your exercises.)' },
  { id:'c3po',     name:'C-3PO',              rarity:'legendary', quote:'I am C-3PO, and I calculate a 97.6% chance of full recovery — provided you complete your exercises.' },
  { id:'r2d2',     name:'R2-D2',              rarity:'legendary', quote:'*determined beeping and whistling*' },
  { id:'bb8',      name:'BB-8',               rarity:'legendary', quote:'*approving beeps and a little thumbs up*' },
];

const DROID_ART = {
  mouse: `<rect x="8" y="32" width="44" height="22" rx="5" fill="#252930"/><ellipse cx="30" cy="33" rx="20" ry="12" fill="#1c2026"/><circle cx="20" cy="36" r="4" fill="#ff2200"/><circle cx="40" cy="36" r="4" fill="#ff2200"/><ellipse cx="15" cy="54" rx="6" ry="4" fill="#111"/><ellipse cx="30" cy="56" rx="6" ry="4" fill="#111"/><ellipse cx="45" cy="54" rx="6" ry="4" fill="#111"/><line x1="10" y1="42" x2="50" y2="42" stroke="#111" stroke-width="1" opacity="0.4"/>`,

  gonk: `<rect x="15" y="16" width="30" height="36" rx="6" fill="#4a3520"/><rect x="18" y="10" width="24" height="10" rx="5" fill="#5a4530"/><rect x="19" y="26" width="22" height="3" rx="1" fill="#2a1808"/><rect x="19" y="32" width="22" height="3" rx="1" fill="#2a1808"/><rect x="19" y="38" width="22" height="3" rx="1" fill="#2a1808"/><rect x="17" y="52" width="9" height="18" rx="3" fill="#3a2510"/><rect x="34" y="52" width="9" height="18" rx="3" fill="#3a2510"/><rect x="13" y="67" width="17" height="7" rx="2" fill="#2a1808"/><rect x="30" y="67" width="17" height="7" rx="2" fill="#2a1808"/>`,

  b1: `<ellipse cx="30" cy="10" rx="9" ry="8" fill="#c8b87a" transform="skewX(-8)"/><rect x="27" y="17" width="6" height="9" fill="#bfaf70"/><rect x="20" y="26" width="20" height="18" rx="3" fill="#c8b87a"/><rect x="38" y="24" width="9" height="14" rx="2" fill="#b8a860"/><line x1="20" y1="31" x2="7" y2="45" stroke="#c8b87a" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="31" x2="53" y2="45" stroke="#c8b87a" stroke-width="4" stroke-linecap="round"/><line x1="25" y1="44" x2="21" y2="72" stroke="#c8b87a" stroke-width="5" stroke-linecap="round"/><line x1="35" y1="44" x2="39" y2="72" stroke="#c8b87a" stroke-width="5" stroke-linecap="round"/><circle cx="25" cy="8" r="2.5" fill="#550000" opacity="0.9"/><circle cx="35" cy="8" r="2.5" fill="#550000" opacity="0.9"/>`,

  superb2: `<ellipse cx="30" cy="13" rx="14" ry="12" fill="#555"/><rect x="16" y="23" width="28" height="24" rx="4" fill="#4a4a4a"/><circle cx="22" cy="14" r="5" fill="#88aaff" opacity="0.8"/><circle cx="38" cy="14" r="5" fill="#88aaff" opacity="0.8"/><circle cx="22" cy="14" r="2" fill="#111"/><circle cx="38" cy="14" r="2" fill="#111"/><rect x="10" y="26" width="8" height="18" rx="3" fill="#3a3a3a"/><rect x="42" y="26" width="8" height="18" rx="3" fill="#3a3a3a"/><rect x="20" y="47" width="9" height="22" rx="3" fill="#3a3a3a"/><rect x="31" y="47" width="9" height="22" rx="3" fill="#3a3a3a"/><rect x="17" y="27" width="26" height="5" rx="2" fill="#222" opacity="0.5"/>`,

  r7: `<ellipse cx="30" cy="20" rx="18" ry="17" fill="#cc2200"/><ellipse cx="30" cy="20" rx="14" ry="13" fill="#999"/><circle cx="30" cy="20" r="6" fill="#cc2200"/><rect x="12" y="35" width="36" height="30" rx="6" fill="#cc2200"/><rect x="16" y="39" width="28" height="20" rx="4" fill="#aaa"/><circle cx="30" cy="49" r="7" fill="#cc2200"/><rect x="10" y="52" width="6" height="14" rx="3" fill="#999"/><rect x="44" y="52" width="6" height="14" rx="3" fill="#999"/>`,

  a7: `<ellipse cx="30" cy="12" rx="10" ry="10" fill="#888"/><rect x="20" y="20" width="20" height="26" rx="3" fill="#7a7a7a"/><line x1="20" y1="26" x2="5" y2="19" stroke="#777" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="26" x2="55" y2="19" stroke="#777" stroke-width="4" stroke-linecap="round"/><circle cx="5" cy="19" r="5" fill="#555"/><circle cx="55" cy="19" r="5" fill="#555"/><rect x="23" y="46" width="6" height="24" rx="3" fill="#666"/><rect x="31" y="46" width="6" height="24" rx="3" fill="#666"/><circle cx="30" cy="12" r="5" fill="#00aaff" opacity="0.7"/>`,

  medical: `<ellipse cx="30" cy="13" rx="12" ry="11" fill="#aaa"/><rect x="18" y="22" width="24" height="28" rx="4" fill="#999"/><line x1="18" y1="30" x2="4" y2="22" stroke="#888" stroke-width="4" stroke-linecap="round"/><line x1="42" y1="30" x2="56" y2="22" stroke="#888" stroke-width="4" stroke-linecap="round"/><circle cx="4" cy="22" r="5" fill="#666"/><circle cx="56" cy="22" r="5" fill="#666"/><rect x="22" y="50" width="7" height="22" rx="3" fill="#888"/><rect x="31" y="50" width="7" height="22" rx="3" fill="#888"/><circle cx="30" cy="14" r="5" fill="#555"/><circle cx="27" cy="12" r="2" fill="#fff" opacity="0.8"/>`,

  b2emo: `<rect x="8" y="26" width="44" height="34" rx="6" fill="#2a3a3a"/><rect x="12" y="20" width="36" height="14" rx="4" fill="#1e2e2e"/><ellipse cx="30" cy="32" rx="13" ry="11" fill="#162626"/><circle cx="30" cy="32" r="8" fill="#0a1a1a"/><circle cx="30" cy="32" r="5" fill="#004444" opacity="0.9"/><circle cx="30" cy="32" r="2" fill="#00aaaa"/><rect x="12" y="60" width="8" height="6" rx="2" fill="#1a2a2a"/><rect x="26" y="60" width="8" height="6" rx="2" fill="#1a2a2a"/><rect x="40" y="60" width="8" height="6" rx="2" fill="#1a2a2a"/><rect x="9" y="63" width="14" height="4" rx="2" fill="#111"/><rect x="23" y="63" width="14" height="4" rx="2" fill="#111"/><rect x="37" y="63" width="14" height="4" rx="2" fill="#111"/>`,

  spybot: `<circle cx="30" cy="36" r="24" fill="#111"/><circle cx="30" cy="36" r="20" fill="#1a1a1a"/><circle cx="30" cy="36" r="7" fill="#ff2200"/><circle cx="30" cy="36" r="3" fill="#ff7700"/><line x1="30" y1="16" x2="30" y2="6" stroke="#333" stroke-width="3"/><circle cx="30" cy="6" r="4" fill="#222"/><circle cx="30" cy="6" r="2" fill="#ff4400" opacity="0.9"/><circle cx="16" cy="30" r="2" fill="#333"/><circle cx="44" cy="30" r="2" fill="#333"/><line x1="10" y1="38" x2="4" y2="44" stroke="#222" stroke-width="2"/><line x1="50" y1="38" x2="56" y2="44" stroke="#222" stroke-width="2"/>`,

  twotubes: `<ellipse cx="30" cy="12" rx="12" ry="11" fill="#3a4a4a"/><rect x="18" y="21" width="24" height="26" rx="4" fill="#2e3e3e"/><line x1="22" y1="18" x2="12" y2="32" stroke="#1a2a2a" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="18" x2="48" y2="32" stroke="#1a2a2a" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="33" r="4" fill="#111"/><circle cx="48" cy="33" r="4" fill="#111"/><circle cx="25" cy="13" r="3.5" fill="#445566" opacity="0.8"/><circle cx="35" cy="13" r="3.5" fill="#445566" opacity="0.8"/><rect x="22" y="47" width="7" height="22" rx="3" fill="#2e3e3e"/><rect x="31" y="47" width="7" height="22" rx="3" fill="#2e3e3e"/>`,

  k2so: `<ellipse cx="30" cy="9" rx="12" ry="9" fill="#6a6a6a"/><rect x="18" y="9" width="24" height="10" rx="2" fill="#707070"/><rect x="21" y="18" width="18" height="26" rx="3" fill="#6a6a6a"/><circle cx="25" cy="13" r="4" fill="#fff" opacity="0.9"/><circle cx="25" cy="13" r="2" fill="#000"/><line x1="21" y1="24" x2="6" y2="42" stroke="#606060" stroke-width="6" stroke-linecap="round"/><line x1="39" y1="24" x2="54" y2="42" stroke="#606060" stroke-width="6" stroke-linecap="round"/><line x1="6" y1="42" x2="8" y2="56" stroke="#505050" stroke-width="5" stroke-linecap="round"/><line x1="54" y1="42" x2="52" y2="56" stroke="#505050" stroke-width="5" stroke-linecap="round"/><rect x="23" y="44" width="7" height="26" rx="3" fill="#606060"/><rect x="30" y="44" width="7" height="26" rx="3" fill="#606060"/>`,

  bd1: `<ellipse cx="30" cy="18" rx="17" ry="15" fill="#e0e0e0"/><circle cx="30" cy="18" r="11" fill="#fff"/><circle cx="30" cy="18" r="8" fill="#ff8c00"/><circle cx="30" cy="18" r="4" fill="#1a1a1a"/><circle cx="28" cy="16" r="1.5" fill="#fff" opacity="0.8"/><rect x="22" y="31" width="16" height="18" rx="4" fill="#ddd"/><line x1="22" y1="35" x2="9" y2="50" stroke="#ccc" stroke-width="5" stroke-linecap="round"/><line x1="38" y1="35" x2="51" y2="50" stroke="#ccc" stroke-width="5" stroke-linecap="round"/><line x1="25" y1="49" x2="22" y2="72" stroke="#ccc" stroke-width="5" stroke-linecap="round"/><line x1="35" y1="49" x2="38" y2="72" stroke="#ccc" stroke-width="5" stroke-linecap="round"/><line x1="22" y1="8" x2="9" y2="2" stroke="#bbb" stroke-width="3" stroke-linecap="round"/>`,

  chopper: `<ellipse cx="30" cy="14" rx="14" ry="12" fill="#f5700a"/><rect x="16" y="24" width="28" height="26" rx="6" fill="#f5700a"/><rect x="20" y="27" width="20" height="12" rx="3" fill="#fff"/><circle cx="25" cy="33" r="4" fill="#1a1a1a"/><circle cx="35" cy="33" r="4" fill="#1a1a1a"/><circle cx="25" cy="33" r="1.5" fill="#ff0000"/><circle cx="35" cy="33" r="1.5" fill="#ff0000"/><rect x="25" y="50" width="4" height="18" rx="2" fill="#d96000"/><rect x="31" y="50" width="4" height="18" rx="2" fill="#d96000"/><rect x="22" y="66" width="10" height="6" rx="2" fill="#c05000"/><rect x="28" y="66" width="10" height="6" rx="2" fill="#c05000"/><line x1="16" y1="30" x2="5" y2="26" stroke="#e06000" stroke-width="5" stroke-linecap="round"/><line x1="44" y1="30" x2="55" y2="26" stroke="#e06000" stroke-width="5" stroke-linecap="round"/>`,

  c3po: `<ellipse cx="30" cy="11" rx="13" ry="11" fill="#ffd700"/><rect x="17" y="21" width="26" height="26" rx="4" fill="#ffc800"/><circle cx="24" cy="11" r="5" fill="#cc9900"/><circle cx="36" cy="11" r="5" fill="#cc9900"/><circle cx="24" cy="11" r="2.5" fill="#111"/><circle cx="36" cy="11" r="2.5" fill="#111"/><line x1="17" y1="27" x2="4" y2="37" stroke="#ffcc00" stroke-width="6" stroke-linecap="round"/><line x1="43" y1="27" x2="56" y2="37" stroke="#ffcc00" stroke-width="6" stroke-linecap="round"/><line x1="4" y1="37" x2="6" y2="55" stroke="#ffb800" stroke-width="5" stroke-linecap="round"/><line x1="56" y1="37" x2="54" y2="55" stroke="#ffb800" stroke-width="5" stroke-linecap="round"/><rect x="22" y="47" width="7" height="24" rx="3" fill="#ffc800"/><rect x="31" y="47" width="7" height="24" rx="3" fill="#ffc800"/><rect x="21" y="28" width="18" height="5" rx="2" fill="#cc9900" opacity="0.5"/>`,

  r2d2: `<ellipse cx="30" cy="18" rx="20" ry="17" fill="#4488cc"/><ellipse cx="30" cy="18" rx="16" ry="13" fill="#eee"/><circle cx="30" cy="16" r="8" fill="#4488cc"/><circle cx="30" cy="16" r="5" fill="#aac8ee"/><circle cx="30" cy="16" r="2.5" fill="#111"/><rect x="10" y="33" width="40" height="32" rx="6" fill="#eee"/><rect x="14" y="37" width="32" height="20" rx="4" fill="#4488cc" opacity="0.2"/><circle cx="30" cy="47" r="6" fill="#4488cc"/><rect x="8" y="51" width="6" height="18" rx="3" fill="#ccc"/><rect x="46" y="51" width="6" height="18" rx="3" fill="#ccc"/><rect x="6" y="65" width="10" height="6" rx="2" fill="#aaa"/><rect x="44" y="65" width="10" height="6" rx="2" fill="#aaa"/>`,

  bb8: `<circle cx="30" cy="48" r="26" fill="#f5f0e8"/><circle cx="30" cy="48" r="26" fill="none" stroke="#ff6a00" stroke-width="5" stroke-dasharray="28 20"/><ellipse cx="30" cy="22" rx="16" ry="12" fill="#eee"/><ellipse cx="30" cy="22" rx="12" ry="9" fill="#ff6a00" opacity="0.3"/><circle cx="30" cy="20" r="6" fill="#ff6a00"/><circle cx="30" cy="20" r="3" fill="#111"/><circle cx="28" cy="18" r="1.5" fill="#fff" opacity="0.7"/><circle cx="22" cy="24" r="2" fill="#555"/>`,
};

function rollDroid() {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  let rolledRarity = 'common';
  for (const [key, r] of Object.entries(RARITY)) {
    roll -= r.weight;
    if (roll <= 0) { rolledRarity = key; break; }
  }
  const pool = DROIDS.filter(d => d.rarity === rolledRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function getCollection() {
  return db.companions.toArray();
}

async function setActiveCompanion(droidId) {
  await db.settings.put({ key: 'activeCompanion', value: droidId });
}

async function getActiveCompanion() {
  const s = await db.settings.get('activeCompanion');
  return s ? s.value : null;
}

function renderDroid(droidId, size) {
  const art  = DROID_ART[droidId];
  const droid = DROIDS.find(d => d.id === droidId);
  if (!art || !droid) return '';
  const h = Math.round(size * 80 / 60);
  return `<svg viewBox="0 0 60 80" width="${size}" height="${h}" class="droid-svg rarity-${droid.rarity}" style="--rc:${RARITY[droid.rarity].color}">${art}</svg>`;
}

function calcCreditsEarned(level) {
  return (level - 1) * CREDITS_PER_LEVEL;
}

async function calcCreditsSpent() {
  const all = await db.purchases.toArray();
  const shopSpent = all.reduce((sum, p) => {
    const item = SHOP_ITEMS.find(i => i.id === p.type);
    return sum + (item ? item.cost : 0);
  }, 0);
  const boxCount = await db.companions.count();
  const boxItem  = SHOP_ITEMS.find(i => i.id === 'droid-box');
  return shopSpent + boxCount * (boxItem?.cost ?? 0);
}

async function getCreditBalance(level) {
  return Math.max(0, calcCreditsEarned(level) - await calcCreditsSpent());
}

async function purchaseItem(itemId, balance) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item || balance < item.cost) return false;
  if (itemId === 'droid-box') {
    const droid = rollDroid();
    await db.companions.add({ droidId: droid.id, unlockedAt: Date.now() });
    return { type: 'droid-box', droid };
  }
  const record = { type: itemId, purchasedAt: Date.now() };
  if (itemId === 'xp-boost') record.expiresAt = Date.now() + DAY_MS;
  await db.purchases.add(record);
  return true;
}

// ------------------------------------------------------------------
// Date helpers
// ------------------------------------------------------------------
const DAY_MS = 86400000;

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatFullDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLabel(date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today - target) / DAY_MS);
  const full = formatFullDate(date);
  if (diffDays === 0) return { main: 'Today', sub: full, kind: 'today' };
  if (diffDays === 1) return { main: 'Yesterday', sub: full, kind: 'yesterday' };
  return { main: full, sub: '', kind: 'past' };
}

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------
let currentDate = startOfDay(new Date());

// ------------------------------------------------------------------
// DB operations
// ------------------------------------------------------------------
async function loadCompletions(date) {
  const rows = await db.completions.where('date').equals(dateKey(date)).toArray();
  const map = new Map();
  rows.forEach(r => map.set(r.exerciseId, r.done));
  return map;
}

async function toggleExercise(exerciseId, currentDone) {
  const exercise = EXERCISE_TEMPLATE.find(e => e.id === exerciseId);
  const newDone = !currentDone;
  await db.completions.put({
    date: dateKey(currentDate),
    exerciseId,
    done: newDone,
    nameSnapshot: exercise ? exercise.name : exerciseId,
    completedAt: newDone ? Date.now() : null,
  });
}

// ------------------------------------------------------------------
// Day navigation
// ------------------------------------------------------------------
function setDate(date) {
  const today = startOfDay(new Date());
  if (date > today) return; // block future dates
  currentDate = startOfDay(date);
  render();
}

// ------------------------------------------------------------------
// XP & Levels
// ------------------------------------------------------------------
const XP_PER_EXERCISE = 10;
const XP_FULL_DAY_BONUS = 25;

const LEVELS = [
  { xp: 0,    name: 'Newcomer'  },
  { xp: 100,  name: 'Trainee'   },
  { xp: 300,  name: 'Grinder'   },
  { xp: 600,  name: 'Athlete'   },
  { xp: 1000, name: 'Warrior'   },
  { xp: 1500, name: 'Champion'  },
  { xp: 2200, name: 'Elite'     },
  { xp: 3200, name: 'Legend'    },
  { xp: 4500, name: 'Immortal'  },
  { xp: 6000, name: 'G.O.A.T.'  },
];

function isDoubleXPDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const daysSinceEpoch = Math.floor(date.getTime() / 86400000);
  const weekSeed = Math.floor((daysSinceEpoch + 4) / 7);
  const doubleDay = ((weekSeed * 1234567) % 7 + 7) % 7;
  return date.getDay() === doubleDay;
}

async function calcXP() {
  const dates = await db.completions.orderBy('date').uniqueKeys();
  const boosts = await db.purchases.where('type').equals('xp-boost').toArray();
  let xp = 0;
  for (const date of dates) {
    const dayDone = await db.completions.where('date').equals(date).filter(r => r.done === true).count();
    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d).getTime();
    const dayEnd = dayStart + DAY_MS;
    let multiplier = 1;
    if (isDoubleXPDay(date)) multiplier *= 2;
    if (boosts.some(b => b.purchasedAt < dayEnd && (b.expiresAt ?? 0) > dayStart)) multiplier *= 2;
    xp += dayDone * XP_PER_EXERCISE * multiplier;
    if (dayDone >= EXERCISE_TEMPLATE.length) xp += XP_FULL_DAY_BONUS * multiplier;
  }
  return xp;
}

function calcLevelInfo(xp) {
  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) levelIndex = i;
  }
  const current = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const prevXP = current.xp;
  const nextXP = next ? next.xp : null;
  const xpIntoLevel = xp - prevXP;
  const xpNeeded = nextXP !== null ? nextXP - prevXP : null;
  const pct = xpNeeded !== null ? Math.min(100, (xpIntoLevel / xpNeeded) * 100) : 100;
  return { level: levelIndex + 1, name: current.name, xpIntoLevel, xpNeeded, pct };
}

// ------------------------------------------------------------------
// Streak
// ------------------------------------------------------------------
async function calcStreak() {
  const today = startOfDay(new Date());
  const allFreezes = await db.purchases.where('type').equals('streak-freeze').toArray();
  const usedDates = new Set(allFreezes.filter(f => f.usedForDate).map(f => f.usedForDate));
  const unusedFreezes = allFreezes.filter(f => !f.usedForDate);

  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const key = dateKey(checkDate);
    const count = await db.completions.where('date').equals(key).filter(r => r.done === true).count();
    if (count > 0) {
      streak++;
    } else if (i === 0) {
      // today empty — check yesterday
    } else if (usedDates.has(key)) {
      streak++; // gap already bridged by a previously consumed freeze
    } else if (unusedFreezes.length > 0) {
      const freeze = unusedFreezes.shift();
      await db.purchases.update(freeze.id, { usedForDate: key });
      usedDates.add(key);
      streak++;
    } else {
      break;
    }
    checkDate = addDays(checkDate, -1);
  }

  return streak;
}

// ------------------------------------------------------------------
// Shop UI
// ------------------------------------------------------------------
async function renderShop(balance) {
  const listEl = document.getElementById('shop-items-list');
  const invEl  = document.getElementById('shop-inventory');
  if (!listEl) return;

  const now = Date.now();
  const allPurchases = await db.purchases.toArray();
  const activeBoost = allPurchases
    .filter(p => p.type === 'xp-boost' && (p.expiresAt ?? 0) > now)
    .sort((a, b) => b.expiresAt - a.expiresAt)[0];
  const unusedFreezes = allPurchases.filter(p => p.type === 'streak-freeze' && !p.usedForDate).length;

  let itemsHtml = '';
  for (const item of SHOP_ITEMS) {
    const canAfford = balance >= item.cost;
    let tag = '';
    let disabled = !canAfford;
    if (item.id === 'xp-boost' && activeBoost) {
      tag = `${Math.max(1, Math.ceil((activeBoost.expiresAt - now) / 3600000))}h left`;
      disabled = true;
    }
    if (item.id === 'streak-freeze' && unusedFreezes > 0) tag = `${unusedFreezes} owned`;
    itemsHtml += `
      <div class="shop-item">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-item-detail">${item.detail}</div>
          ${tag ? `<div class="shop-item-tag">${tag}</div>` : ''}
        </div>
        <button class="shop-buy-btn" data-item="${item.id}" ${disabled ? 'disabled' : ''}>◆ ${item.cost}</button>
      </div>`;
  }
  listEl.innerHTML = itemsHtml;

  listEl.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await purchaseItem(btn.dataset.item, balance);
      if (!result) return;
      if (result.type === 'droid-box') {
        showDroidReveal(result.droid);
      }
      await render();
      const newXP = await calcXP();
      const lv = calcLevelInfo(newXP);
      const newBal = await getCreditBalance(lv.level);
      const balEl = document.getElementById('shop-bal-display');
      if (balEl) balEl.textContent = newBal;
      await renderShop(newBal);
    });
  });

  const invItems = [];
  if (activeBoost) invItems.push(`⚡ XP Boost — ${Math.max(1, Math.ceil((activeBoost.expiresAt - now) / 3600000))}h remaining`);
  if (unusedFreezes > 0) invItems.push(`🧊 ${unusedFreezes} streak freeze${unusedFreezes > 1 ? 's' : ''} ready`);
  invEl.innerHTML = invItems.length
    ? `<div class="shop-inv-title">Your inventory</div>` + invItems.map(i => `<div class="shop-inv-row">${i}</div>`).join('')
    : '';

  // Collection grid
  const collEl = document.getElementById('shop-collection');
  if (!collEl) return;
  const owned = await getCollection();
  const ownedIds = new Set(owned.map(c => c.droidId));
  const activeDroidId = await getActiveCompanion();
  let collHtml = `<div class="shop-inv-title" style="margin-top:20px">Droid Collection (${ownedIds.size}/${DROIDS.length})</div><div class="droid-grid">`;
  for (const droid of DROIDS) {
    const isOwned  = ownedIds.has(droid.id);
    const isActive = droid.id === activeDroidId;
    const r = RARITY[droid.rarity];
    collHtml += `<div class="droid-cell${isOwned ? ' owned' : ' locked'}${isActive ? ' active' : ''}" data-droid="${droid.id}" title="${droid.name}" style="--rc:${r.color}">`;
    if (isOwned) {
      collHtml += renderDroid(droid.id, 44);
      if (isActive) collHtml += `<div class="droid-active-pip"></div>`;
    } else {
      collHtml += `<div class="droid-lock">?</div>`;
    }
    collHtml += `<div class="droid-rarity-dot" style="background:${r.color}"></div>`;
    collHtml += `</div>`;
  }
  collHtml += `</div>`;
  collEl.innerHTML = collHtml;

  collEl.querySelectorAll('.droid-cell.owned').forEach(cell => {
    cell.addEventListener('click', async () => {
      const droidId = cell.dataset.droid;
      await setActiveCompanion(droidId);
      await render();
      await renderShop(balance);
    });
  });
}

function showDroidReveal(droid) {
  const r = RARITY[droid.rarity];
  const existing = document.getElementById('droid-reveal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'droid-reveal';
  el.className = 'droid-reveal';
  el.innerHTML = `
    <div class="droid-reveal-box" style="--rc:${r.color}">
      <div class="droid-reveal-rarity">${r.label}</div>
      <div class="droid-reveal-art">${renderDroid(droid.id, 80)}</div>
      <div class="droid-reveal-name">${droid.name}</div>
      <div class="droid-reveal-quote">"${droid.quote}"</div>
      <button class="droid-reveal-close">Set as companion</button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('.droid-reveal-close').addEventListener('click', async () => {
    await setActiveCompanion(droid.id);
    await render();
    el.remove();
  });
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
}

async function openShop() {
  const overlay = document.getElementById('shop-overlay');
  if (!overlay) return;
  const xp = await calcXP();
  const lv = calcLevelInfo(xp);
  const bal = await getCreditBalance(lv.level);
  const balEl = document.getElementById('shop-bal-display');
  if (balEl) balEl.textContent = bal;
  overlay.removeAttribute('hidden');
  requestAnimationFrame(() => overlay.classList.add('open'));
  await renderShop(bal);
}

function closeShop() {
  const overlay = document.getElementById('shop-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.setAttribute('hidden', ''), 300);
}

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
async function render() {
  const today = startOfDay(new Date());
  const label = formatDateLabel(currentDate);

  const mainLabel = document.getElementById('day-label-main');
  const subLabel = document.getElementById('day-label-sub');
  const btnNext = document.getElementById('btn-next');
  if (mainLabel) mainLabel.textContent = label.main;
  if (subLabel) subLabel.textContent = label.sub;
  if (btnNext) btnNext.disabled = isSameDay(currentDate, today);

  const main = document.getElementById('main');
  const [completions, streak, totalXP] = await Promise.all([loadCompletions(currentDate), calcStreak(), calcXP()]);
  const lv = calcLevelInfo(totalXP);
  const [balance, activeBoost] = await Promise.all([
    getCreditBalance(lv.level),
    db.purchases.where('type').equals('xp-boost').filter(p => (p.expiresAt ?? 0) > Date.now()).first(),
  ]);

  const badge = document.getElementById('streak-badge');
  const countEl = document.getElementById('streak-count');
  if (badge && countEl) {
    countEl.textContent = streak;
    badge.hidden = streak === 0;
  }
  const creditsEl = document.getElementById('header-credits');
  if (creditsEl) creditsEl.textContent = balance;

  // Companion widget
  const activeDroidId = await getActiveCompanion();
  const widget = document.getElementById('companion-widget');
  const widgetArt = document.getElementById('companion-art');
  if (widget && widgetArt) {
    if (activeDroidId) {
      widgetArt.innerHTML = renderDroid(activeDroidId, 58);
      widget.hidden = false;
    } else {
      widget.hidden = true;
    }
  }

  const groups = [];
  for (const time of TIME_ORDER) {
    for (const category of CATEGORY_ORDER) {
      const items = EXERCISE_TEMPLATE.filter(e => e.time === time && e.category === category);
      if (items.length > 0) groups.push({ time, category, items });
    }
  }

  const totalDone = EXERCISE_TEMPLATE.filter(e => completions.get(e.id) === true).length;
  const total = EXERCISE_TEMPLATE.length;
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0;
  const complete = totalDone === total && total > 0;

  const xpLabel = lv.xpNeeded !== null ? `${lv.xpIntoLevel} / ${lv.xpNeeded} XP` : `MAX`;
  const doubleToday = isDoubleXPDay(dateKey(currentDate));
  const anybanner = doubleToday || activeBoost;

  let html = `<div class="xp-card${anybanner ? ' xp-double-active' : ''}">`;
  if (doubleToday && activeBoost) {
    html += `<div class="xp-double-banner">⚡ 4× XP — Double Day + Boost!</div>`;
  } else if (doubleToday) {
    html += `<div class="xp-double-banner">⚡ Double XP Day!</div>`;
  } else if (activeBoost) {
    html += `<div class="xp-double-banner">⚡ XP Boost Active!</div>`;
  }
  html += `<div class="xp-card-row">`;
  html += `<span class="xp-level">Lv.${lv.level} <span class="xp-name">${lv.name}</span></span>`;
  html += `<span class="xp-amount">${xpLabel}</span>`;
  html += `</div>`;
  html += `<div class="xp-bar-track"><div class="xp-bar-fill" style="width:0"></div></div>`;
  html += `</div>`;

  html += `<div class="day-progress">`;
  html += `<div class="ring${complete ? ' complete' : ''}" style="--pct:${pct}">`;
  html += `<div class="ring-inner"><b>${totalDone}<i>/${total}</i></b><span class="ring-cap">done</span></div>`;
  html += `</div></div>`;

  for (const group of groups) {
    const doneInGroup = group.items.filter(e => completions.get(e.id) === true).length;
    html += `<section class="group">`;
    html += `<h2 class="group-header">`;
    html += `<span class="group-time">${group.time}</span>`;
    html += `<span class="group-category">${group.category}</span>`;
    html += `<span class="group-progress">${doneInGroup}/${group.items.length}</span>`;
    html += `</h2>`;
    html += `<ul class="exercise-list">`;
    for (const ex of group.items) {
      const done = completions.get(ex.id) === true;
      html += `<li class="exercise-row${done ? ' done' : ''}" data-id="${ex.id}" data-done="${done}">`;
      html += `<span class="checkbox">${done ? '&#10003;' : ''}</span>`;
      html += `<span class="exercise-info">`;
      html += `<span class="exercise-name">${ex.name}</span>`;
      if (ex.detail) html += `<span class="exercise-detail">${ex.detail}</span>`;
      html += `</span>`;
      html += `</li>`;
    }
    html += `</ul></section>`;
  }

  main.innerHTML = html;

  requestAnimationFrame(() => {
    const bar = main.querySelector('.xp-bar-fill');
    if (bar) bar.style.width = `${lv.pct}%`;
  });

  main.querySelectorAll('.exercise-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = row.dataset.id;
      const done = row.dataset.done === 'true';
      const newDone = !done;
      // Optimistic update
      row.classList.toggle('done', newDone);
      row.dataset.done = String(newDone);
      const checkbox = row.querySelector('.checkbox');
      if (checkbox) checkbox.innerHTML = newDone ? '&#10003;' : '';
      try {
        await toggleExercise(id, done);
        await render();
      } catch (err) {
        // Revert on write failure
        row.classList.toggle('done', done);
        row.dataset.done = String(done);
        if (checkbox) checkbox.innerHTML = done ? '&#10003;' : '';
        console.error('Toggle failed', err);
      }
    });
  });
}

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
async function init() {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const main = document.getElementById('main');

  btnPrev.addEventListener('click', () => setDate(addDays(currentDate, -1)));
  btnNext.addEventListener('click', () => setDate(addDays(currentDate, 1)));

  document.getElementById('shop-btn').addEventListener('click', openShop);
  document.getElementById('shop-close').addEventListener('click', closeShop);
  document.getElementById('shop-backdrop').addEventListener('click', closeShop);

  const widget = document.getElementById('companion-widget');
  const bubble = document.getElementById('companion-bubble');
  if (widget && bubble) {
    widget.addEventListener('click', async () => {
      const droidId = await getActiveCompanion();
      const droid = DROIDS.find(d => d.id === droidId);
      if (!droid) return;
      bubble.textContent = droid.quote;
      bubble.hidden = false;
      clearTimeout(widget._bubbleTimer);
      widget._bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4000);
    });
  }

  // Swipe left/right to change day. Don't preventDefault so vertical scroll stays intact.
  let swipeStartX = 0;
  let swipeStartY = 0;
  main.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
  }, { passive: true });
  main.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    if (Math.abs(dx) <= 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    if (dx > 0) {
      setDate(addDays(currentDate, -1));
    } else {
      setDate(addDays(currentDate, 1)); // setDate blocks future dates internally
    }
  }, { passive: true });

  await render();
}

init();
