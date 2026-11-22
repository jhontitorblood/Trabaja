'use strict';
/* Trabaja — pantallas (cada función devuelve HTML) */

const fmt = n => Number(n || 0).toLocaleString('es-BO');
const pct = (a, b) => b > 0 ? clamp(a / b * 100, 0, 100) : 0;
const fmtTime = ms => { const s = Math.ceil(ms / 1000); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); };
const titleName = () => (TITLES.find(t => t.id === state.title) || {}).name || '';

/* ---------- piezas ---------- */
function ring(p, size, stroke, inner, cls) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(p, 0, 100) / 100), h = size / 2;
  return '<div class="ring ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle cx="' + h + '" cy="' + h + '" r="' + r + '" class="ring-bg" stroke-width="' + stroke + '"/><circle cx="' + h + '" cy="' + h + '" r="' + r + '" class="ring-fg" stroke-width="' + stroke + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/></svg><div class="ring-in">' + inner + '</div></div>';
}
function avatar(size) {
  const f = FRAMES.find(x => x.id === state.frame);
  const style = f && f.color ? ' style="--frame:' + f.color + '"' : '';
  return '<div class="profile-avatar ' + size + (f && f.color ? ' framed' : '') + '"' + style + '>' + (state.profilePhoto ? '<img src="' + state.profilePhoto + '" alt="Foto de ' + esc(state.name) + '">' : ic('user', size === 'large' ? 44 : 24)) + '</div>';
}
function xpBar() {
  const need = xpNext(), p = pct(state.xp, need);
  return '<div class="xp-track" role="progressbar" aria-valuenow="' + state.xp + '" aria-valuemin="0" aria-valuemax="' + need + '"><div class="xp-fill" style="width:' + p + '%"></div></div><div class="xp-caption"><span>' + state.xp + ' / ' + need + ' XP</span><span>' + (need - state.xp) + ' XP para el siguiente nivel</span></div>';
}
function boostPill() { return boostActive() ? '<span class="pill boost" data-key="boost">' + ic('bolt', 12) + ' XP +50%</span>' : ''; }
function sectionHead(title, right, eyebrow) {
  return '<div class="section-head"><div>' + (eyebrow ? '<span class="eyebrow">' + eyebrow + '</span>' : '') + '<h2>' + title + '</h2></div>' + (right || '') + '</div>';
}
const linkBtn = (label, v) => '<button class="link-btn" data-act="nav" data-v="' + v + '">' + label + ' ' + ic('chev', 12) + '</button>';
function empty(icon, text) { return '<div class="panel empty">' + ic(icon, 34) + '<p>' + text + '</p></div>'; }

function subList(m) {
  if (!m.subtasks || !m.subtasks.length) return '';
  return '<div class="subtasks">' + m.subtasks.map((s, i) => '<button class="sub ' + (s.done ? 'done' : '') + '" data-act="sub" data-id="' + esc(m.id) + '" data-i="' + i + '" ' + (m.completed ? 'disabled' : '') + '><span class="box">' + (s.done ? ic('check', 13) : '') + '</span><span>' + esc(s.t) + '</span></button>').join('') + '</div>';
}
function missionCard(m) {
  const subDone = (m.subtasks || []).filter(s => s.done).length, subTot = (m.subtasks || []).length;
  const pr = PRIORITIES[m.priority] || PRIORITIES.media;
  return '<article class="mission pr-' + m.priority + (m.completed ? ' done' : '') + '" data-key="m-' + esc(m.id) + '">' +
    '<div class="mission-ico">' + ic(m.completed ? 'check' : (m.icon || 'star'), 22) + '</div><div class="mission-body">' +
    '<div class="row"><div class="mission-title">' + esc(m.name) + '</div>' + (m.completed ? '<span class="pill ok">HECHA</span>' : '') + '</div>' +
    '<div class="mission-desc">' + esc(m.desc || 'Orden activa.') + '</div>' +
    '<div class="mission-meta"><span class="pill xp">+' + m.xp + ' XP</span><span class="pill">' + esc(m.type || 'Personal') + '</span><span class="pill pr">' + pr.label + '</span>' +
    (subTot ? '<span class="pill">' + subDone + '/' + subTot + ' pasos</span>' : '') + (m.reminderEnabled ? '<span class="pill">' + ic('bell', 11) + ' ' + esc(m.reminderTime || '') + '</span>' : '') + '</div>' +
    subList(m) +
    '<div class="mission-actions">' + (m.completed ? '<button class="btn success" disabled>' + ic('check', 14) + ' Completada</button>' : '<button class="btn primary" data-act="complete" data-id="' + esc(m.id) + '">Completar</button><button class="btn" data-act="focusFor" data-id="' + esc(m.id) + '" aria-label="Enfocar">' + ic('timer', 15) + '</button>') +
    (!m.completed ? '<button class="btn ghost" data-act="remind" data-id="' + esc(m.id) + '" aria-label="Aviso">' + ic('bell', 15) + '</button>' : '') +
    (m.custom && !m.completed ? '<button class="btn ghost" data-act="editMission" data-id="' + esc(m.id) + '" aria-label="Editar">' + ic('edit', 15) + '</button><button class="btn ghost danger-t" data-act="delMission" data-id="' + esc(m.id) + '" aria-label="Eliminar">' + ic('trash', 15) + '</button>' : '') +
    '</div></div></article>';
}
function sortedMissions(list) {
  return list.slice().sort((a, b) => (a.completed - b.completed) || ((PRIORITIES[a.priority] || PRIORITIES.media).order - (PRIORITIES[b.priority] || PRIORITIES.media).order));
}
function recurrentCards() {
  return RECUR.map(r => {
    const n = state.recurrent.counts[r.id] || 0, iv = state.settings[r.setting] || r.interval;
    return '<div class="recurrent-card" data-key="r-' + r.id + '"><span class="rc-icon">' + ic(r.icon, 22) + '</span><div class="rc-body"><b>' + r.name + '</b><small>' + r.desc + ' · ' + iv + ' min</small></div><span class="count">' + n + '/' + r.max + '</span><button class="btn success" data-act="recurrent" data-id="' + r.id + '" ' + (n >= r.max ? 'disabled' : '') + '>+' + r.xp + ' XP</button></div>';
  }).join('');
}

