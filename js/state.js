'use strict';
/* Trabaja — estado, persistencia y ciclo de días/semanas */

/* ---------- utilidades de fecha y azar ---------- */
const pad2 = n => String(n).padStart(2, '0');
const dayKey = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const today = () => dayKey(new Date());
function parseDay(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
function addDays(k, n) { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); }
function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 864e5); }
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekId(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + pad2(w);
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const uniq = a => Array.from(new Set(a));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- estado inicial y migración ---------- */
function initial() {
  const d = today();
  return {
    version: 2, name: 'Cazador', profilePhoto: '', level: 1, xp: 0, totalXp: 0, rank: 'E',
    stats: { fuerza: 10, agilidad: 10, vitalidad: 10, inteligencia: 10, percepcion: 10 },
    points: 0, coins: 0, totalMissions: 0, streak: 0, bestStreak: 0, lastCompletedDay: null, lastDay: '',
    missions: [], customMissions: [], history: [], achievements: [],
    inventory: [{ id: 'starter', name: 'Insignia del Despertar', desc: 'Tu primer símbolo de cazador.', icon: 'sparkle', rarity: 'Común' }],
    recurrent: { day: d, counts: {} },
    workout: { day: d, sessionDone: false, week: 0, count: 0, progress: {}, adapt: {} },
    settings: {
      notifications: false, sound: true,
      sounds: { menu: true, select: true, complete: true, fail: true, level: true, unlock: true },
      volume: .3, waterInterval: 120, stretchInterval: 180, music: false, haptics: true, fx: true, mode: 'dark'
    },
    notified: [], createdAt: new Date().toISOString(), tiktokRewardAt: 0,
    theme: 'violet', frame: 'none', title: '', featured: '',
    owned: { themes: ['violet'], frames: ['none'], titles: [''] },
    shields: 0, boostUntil: 0, shieldNote: '',
    days: {},
    weekly: { id: '', quests: [], progress: {}, claimed: {} },
    boss: { id: '', name: '', icon: 'skull', image: '', desc: '', max: 0, dealt: 0, claimed: false },
    focus: { sessions: 0, minutes: 0, active: null, xpDay: { day: '', xp: 0 }, lastDone: null }
  };
}

function poolItem(id) { return MISSION_POOL.find(m => m.id === id); }
function fixMission(m) {
  m = Object.assign({}, m);
  const p = poolItem(m.id);
  if (!ICONS[m.icon]) m.icon = (p && p.icon) || TYPE_ICON[m.type] || 'star';
  if (!PRIORITIES[m.priority]) m.priority = 'media';
  m.subtasks = Array.isArray(m.subtasks) ? m.subtasks.filter(s => s && s.t).map(s => ({ t: String(s.t), done: !!s.done })) : [];
  m.xp = Number(m.xp) || 10;
  return m;
}

function migrate(raw) {
  const f = initial();
  const s = Object.assign({}, f, raw || {});
  s.name = String(s.name || 'Cazador').slice(0, 24);
  s.profilePhoto = s.profilePhoto || '';
  s.settings = Object.assign({}, f.settings, s.settings || {});
  s.settings.sounds = Object.assign({}, f.settings.sounds, (raw && raw.settings && raw.settings.sounds) || {});
  s.stats = Object.assign({}, f.stats, s.stats || {});
  s.recurrent = Object.assign({ day: today(), counts: {} }, s.recurrent || {});
  s.recurrent.counts = s.recurrent.counts || {};
  s.workout = Object.assign({}, f.workout, s.workout || {});
  s.workout.progress = s.workout.progress || {};
  s.workout.adapt = s.workout.adapt || {};
  s.owned = {
    themes: uniq(['violet'].concat((s.owned && s.owned.themes) || [])),
    frames: uniq(['none'].concat((s.owned && s.owned.frames) || [])),
    titles: uniq([''].concat((s.owned && s.owned.titles) || []))
  };
  s.days = (s.days && typeof s.days === 'object') ? s.days : {};
  s.weekly = Object.assign({}, f.weekly, s.weekly || {});
  s.boss = Object.assign({}, f.boss, s.boss || {});
  s.focus = Object.assign({}, f.focus, s.focus || {});
  s.focus.xpDay = Object.assign({ day: '', xp: 0 }, s.focus.xpDay || {});
  s.missions = (s.missions || []).map(fixMission);
  s.customMissions = (s.customMissions || []).map(fixMission);
  s.history = Array.isArray(s.history) ? s.history : [];
  s.notified = Array.isArray(s.notified) ? s.notified : [];
  s.inventory = (Array.isArray(s.inventory) ? s.inventory : []).filter(i => !i.shadow || WARRIORS.some(w => w.id === i.id)).map(i => ICONS[i.icon] ? i : Object.assign({}, i, { icon: 'sparkle' }));
  s.achievements = (Array.isArray(s.achievements) ? s.achievements : []).filter(id => WARRIORS.some(w => w.id === id));
  s.tiktokRewardAt = Number(s.tiktokRewardAt) || 0;
  s.totalMissions = Math.max(Number(s.totalMissions) || 0, s.history.filter(h => /^Misión completada:/.test(h.text)).length);
  s.bestStreak = Math.max(Number(s.bestStreak) || 0, Number(s.streak) || 0);
  s.shields = clamp(Number(s.shields) || 0, 0, 3);
  s.boostUntil = Number(s.boostUntil) || 0;
  if (!THEMES.some(t => t.id === s.theme) || !s.owned.themes.includes(s.theme)) s.theme = 'violet';
  if (!FRAMES.some(t => t.id === s.frame) || !s.owned.frames.includes(s.frame)) s.frame = 'none';
  if (!s.owned.titles.includes(s.title)) s.title = '';
  if (s.featured && !s.achievements.includes(s.featured)) s.featured = '';
  // Reconstruye historial diario aproximado si viene de una versión previa sin "days"
  if (!Object.keys(s.days).length) {
    s.history.forEach(h => {
      const k = String(h.date || '').slice(0, 10);
      if (!k) return;
      const d = s.days[k] || (s.days[k] = { xp: 0, missions: 0, focus: 0, workouts: 0 });
      d.xp += Number(h.xp) || 0;
      if (/^Misión completada/.test(h.text)) d.missions++;
      if (/^Rutina completada/.test(h.text)) d.workouts++;
    });
  }
  return s;
}

/* ---------- persistencia ---------- */
let state;
let saveTimer = 0, noSave = false;
function loadState() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  if (!raw) { try { raw = JSON.parse(localStorage.getItem(LEGACY_KEY)); } catch (e) { raw = null; } }
  return migrate(raw || {});
}
function flushSave() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (noSave) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento lleno */ }
}
function save() { if (saveTimer) return; saveTimer = setTimeout(flushSave, 120); }
addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

