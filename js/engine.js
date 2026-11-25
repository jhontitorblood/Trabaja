'use strict';
/* Trabaja — reglas del juego: XP, misiones, enfoque, entrenos, retos, jefe y tienda */

/* ---------- XP y niveles ---------- */
function addXP(amount, source, o) {
  o = o || {};
  const gain = Math.max(1, Math.round(amount * (boostActive() && !o.noBoost ? 1.5 : 1)));
  state.xp += gain; state.totalXp += gain;
  state.coins += Math.max(1, Math.floor(gain / 5));
  let leveled = false;
  while (state.xp >= xpNext()) { state.xp -= xpNext(); state.level++; state.points += 3; leveled = true; }
  state.rank = rankFor(state.level);
  state.history.unshift({ date: new Date().toISOString(), text: source, xp: gain });
  state.history = state.history.slice(0, 150);
  bumpDay({ xp: gain });
  weeklyAdd('xp', gain);
  if (!o.noBoss) bossHit(gain);
  checkUnlocks();
  save();
  if (o.origin) FX.float('+' + gain + ' XP', o.origin);
  if (leveled) levelFX(state.level);
  return gain;
}
function weeklyAdd(stat, n) { ensureWeek(); state.weekly.progress[stat] = (state.weekly.progress[stat] || 0) + n; }

/* ---------- jefe semanal y retos ---------- */
function bossHit(dmg) {
  ensureBoss();                       // si ya pasó el viernes 00:00, el golpe es para el jefe nuevo
  const b = state.boss; if (!b.max || b.dealt >= b.max) return;
  const was = b.dealt;
  b.dealt = Math.min(b.max, b.dealt + dmg);
  if (was < b.max && b.dealt >= b.max) {
    recordDefeat(b);
    setTimeout(() => { toast('¡' + b.name + ' ha caído! Reclama tu botín y su ícono en la tienda.'); sound('unlock'); haptic([60, 40, 90]); FX.rain(); }, 500);
  }
}
/* El botín solo se entrega si el jefe fue derrotado. */
function grantBoss(b, auto) {
  if (b.dealt < b.max || b.claimed) return;
  b.claimed = true;
  const xp = b.xp || 120, coins = b.coins || 150;
  state.coins += coins;
  addXP(xp, 'Jefe derrotado: ' + b.name, { noBoss: true, noBoost: true });
  if (auto) setTimeout(() => toast('Botín de ' + b.name + ': +' + xp + ' XP y +' + coins + ' monedas'), 600);
  return { xp, coins };
}
function claimBoss() {
  const b = state.boss;
  const r = grantBoss(b, false); if (!r) return;
  toast('Botín del jefe: +' + r.xp + ' XP y +' + r.coins + ' monedas'); sound('level'); FX.rain(); haptic([40, 30, 40]);
  save(); render();
}
function claimQuest(id, origin) {
  const q = state.weekly.quests.find(x => x.id === id);
  if (!q || state.weekly.claimed[id] || questProgress(q) < q.target) return;
  state.weekly.claimed[id] = true; state.coins += q.coins;
  addXP(q.xp, 'Reto semanal: ' + questName(q), { noBoss: true, noBoost: true, origin });
  toast('Reto completado: +' + q.xp + ' XP y +' + q.coins + ' monedas'); sound('complete'); FX.celebrate(origin, 40); haptic(25);
  save(); render();
}

/* ---------- logros / guerreros ---------- */
let awakeningQueue = [];
function checkUnlocks() {
  const m = totalMissionsDone();
  const checks = [['first', m >= 1], ['missions3', m >= 3], ['minos5', m >= 5], ['level5', state.level >= 5], ['ten', m >= 10], ['streak3', state.streak >= 3], ['streak7', state.streak >= 7], ['workout5', state.workout.count >= 5], ['workout10', state.workout.count >= 10], ['xp500', state.totalXp >= 500], ['missions15', m >= 15], ['xp2500', state.totalXp >= 2500]];
  for (const c of checks) {
    if (!c[1] || state.achievements.includes(c[0])) continue;
    state.achievements.push(c[0]);
    const w = WARRIORS.find(x => x.id === c[0]);
    if (w && !state.inventory.some(i => i.id === c[0])) state.inventory.push({ id: w.id, name: w.name, desc: w.title, icon: 'shield', rarity: w.rarity, shadow: true });
    if (w) { awakeningQueue.push(w); if (!state.featured) state.featured = w.id; }
  }
  if (awakeningQueue.length && typeof showNextAwakening === 'function') setTimeout(showNextAwakening, 350);
}

