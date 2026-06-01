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
  // Compound PK [date+exerciseId] => one idempotent row per exercise per day.
  completions: '[date+exerciseId], date, exerciseId, done',
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
  let xp = 0;
  for (const date of dates) {
    const dayDone = await db.completions.where('date').equals(date).filter(r => r.done === true).count();
    const multiplier = isDoubleXPDay(date) ? 2 : 1;
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
  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const key = dateKey(checkDate);
    const count = await db.completions.where('date').equals(key).filter(r => r.done === true).count();
    if (count > 0) {
      streak++;
    } else if (i === 0) {
      // today has no completions yet — check if yesterday keeps the streak alive
    } else {
      break;
    }
    checkDate = addDays(checkDate, -1);
  }

  return streak;
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

  const badge = document.getElementById('streak-badge');
  const countEl = document.getElementById('streak-count');
  if (badge && countEl) {
    countEl.textContent = streak;
    badge.hidden = streak === 0;
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

  const lv = calcLevelInfo(totalXP);
  const xpLabel = lv.xpNeeded !== null
    ? `${lv.xpIntoLevel} / ${lv.xpNeeded} XP`
    : `MAX`;

  const doubleToday = isDoubleXPDay(dateKey(currentDate));

  let html = `<div class="xp-card${doubleToday ? ' xp-double-active' : ''}">`;
  if (doubleToday) {
    html += `<div class="xp-double-banner">⚡ Double XP Day!</div>`;
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