/* ---------- semana (calendario + racha) ---------- */
function weekStrip() {
  const keys = weekDays(), t = today(), names = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return '<div class="week-strip">' + keys.map((k, i) => {
    const d = state.days[k], on = d && d.xp > 0, fut = k > t;
    return '<div class="wd ' + (on ? 'on ' : '') + (k === t ? 'today ' : '') + (fut ? 'future' : '') + '" data-key="wd-' + k + '"><small>' + names[i] + '</small><span>' + (on ? ic('check', 14) : parseDay(k).getDate()) + '</span></div>';
  }).join('') + '</div>';
}
function heatmap() {
  const t = today(), start = mondayOf(new Date(parseDay(addDays(t, -7 * 11)))), cells = [];
  let max = 1;
  for (let i = 0; i < 84; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = dayKey(d); const xp = (state.days[k] || {}).xp || 0; max = Math.max(max, xp); cells.push({ k, xp }); }
  return '<div class="heat" role="img" aria-label="Actividad de las últimas 12 semanas">' + cells.map(c => {
    const lv = c.k > t ? -1 : c.xp <= 0 ? 0 : Math.min(4, Math.ceil(c.xp / max * 4));
    return '<i class="h' + lv + '" title="' + c.k + ' · ' + c.xp + ' XP"></i>';
  }).join('') + '</div>';
}
function streakCard() {
  const note = state.shieldNote ? '<div class="notice ok-n">' + esc(state.shieldNote) + '</div>' : '';
  return '<div class="panel streak-card"><div class="row"><div class="streak-main"><span class="streak-flame ' + (state.streak > 0 ? 'lit' : '') + '">' + ic('flame', 34) + '</span><div><div class="large-number">' + state.streak + '<small> ' + (state.streak === 1 ? 'día' : 'días') + '</small></div><span class="muted small">Racha activa · mejor ' + state.bestStreak + '</span></div></div>' +
    '<div class="shield-box" title="Escudos de racha">' + ic('shield', 20) + '<b>' + state.shields + '</b><small>escudos</small></div></div>' + weekStrip() + note + '</div>';
}

