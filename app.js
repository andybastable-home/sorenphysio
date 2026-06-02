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
  { id:'mouse',    name:'Mouse Droid',        rarity:'common'    },
  { id:'gonk',     name:'Gonk Droid',         rarity:'common'    },
  { id:'b1',       name:'B1 Battle Droid',    rarity:'common'    },
  { id:'superb2',  name:'Super Battle Droid', rarity:'rare'      },
  { id:'r7',       name:'R7 Astromech',       rarity:'rare'      },
  { id:'medical',  name:'2-1B Surgical',      rarity:'rare'      },
  { id:'b2emo',    name:'B2EMO',              rarity:'epic'      },
  { id:'spybot',   name:'Spy Probe Droid',    rarity:'epic'      },
  { id:'twotubes', name:'Two-Boots',          rarity:'epic'      },
  { id:'k2so',     name:'K-2SO',              rarity:'mythic'    },
  { id:'bd1',      name:'BD-1',               rarity:'mythic'    },
  { id:'chopper',  name:'Chopper',            rarity:'mythic'    },
  { id:'c3po',     name:'C-3PO',              rarity:'legendary' },
  { id:'r2d2',     name:'R2-D2',              rarity:'legendary' },
  { id:'bb8',      name:'BB-8',               rarity:'legendary' },
];

