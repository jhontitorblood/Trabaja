'use strict';
/* Trabaja — render sin parpadeo, diálogos y overlays */

let view = 'home', actionTab = 'focus', missionTab = 'today', filter = 'Todas', shopTab = 'themes';
let focusPick = 25, breakPick = 5, focusMissionPick = '', lastView = '';
const main = document.getElementById('main');

/* ---------- morph: actualiza solo lo que cambió ---------- */
function keyOf(n) { return n.nodeType === 1 ? n.getAttribute('data-key') : null; }
function morphAttrs(a, b) {
  for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  const tag = a.nodeName;
  if (tag === 'INPUT' && (a.type === 'checkbox' || a.type === 'radio')) { if (a.checked !== b.checked) a.checked = b.checked; }
  else if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && a !== document.activeElement && a.value !== b.value) a.value = b.value;
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  morphAttrs(a, b);
  if (a.nodeName === 'TEXTAREA') return;
  morphChildren(a, b);
}
function morphChildren(parent, next) {
  const cur = Array.from(parent.childNodes), want = Array.from(next.childNodes);
  const byKey = new Map();
  cur.forEach(c => { const k = keyOf(c); if (k != null) byKey.set(k, c); });
  const used = new Set(), out = [];
  let pos = 0;
  for (const w of want) {
    const k = keyOf(w);
    let m = null;
    if (k != null) { m = byKey.get(k) || null; if (m && used.has(m)) m = null; }
    else {
      while (pos < cur.length) {
        const c = cur[pos++];
        if (used.has(c) || keyOf(c) != null) continue;
        if (c.nodeType === w.nodeType && c.nodeName === w.nodeName) { m = c; break; }
      }
    }
    if (m) { used.add(m); morphNode(m, w); out.push(m); } else out.push(w);
  }
  cur.forEach(c => { if (!used.has(c)) c.remove(); });
  let ref = parent.firstChild;
  for (const n of out) { if (n === ref) ref = ref.nextSibling; else parent.insertBefore(n, ref); }
}
const toFragment = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };

/* ---------- render principal ---------- */
const NAV = [
  { v: 'home', label: 'Inicio', icon: 'home' },
  { v: 'missions', label: 'Misiones', icon: 'list' },
  { v: 'action', label: 'Acción', icon: 'bolt' },
  { v: 'army', label: 'Ejército', icon: 'castle' },
  { v: 'character', label: 'Cazador', icon: 'user' }
];
function buildChrome() {
  buildDayChips('mDayChips'); buildDayChips('rDayChips');
  document.getElementById('topbar').innerHTML =
    '<button class="brand" data-act="nav" data-v="home"><img class="brand-mark" src="assets/img/icon-192.png" alt=""><span><b>CAZADOR DE HÁBITOS</b><small>RPG DE HÁBITOS</small></span></button>' +
    '<div class="top-actions"><button class="coin-chip" data-act="nav" data-v="shop" aria-label="Tienda">' + ic('coin', 18) + '<b id="coinCount">0</b></button>' +
    '<button class="icon-btn" data-act="nav" data-v="settings" aria-label="Ajustes">' + ic('gear', 20) + '</button></div>';
  document.getElementById('nav').innerHTML = '<span class="nav-ind" aria-hidden="true"></span>' +
    NAV.map(n => '<button class="nav-item" data-act="nav" data-v="' + n.v + '" aria-label="' + n.label + '">' + ic(n.icon, 22) + '<small>' + n.label + '</small></button>').join('');
}
/* selector de días (L M X J V S D) */
function buildDayChips(id) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = DAY_LABELS.map(d => '<label class="dchip"><input type="checkbox" value="' + d[0] + '"><span>' + d[1] + '</span></label>').join('');
}
function setDayChips(id, days) { document.querySelectorAll('#' + id + ' input').forEach(i => { i.checked = days.includes(Number(i.value)); }); }
function getDayChips(id) { return Array.from(document.querySelectorAll('#' + id + ' input:checked')).map(i => Number(i.value)); }
const DAY_PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], weekdays: [1, 2, 3, 4, 5], weekend: [0, 6] };