/* ---------- INICIO ---------- */
function viewHome() {
  const featured = WARRIORS.find(w => w.id === state.featured) || WARRIORS.find(w => state.achievements.includes(w.id));
  const need = xpNext();
  const done = state.missions.filter(m => m.completed).length, total = state.missions.length;
  const pending = sortedMissions(state.missions.filter(m => !m.completed)).slice(0, 3);
  const hello = (() => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; })();
  const art = featured ? '<img class="hero-art" src="' + esc(featured.image) + '" alt="' + esc(featured.name) + '" decoding="async">' : '<div class="hero-art empty-art">' + ic('sparkle', 64) + '</div>';
  return '<section class="view">' +
    '<section class="hero"><div class="hero-glow"></div><div class="hero-copy"><div class="hero-profile">' + avatar('small') + '<div><b>' + esc(state.name) + '</b><small>' + (esc(titleName()) || 'Tu cazador') + '</small></div></div>' +
    '<div class="eyebrow">' + hello.toUpperCase() + ' · ' + parseDay(today()).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'short' }).toUpperCase() + '</div>' +
    '<h1>El sistema<br>te ha elegido.</h1><div class="hero-cta"><button class="btn primary" data-act="nav" data-v="missions">Ver misiones ' + ic('arrow', 14) + '</button><button class="btn" data-act="nav" data-v="action">' + ic('timer', 15) + ' Enfocar</button></div></div>' + art +
    '<div class="hero-ring">' + ring(pct(state.xp, need), 112, 9, '<b>' + state.level + '</b><small>NIVEL</small>', 'big') + '</div></section>' +
    '<div class="level-row"><span class="rank">RANGO ' + state.rank + '</span>' + boostPill() + '<span class="level-tag">' + fmt(state.totalXp) + ' XP totales</span></div>' + xpBar() +
    sectionHead('RACHA Y SEMANA', linkBtn('Detalle', 'character')) + streakCard() +
    sectionHead('OPERACIONES DE HOY', '<small class="muted">' + done + '/' + total + '</small>') +
    '<div class="panel today-bar"><div class="row"><span>Progreso del día</span><b>' + Math.round(pct(done, total)) + '%</b></div><div class="xp-track thin"><div class="xp-fill" style="width:' + pct(done, total) + '%"></div></div></div>' +
    '<div class="mission-list tight">' + (pending.map(missionCard).join('') || empty('trophy', 'Todas las órdenes del día completadas. Descansa y prepara la siguiente jornada.')) + '</div>' +
    (state.missions.filter(m => !m.completed).length > 3 ? '<div class="more-link">' + linkBtn('Ver las ' + (state.missions.filter(m => !m.completed).length - 3) + ' restantes', 'missions') + '</div>' : '') +
    sectionHead('JEFE DE LA SEMANA', linkBtn('Retos', 'missions')) + bossCard(true) +
    sectionHead('RUTINAS DE RESPUESTA', '<small class="muted">Recompensa menor</small>') + '<div class="mission-list tight">' + recurrentCards() + '</div>' +
    sectionHead('RECOMPENSA DE CREADOR', '<small class="muted">Cada 24 horas</small>') +
    '<div class="panel glow creator-reward"><div class="row"><div class="creator-icon" aria-hidden="true">' + ic('music', 22) + '</div><div class="creator-copy"><b>Apoya a JoserBlood en TikTok</b><small class="muted">' + (tiktokReady() ? 'Video disponible · +100 XP' : 'Vuelve en ' + tiktokRemaining()) + '</small></div><button class="btn primary" data-act="tiktok" ' + (tiktokReady() ? '' : 'disabled') + '>+100 XP</button></div></div>' +
    '</section>';
}

/* ---------- jefe y retos ---------- */
function bossCard(compact) {
  const b = state.boss; if (!b.max) return '';
  const p = pct(b.dealt, b.max), dead = b.dealt >= b.max;
  return '<div class="panel boss ' + (dead ? 'dead' : '') + '" data-key="boss"><div class="boss-ico">' + ic(b.icon, 30) + '</div><div class="boss-body"><div class="row"><b>' + esc(b.name) + '</b><span class="pill">' + fmt(b.dealt) + ' / ' + fmt(b.max) + '</span></div>' +
    '<small class="muted">' + esc(b.desc) + '</small><div class="xp-track boss-bar"><div class="xp-fill" style="width:' + p + '%"></div></div>' +
    '<small class="muted">Cada XP que ganas le hace daño. Derrótalo para ganar +120 XP y +150 monedas.</small>' +
    (dead ? (b.claimed ? '<div class="pill ok mt">BOTÍN RECLAMADO</div>' : '<button class="btn gold full mt" data-act="claimBoss">' + ic('gift', 16) + ' Reclamar botín</button>') : '') + '</div></div>';
}
function questsPanel() {
  return '<div class="mission-list tight">' + state.weekly.quests.map(q => {
    const prog = Math.min(q.target, questProgress(q)), ready = prog >= q.target, claimed = state.weekly.claimed[q.id];
    return '<div class="panel quest ' + (claimed ? 'claimed' : '') + '" data-key="q-' + q.id + '"><div class="mission-ico">' + ic(q.icon, 22) + '</div><div class="mission-body"><div class="row"><b>' + esc(questName(q)) + '</b><span class="pill xp">+' + q.xp + ' XP</span></div><div class="xp-track thin"><div class="xp-fill" style="width:' + pct(prog, q.target) + '%"></div></div><div class="row"><small class="muted">' + prog + ' / ' + q.target + ' · +' + q.coins + ' monedas</small>' +
      (claimed ? '<span class="pill ok">RECLAMADO</span>' : '<button class="btn ' + (ready ? 'gold' : '') + '" data-act="claimQuest" data-id="' + q.id + '" ' + (ready ? '' : 'disabled') + '>' + (ready ? 'Reclamar' : 'En curso') + '</button>') + '</div></div></div>';
  }).join('') + '</div>';
}