const DROID_ART = {
  // Mouse Droid (MSE-6): low dark wedge box, chrome skirt, antenna combs, red sensors, wheels
  mouse: `<polygon points="9,62 9,54 24,45 53,42 53,62" fill="#2b2f36"/><polygon points="24,45 53,42 53,49 24,52" fill="#23252b"/><rect x="6" y="60" width="49" height="4.5" rx="1.5" fill="#c7ccd3"/><rect x="6" y="62.5" width="49" height="2" fill="#8f959d" opacity="0.6"/><rect x="27" y="46" width="22" height="1.8" rx="0.9" fill="#15171c"/><rect x="27" y="49" width="22" height="1.8" rx="0.9" fill="#15171c"/><rect x="13" y="50" width="9" height="9" rx="1" fill="#3a3f47"/><line x1="15" y1="52.5" x2="20" y2="52.5" stroke="#15171c" stroke-width="0.9"/><line x1="15" y1="55.5" x2="20" y2="55.5" stroke="#15171c" stroke-width="0.9"/><circle cx="12" cy="58" r="2" fill="#cc2200"/><circle cx="12" cy="58" r="0.9" fill="#ff5533"/><line x1="39" y1="42.5" x2="39" y2="33" stroke="#3a3f47" stroke-width="1.4"/><line x1="46" y1="42" x2="46" y2="32" stroke="#3a3f47" stroke-width="1.4"/><rect x="36" y="30" width="7" height="3" rx="0.8" fill="#565b62"/><rect x="43" y="29" width="7" height="3" rx="0.8" fill="#565b62"/><ellipse cx="16" cy="67" rx="5" ry="4.6" fill="#101216"/><ellipse cx="16" cy="67" rx="2" ry="1.8" fill="#2f343b"/><ellipse cx="45" cy="67" rx="5" ry="4.6" fill="#101216"/><ellipse cx="45" cy="67" rx="2" ry="1.8" fill="#2f343b"/>`,

  // GNK Power Droid: olive-grey tapered box body, panel + lights, red stripes, ribbed black legs
  gonk: `<polygon points="13,9 47,9 47,53 13,53" fill="#8f9277"/><rect x="13" y="44" width="34" height="9" fill="#7c7f64"/><rect x="14" y="9" width="33" height="3" fill="#9da085"/><rect x="30" y="13" width="13" height="11" rx="1" fill="#3c3e30"/><circle cx="36" cy="18" r="2" fill="#6a6c55"/><rect x="33" y="20" width="7" height="2" rx="0.5" fill="#9a9c82"/><path d="M18,14 h6 v2 h-4 v2 h4 v2 h-4 v2 h4 v2 h-6 z" fill="#6f7259"/><circle cx="17" cy="13.5" r="1.3" fill="#cc2222"/><circle cx="21" cy="13.5" r="1.3" fill="#22aa44"/><circle cx="17" cy="40" r="2.5" fill="#3c3e30"/><rect x="33" y="33" width="2.4" height="11" rx="1" fill="#992222"/><rect x="37" y="33" width="2.4" height="11" rx="1" fill="#992222"/><rect x="15" y="53" width="11" height="16" rx="1" fill="#1f1f1f"/><rect x="34" y="53" width="11" height="16" rx="1" fill="#1f1f1f"/><g stroke="#0d0d0d" stroke-width="1"><line x1="15" y1="56" x2="26" y2="56"/><line x1="15" y1="59" x2="26" y2="59"/><line x1="15" y1="62" x2="26" y2="62"/><line x1="15" y1="65" x2="26" y2="65"/><line x1="34" y1="56" x2="45" y2="56"/><line x1="34" y1="59" x2="45" y2="59"/><line x1="34" y1="62" x2="45" y2="62"/><line x1="34" y1="65" x2="45" y2="65"/></g><rect x="12" y="69" width="17" height="7" rx="2" fill="#141414"/><rect x="31" y="69" width="17" height="7" rx="2" fill="#141414"/>`,

  // B1 Battle Droid: tan skeletal frame, elongated downturned head, segmented limbs w/ joint discs
  b1: `<ellipse cx="31" cy="11" rx="6" ry="11" transform="rotate(16 31 11)" fill="#c3b178"/><path d="M27,17 L35,20 L33,28 L26,26 Z" fill="#b6a468"/><circle cx="29" cy="22" r="1.4" fill="#1a0c00"/><circle cx="31.6" cy="23" r="1.4" fill="#1a0c00"/><line x1="28.5" y1="25.5" x2="32" y2="26.5" stroke="#1a0c00" stroke-width="0.7"/><rect x="29" y="27" width="3" height="6" rx="1" fill="#b0a060"/><rect x="25" y="32" width="12" height="11" rx="2" fill="#c3b178"/><rect x="35" y="30" width="8" height="13" rx="2" fill="#a89757"/><line x1="26" y1="35" x2="15" y2="46" stroke="#bdab70" stroke-width="2.6" stroke-linecap="round"/><circle cx="15" cy="46" r="2.2" fill="#a89757"/><line x1="15" y1="46" x2="9" y2="57" stroke="#bdab70" stroke-width="2.6" stroke-linecap="round"/><line x1="36" y1="34" x2="46" y2="44" stroke="#bdab70" stroke-width="2.6" stroke-linecap="round"/><circle cx="46" cy="44" r="2.2" fill="#a89757"/><line x1="46" y1="44" x2="51" y2="55" stroke="#bdab70" stroke-width="2.6" stroke-linecap="round"/><line x1="28" y1="43" x2="26" y2="57" stroke="#bdab70" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="57" r="2.4" fill="#a89757"/><line x1="26" y1="57" x2="24" y2="71" stroke="#bdab70" stroke-width="3" stroke-linecap="round"/><line x1="34" y1="43" x2="36" y2="57" stroke="#bdab70" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="57" r="2.4" fill="#a89757"/><line x1="36" y1="57" x2="38" y2="71" stroke="#bdab70" stroke-width="3" stroke-linecap="round"/><path d="M20,73 L28,73 L26,69 L22,69 Z" fill="#988840"/><path d="M40,73 L32,73 L34,69 L38,69 Z" fill="#988840"/>`,

  // Super Battle Droid (B2): hulking gunmetal, sunken head w/ red sensor, raised wrist-blaster arm
  superb2: `<rect x="19" y="20" width="22" height="6" rx="2" fill="#4a4e56"/><ellipse cx="30" cy="19" rx="6" ry="4.5" fill="#54585f"/><circle cx="33" cy="18" r="1.5" fill="#dd2200"/><path d="M14,30 L46,30 L42,52 L18,52 Z" fill="#5c616a"/><path d="M14,30 L46,30 L44,37 L16,37 Z" fill="#686e77"/><path d="M27,37 L33,37 L31,52 L29,52 Z" fill="#2e3138"/><path d="M14,31 L7,26 L3,12 L9,11 L15,27 Z" fill="#54585f"/><rect x="1" y="7" width="10" height="6" rx="1.5" fill="#3a3d44"/><path d="M46,31 L52,40 L52,55 L45,52 Z" fill="#54585f"/><rect x="44" y="53" width="11" height="6" rx="2" fill="#3a3d44"/><rect x="18" y="52" width="10" height="20" rx="2" fill="#50545c"/><rect x="32" y="52" width="10" height="20" rx="2" fill="#50545c"/><circle cx="23" cy="52" r="3" fill="#3a3d44"/><circle cx="37" cy="52" r="3" fill="#3a3d44"/><path d="M16,72 L30,72 L30,76 L14,76 Z" fill="#2e3138"/><path d="M44,72 L30,72 L30,76 L46,76 Z" fill="#2e3138"/>`,

  // R7-A7 Astromech: deep maroon body, olive-green dome accents, blue logic eye, three legs
  r7: `<path d="M12,22 a18,16 0 0 1 36,0 Z" fill="#7a1f18"/><path d="M16,18 a14,13 0 0 1 28,0 Z" fill="#8a9a36"/><rect x="12" y="20" width="36" height="2" fill="#5a5a5a"/><circle cx="30" cy="13" r="3.5" fill="#3a3a3a"/><circle cx="30" cy="13" r="2" fill="#aaccdd"/><rect x="21" y="9" width="4" height="3" rx="0.5" fill="#cc2222"/><rect x="26" y="8" width="4" height="3" rx="0.5" fill="#dddddd"/><rect x="11" y="22" width="38" height="34" rx="4" fill="#7a1f18"/><polygon points="18,28 40,28 40,32 22,32 22,40 18,40" fill="#8a9a36"/><rect x="15" y="34" width="5" height="9" rx="1" fill="#3a3a3a"/><circle cx="20" cy="48" r="4" fill="#3a7a9a"/><circle cx="20" cy="48" r="2" fill="#bfe0ee"/><rect x="33" y="36" width="12" height="14" rx="2" fill="#6a1a14"/><rect x="9" y="50" width="6" height="20" rx="2" fill="#b0b0b0"/><rect x="45" y="50" width="6" height="20" rx="2" fill="#b0b0b0"/><polygon points="6,70 18,70 16,78 8,78" fill="#9a9a9a"/><polygon points="42,70 54,70 52,78 44,78" fill="#9a9a9a"/><rect x="25" y="56" width="10" height="16" rx="2" fill="#6a1a14"/><polygon points="22,72 38,72 36,78 24,78" fill="#7a7a7a"/>`,

  // 2-1B Surgical Droid: humanoid silver-grey, twin amber eyes, exposed chest wiring, claw + tool arms
  medical: `<rect x="25" y="20" width="10" height="6" rx="1" fill="#7a7e84"/><path d="M23,10 a7,7 0 0 1 14,0 l-1,8 l-12,0 Z" fill="#9ca2aa"/><circle cx="27" cy="11" r="2" fill="#e0c020"/><circle cx="33" cy="11" r="2" fill="#e0c020"/><rect x="21" y="26" width="18" height="20" rx="3" fill="#8a9098"/><path d="M30,27 q9,3 4,9 q-9,3 -4,9" stroke="#cfd3d8" stroke-width="1.6" fill="none"/><rect x="24" y="29" width="12" height="3" rx="1" fill="#6a6e74"/><line x1="22" y1="30" x2="9" y2="24" stroke="#7a7e84" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="24" r="2.4" fill="#5a5e64"/><line x1="9" y1="24" x2="8" y2="38" stroke="#7a7e84" stroke-width="2.6" stroke-linecap="round"/><path d="M5,38 l3,3 M11,38 l-3,3" stroke="#5a5e64" stroke-width="1.6" stroke-linecap="round"/><line x1="38" y1="30" x2="50" y2="26" stroke="#7a7e84" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="26" r="2.4" fill="#5a5e64"/><line x1="50" y1="26" x2="52" y2="38" stroke="#7a7e84" stroke-width="2.6" stroke-linecap="round"/><circle cx="52" cy="40" r="2.6" fill="#3a3d42"/><rect x="24" y="46" width="5" height="20" rx="2" fill="#7a7e84"/><rect x="31" y="46" width="5" height="20" rx="2" fill="#7a7e84"/><path d="M20,66 L31,66 L30,72 L19,73 Z" fill="#1f2226"/><path d="M40,66 L29,66 L30,72 L41,73 Z" fill="#1f2226"/>`,

  // B2EMO (Andor): maroon banded box, amber eye + dark sensor, teal accents, twin tread feet
  b2emo: `<polygon points="14,22 46,22 50,30 10,30" fill="#7a2820"/><circle cx="22" cy="26" r="5" fill="#2a1410"/><circle cx="22" cy="26" r="3.5" fill="#ff9a1e"/><circle cx="22" cy="26" r="1.6" fill="#ffe0a0"/><circle cx="34" cy="26" r="2.6" fill="#1a0c0a"/><circle cx="34" cy="26" r="1.2" fill="#553028"/><rect x="10" y="30" width="40" height="9" rx="1" fill="#6e241c"/><rect x="9" y="40" width="42" height="11" rx="1" fill="#7a2820"/><rect x="10" y="52" width="40" height="9" rx="1" fill="#6e241c"/><line x1="12" y1="35" x2="26" y2="35" stroke="#2a9a86" stroke-width="1.4"/><line x1="34" y1="45" x2="48" y2="45" stroke="#2a9a86" stroke-width="1.4"/><line x1="12" y1="57" x2="22" y2="57" stroke="#2a9a86" stroke-width="1.4"/><rect x="27" y="42" width="6" height="8" rx="1" fill="#4a1812"/><g stroke="#3a120e" stroke-width="0.8"><line x1="28" y1="44" x2="32" y2="44"/><line x1="28" y1="46" x2="32" y2="46"/><line x1="28" y1="48" x2="32" y2="48"/></g><rect x="7" y="61" width="20" height="14" rx="3" fill="#641f18"/><rect x="33" y="61" width="20" height="14" rx="3" fill="#641f18"/><rect x="9" y="69" width="16" height="5" rx="1.5" fill="#2a0e0a"/><rect x="35" y="69" width="16" height="5" rx="1.5" fill="#2a0e0a"/>`,

  // Imperial Probe Droid: dark saucer dome, antenna stalks, red sensor eye, dangling tentacle arms
  spybot: `<line x1="27" y1="14" x2="24" y2="3" stroke="#2a2a2e" stroke-width="1.4" stroke-linecap="round"/><line x1="31" y1="13" x2="31" y2="2" stroke="#2a2a2e" stroke-width="1.4" stroke-linecap="round"/><line x1="35" y1="14" x2="38" y2="4" stroke="#2a2a2e" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="30" cy="26" rx="22" ry="12" fill="#1a1a1f"/><ellipse cx="30" cy="22" rx="22" ry="10" fill="#26262c"/><ellipse cx="30" cy="20" rx="15" ry="6" fill="#303036"/><circle cx="30" cy="30" r="4" fill="#cc1100"/><circle cx="30" cy="30" r="2" fill="#ff5522"/><circle cx="14" cy="27" r="1.6" fill="#aa0e0e"/><circle cx="46" cy="27" r="1.6" fill="#aa0e0e"/><g stroke="#1c1c20" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M18,34 q-4,12 -8,20"/><path d="M26,37 q-2,14 -3,24"/><path d="M34,37 q2,14 3,24"/><path d="M42,34 q4,12 8,20"/></g><g fill="#141417"><circle cx="10" cy="55" r="1.6"/><circle cx="23" cy="62" r="1.6"/><circle cx="37" cy="62" r="1.6"/><circle cx="50" cy="55" r="1.6"/></g>`,

  // Two-Boots: blue & yellow painted battle droid, crested helmet, grey face, twin yellow eyes
  twotubes: `<path d="M21,11 a9,8 0 0 1 18,0 l0,5 l-18,0 Z" fill="#8e949c"/><path d="M24,8 h12 l-1,4 h-10 Z" fill="#e0a82e"/><path d="M24,15 L36,15 L34,26 L30,29 L26,26 Z" fill="#9aa0a8"/><circle cx="27" cy="19" r="2" fill="#f0d020"/><circle cx="33" cy="19" r="2" fill="#f0d020"/><circle cx="27" cy="19" r="0.9" fill="#7a5a00"/><circle cx="33" cy="19" r="0.9" fill="#7a5a00"/><rect x="27" y="24" width="6" height="3" rx="0.5" fill="#5a5e64"/><rect x="26" y="29" width="8" height="4" rx="1" fill="#7a7e84"/><path d="M20,33 L40,33 L37,50 L23,50 Z" fill="#3a5a86"/><path d="M20,33 L40,33 L39,38 L21,38 Z" fill="#d99f2a"/><ellipse cx="20" cy="36" rx="4" ry="5" fill="#d99f2a"/><ellipse cx="40" cy="36" rx="4" ry="5" fill="#d99f2a"/><rect x="27" y="42" width="3" height="3" fill="#2aa0c0"/><rect x="31" y="42" width="2.5" height="3" fill="#cc3344"/><line x1="19" y1="38" x2="13" y2="52" stroke="#33507a" stroke-width="2.8" stroke-linecap="round"/><line x1="41" y1="38" x2="47" y2="52" stroke="#33507a" stroke-width="2.8" stroke-linecap="round"/><line x1="26" y1="50" x2="25" y2="68" stroke="#33507a" stroke-width="3" stroke-linecap="round"/><line x1="34" y1="50" x2="35" y2="68" stroke="#33507a" stroke-width="3" stroke-linecap="round"/><path d="M21,69 L28,69 L27,73 L22,73 Z" fill="#28405e"/><path d="M39,69 L32,69 L33,73 L38,73 Z" fill="#28405e"/>`,

  // K-2SO: tall charcoal Imperial droid, rounded head w/ twin eyes, broad shoulders, long thin limbs
  k2so: `<ellipse cx="30" cy="11" rx="8" ry="9" fill="#454952"/><path d="M24,13 q6,5 12,0 l-1,6 l-10,0 Z" fill="#34373e"/><circle cx="27" cy="11" r="2" fill="#0c0e11"/><circle cx="33" cy="11" r="2" fill="#0c0e11"/><circle cx="27" cy="11" r="1" fill="#9fd6e6"/><circle cx="33" cy="11" r="1" fill="#9fd6e6"/><rect x="28" y="19" width="4" height="6" rx="1" fill="#383b42"/><path d="M16,27 q14,-6 28,0 l-2,8 l-24,0 Z" fill="#454952"/><path d="M22,34 L38,34 L36,52 L24,52 Z" fill="#3a3d45"/><rect x="26" y="36" width="8" height="3" rx="1" fill="#26282d"/><line x1="18" y1="29" x2="9" y2="50" stroke="#42454d" stroke-width="3.4" stroke-linecap="round"/><line x1="9" y1="50" x2="11" y2="62" stroke="#383b42" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="29" x2="51" y2="50" stroke="#42454d" stroke-width="3.4" stroke-linecap="round"/><line x1="51" y1="50" x2="49" y2="62" stroke="#383b42" stroke-width="3" stroke-linecap="round"/><rect x="24" y="52" width="5" height="22" rx="2" fill="#3d4047"/><rect x="31" y="52" width="5" height="22" rx="2" fill="#3d4047"/><path d="M20,74 L29,74 L29,78 L19,78 Z" fill="#26282d"/><path d="M40,74 L31,74 L31,78 L41,78 Z" fill="#26282d"/>`,

  // BD-1: small scout, cream + red box head w/ twin lens eyes, two antennae, thin bird legs
  bd1: `<line x1="20" y1="14" x2="14" y2="3" stroke="#9a9488" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="3" r="1.6" fill="#3a3a3a"/><line x1="40" y1="14" x2="46" y2="3" stroke="#9a9488" stroke-width="1.6" stroke-linecap="round"/><circle cx="46" cy="3" r="1.6" fill="#3a3a3a"/><path d="M11,16 L49,13 L49,30 L11,30 Z" fill="#e7e1d2"/><path d="M11,16 L49,13 L49,18 L11,21 Z" fill="#cfc8b6"/><rect x="22" y="14" width="16" height="3" fill="#c43028"/><circle cx="16" cy="23" r="6" fill="#c43028"/><circle cx="16" cy="23" r="4" fill="#cfd3d8"/><circle cx="16" cy="23" r="2" fill="#6a6e74"/><circle cx="42" cy="22" r="6" fill="#3a3d42"/><circle cx="42" cy="22" r="4.2" fill="#3a6aaa"/><circle cx="42" cy="22" r="2" fill="#bfe0ee"/><circle cx="40" cy="20" r="1" fill="#fff" opacity="0.8"/><rect x="25" y="31" width="10" height="9" rx="2" fill="#ddd7c6"/><rect x="28" y="33" width="6" height="4" rx="1" fill="#c43028"/><path d="M27,40 L22,55 L25,57 L29,42 Z" fill="#d8d2c2"/><path d="M22,55 L24,68 L20,69 L19,56 Z" fill="#cfc8b6"/><path d="M16,69 L26,69 L26,72 L16,72 Z" fill="#3a3a3a"/><path d="M33,40 L38,55 L35,57 L31,42 Z" fill="#d8d2c2"/><path d="M38,55 L36,68 L40,69 L41,56 Z" fill="#cfc8b6"/><path d="M34,69 L44,69 L44,72 L34,72 Z" fill="#3a3a3a"/>`,

  // Chopper (C1-10P): grey astromech, rust-orange dome + yellow band, grabber arms, spark tips
  chopper: `<line x1="30" y1="8" x2="30" y2="2" stroke="#3a3a3a" stroke-width="1.2" stroke-linecap="round"/><path d="M16,22 a14,13 0 0 1 28,0 Z" fill="#d6691e"/><path d="M19,16 a11,10 0 0 1 22,0 Z" fill="#e07a28"/><circle cx="24" cy="15" r="1.8" fill="#222"/><circle cx="30" cy="13" r="1.8" fill="#222"/><circle cx="36" cy="15" r="1.8" fill="#222"/><rect x="16" y="22" width="28" height="4" fill="#e0b020"/><rect x="15" y="26" width="30" height="30" rx="4" fill="#b9b9b0"/><rect x="18" y="29" width="24" height="15" rx="2" fill="#cfcfc8"/><rect x="20" y="31" width="9" height="5" rx="1" fill="#8a8a82"/><rect x="31" y="31" width="9" height="5" rx="1" fill="#8a8a82"/><rect x="20" y="38" width="20" height="2" fill="#9a9a92"/><rect x="22" y="46" width="7" height="8" rx="1" fill="#d6691e"/><rect x="31" y="46" width="7" height="8" rx="1" fill="#8a8a82"/><line x1="15" y1="32" x2="5" y2="26" stroke="#9a9a92" stroke-width="2.2" stroke-linecap="round"/><line x1="45" y1="32" x2="55" y2="26" stroke="#9a9a92" stroke-width="2.2" stroke-linecap="round"/><path d="M5,26 l-2,-2 m2,2 l-2,2" stroke="#6a6a62" stroke-width="1.4" stroke-linecap="round"/><path d="M55,26 l2,-2 m-2,2 l2,2" stroke="#6a6a62" stroke-width="1.4" stroke-linecap="round"/><rect x="20" y="56" width="7" height="14" rx="2" fill="#a0a098"/><rect x="33" y="56" width="7" height="14" rx="2" fill="#a0a098"/><path d="M16,70 L29,70 L29,76 L15,76 Z" fill="#3a3a3a"/><path d="M44,70 L31,70 L31,76 L45,76 Z" fill="#3a3a3a"/><circle class="spark1" cx="3" cy="23" r="2.2" fill="#ffee44"/><circle class="spark2" cx="57" cy="23" r="2.2" fill="#ffbb22"/><line class="spark3" x1="2" y1="21" x2="6" y2="25" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`,

  // C-3PO: gold protocol droid, round eyes + mouth grille, wired waist, one silver lower leg
  c3po: `<ellipse cx="30" cy="11" rx="9" ry="10" fill="#e3b524"/><ellipse cx="30" cy="9" rx="9" ry="7" fill="#edc23a"/><circle cx="25" cy="11" r="3.4" fill="#3a2e00"/><circle cx="35" cy="11" r="3.4" fill="#3a2e00"/><circle cx="25" cy="11" r="1.8" fill="#fff4c0"/><circle cx="35" cy="11" r="1.8" fill="#fff4c0"/><g stroke="#a8801a" stroke-width="0.7"><line x1="26" y1="17" x2="34" y2="17"/><line x1="27" y1="19" x2="33" y2="19"/></g><rect x="27" y="21" width="6" height="4" rx="1" fill="#caa01e"/><path d="M19,26 q11,-3 22,0 l-1,12 l-20,0 Z" fill="#e0b524"/><circle cx="30" cy="32" r="4" fill="#caa01e"/><circle cx="30" cy="32" r="2" fill="#a8801a"/><g stroke="#8a6a14" stroke-width="1.2"><line x1="24" y1="38" x2="36" y2="38"/><line x1="25" y1="41" x2="35" y2="41"/></g><line x1="20" y1="28" x2="11" y2="44" stroke="#dcb223" stroke-width="3.2" stroke-linecap="round"/><line x1="11" y1="44" x2="12" y2="55" stroke="#caa01e" stroke-width="2.8" stroke-linecap="round"/><line x1="40" y1="28" x2="49" y2="44" stroke="#dcb223" stroke-width="3.2" stroke-linecap="round"/><line x1="49" y1="44" x2="48" y2="55" stroke="#caa01e" stroke-width="2.8" stroke-linecap="round"/><rect x="24" y="44" width="5" height="16" rx="2" fill="#dcb223"/><rect x="31" y="44" width="5" height="16" rx="2" fill="#dcb223"/><rect x="24" y="60" width="5" height="12" rx="2" fill="#dcb223"/><rect x="31" y="60" width="5" height="12" rx="2" fill="#bcc0c6"/><path d="M22,72 L30,72 L30,76 L21,76 Z" fill="#b0901a"/><path d="M38,72 L30,72 L30,76 L39,76 Z" fill="#aab0b6"/>`,

  // R2-D2: silver dome w/ blue accents + big front eye, white body w/ blue panels + vents, three legs
  r2d2: `<path d="M11,20 a19,17 0 0 1 38,0 Z" fill="#dfe4ea"/><rect x="11" y="20" width="38" height="2" fill="#9aa0a8"/><circle cx="30" cy="13" r="4" fill="#2e5aa0"/><circle cx="30" cy="13" r="2.4" fill="#0a0a0a"/><circle cx="29" cy="12" r="0.9" fill="#9ad0ff"/><rect x="19" y="11" width="4" height="3" rx="0.5" fill="#2e5aa0"/><rect x="24" y="9" width="3" height="3" rx="0.5" fill="#cc6666"/><rect x="11" y="22" width="38" height="34" rx="3" fill="#e7ebf0"/><rect x="14" y="25" width="32" height="3" rx="1" fill="#2e5aa0"/><rect x="18" y="30" width="9" height="4" rx="1" fill="#2e5aa0"/><rect x="33" y="30" width="9" height="4" rx="1" fill="#2e5aa0"/><rect x="25" y="37" width="10" height="3" fill="#5a5e64"/><rect x="25" y="42" width="10" height="3" fill="#5a5e64"/><circle cx="30" cy="50" r="3.5" fill="#2e5aa0"/><circle cx="30" cy="50" r="1.8" fill="#aaccee"/><rect x="9" y="50" width="6" height="20" rx="2" fill="#c8ced6"/><rect x="45" y="50" width="6" height="20" rx="2" fill="#c8ced6"/><polygon points="6,70 17,70 15,78 8,78" fill="#5a5e64"/><polygon points="43,70 54,70 52,78 45,78" fill="#5a5e64"/><rect x="25" y="56" width="10" height="16" rx="2" fill="#dfe4ea"/><polygon points="22,72 38,72 36,78 24,78" fill="#4a4e54"/>`,

  // BB-8: white ball body w/ orange ring motif, domed head, big dark eye + small silver eye, antenna
  bb8: `<line x1="30" y1="14" x2="30" y2="3" stroke="#9a9a9a" stroke-width="1" stroke-linecap="round"/><circle cx="30" cy="2.6" r="1.3" fill="#3a3a3a"/><circle cx="30" cy="52" r="25" fill="#eef0ee"/><circle cx="30" cy="52" r="25" fill="none" stroke="#d8dad6" stroke-width="1"/><circle cx="30" cy="50" r="10" fill="none" stroke="#e07a1e" stroke-width="3.5"/><circle cx="30" cy="50" r="4.5" fill="#e07a1e"/><circle cx="30" cy="50" r="2.4" fill="#cf5a00"/><path d="M7,44 q23,-8 46,0" stroke="#e07a1e" stroke-width="2.6" fill="none"/><path d="M8,62 q22,9 44,0" stroke="#e07a1e" stroke-width="2.6" fill="none"/><circle cx="13" cy="58" r="3.5" fill="none" stroke="#e07a1e" stroke-width="2"/><circle cx="47" cy="58" r="3.5" fill="none" stroke="#e07a1e" stroke-width="2"/><path d="M12,28 a18,12 0 0 1 36,0 Z" fill="#eef0ee"/><rect x="14" y="26" width="32" height="3" rx="1" fill="#e07a1e"/><circle cx="26" cy="22" r="4.5" fill="#2a2a2a"/><circle cx="26" cy="22" r="2.4" fill="#aa1818"/><circle cx="26" cy="22" r="1" fill="#ff8888"/><circle cx="38" cy="23" r="2.4" fill="#6a6e74"/><circle cx="38" cy="23" r="1.2" fill="#cfd3d8"/>`,
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
  const ownedCount = DROIDS.filter(d => ownedIds.has(d.id)).length;
  const activeDroidId = await getActiveCompanion();
  let collHtml = `<div class="shop-inv-title" style="margin-top:20px">Droid Collection (${ownedCount}/${DROIDS.length})</div><div class="droid-grid">`;
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
    if (activeDroidId && DROIDS.some(d => d.id === activeDroidId)) {
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