/* ---------- misiones ---------- */
function findMission(id) { return state.missions.find(x => x.id === id); }
function completeMission(id, origin) {
  const m = findMission(id);
  if (!m || m.completed) return;
  m.completed = true; m.accepted = true;
  (m.subtasks || []).forEach(s => { s.done = true; });
  Native.cancel(m.id);
  if (m.stat && state.stats[m.stat] != null) state.stats[m.stat]++;
  const d = today();
  if (state.lastCompletedDay !== d) {
    state.streak = state.lastCompletedDay === addDays(d, -1) ? state.streak + 1 : 1;
    state.lastCompletedDay = d;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  }
  state.totalMissions++;
  bumpDay({ missions: 1 }); weeklyAdd('missions', 1);
  const gain = addXP(m.xp, 'Misión completada: ' + m.name, { origin });
  sound('complete'); haptic(22); FX.celebrate(origin, 30);
  toast('+' + gain + ' XP · Misión completada');
  save(); render();
}
function toggleSub(id, i, origin) {
  const m = findMission(id);
  if (!m || m.completed || !m.subtasks[i]) return;
  m.subtasks[i].done = !m.subtasks[i].done;
  sound('select'); haptic(10); save();
  if (m.subtasks.every(s => s.done)) completeMission(id, origin); else render();
}
const recurMs = r => state.settings[r.every] * 3600000;
const recurLeft = r => Math.max(0, (state.recurrent.last[r.id] || 0) + recurMs(r) - Date.now());
function fmtLeft(ms) { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + pad2(m % 60) + ' min' : m + ' min'; }
function completeRecurrent(id, origin) {
  const r = RECUR.find(x => x.id === id); if (!r) return;
  if (recurLeft(r) > 0) { toast('Disponible de nuevo en ' + fmtLeft(recurLeft(r))); return; }
  state.recurrent.last[id] = Date.now();
  state.recurrent.counts[id] = (state.recurrent.counts[id] || 0) + 1;
  if (id === 'water-repeat') weeklyAdd('water', 1);
  const gain = addXP(r.xp, 'Rutina recurrente: ' + r.name, { origin });
  Native.syncReminders(); sound('complete'); haptic(14);
  toast('+' + gain + ' XP · ' + r.name); save(); render();
}
function allocAttribute(key) {
  if (state.points <= 0 || state.stats[key] == null) return;
  state.points--; state.stats[key]++; sound('select'); haptic(10); save(); render();
}

