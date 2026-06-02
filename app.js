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
  // Mouse Droid: low wedge-shaped box, twin red sensor eyes, wheels — scurries around
  mouse: `<rect x="7" y="48" width="46" height="20" rx="4" fill="#252930"/><rect x="11" y="38" width="38" height="13" rx="3" fill="#1c2026"/><rect x="15" y="33" width="30" height="8" rx="3" fill="#181c22"/><circle cx="21" cy="43" r="4.5" fill="#bb1100"/><circle cx="21" cy="43" r="2" fill="#ff4422"/><circle cx="41" cy="43" r="4.5" fill="#bb1100"/><circle cx="41" cy="43" r="2" fill="#ff4422"/><line x1="11" y1="54" x2="49" y2="54" stroke="#111" stroke-width="1.5" opacity="0.4"/><ellipse cx="15" cy="68" rx="5" ry="4" fill="#0d1014"/><ellipse cx="30" cy="70" rx="5" ry="4" fill="#0d1014"/><ellipse cx="45" cy="68" rx="5" ry="4" fill="#0d1014"/>`,

  // GNK Power Droid: boxy body, horizontal vents, wide stubby legs
  gonk: `<rect x="13" y="13" width="34" height="45" rx="5" fill="#5c4a2a"/><ellipse cx="30" cy="13" rx="15" ry="6" fill="#6a5534"/><rect x="15" y="20" width="30" height="3" rx="1" fill="#3a2808"/><rect x="15" y="27" width="30" height="3" rx="1" fill="#3a2808"/><rect x="15" y="34" width="30" height="3" rx="1" fill="#3a2808"/><rect x="15" y="41" width="30" height="3" rx="1" fill="#3a2808"/><rect x="13" y="58" width="14" height="18" rx="3" fill="#4a3820"/><rect x="33" y="58" width="14" height="18" rx="3" fill="#4a3820"/><rect x="10" y="72" width="20" height="7" rx="2" fill="#3a2810"/><rect x="30" y="72" width="20" height="7" rx="2" fill="#3a2810"/>`,

  // B1 Battle Droid: rounded rectangular head, huge dark eye sockets, ultra-thin neck,
  // segmented arms+legs with visible elbow/knee joints, prominent backpack
  b1: `<ellipse cx="30" cy="9" rx="11" ry="8" fill="#c8b87a"/><circle cx="24" cy="9" r="4" fill="#1a0800"/><circle cx="36" cy="9" r="4" fill="#1a0800"/><circle cx="24" cy="9" r="2" fill="#770000" opacity="0.9"/><circle cx="36" cy="9" r="2" fill="#770000" opacity="0.9"/><rect x="28.5" y="16" width="3" height="10" rx="1" fill="#b8a860"/><rect x="23" y="26" width="14" height="11" rx="2" fill="#c4b475"/><rect x="36" y="24" width="9" height="12" rx="2" fill="#b0a060"/><rect x="37" y="25" width="7" height="3" rx="1" fill="#9a8a50" opacity="0.6"/><line x1="23" y1="30" x2="13" y2="42" stroke="#c0b070" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="42" r="2.5" fill="#b0a060"/><line x1="13" y1="42" x2="4" y2="53" stroke="#c0b070" stroke-width="3" stroke-linecap="round"/><line x1="37" y1="30" x2="47" y2="41" stroke="#c0b070" stroke-width="3" stroke-linecap="round"/><circle cx="47" cy="41" r="2.5" fill="#b0a060"/><line x1="47" y1="41" x2="55" y2="51" stroke="#c0b070" stroke-width="3" stroke-linecap="round"/><line x1="27" y1="37" x2="25" y2="52" stroke="#c0b070" stroke-width="3.5" stroke-linecap="round"/><circle cx="25" cy="52" r="2.5" fill="#b0a060"/><line x1="25" y1="52" x2="23" y2="67" stroke="#c0b070" stroke-width="3.5" stroke-linecap="round"/><line x1="33" y1="37" x2="35" y2="52" stroke="#c0b070" stroke-width="3.5" stroke-linecap="round"/><circle cx="35" cy="52" r="2.5" fill="#b0a060"/><line x1="35" y1="52" x2="37" y2="67" stroke="#c0b070" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="23" cy="69" rx="5.5" ry="3" fill="#a89840"/><ellipse cx="37" cy="69" rx="5.5" ry="3" fill="#a89840"/>`,

  // Super Battle Droid: massive, no neck, glowing blue photoreceptors, cannon arm
  superb2: `<ellipse cx="30" cy="28" rx="19" ry="22" fill="#4a5060"/><ellipse cx="30" cy="18" rx="14" ry="13" fill="#555a6a"/><ellipse cx="21" cy="19" rx="6" ry="5.5" fill="#1a2a4a"/><circle cx="21" cy="19" r="3.5" fill="#2266cc"/><circle cx="21" cy="19" r="1.8" fill="#88ccff"/><ellipse cx="39" cy="19" rx="6" ry="5.5" fill="#1a2a4a"/><circle cx="39" cy="19" r="3.5" fill="#2266cc"/><circle cx="39" cy="19" r="1.8" fill="#88ccff"/><rect x="12" y="40" width="36" height="14" rx="3" fill="#3a4050"/><rect x="1" y="30" width="12" height="8" rx="2" fill="#3a4050"/><rect x="47" y="28" width="13" height="8" rx="2" fill="#3a4050"/><circle cx="59" cy="32" r="3.5" fill="#111"/><rect x="18" y="54" width="11" height="22" rx="3" fill="#3a4050"/><rect x="31" y="54" width="11" height="22" rx="3" fill="#3a4050"/><rect x="14" y="73" width="18" height="5" rx="2" fill="#2a3040"/><rect x="28" y="73" width="18" height="5" rx="2" fill="#2a3040"/>`,

  // R7 Astromech: red dome, white/grey cylindrical body, three legs
  r7: `<ellipse cx="30" cy="19" rx="19" ry="17" fill="#cc2200"/><ellipse cx="30" cy="19" rx="15" ry="13" fill="#aa1a00"/><ellipse cx="30" cy="19" rx="11" ry="9" fill="#eeeeee"/><circle cx="30" cy="17" r="7" fill="#cc2200"/><circle cx="30" cy="17" r="4.5" fill="#fefefe" opacity="0.85"/><circle cx="30" cy="17" r="2.5" fill="#cc2200"/><rect x="11" y="33" width="38" height="30" rx="6" fill="#dddddd"/><rect x="15" y="37" width="30" height="20" rx="4" fill="#cc2200" opacity="0.18"/><circle cx="30" cy="47" r="6" fill="#cc2200"/><circle cx="30" cy="47" r="3.5" fill="#fefefe"/><rect x="9" y="51" width="7" height="22" rx="3" fill="#bbbbbb"/><rect x="44" y="51" width="7" height="22" rx="3" fill="#bbbbbb"/><rect x="25" y="63" width="10" height="16" rx="3" fill="#cc2200"/>`,

  // A7 Medical Droid: white spherical head, blue eye, four outstretched arms
  a7: `<circle cx="30" cy="14" r="12" fill="#cccccc"/><circle cx="30" cy="14" r="8" fill="#aaaaaa"/><circle cx="30" cy="14" r="4" fill="#0088ff" opacity="0.85"/><circle cx="30" cy="14" r="2" fill="#222"/><rect x="22" y="24" width="16" height="22" rx="3" fill="#bbbbbb"/><line x1="22" y1="27" x2="5" y2="19" stroke="#aaa" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="27" x2="55" y2="19" stroke="#aaa" stroke-width="4" stroke-linecap="round"/><line x1="22" y1="36" x2="5" y2="38" stroke="#aaa" stroke-width="3.5" stroke-linecap="round"/><line x1="38" y1="36" x2="55" y2="38" stroke="#aaa" stroke-width="3.5" stroke-linecap="round"/><circle cx="5" cy="19" r="4.5" fill="#888"/><circle cx="55" cy="19" r="4.5" fill="#888"/><circle cx="5" cy="38" r="3.5" fill="#888"/><circle cx="55" cy="38" r="3.5" fill="#888"/><rect x="24" y="46" width="6" height="24" rx="3" fill="#aaa"/><rect x="30" y="46" width="6" height="24" rx="3" fill="#aaa"/>`,

  // 2-1B Surgical Droid: thin silver, large single lens eye, long arms
  medical: `<ellipse cx="30" cy="12" rx="12" ry="11" fill="#aaaaaa"/><circle cx="30" cy="12" r="7" fill="#888"/><circle cx="30" cy="12" r="4.5" fill="#222"/><circle cx="28" cy="10" r="1.5" fill="#fff" opacity="0.7"/><rect x="26" y="21" width="8" height="5" rx="1" fill="#999"/><rect x="20" y="26" width="20" height="22" rx="4" fill="#999"/><line x1="20" y1="31" x2="3" y2="22" stroke="#888" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="31" x2="57" y2="22" stroke="#888" stroke-width="3.5" stroke-linecap="round"/><circle cx="3" cy="22" r="4" fill="#666"/><circle cx="57" cy="22" r="4" fill="#666"/><rect x="24" y="48" width="6" height="26" rx="3" fill="#888"/><rect x="30" y="48" width="6" height="26" rx="3" fill="#888"/>`,

  // B2EMO (Andor): chunky dark teal box, massive glowing single lens eye, tank treads
  b2emo: `<rect x="8" y="20" width="44" height="40" rx="6" fill="#1e3030"/><rect x="10" y="14" width="40" height="10" rx="4" fill="#162828"/><ellipse cx="30" cy="33" rx="16" ry="14" fill="#0e2020"/><circle cx="30" cy="33" r="12" fill="#081818"/><circle cx="30" cy="33" r="8" fill="#006666" opacity="0.9"/><circle cx="30" cy="33" r="5" fill="#00aaaa"/><circle cx="30" cy="33" r="2.5" fill="#aaffff" opacity="0.85"/><circle cx="28" cy="31" r="1" fill="#fff" opacity="0.6"/><rect x="10" y="60" width="12" height="8" rx="2" fill="#0e2020"/><rect x="24" y="60" width="12" height="8" rx="2" fill="#0e2020"/><rect x="38" y="60" width="12" height="8" rx="2" fill="#0e2020"/><rect x="7" y="65" width="17" height="6" rx="2" fill="#080e0e"/><rect x="22" y="65" width="16" height="6" rx="2" fill="#080e0e"/><rect x="36" y="65" width="17" height="6" rx="2" fill="#080e0e"/>`,

  // Probe Droid: dark sphere, red targeting eye, multiple sensor stalks
  spybot: `<circle cx="30" cy="36" r="24" fill="#0e0e0e"/><circle cx="30" cy="36" r="20" fill="#1a1a1a"/><circle cx="30" cy="36" r="9" fill="#cc0000"/><circle cx="30" cy="36" r="6" fill="#ff2200"/><circle cx="30" cy="36" r="3" fill="#ff9900"/><circle cx="28" cy="34" r="1.2" fill="#fff" opacity="0.5"/><line x1="30" y1="16" x2="30" y2="4" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="3" r="3.5" fill="#222"/><circle cx="30" cy="3" r="1.5" fill="#ff2200"/><line x1="16" y1="25" x2="7" y2="15" stroke="#282828" stroke-width="2" stroke-linecap="round"/><circle cx="6" cy="14" r="2" fill="#1a1a1a"/><line x1="44" y1="25" x2="53" y2="15" stroke="#282828" stroke-width="2" stroke-linecap="round"/><circle cx="54" cy="14" r="2" fill="#1a1a1a"/><line x1="12" y1="44" x2="4" y2="54" stroke="#222" stroke-width="2" stroke-linecap="round"/><line x1="48" y1="44" x2="56" y2="54" stroke="#222" stroke-width="2" stroke-linecap="round"/>`,

  // Two Tubes: helmeted Partisan, vivid green breathing tubes
  twotubes: `<ellipse cx="30" cy="13" rx="14" ry="12" fill="#3a4a4a"/><rect x="21" y="21" width="18" height="24" rx="3" fill="#2e3e3e"/><circle cx="24" cy="13" r="4" fill="#4a6060" opacity="0.8"/><circle cx="36" cy="13" r="4" fill="#4a6060" opacity="0.8"/><rect x="22" y="19" width="16" height="6" rx="2" fill="#202c2c"/><line x1="22" y1="21" x2="7" y2="37" stroke="#1a7a1a" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="21" x2="53" y2="37" stroke="#1a7a1a" stroke-width="4" stroke-linecap="round"/><circle cx="7" cy="38" r="5" fill="#0e5e0e"/><circle cx="53" cy="38" r="5" fill="#0e5e0e"/><rect x="23" y="45" width="7" height="24" rx="3" fill="#2e3e3e"/><rect x="30" y="45" width="7" height="24" rx="3" fill="#2e3e3e"/>`,

  // K-2SO: tall Imperial enforcer droid, elongated head, single white photoreceptor
  k2so: `<ellipse cx="30" cy="8" rx="10" ry="8" fill="#717176"/><rect x="20" y="8" width="20" height="10" rx="2" fill="#747478"/><circle cx="26" cy="11" r="5.5" fill="#f0f0f0" opacity="0.95"/><circle cx="26" cy="11" r="3" fill="#000"/><circle cx="25" cy="10" r="1.2" fill="#fff" opacity="0.7"/><rect x="22" y="18" width="16" height="5" rx="2" fill="#6a6a6e"/><rect x="13" y="23" width="34" height="18" rx="3" fill="#717176"/><rect x="17" y="26" width="26" height="3" rx="1" fill="#5a5a5e" opacity="0.45"/><rect x="18" y="41" width="24" height="12" rx="2" fill="#6a6a6e"/><line x1="13" y1="28" x2="2" y2="46" stroke="#696970" stroke-width="5.5" stroke-linecap="round"/><line x1="47" y1="28" x2="58" y2="46" stroke="#696970" stroke-width="5.5" stroke-linecap="round"/><line x1="2" y1="46" x2="4" y2="58" stroke="#5a5a60" stroke-width="5" stroke-linecap="round"/><line x1="58" y1="46" x2="56" y2="58" stroke="#5a5a60" stroke-width="5" stroke-linecap="round"/><rect x="21" y="53" width="7" height="25" rx="3" fill="#646468"/><rect x="32" y="53" width="7" height="25" rx="3" fill="#646468"/><rect x="18" y="75" width="12" height="4" rx="2" fill="#50505a"/><rect x="30" y="75" width="12" height="4" rx="2" fill="#50505a"/>`,

  // BD-1: small scout droid, huge orange eye, long hop legs (Jedi: Fallen Order)
  bd1: `<ellipse cx="30" cy="18" rx="18" ry="16" fill="#e8e0d0"/><circle cx="30" cy="18" r="13" fill="#f0ead8"/><circle cx="30" cy="18" r="9.5" fill="#ff8c00"/><circle cx="30" cy="18" r="6.5" fill="#222"/><circle cx="30" cy="18" r="3.5" fill="#ff8c00" opacity="0.5"/><circle cx="28" cy="16" r="1.5" fill="#fff" opacity="0.8"/><rect x="23" y="32" width="14" height="16" rx="4" fill="#ddd8c8"/><line x1="23" y1="38" x2="9" y2="52" stroke="#ccc8b8" stroke-width="5" stroke-linecap="round"/><line x1="37" y1="38" x2="51" y2="52" stroke="#ccc8b8" stroke-width="5" stroke-linecap="round"/><line x1="26" y1="48" x2="23" y2="72" stroke="#ccc8b8" stroke-width="5" stroke-linecap="round"/><line x1="34" y1="48" x2="37" y2="72" stroke="#ccc8b8" stroke-width="5" stroke-linecap="round"/><line x1="22" y1="9" x2="8" y2="3" stroke="#bbb8a8" stroke-width="3" stroke-linecap="round"/>`,

  // Chopper (C1-10P): squat orange astromech, angry red eyes, spark elements on arms
  chopper: `<ellipse cx="30" cy="14" rx="16" ry="13" fill="#f07010"/><ellipse cx="30" cy="14" rx="12" ry="9" fill="#e86808"/><circle cx="22" cy="16" r="5" fill="#111"/><circle cx="38" cy="16" r="5" fill="#111"/><circle cx="22" cy="16" r="2.5" fill="#dd0000"/><circle cx="38" cy="16" r="2.5" fill="#dd0000"/><rect x="15" y="25" width="30" height="28" rx="6" fill="#f07010"/><rect x="18" y="28" width="24" height="12" rx="3" fill="#fff" opacity="0.12"/><rect x="20" y="30" width="9" height="7" rx="1" fill="#cc5500"/><rect x="31" y="30" width="9" height="7" rx="1" fill="#cc5500"/><rect x="24" y="53" width="5" height="20" rx="2" fill="#d06010"/><rect x="31" y="53" width="5" height="20" rx="2" fill="#d06010"/><line x1="15" y1="31" x2="4" y2="27" stroke="#e06010" stroke-width="5.5" stroke-linecap="round"/><line x1="45" y1="31" x2="56" y2="27" stroke="#e06010" stroke-width="5.5" stroke-linecap="round"/><rect x="20" y="70" width="8" height="6" rx="2" fill="#c05000"/><rect x="32" y="70" width="8" height="6" rx="2" fill="#c05000"/><circle class="spark1" cx="4" cy="24" r="2.5" fill="#ffee44"/><circle class="spark2" cx="56" cy="24" r="2.5" fill="#ffbb22"/><line class="spark3" x1="2" y1="21" x2="7" y2="17" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`,

  // C-3PO: gold humanoid protocol droid, large round eyes, segmented torso
  c3po: `<ellipse cx="30" cy="11" rx="13" ry="11" fill="#ffd700"/><circle cx="23" cy="11" r="5.5" fill="#cc9900"/><circle cx="37" cy="11" r="5.5" fill="#cc9900"/><circle cx="23" cy="11" r="3" fill="#111"/><circle cx="37" cy="11" r="3" fill="#111"/><circle cx="22" cy="10" r="1.2" fill="#fff" opacity="0.7"/><circle cx="36" cy="10" r="1.2" fill="#fff" opacity="0.7"/><rect x="18" y="21" width="24" height="26" rx="4" fill="#ffc800"/><rect x="21" y="24" width="18" height="5" rx="2" fill="#cc9900" opacity="0.5"/><rect x="20" y="32" width="20" height="3" rx="1" fill="#cc9900" opacity="0.4"/><line x1="18" y1="27" x2="3" y2="38" stroke="#ffcc00" stroke-width="5.5" stroke-linecap="round"/><line x1="42" y1="27" x2="57" y2="38" stroke="#ffcc00" stroke-width="5.5" stroke-linecap="round"/><line x1="3" y1="38" x2="5" y2="57" stroke="#ffb800" stroke-width="5" stroke-linecap="round"/><line x1="57" y1="38" x2="55" y2="57" stroke="#ffb800" stroke-width="5" stroke-linecap="round"/><rect x="22" y="47" width="7" height="24" rx="3" fill="#ffc800"/><rect x="31" y="47" width="7" height="24" rx="3" fill="#ffc800"/>`,

  // R2-D2: blue/white astromech, dome with blue panels, cylindrical body, three legs
  r2d2: `<ellipse cx="30" cy="18" rx="20" ry="17" fill="#e8eef4"/><ellipse cx="30" cy="18" rx="16" ry="13" fill="#4488cc"/><ellipse cx="30" cy="18" rx="12" ry="9" fill="#e8eef4"/><circle cx="30" cy="16" r="8.5" fill="#4488cc"/><circle cx="30" cy="16" r="5.5" fill="#aaccee"/><circle cx="30" cy="16" r="2.5" fill="#111"/><circle cx="29" cy="15" r="1" fill="#fff" opacity="0.8"/><rect x="10" y="33" width="40" height="30" rx="6" fill="#e8eef4"/><rect x="14" y="37" width="32" height="20" rx="4" fill="#4488cc" opacity="0.22"/><circle cx="30" cy="47" r="6.5" fill="#4488cc"/><circle cx="30" cy="47" r="3.5" fill="#aaccee"/><rect x="18" y="37" width="8" height="5" rx="2" fill="#4488cc"/><rect x="34" y="37" width="8" height="5" rx="2" fill="#4488cc"/><rect x="8" y="52" width="7" height="20" rx="3" fill="#d0d8e4"/><rect x="45" y="52" width="7" height="20" rx="3" fill="#d0d8e4"/><rect x="24" y="63" width="12" height="17" rx="3" fill="#4488cc"/>`,

  // BB-8: orange/white sphere, small domed head, orange stripe markings
  bb8: `<circle cx="30" cy="50" r="26" fill="#f5f0e8"/><path d="M4,50 a26,26 0 0 1 52,0" fill="#ff6a00" opacity="0.35"/><path d="M5,44 Q30,37 55,44" stroke="#ff6a00" stroke-width="3.5" fill="none"/><path d="M5,56 Q30,63 55,56" stroke="#ff6a00" stroke-width="3.5" fill="none"/><circle cx="30" cy="50" r="9" fill="#ff6a00"/><circle cx="30" cy="50" r="6" fill="#cc4400"/><circle cx="30" cy="50" r="3" fill="#111"/><ellipse cx="30" cy="24" rx="17" ry="12" fill="#eeeeee"/><ellipse cx="30" cy="22" rx="12" ry="8" fill="#ff6a00" opacity="0.3"/><circle cx="30" cy="20" r="7" fill="#ff6a00"/><circle cx="30" cy="20" r="4" fill="#111"/><circle cx="28" cy="18" r="1.5" fill="#fff" opacity="0.7"/><circle cx="22" cy="27" r="2.5" fill="#555"/>`,
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
  return `<svg viewBox="0 0 60 80" width="${size}" height="${h}" class="droid-svg rarity-${droid.rarity} droid-id-${droid.id}" style="--rc:${RARITY[droid.rarity].color}">${art}</svg>`;
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
  const dev = await db.settings.get('dev-bonus-credits');
  const bonus = dev?.value ?? 0;
  return Math.max(0, calcCreditsEarned(level) + bonus - await calcCreditsSpent());
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
      const companionSize = activeDroidId === 'k2so' ? 108 : 78;
      widgetArt.innerHTML = renderDroid(activeDroidId, companionSize);
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
  // Dev: tap the footer version number 5 times to set bonus testing credits.
  const versionEl = document.getElementById('version');
  if (versionEl) {
    let taps = 0;
    let tapTimer = null;
    versionEl.addEventListener('click', async () => {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 800);
      if (taps < 5) return;
      taps = 0;
      const current = (await db.settings.get('dev-bonus-credits'))?.value ?? 0;
      const input = prompt('Set bonus testing credits (0 to clear):', current);
      if (input === null) return;
      const n = parseInt(input, 10) || 0;
      if (n > 0) await db.settings.put({ key: 'dev-bonus-credits', value: n });
      else await db.settings.delete('dev-bonus-credits');
      await render();
    });
  }

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