/* ---------- MISIONES ---------- */
function viewMissions() {
  const tabs = [['today', 'Hoy'], ['week', 'Semana']];
  let body;
  if (missionTab === 'week') {
    body = sectionHead('RETOS SEMANALES', '<small class="muted">Se renuevan el lunes</small>') + questsPanel() + sectionHead('JEFE SEMANAL') + bossCard(false);
  } else {
    const list = sortedMissions(state.missions.filter(m => filter === 'Todas' || (filter === 'Pendientes' && !m.completed) || (filter === 'Completadas' && m.completed)));
    body = '<div class="chips">' + ['Todas', 'Pendientes', 'Completadas'].map(x => '<button class="chip ' + (filter === x ? 'active' : '') + '" data-act="filter" data-v="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<div class="mission-list">' + (list.map(missionCard).join('') || empty('list', 'No hay misiones en este filtro.')) + '</div>' +
      sectionHead('MICRO-ÓRDENES', '<small class="muted">XP limitada por día</small>') + '<div class="mission-list tight">' + recurrentCards() + '</div>' +
      '<div class="notice">Las tareas recurrentes dan XP menor y tienen límite diario. Tómalas como recordatorios, no como presión.</div>';
  }
  return '<section class="view">' + sectionHead('MISIONES', '<button class="btn primary" data-act="newMission">' + ic('plus', 15) + ' Crear</button>', 'TABLERO DE ÓRDENES') +
    '<div class="seg" role="tablist">' + tabs.map(t => '<button class="seg-btn ' + (missionTab === t[0] ? 'active' : '') + '" data-act="mtab" data-v="' + t[0] + '" role="tab">' + t[1] + '</button>').join('') + '</div>' + body + '</section>';
}

/* ---------- ACCIÓN: enfoque + entrenamiento ---------- */
function viewAction() {
  const tabs = [['focus', 'Enfoque'], ['workout', 'Entrenamiento']];
  return '<section class="view"><div class="seg" role="tablist">' + tabs.map(t => '<button class="seg-btn ' + (actionTab === t[0] ? 'active' : '') + '" data-act="atab" data-v="' + t[0] + '" role="tab">' + t[1] + '</button>').join('') + '</div>' +
    (actionTab === 'focus' ? focusPanel() : workoutPanel()) + '</section>';
}
function focusPanel() {
  const a = state.focus.active, cap = FOCUS_XP_DAY_CAP, used = state.focus.xpDay.day === today() ? state.focus.xpDay.xp : 0;
  const pend = state.missions.filter(m => !m.completed);
  const stats = '<div class="two-col"><div class="mini-stat"><small>Sesiones totales</small><b>' + fmt(state.focus.sessions) + '</b></div><div class="mini-stat"><small>Minutos enfocados</small><b>' + fmt(state.focus.minutes) + '</b></div></div>';
  if (a) {
    const total = a.minutes * 60000, left = Math.max(0, a.end - Date.now()), mission = a.missionId ? findMission(a.missionId) : null;
    return '<div class="panel focus-live ' + a.kind + '"><span class="eyebrow">' + (a.kind === 'focus' ? 'SESIÓN DE ENFOQUE' : 'DESCANSO') + '</span>' +
      ring(pct(total - left, total), 236, 12, '<b id="focusClock">' + fmtTime(left) + '</b><small>' + (a.kind === 'focus' ? 'concéntrate' : 'respira') + '</small>', 'timer') +
      (mission ? '<p class="muted">Trabajando en: <b>' + esc(mission.name) + '</b></p>' : '') +
      '<div class="modal-actions center"><button class="btn danger" data-act="focusCancel">' + ic('stop', 15) + ' Cancelar</button></div><small class="muted">Puedes salir de la app; el tiempo sigue corriendo.</small></div>' + stats;
  }
  const last = state.focus.lastDone;
  return (last ? '<div class="panel glow center-t"><div class="done-badge">' + ic('check', 28) + '</div><b>¡Sesión completada!</b><p class="muted small">' + last.minutes + ' minutos' + (last.xp ? ' · +' + last.xp + ' XP' : '') + '. Toma un descanso o inicia otra.</p></div>' : '') +
    '<div class="panel focus-setup"><span class="eyebrow">MODO ENFOQUE</span><h3>¿Cuánto vas a concentrarte?</h3><div class="chips wrap">' + FOCUS_PRESETS.map(m => '<button class="chip big ' + (focusPick === m ? 'active' : '') + '" data-act="fpick" data-v="' + m + '">' + m + ' min</button>').join('') + '</div>' +
    '<label class="field">Misión a trabajar (opcional)<select id="focusMission" data-act="fmission"><option value="">Sin misión específica</option>' + pend.map(m => '<option value="' + esc(m.id) + '" ' + (focusMissionPick === m.id ? 'selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select></label>' +
    '<button class="btn primary full lg" data-act="fstart">' + ic('play', 18) + ' Iniciar enfoque</button><small class="muted">+' + FOCUS_XP_PER_MIN + ' XP por minuto · XP de hoy ' + used + '/' + cap + '</small></div>' +
    '<div class="panel"><span class="eyebrow">DESCANSO</span><div class="row wrap-gap"><div class="chips wrap">' + BREAK_PRESETS.map(m => '<button class="chip ' + (breakPick === m ? 'active' : '') + '" data-act="bpick" data-v="' + m + '">' + m + ' min</button>').join('') + '</div><button class="btn" data-act="bstart">' + ic('play', 15) + ' Iniciar descanso</button></div></div>' + stats;
}
function updateFocusUI() {
  const a = state.focus.active; if (!a) return;
  const left = Math.max(0, a.end - Date.now()), total = a.minutes * 60000;
  const clock = document.getElementById('focusClock'); if (clock) clock.textContent = fmtTime(left);
  const fg = document.querySelector('.focus-live .ring-fg');
  if (fg) { const c = parseFloat(fg.getAttribute('stroke-dasharray')); fg.setAttribute('stroke-dashoffset', (c * (1 - clamp((total - left) / total, 0, 1))).toFixed(2)); }
  document.title = fmtTime(left) + ' · Trabaja';
}
function workoutPanel() {
  const type = routineType(), routine = ROUTINES[type], progress = state.workout.progress[type] || {}, completed = state.workout.sessionDone;
  const doneSets = routine.reduce((s, e) => s + Math.min(progress[e.id] || 0, e.sets), 0), totalSets = routine.reduce((s, e) => s + e.sets, 0);
  return '<div class="row head-row"><div><span class="eyebrow">PROTOCOLO DE ENTRENAMIENTO</span><h2>RUTINA ' + type + '</h2></div><span class="pill">' + state.workout.count + ' sesiones</span></div>' +
    '<div class="panel workout-summary"><b>' + (type === 'A' ? 'Base · cuerpo completo' : 'Equilibrio · cuerpo completo') + '</b><p class="muted small">2–3 días por semana alternando A/B. Calienta 5 minutos y descansa entre series. Ajusta a tu capacidad.</p><div class="xp-track thin"><div class="xp-fill" style="width:' + pct(doneSets, totalSets) + '%"></div></div><div class="row"><span class="pill">' + routine.length + ' ejercicios</span><span class="pill xp">+40 XP al terminar</span></div></div>' +
    (completed ? '<div class="panel glow center-t"><div class="done-badge">' + ic('sparkle', 28) + '</div><h3>Sesión completada</h3><p class="muted">¿Cómo se sintió?</p><div class="modal-actions center"><button class="btn" data-act="wfeed" data-v="easy">Fácil</button><button class="btn primary" data-act="wfeed" data-v="ok">Adecuado</button><button class="btn" data-act="wfeed" data-v="hard">Difícil</button></div><p class="muted small">La progresión es gradual. Si hay dolor, detén el ejercicio.</p></div>' :
      routine.map(e => {
        const n = progress[e.id] || 0, done = n >= e.sets, reps = (state.workout.adapt && state.workout.adapt[e.id]) || e.reps;
        return '<div class="panel workout-ex" data-key="ex-' + e.id + '"><div class="exercise"><div><b>' + e.name + '</b><small>' + e.desc + '</small><small>Objetivo: ' + e.sets + ' × ' + reps + ' ' + e.unit + '</small></div><button class="btn ' + (done ? 'success' : 'primary') + '" data-act="set" data-id="' + e.id + '" ' + (done ? 'disabled' : '') + '>' + (done ? ic('check', 14) + ' Hecho' : 'Serie ' + (n + 1) + '/' + e.sets) + '</button></div><div class="ex-progress"><span style="width:' + (n / e.sets * 100) + '%"></span></div></div>';
      }).join('')) +
    '<div class="notice">Si sientes dolor, mareo o falta de aire inusual, detente. No entrenes a través del dolor. La rutina incluye opciones sin equipo.</div>' +
    (!completed ? '<button class="btn full lg mt" data-act="wfinish" ' + (routine.some(e => (progress[e.id] || 0) < e.sets) ? 'disabled' : '') + '>Finalizar sesión</button>' : '');
}

/* ---------- EJÉRCITO ---------- */
function viewArmy() {
  const got = state.inventory.filter(i => i.shadow).length;
  return '<section class="view">' + sectionHead('EJÉRCITO', '<span class="pill">' + got + '/' + WARRIORS.length + '</span>', 'COLECCIÓN DE DESPERTADOS') +
    '<div class="panel glow"><div class="row"><div><b>Guerreros despiertos</b><small class="muted block">Cada logro revela un aliado original. Toca uno para destacarlo en el inicio.</small></div><div class="large-number">' + got + '</div></div></div>' +
    '<div class="shadow-grid">' + WARRIORS.map(w => {
      const un = state.achievements.includes(w.id), feat = state.featured === w.id;
      return '<div class="shadow-card r-' + w.rarity.toLowerCase().replace('í', 'i').replace('é', 'e') + ' ' + (un ? 'unlocked' : 'locked') + (feat ? ' featured' : '') + '" data-key="w-' + w.id + '">' +
        (feat ? '<span class="feat-badge">' + ic('star', 12) + ' DESTACADO</span>' : '') +
        (un ? warriorImg(w) : '<div class="locked-wrap">' + warriorImg(w, 'locked-art') + '<span class="lock-ico">' + ic('lock', 26) + '</span></div>') +
        '<strong>' + (un ? esc(w.name) : 'Guerrero oculto') + '</strong><small>' + (un ? esc(w.legend) : esc(w.condition)) + '</small><span class="rarity ' + w.rarity.toLowerCase() + '">' + w.rarity.toUpperCase() + '</span>' +
        (un ? '<div class="card-actions"><button class="btn" data-act="inspect" data-id="' + w.id + '">Ver ficha</button><button class="btn ' + (feat ? 'gold' : 'ghost') + '" data-act="feature" data-id="' + w.id + '" aria-label="Destacar">' + ic('star', 15) + '</button></div>' : '') + '</div>';
    }).join('') + '</div>' +
    sectionHead('OBJETOS') + '<div class="mission-list tight">' + state.inventory.filter(i => !i.shadow).map(i => '<div class="inventory-item" data-key="i-' + esc(i.id) + '"><span class="item-icon">' + ic(i.icon, 24) + '</span><div><b>' + esc(i.name) + '</b><small class="muted block">' + esc(i.desc) + '</small><span class="rarity">' + (i.rarity || 'Común').toUpperCase() + '</span></div></div>').join('') + '</div></section>';
}

/* ---------- CAZADOR ---------- */
function viewCharacter() {
  const attrs = ATTRS.map(a => '<div class="attribute-row" data-key="a-' + a.key + '"><div class="attr-left"><div class="attr-icon">' + ic(a.icon, 20) + '</div><div><b>' + a.name + '</b><div class="attr-desc">' + a.desc + '</div></div></div><b class="attr-val">' + state.stats[a.key] + '</b>' + (state.points ? '<button class="btn" data-act="attr" data-id="' + a.key + '" aria-label="Subir ' + a.name + '">' + ic('plus', 14) + '</button>' : '<span></span>') + '</div>').join('');
  const last7 = Array.from({ length: 7 }, (_, i) => { const k = addDays(today(), -6 + i); return { label: parseDay(k).toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', ''), xp: (state.days[k] || {}).xp || 0, k }; });
  const max = Math.max(20, ...last7.map(w => w.xp));
  return '<section class="view">' +
    sectionHead('IDENTIDAD DEL CAZADOR') +
    '<div class="panel profile-edit glow"><div class="profile-edit-head">' + avatar('large') + '<div><span class="eyebrow">PERFIL DEL JUGADOR</span><h3>' + esc(state.name) + '</h3><small class="muted">Nivel ' + state.level + ' · Rango ' + state.rank + (titleName() ? ' · ' + esc(titleName()) : '') + '</small></div></div>' +
    '<label class="profile-label" for="characterName">Nombre de tu personaje</label><div class="profile-name-row"><input id="characterName" maxlength="24" value="' + esc(state.name) + '" placeholder="Nombre del cazador"><button class="btn primary" data-act="saveName">Guardar</button></div>' +
    '<div class="profile-photo-actions"><label class="btn primary" for="profilePhotoInput">' + ic('camera', 16) + ' Elegir foto</label><button class="btn ghost" data-act="rmPhoto" ' + (state.profilePhoto ? '' : 'disabled') + '>Quitar foto</button><input type="file" id="profilePhotoInput" accept="image/*" hidden></div></div>' +
    sectionHead('FICHA DEL CAZADOR') +
    '<div class="panel glow"><div class="row"><div><span class="eyebrow">PUNTOS DE ATRIBUTO</span><div class="large-number">' + state.points + '</div></div><div class="text-right"><span class="eyebrow">MONEDAS</span><div class="large-number coin-num">' + ic('coin', 22) + ' ' + fmt(state.coins) + '</div></div></div>' + attrs + '</div>' +
    sectionHead('CONSTANCIA', '<small class="muted">12 semanas</small>') + '<div class="panel">' + heatmap() + '<div class="heat-legend"><small class="muted">Menos</small><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><small class="muted">Más</small></div></div>' +
    sectionHead('ACTIVIDAD · 7 DÍAS') + '<div class="panel"><div class="bar-chart">' + last7.map(w => '<div class="bar-col" data-key="b-' + w.k + '"><b>' + (w.xp || '') + '</b><div class="bar" style="height:' + Math.max(5, w.xp / max * 70) + 'px"></div><small>' + w.label + '</small></div>').join('') + '</div></div>' +
    sectionHead('LOGROS', '<small class="muted">' + state.achievements.length + '/' + WARRIORS.length + '</small>') +
    '<div class="achievement-grid">' + WARRIORS.map(w => { const un = state.achievements.includes(w.id); return '<div class="achievement ' + (un ? '' : 'locked') + '" data-key="ach-' + w.id + '"><span class="ach-icon">' + ic(un ? 'trophy' : 'lock', 22) + '</span><strong>' + esc(w.title) + '</strong><small>' + esc(w.condition) + '</small></div>'; }).join('') + '</div>' +
    sectionHead('REGISTRO RECIENTE') + '<div class="panel history-list">' + (state.history.slice(0, 8).map((h, i) => '<div class="history-entry" data-key="h-' + i + '-' + esc(h.date) + '">' + new Date(h.date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + esc(h.text) + ' <b class="acc-t">+' + h.xp + ' XP</b></div>').join('') || '<div class="empty-inline">Todavía no hay actividad.</div>') + '</div></section>';
}

/* ---------- TIENDA ---------- */
function shopCard(kind, it, owned, equipped) {
  const prev = kind === 'theme' ? '<div class="swatch" style="--a:' + it.swatch[0] + ';--b:' + it.swatch[1] + '"></div>' : kind === 'frame' ? '<div class="frame-prev" style="' + (it.color ? '--frame:' + it.color : '') + '">' + ic('user', 22) + '</div>' : kind === 'item' ? '<div class="item-prev">' + ic(it.icon, 26) + '</div>' : '<div class="item-prev">' + ic('crown', 24) + '</div>';
  const btn = equipped ? '<button class="btn success" disabled>' + ic('check', 14) + ' En uso</button>' : owned ? '<button class="btn" data-act="equip" data-kind="' + kind + '" data-id="' + esc(it.id) + '">Usar</button>' : '<button class="btn gold" data-act="buy" data-kind="' + kind + '" data-id="' + esc(it.id) + '">' + ic('coin', 14) + ' ' + it.price + '</button>';
  return '<div class="panel shop-card ' + (equipped ? 'equipped' : '') + '" data-key="s-' + kind + '-' + esc(it.id) + '">' + prev + '<div class="shop-body"><b>' + esc(it.name) + '</b>' + (it.desc ? '<small class="muted block">' + esc(it.desc) + '</small>' : '') + '</div>' + btn + '</div>';
}
function viewShop() {
  const tabs = [['themes', 'Temas'], ['frames', 'Marcos'], ['titles', 'Títulos'], ['items', 'Objetos']];
  let body = '';
  if (shopTab === 'themes') body = THEMES.map(t => shopCard('theme', t, state.owned.themes.includes(t.id), state.theme === t.id)).join('');
  if (shopTab === 'frames') body = FRAMES.map(t => shopCard('frame', t, state.owned.frames.includes(t.id), state.frame === t.id)).join('');
  if (shopTab === 'titles') body = TITLES.map(t => shopCard('title', t, state.owned.titles.includes(t.id), state.title === t.id)).join('');
  if (shopTab === 'items') body = CONSUMABLES.map(t => shopCard('item', t, false, false)).join('') + '<div class="notice">Tienes ' + state.shields + ' escudo(s) de racha' + (boostActive() ? ' y un elixir activo hasta las ' + new Date(state.boostUntil).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '') + '.</div>';
  return '<section class="view">' + sectionHead('TIENDA', '<span class="pill gold-p">' + ic('coin', 13) + ' ' + fmt(state.coins) + '</span>', 'GASTA TUS MONEDAS') +
    '<div class="seg" role="tablist">' + tabs.map(t => '<button class="seg-btn ' + (shopTab === t[0] ? 'active' : '') + '" data-act="stab" data-v="' + t[0] + '" role="tab">' + t[1] + '</button>').join('') + '</div><div class="mission-list tight">' + body + '</div></section>';
}

/* ---------- AJUSTES ---------- */
function toggle(setting, label, help) {
  return '<div class="setting-row"><span>' + label + (help ? '<small class="muted block">' + help + '</small>' : '') + '</span><label class="switch"><input type="checkbox" data-setting="' + setting + '" ' + (state.settings[setting] ? 'checked' : '') + '><i></i></label></div>';
}
function selectRow(setting, label, opts) {
  return '<div class="setting-row"><span>' + label + '</span><select data-setting="' + setting + '">' + opts.map(o => '<option value="' + o[0] + '" ' + (String(state.settings[setting]) === String(o[0]) ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
}
function viewSettings() {
  const exact = Native.canExact();
  return '<section class="view">' + sectionHead('AJUSTES DEL SISTEMA', '', 'CONFIGURACIÓN') + '<div class="settings-grid">' +
    '<div class="panel"><h3>' + ic('palette', 18) + ' Apariencia</h3>' +
    selectRow('mode', 'Modo', [['dark', 'Oscuro'], ['light', 'Claro'], ['auto', 'Automático']]) +
    '<div class="setting-row col"><span>Tema de color</span><div class="theme-row">' + THEMES.map(t => { const own = state.owned.themes.includes(t.id); return '<button class="theme-dot ' + (state.theme === t.id ? 'active ' : '') + (own ? '' : 'locked') + '" style="--a:' + t.swatch[0] + ';--b:' + t.swatch[1] + '" data-act="themeDot" data-id="' + t.id + '" aria-label="' + t.name + (own ? '' : ' (bloqueado)') + '">' + (own ? '' : ic('lock', 14)) + '</button>'; }).join('') + '</div><small class="muted">Los temas bloqueados se compran en la <button class="link-btn" data-act="nav" data-v="shop">Tienda</button>.</small></div>' +
    toggle('fx', 'Animaciones y partículas', 'Efectos al completar misiones') + '</div>' +
    '<div class="panel"><h3>' + ic('bell', 18) + ' Notificaciones</h3><div class="setting-row"><span>Permitir notificaciones</span><button class="btn" data-act="notif">' + (state.settings.notifications ? 'Desactivar' : 'Activar') + '</button></div>' +
    selectRow('waterInterval', 'Agua · intervalo', [[60, '60 min'], [90, '90 min'], [120, '120 min'], [180, '180 min']]) +
    selectRow('stretchInterval', 'Pausa activa', [[90, '90 min'], [120, '120 min'], [180, '180 min'], [240, '240 min']]) +
    (Native.has() && exact === false ? '<div class="notice">Las alarmas exactas están desactivadas: los avisos pueden retrasarse. <button class="btn" data-act="exact">Permitir alarmas exactas</button></div>' : '') + '</div>' +
    '<div class="panel"><h3>' + ic('volume', 18) + ' Audio y tacto</h3>' + toggle('music', 'Música ambiental', 'Ambiente RPG oscuro, se puede apagar cuando quieras') + toggle('sound', 'Efectos de sonido') +
    '<div class="setting-row"><span>Volumen</span><input type="range" min="0" max="1" step=".05" data-setting="volume" value="' + state.settings.volume + '"></div>' + toggle('haptics', 'Vibración', 'Respuesta háptica al completar') +
    '<details class="more"><summary>Sonidos individuales</summary>' + Object.entries(state.settings.sounds).map(e => '<div class="setting-row"><span>' + SOUND_LABELS[e[0]] + '</span><label class="switch"><input type="checkbox" data-sound="' + e[0] + '" ' + (e[1] ? 'checked' : '') + '><i></i></label></div>').join('') + '</details></div>' +
    '<div class="panel"><h3>' + ic('download', 18) + ' Datos y respaldo</h3><div class="modal-actions"><button class="btn" data-act="export">' + ic('download', 15) + ' Exportar</button><button class="btn" data-act="import">' + ic('upload', 15) + ' Importar</button><button class="btn danger" data-act="reset">Restablecer</button><input type="file" id="backupFile" accept="application/json,.json" hidden></div><small class="muted block mt">Tus datos viven en este dispositivo. Exporta un respaldo de vez en cuando.</small></div>' +
    '<div class="panel"><h3>' + ic('info', 18) + ' Información</h3><p class="muted small">Trabaja V2.0 · Colección de guerreros, tienda, retos semanales y modo enfoque. Funciona sin conexión después de la primera carga.</p></div>' +
    '</div></section>';
}