function renderChrome() {
  const idx = NAV.findIndex(n => n.v === view);
  const nav = document.getElementById('nav');
  nav.style.setProperty('--i', Math.max(0, idx));
  nav.classList.toggle('no-active', idx < 0);
  nav.querySelectorAll('.nav-item').forEach((el, i) => { el.classList.toggle('active', i === idx); if (i === idx) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  const c = document.getElementById('coinCount'); if (c) c.textContent = fmt(state.coins);
}
function render() {
  updateDay();
  const fn = { home: viewHome, missions: viewMissions, action: viewAction, army: viewArmy, character: viewCharacter, shop: viewShop, settings: viewSettings }[view] || viewHome;
  const html = fn();
  if (lastView !== view) { main.innerHTML = html; lastView = view; } else morphChildren(main, toFragment(html));
  renderChrome();
  if (view === 'action' && state.focus.active) updateFocusUI();
}
function navigate(v, opts) {
  opts = opts || {};
  if (v === view && !opts.force) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  view = v; sound('menu');
  if (!opts.fromPop) { try { history.pushState({ view: v }, ''); } catch (e) { /* sin historial */ } }
  render(); window.scrollTo({ top: 0 });
}
window.addEventListener('popstate', e => { const v = e.state && e.state.view; if (v && v !== view) { view = v; render(); window.scrollTo({ top: 0 }); } });

/* ---------- diálogos ---------- */
function openDialog(id) { const d = document.getElementById(id); if (d && !d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } return d; }
function closeDialog(id) { const d = document.getElementById(id); if (d && d.open) d.close(); }

let confirmCb = null;
function confirmDialog(o, onOk) {
  confirmCb = onOk;
  document.getElementById('confirmBody').innerHTML =
    '<div class="dialog-head"><div><span class="eyebrow">CONFIRMAR</span><h2>' + esc(o.title) + '</h2></div></div>' +
    '<p class="muted">' + esc(o.text || '') + '</p>' +
    '<div class="modal-actions end"><button type="button" class="btn ghost" data-act="dlgCancel">Cancelar</button><button type="button" class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-act="dlgOk">' + esc(o.ok || 'Aceptar') + '</button></div>';
  openDialog('confirmDialog');
}

let editingMission = '';
function openMissionDialog(id) {
  editingMission = id || '';
  const m = id ? findMission(id) : null;
  const f = document.getElementById('missionForm');
  f.reset();
  document.getElementById('missionDialogTitle').textContent = m ? 'Editar misión' : 'Crear misión';
  document.getElementById('missionSubmit').textContent = m ? 'Guardar cambios' : 'Crear misión';
  document.getElementById('mName').value = m ? m.name : '';
  document.getElementById('mDesc').value = m ? m.desc || '' : '';
  document.getElementById('mXP').value = m ? m.xp : 25;
  document.getElementById('mType').value = m ? m.type : 'Personal';
  document.getElementById('mPriority').value = m ? m.priority : 'media';
  document.getElementById('mSubs').value = m ? (m.subtasks || []).map(s => s.t).join('\n') : '';
  document.getElementById('mScheduled').checked = !!(m && m.schedule);
  document.getElementById('mReminder').checked = !!(m && m.reminderEnabled);
  document.getElementById('mTime').value = (m && ((m.schedule && m.schedule.time) || m.reminderTime)) || '18:00';
  setDayChips('mDayChips', (m && ((m.schedule && m.schedule.days) || m.reminderDays)) || DAY_PRESETS.all);
  openDialog('missionDialog');
}
function submitMission(ev) {
  ev.preventDefault();
  const g = id => document.getElementById(id);
  const days = getDayChips('mDayChips');
  if ((g('mScheduled').checked || g('mReminder').checked) && !days.length) { toast('Elige al menos un día'); return; }
  const ok = saveMission({ name: g('mName').value, desc: g('mDesc').value, xp: g('mXP').value, type: g('mType').value, priority: g('mPriority').value, subs: g('mSubs').value, scheduled: g('mScheduled').checked, reminder: g('mReminder').checked, time: g('mTime').value, days }, editingMission);
  if (ok) { closeDialog('missionDialog'); sound('select'); }
}

let reminderFor = '';
function openReminderDialog(id) {
  const m = findMission(id); if (!m) return;
  reminderFor = id;
  document.getElementById('rTitle').textContent = m.name;
  document.getElementById('rEnabled').checked = !!m.reminderEnabled || !m.reminderTime;
  document.getElementById('rTime').value = m.reminderTime || '18:00';
  setDayChips('rDayChips', m.reminderDays || DAY_PRESETS.all);
  document.getElementById('rNote').textContent = state.settings.notifications ? '' : 'Activa las notificaciones en Ajustes para recibir el aviso.';
  openDialog('reminderDialog');
}
function submitReminder(ev) {
  ev.preventDefault();
  const days = getDayChips('rDayChips');
  if (!days.length) { toast('Elige al menos un día'); return; }
  const time = document.getElementById('rTime').value || '18:00';
  setMissionReminder(reminderFor, document.getElementById('rEnabled').checked, time, days);
  closeDialog('reminderDialog');
}

/* ---------- overlays: nivel, despertar, ficha ---------- */
function levelFX(l) {
  const el = document.createElement('div');
  el.className = 'level-overlay';
  el.innerHTML = '<div class="level-burst">' + ic('sparkle', 72) + '</div><div class="level-title">NIVEL AUMENTADO</div><div class="level-number">' + l + '</div><div class="level-sub">+3 puntos de atributo · El Sistema reconoce tu crecimiento.</div><button class="btn primary" data-act="closeOverlay">Continuar</button>';
  document.body.appendChild(el);
  sound('level'); haptic([50, 40, 80]);
  FX.rain();
  setTimeout(() => el.remove(), 9000);
}
function warriorImg(w, cls) { return '<img class="warrior-art ' + (cls || '') + '" src="' + esc(w.image) + '" alt="' + esc(w.name) + '" loading="lazy" decoding="async">'; }
function showNextAwakening() {
  if (!awakeningQueue.length || document.querySelector('.overlay.awakening')) return;
  const w = awakeningQueue.shift(), el = document.createElement('div');
  el.className = 'overlay awakening';
  el.innerHTML = '<div class="awaken-card"><div class="awaken-label">LOGRO DESBLOQUEADO · NUEVA ENTIDAD</div><div class="awaken-figure">' + warriorImg(w, 'modal-art') + '</div><div class="eyebrow">GUERRERO DESPERTADO</div><h2>' + esc(w.name) + '</h2><div class="awaken-rarity">' + w.rarity.toUpperCase() + ' · ' + esc(w.title.toUpperCase()) + '</div><p>' + esc(w.desc) + '</p><p class="warrior-legend">' + esc(w.legend) + '</p><p class="joined">Se ha unido a tu ejército.</p><button class="btn primary full" data-act="awakenNext">RECLAMAR GUERRERO</button></div>';
  document.getElementById('overlay-root').appendChild(el);
  sound('unlock'); haptic([40, 30, 40, 30, 90]);
  setTimeout(() => FX.rain(), 250);
}
function inspectWarrior(id) {
  const w = WARRIORS.find(x => x.id === id); if (!w) return;
  const d = document.createElement('div');
  d.className = 'overlay';
  d.innerHTML = '<div class="awaken-card"><div class="awaken-figure">' + warriorImg(w, 'modal-art') + '</div><h2>' + esc(w.name) + '</h2><div class="awaken-rarity">' + w.rarity.toUpperCase() + ' · ' + esc(w.title.toUpperCase()) + '</div><p class="warrior-legend">' + esc(w.legend) + '</p><p class="muted">' + esc(w.condition) + '</p><button class="btn primary full" data-act="closeOverlay">Cerrar ficha</button></div>';
  document.getElementById('overlay-root').appendChild(d);
}
