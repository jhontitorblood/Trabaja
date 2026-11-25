'use strict';
/* Trabaja — eventos y arranque */

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const a = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
  const origin = FX.originOf(el);
  switch (a) {
    case 'nav': navigate(v); break;
    case 'complete': completeMission(id, origin); break;
    case 'sub': toggleSub(id, Number(el.dataset.i), origin); break;
    case 'recurrent': completeRecurrent(id, origin); break;
    case 'focusFor': focusMissionPick = id; actionTab = 'focus'; navigate('action', { force: true }); break;
    case 'remind': openReminderDialog(id); break;
    case 'newMission': openMissionDialog(); break;
    case 'editMission': openMissionDialog(id); break;
    case 'delMission': confirmDialog({ title: 'Eliminar misión', text: 'Se quitará de hoy y de las próximas jornadas.', ok: 'Eliminar', danger: true }, () => deleteMission(id)); break;
    case 'filter': filter = v; sound('select'); render(); break;
    case 'mtab': missionTab = v; sound('select'); render(); break;
    case 'atab': actionTab = v; sound('select'); render(); break;
    case 'stab': shopTab = v; sound('select'); render(); break;
    case 'fpick': focusPick = Number(v); sound('select'); render(); break;
    case 'bpick': breakPick = Number(v); sound('select'); render(); break;
    case 'fstart': focusStart(focusPick, 'focus', focusMissionPick); break;
    case 'bstart': focusStart(breakPick, 'break', ''); break;
    case 'focusCancel': confirmDialog({ title: 'Cancelar sesión', text: 'Perderás el progreso de esta sesión y no ganarás XP.', ok: 'Cancelar sesión', danger: true }, focusCancel); break;
    case 'set': doSet(id); break;
    case 'wfinish': finishWorkout(origin); break;
    case 'wfeed': workoutFeedback(v); break;
    case 'attr': allocAttribute(id); break;
    case 'claimBoss': claimBoss(); break;
    case 'claimQuest': claimQuest(id, origin); break;
    case 'buy': buy(el.dataset.kind, id); break;
    case 'equip': equip(el.dataset.kind, id); break;
    case 'themeDot': if (state.owned.themes.includes(id)) equip('theme', id); else { toast('Tema bloqueado: cómpralo en la Tienda'); sound('fail'); } break;
    case 'inspect': inspectWarrior(id); break;
    case 'feature': state.featured = state.featured === id ? '' : id; save(); sound('select'); render(); break;
    case 'tiktok': claimTiktok(origin); break;
    case 'saveName': {
      const inp = document.getElementById('characterName'), n = inp.value.trim().slice(0, 24);
      if (!n) { toast('Escribe un nombre'); break; }
      state.name = n; save(); sound('select'); render(); toast('Nombre guardado'); break;
    }
    case 'rmPhoto': state.profilePhoto = ''; save(); render(); toast('Foto eliminada'); break;
    case 'notif': toggleNotifications(); break;
    case 'exact': Native.openExactSettings(); break;
    case 'export': exportData(); break;
    case 'import': document.getElementById('backupFile').click(); break;
    case 'reset': resetAll(); break;
    case 'closeOverlay': { const o = el.closest('.overlay, .level-overlay'); if (o) o.remove(); break; }
    case 'awakenNext': { const o = el.closest('.overlay'); if (o) o.remove(); sound('select'); setTimeout(showNextAwakening, 250); break; }
    case 'dlgCancel': confirmCb = null; closeDialog('confirmDialog'); break;
    case 'dlgOk': { const cb = confirmCb; confirmCb = null; closeDialog('confirmDialog'); if (cb) cb(); break; }
    case 'dayPreset': setDayChips(el.dataset.target, DAY_PRESETS[v]); sound('select'); break;
    case 'closeMission': closeDialog('missionDialog'); break;
    case 'closeReminder': closeDialog('reminderDialog'); break;
  }
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'profilePhotoInput' && t.files[0]) { saveProfilePhoto(t.files[0]); t.value = ''; return; }
  if (t.id === 'backupFile' && t.files[0]) { importData(t.files[0]); t.value = ''; return; }
  if (t.dataset.act === 'fmission') { focusMissionPick = t.value; return; }
  if (t.dataset.setting) {
    const k = t.dataset.setting;
    if (t.type === 'checkbox') state.settings[k] = t.checked;
    else if (t.type === 'range') state.settings[k] = Number(t.value);
    else if (k === 'mode') state.settings[k] = t.value;
    else state.settings[k] = isNaN(Number(t.value)) ? t.value : Number(t.value);
    save();
    if (k === 'music' || k === 'sound' || k === 'volume') { musicVolume(); syncMusic(); }
    if (k === 'mode' || k === 'fx') applyTheme();
    if (RECUR.some(r => r.on === k || r.every === k)) Native.syncReminders();
    if (k === 'haptics' && t.checked) haptic(20);
    if (k !== 'volume') sound('select');
    render();
  }
  if (t.dataset.sound) { state.settings.sounds[t.dataset.sound] = t.checked; save(); sound(t.dataset.sound); }
});
document.addEventListener('input', ev => { if (ev.target.dataset.setting === 'volume') { state.settings.volume = Number(ev.target.value); musicVolume(); save(); } });

document.getElementById('missionForm').addEventListener('submit', submitMission);
document.getElementById('reminderForm').addEventListener('submit', submitReminder);
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

/* feedback táctil: ripple ligero en botones */
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest('.btn, .nav-item, .chip, .seg-btn');
  if (!b || b.disabled || !fxEnabled()) return;
  const r = b.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'ripple';
  const size = Math.max(r.width, r.height) * 1.6;
  s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (ev.clientX - r.left - size / 2) + 'px;top:' + (ev.clientY - r.top - size / 2) + 'px';
  b.appendChild(s); setTimeout(() => s.remove(), 600);
}, { passive: true });

/* ---------- relojes: cuenta atrás del jefe y misiones/rutinas que aparecen con la hora ---------- */
let lastMinute = '';
function tickClocks() {
  if (document.hidden) return;
  const now = Date.now();
  document.querySelectorAll('.boss-clock').forEach(el => {
    const end = Number(el.dataset.end);
    if (now >= end) { render(); return; }
    el.textContent = bossClockText(end - now);
  });
  const hm = hmNow();
  if (hm !== lastMinute) { lastMinute = hm; if (view === 'home' || view === 'missions' || view === 'action') render(); }
}

/* ---------- arranque ---------- */
function boot() {
  buildChrome();
  applyTheme();
  updateDay();
  render();
  Native.syncReminders();
  checkReminders();
  if (state.focus.active) { if (Date.now() >= state.focus.active.end) focusComplete(); else startFocusTicker(); }
  checkUnlocks();
  setInterval(checkReminders, 30000);
  setInterval(tickClocks, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateDay(); render(); if (state.focus.active) focusTick(); } });
  if (state.settings.mode === 'auto' && window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
  // la música solo puede empezar tras un gesto del usuario
  if (state.settings.music) document.addEventListener('pointerdown', function once() { document.removeEventListener('pointerdown', once); syncMusic(); }, { once: true });
  try { history.replaceState({ view }, ''); } catch (e) { /* sin historial */ }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !Native.has()) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.getElementById('splash').classList.add('hide');
  setTimeout(() => { const s = document.getElementById('splash'); if (s) s.remove(); }, 600);
}
boot();
