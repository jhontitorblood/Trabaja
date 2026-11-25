'use strict';
/* Trabaja — puente con la app Android (si existe) y alternativas web */
const Native = (() => {
  const B = () => window.AndroidBridge || null;
  const has = () => !!B();
  const call = (fn, ...a) => { try { const b = B(); if (b && typeof b[fn] === 'function') return b[fn](...a); } catch (e) { /* ignora */ } return undefined; };

  function syncReminders() {
    if (!has()) return;
    try {
      const s = state.settings;
      if (s.notifications && !call('hasNotificationsPermission')) { s.notifications = false; save(); }
      if (!s.notifications) {
        state.missions.forEach(m => call('cancelReminder', String(m.id)));
        RECUR.forEach(r => call('cancelReminder', r.id));
        return;
      }
      state.missions.forEach(m => {
        if (m.reminderEnabled && !m.completed && m.reminderTime) {
          const mask = (m.reminderDays || [0, 1, 2, 3, 4, 5, 6]).reduce((a, d) => a | (1 << d), 0);
          call('scheduleReminder', String(m.id), String(m.name), String(m.reminderTime), Number(mask));
        } else call('cancelReminder', String(m.id));
      });
      RECUR.forEach(r => {
        if (s[r.on]) call('scheduleInterval', r.id, r.name, Number(s[r.every]) * 60);
        else call('cancelReminder', r.id);
      });
    } catch (e) { /* el puente puede no estar listo */ }
  }
  const cancel = id => call('cancelReminder', String(id));
  const scheduleOnce = (id, title, seconds) => { if (state.settings.notifications) call('scheduleOnce', String(id), String(title), Math.round(seconds)); };
  const requestNotifications = () => call('requestNotifications');
  const canExact = () => { const v = call('canExactAlarms'); return v === undefined ? null : !!v; };
  const openExactSettings = () => call('openExactAlarmSettings');
  const setBars = (color, light) => call('setBars', String(color), !!light);
  const openUrl = url => { if (has() && B().openTikTok) call('openTikTok', url); else window.open(url, '_blank', 'noopener'); };

  /* Exportar archivos: en Android abre el selector de guardado; en web descarga normal */
  function exportFile(name, mime, text) {
    if (has() && B().exportFile) { call('exportFile', name, mime, text); return; }
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  return { has, syncReminders, cancel, scheduleOnce, requestNotifications, canExact, openExactSettings, setBars, openUrl, exportFile };
})();
window.onAndroidExport = ok => toast(ok ? 'Respaldo guardado' : 'No se guardó el archivo');