/* crear / editar / borrar */
function missionFromForm(f, base) {
  const subs = String(f.subs || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12);
  const old = (base && base.subtasks) || [];
  const days = (f.days && f.days.length) ? f.days.map(Number) : [0, 1, 2, 3, 4, 5, 6];
  const m = Object.assign({}, base || {}, {
    id: (base && base.id) || 'custom-' + Date.now(),
    name: f.name.trim().slice(0, 60),
    desc: String(f.desc || '').trim().slice(0, 120),
    xp: clamp(Number(f.xp) || 25, 5, 500),
    type: f.type, priority: f.priority, custom: true,
    icon: TYPE_ICON[f.type] || 'star',
    subtasks: subs.map(t => ({ t, done: !!(old.find(o => o.t === t) || {}).done })),
    reminderEnabled: !!f.reminder, reminderTime: f.time || '18:00', reminderDays: days,
    schedule: f.scheduled ? { days, time: f.time || '18:00' } : null
  });
  if (!base) { m.accepted = false; m.completed = false; }
  return m;
}
function saveMission(f, editId) {
  if (!f.name.trim()) return false;
  if (editId) {
    const cur = findMission(editId);
    if (!cur) return false;
    const next = missionFromForm(f, cur);
    state.missions = state.missions.map(x => x.id === editId ? next : x);
    state.customMissions = state.customMissions.map(x => x.id === editId ? resetSubs(Object.assign({}, next, { completed: false, accepted: false })) : x);
    toast('Misión actualizada');
  } else {
    const m = missionFromForm(f, null);
    state.customMissions.push(resetSubs(Object.assign({}, m)));
    state.missions.push(m);
    toast('Nueva misión creada');
  }
  save(); Native.syncReminders(); render();
  return true;
}
function deleteMission(id) {
  state.missions = state.missions.filter(m => m.id !== id);
  state.customMissions = state.customMissions.filter(m => m.id !== id);
  Native.cancel(id); save(); Native.syncReminders(); render(); toast('Misión eliminada');
}
function setMissionReminder(id, enabled, time, daysMask) {
  const m = findMission(id); if (!m) return;
  m.reminderEnabled = !!enabled;
  if (enabled) { m.reminderTime = time; m.reminderDays = daysMask; }
  const c = state.customMissions.find(x => x.id === id);
  if (c) { c.reminderEnabled = m.reminderEnabled; c.reminderTime = m.reminderTime; c.reminderDays = m.reminderDays; }
  save(); Native.syncReminders(); render();
  toast(enabled ? 'Recordatorio guardado' : 'Recordatorio desactivado');
}

/* ---------- entrenamiento ---------- */
const routineType = () => state.workout.week % 2 === 0 ? 'A' : 'B';
function doSet(id) {
  const type = routineType(), e = ROUTINES[type].find(x => x.id === id), p = state.workout.progress[type] || (state.workout.progress[type] = {});
  if (!e || (p[id] || 0) >= e.sets) return;
  p[id] = (p[id] || 0) + 1; sound('select'); haptic(12); save(); render();
}
function finishWorkout(origin) {
  const type = routineType(), p = state.workout.progress[type] || {};
  if (ROUTINES[type].some(e => (p[e.id] || 0) < e.sets)) return;
  state.workout.sessionDone = true; state.workout.count++;
  bumpDay({ workouts: 1 }); weeklyAdd('workouts', 1);
  addXP(40, 'Rutina completada: ' + type, { origin });
  sound('complete'); haptic([30, 30, 30]); FX.celebrate(origin, 40); save(); render();
}
function workoutFeedback(v) {
  const type = routineType();
  const ad = state.workout.adapt = state.workout.adapt || {};
  ROUTINES[type].forEach(e => {
    const cur = ad[e.id] || e.reps;
    if (v === 'easy') ad[e.id] = Math.min(cur + 1, e.reps + 5);
    if (v === 'hard') ad[e.id] = Math.max(e.reps - 2, cur - 1);
  });
  state.workout.week++; state.workout.sessionDone = false; state.workout.progress = {};
  save(); toast(v === 'easy' ? 'Progresión suave preparada.' : v === 'hard' ? 'Carga ajustada para cuidar la recuperación.' : 'Progresión mantenida.'); render();
}

