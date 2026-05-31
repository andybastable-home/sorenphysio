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
// Render
// ------------------------------------------------------------------
async function render() {
  const main = document.getElementById('main');
  const completions = await loadCompletions(currentDate);

  const groups = [];
  for (const time of TIME_ORDER) {
    for (const category of CATEGORY_ORDER) {
      const items = EXERCISE_TEMPLATE.filter(e => e.time === time && e.category === category);
      if (items.length > 0) groups.push({ time, category, items });
    }
  }

  const totalDone = EXERCISE_TEMPLATE.filter(e => completions.get(e.id) === true).length;
  const total = EXERCISE_TEMPLATE.length;

  let html = `<p class="day-summary">${totalDone} / ${total} done</p>`;

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
      html += `<span class="checkbox">${done ? '✓' : ''}</span>`;
      html += `<span class="exercise-info">`;
      html += `<span class="exercise-name">${ex.name}</span>`;
      if (ex.detail) html += `<span class="exercise-detail">${ex.detail}</span>`;
      html += `</span>`;
      html += `</li>`;
    }
    html += `</ul></section>`;
  }

  main.innerHTML = html;

  main.querySelectorAll('.exercise-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = row.dataset.id;
      const done = row.dataset.done === 'true';
      // Optimistic update
      const newDone = !done;
      row.classList.toggle('done', newDone);
      row.dataset.done = String(newDone);
      const checkbox = row.querySelector('.checkbox');
      if (checkbox) checkbox.textContent = newDone ? '✓' : '';
      try {
        await toggleExercise(id, done);
        await render();
      } catch (err) {
        // Revert on write failure
        row.classList.toggle('done', done);
        row.dataset.done = String(done);
        if (checkbox) checkbox.textContent = done ? '✓' : '';
        console.error('Toggle failed', err);
      }
    });
  });
}

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
async function init() {
  await render();
}

init();