/* ---------- misiones diarias ---------- */
function resetSubs(m) { return Object.assign({}, m, { subtasks: (m.subtasks || []).map(s => ({ t: s.t, done: false })) }); }
function buildDaily(day) {
  const core = CORE_MISSIONS.map(poolItem);
  const rest = shuffle(MISSION_POOL.filter(m => !CORE_MISSIONS.includes(m.id)), rng(hashStr('daily' + day))).slice(0, 3);
  const daily = core.concat(rest).map(m => fixMission(Object.assign({}, m, { accepted: false, completed: false, custom: false, reminderEnabled: false })));
  const custom = state.customMissions.map(m => resetSubs(Object.assign({}, m, { accepted: false, completed: false, custom: true })));
  return daily.concat(custom);
}

/* ---------- racha ---------- */
function checkStreakBreak(d) {
  const last = state.lastCompletedDay;
  if (!last || !state.streak) return;
  const y = addDays(d, -1);
  if (last === d || last === y) return;
  const missed = daysBetween(last, d) - 1;
  if (missed === 1 && state.shields > 0) {
    state.shields--; state.lastCompletedDay = y;
    state.shieldNote = 'Tu escudo protegió la racha de ' + state.streak + ' días.';
  } else {
    state.streak = 0;
  }
}

/* ---------- semana: retos y jefe ---------- */
function questName(q) { return q.name.replace('{n}', q.target); }
/* Jefe con imagen propia: se elige una al azar por semana (misma semana = misma imagen). */
function applyBossImage(w) {
  if (!BOSS_IMAGES.length) { state.boss.image = ''; return; }
  const p = BOSS_IMAGES[Math.floor(rng(hashStr('bossimg' + w))() * BOSS_IMAGES.length)];
  state.boss.image = p.image; state.boss.name = p.name; state.boss.desc = BOSS_DESC;
}
function ensureWeek() {
  const w = weekId(new Date());
  if (state.weekly.id === w && state.boss.id === w) {
    // si se añadieron o quitaron imágenes a mitad de semana, se actualiza sin perder el daño hecho
    const cur = state.boss.image || '';
    if ((!cur && BOSS_IMAGES.length) || (cur && !BOSS_IMAGES.some(x => x.image === cur))) { applyBossImage(w); save(); }
    return;
  }
  const r = rng(hashStr('week' + w));
  const quests = shuffle(WEEKLY_POOL, r).slice(0, 3).map(p => ({
    id: p.id, stat: p.stat, icon: p.icon, name: p.name, xp: p.xp, coins: p.coins,
    target: p.targets[Math.floor(r() * p.targets.length)]
  }));
  state.weekly = { id: w, quests, progress: {}, claimed: {} };
  const b = BOSSES[Math.floor(r() * BOSSES.length)];
  state.boss = { id: w, name: b.name, icon: b.icon, desc: b.desc, max: Math.round((350 + state.level * 30) / 10) * 10, dealt: 0, claimed: false, image: '' };
  applyBossImage(w);
  save();
}
function weekDays() { const m = mondayOf(new Date()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return dayKey(d); }); }
function daysActiveThisWeek() { return weekDays().filter(k => state.days[k] && state.days[k].xp > 0).length; }
function questProgress(q) { return q.stat === 'days' ? daysActiveThisWeek() : (state.weekly.progress[q.stat] || 0); }