/* ---------- enfoque (Pomodoro) ---------- */
let focusTicker = 0;
function focusState() { return state.focus.active; }
function focusStart(minutes, kind, missionId) {
  if (state.focus.active) return;
  const now = Date.now();
  state.focus.active = { start: now, end: now + minutes * 60000, minutes, kind, missionId: missionId || '' };
  state.focus.lastDone = null;
  save(); sound('select'); haptic(15);
  Native.scheduleOnce('focus-end', kind === 'focus' ? 'Sesión de enfoque terminada' : 'Descanso terminado', minutes * 60);
  startFocusTicker(); render();
}
function focusCancel() {
  if (!state.focus.active) return;
  state.focus.active = null; Native.cancel('focus-end'); save(); stopFocusTicker(); sound('fail'); render();
}
function focusComplete() {
  const a = state.focus.active; if (!a) return;
  state.focus.active = null; stopFocusTicker(); Native.cancel('focus-end');
  if (a.kind === 'focus') {
    state.focus.sessions++; state.focus.minutes += a.minutes;
    const day = today(); if (state.focus.xpDay.day !== day) state.focus.xpDay = { day, xp: 0 };
    const xp = Math.max(0, Math.min(Math.round(a.minutes * FOCUS_XP_PER_MIN), FOCUS_XP_DAY_CAP - state.focus.xpDay.xp));
    state.focus.xpDay.xp += xp;
    bumpDay({ focus: a.minutes }); weeklyAdd('focus', 1);
    if (xp > 0) addXP(xp, 'Enfoque completado: ' + a.minutes + ' min', { origin: null });
    state.focus.lastDone = { missionId: a.missionId, minutes: a.minutes, xp };
    sound('complete'); haptic([60, 40, 60]); FX.rain();
    toast(xp > 0 ? 'Enfoque completado · +' + xp + ' XP' : 'Enfoque completado (tope diario de XP alcanzado)');
  } else {
    sound('select'); haptic(40); toast('Descanso terminado. ¡Vuelve al enfoque!');
  }
  save(); render();
}
function focusRemaining() { const a = state.focus.active; return a ? Math.max(0, a.end - Date.now()) : 0; }
function focusTick() {
  const a = state.focus.active;
  if (!a) { stopFocusTicker(); return; }
  if (Date.now() >= a.end) { focusComplete(); return; }
  if (typeof updateFocusUI === 'function') updateFocusUI();
}
function startFocusTicker() { if (!focusTicker) focusTicker = setInterval(focusTick, 500); }
function stopFocusTicker() { clearInterval(focusTicker); focusTicker = 0; }

/* ---------- tienda ---------- */
const coinsOf = () => state.coins;
function buy(kind, id) {
  let item, list;
  if (kind === 'theme') { list = THEMES; } else if (kind === 'frame') { list = FRAMES; } else if (kind === 'title') { list = TITLES; } else if (kind === 'item') { list = CONSUMABLES; } else return;
  item = list.find(x => x.id === id); if (!item) return;
  const bucket = kind === 'theme' ? 'themes' : kind === 'frame' ? 'frames' : 'titles';
  if (kind !== 'item' && state.owned[bucket].includes(id)) { equip(kind, id); return; }
  if (state.coins < item.price) { sound('fail'); haptic(40); toast('Te faltan ' + (item.price - state.coins) + ' monedas'); return; }
  if (kind === 'item' && id === 'shield' && state.shields >= 3) { toast('Ya tienes 3 escudos'); return; }
  state.coins -= item.price;
  if (kind === 'item') {
    if (id === 'shield') state.shields++;
    if (id === 'boost') state.boostUntil = Math.max(Date.now(), state.boostUntil) + 24 * 3600 * 1000;
  } else {
    state.owned[bucket].push(id);
    equip(kind, id, true);
  }
  sound('unlock'); haptic(25); save(); render();
  toast(kind === 'item' ? item.name + ' adquirido' : item.name + ' desbloqueado');
}
function equip(kind, id, silent) {
  if (kind === 'theme') { state.theme = id; applyTheme(); }
  if (kind === 'frame') state.frame = id;
  if (kind === 'avatar') state.avatar = id;
  if (kind === 'title') state.title = id;
  save(); if (!silent) { sound('select'); render(); }
}
function applyTheme() {
  const root = document.documentElement;
  let mode = state.settings.mode;
  if (mode === 'auto') mode = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  root.dataset.theme = state.theme; root.dataset.mode = mode;
  root.dataset.fx = state.settings.fx === false ? 'off' : 'on';
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#070910';
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', bg);
  Native.setBars(bg, mode === 'light');
}

/* ---------- recompensa de creador ---------- */
const TIKTOK_URL = 'https://www.tiktok.com/@joserblood/video/7652866593457704212';
const tiktokReady = () => Date.now() - state.tiktokRewardAt >= 86400000;
function tiktokRemaining() { const ms = Math.max(0, 86400000 - (Date.now() - state.tiktokRewardAt)); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; }
function claimTiktok(origin) {
  if (!tiktokReady()) { toast('Recompensa disponible en ' + tiktokRemaining()); return; }
  Native.openUrl(TIKTOK_URL);
  state.tiktokRewardAt = Date.now();
  addXP(100, 'Recompensa TikTok diaria', { origin });
  toast('+100 XP por apoyar al creador'); render();
}

/* ---------- recordatorios en la versión web ---------- */
function webNotify(title, body) {
  try {
    if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'assets/img/icon-192.png', badge: 'assets/img/icon-192.png' }));
      else new Notification(title, { body });
    }
  } catch (e) { /* sin notificaciones */ }
}
function checkReminders() {
  if (Native.has() || !('Notification' in window) || !state.settings.notifications || Notification.permission !== 'granted') return;
  const now = new Date(), hm = pad2(now.getHours()) + ':' + pad2(now.getMinutes()), key = today() + '-' + hm;
  state.missions.forEach(m => {
    if (m.reminderEnabled && !m.completed && m.reminderTime === hm && (m.reminderDays || [0, 1, 2, 3, 4, 5, 6]).includes(now.getDay()) && !state.notified.includes(key + '-' + m.id)) {
      webNotify('Orden pendiente', m.name); state.notified.push(key + '-' + m.id);
    }
  });
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= RECUR_FROM * 60 && minutes < (RECUR_TO + 1) * 60) {
    RECUR.forEach(r => {
      if (!state.settings[r.on]) return;
      const slot = Math.floor((minutes - RECUR_FROM * 60) / (state.settings[r.every] * 60)), id = today() + '-' + r.id + '-' + slot;
      if (!state.notified.includes(id)) { state.notified.push(id); if (recurLeft(r) <= 0) webNotify('Recordatorio de Trabaja', r.name); }
    });
  }
  save();
}
async function toggleNotifications() {
  if (state.settings.notifications) { state.settings.notifications = false; save(); Native.syncReminders(); render(); toast('Recordatorios desactivados'); return; }
  if (Native.has()) { Native.requestNotifications(); return; }
  if (!('Notification' in window)) { toast('Este navegador no admite notificaciones'); return; }
  const p = await Notification.requestPermission();
  state.settings.notifications = p === 'granted'; save(); render();
  toast(p === 'granted' ? 'Notificaciones habilitadas' : 'Permiso no concedido');
}
window.onAndroidPermissionResult = granted => {
  state.settings.notifications = !!granted; save(); Native.syncReminders(); render();
  toast(granted ? 'Permiso de notificaciones concedido' : 'Permiso de notificaciones denegado');
};

/* ---------- respaldo ---------- */
function exportData() { Native.exportFile('trabaja-respaldo-' + today() + '.json', 'application/json', JSON.stringify(state, null, 2)); }
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || !d.stats || (!d.missions && !d.level)) throw new Error('formato');
      confirmDialog({ title: 'Importar respaldo', text: 'Se reemplazará el progreso actual con el del archivo. Acepta también respaldos de SISTEMA Despertar.', ok: 'Importar' }, () => {
        state = migrate(d); state.lastDay = ''; flushSave(); location.reload();
      });
    } catch (e) { toast('Archivo de respaldo no válido'); }
  };
  r.readAsText(file);
}
function resetAll() {
  confirmDialog({ title: 'Restablecer todo', text: 'Se borrará todo tu progreso. Exporta un respaldo antes si quieres conservarlo.', ok: 'Borrar todo', danger: true }, () => {
    state.missions.forEach(m => Native.cancel(m.id)); RECUR.forEach(r => Native.cancel(r.id));
    noSave = true; localStorage.removeItem(KEY); location.reload();
  });
}
function saveProfilePhoto(file) {
  if (!file.type.startsWith('image/')) { toast('Selecciona una imagen válida'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 384, sc = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * sc), h = Math.round(img.height * sc), cv = document.createElement('canvas');
      cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
      try { state.profilePhoto = cv.toDataURL('image/jpeg', .8); state.avatar = ''; save(); render(); toast('Foto de perfil actualizada'); } catch (e) { toast('No se pudo guardar la foto; prueba una imagen más pequeña'); }
    };
    img.onerror = () => toast('No se pudo abrir la imagen');
    img.src = reader.result;
  };
  reader.onerror = () => toast('Error al leer la imagen');
  reader.readAsDataURL(file);
}