function updateDay() {
  const d = today();
  if (state.lastDay !== d) {
    state.lastDay = d;
    state.missions = buildDaily(d);
    state.recurrent = { day: d, counts: {} };
    state.workout.day = d; state.workout.sessionDone = false; state.workout.progress = {};
    state.notified = [];
    checkStreakBreak(d);
    const cutoff = addDays(d, -140);
    Object.keys(state.days).forEach(k => { if (k < cutoff) delete state.days[k]; });
    save();
    if (typeof Native !== 'undefined') Native.syncReminders();
  }
  if (state.recurrent.day !== d) state.recurrent = { day: d, counts: {} };
  if (state.workout.day !== d) { state.workout.day = d; state.workout.sessionDone = false; state.workout.progress = {}; }
  ensureWeek();
}

/* ---------- cálculos de nivel ---------- */
const rankFor = l => l >= 50 ? 'S' : l >= 35 ? 'A' : l >= 25 ? 'B' : l >= 15 ? 'C' : l >= 8 ? 'D' : 'E';
const xpNext = () => Math.max(100, Math.round(100 * Math.pow(1.5, state.level - 1)));
const boostActive = () => state.boostUntil > Date.now();
function bumpDay(fields) {
  const k = today();
  const d = state.days[k] || (state.days[k] = { xp: 0, missions: 0, focus: 0, workouts: 0 });
  Object.keys(fields).forEach(f => { d[f] = (d[f] || 0) + fields[f]; });
}
function totalMissionsDone() { return state.totalMissions; }

state = loadState();
