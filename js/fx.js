'use strict';
/* Trabaja — sonido, vibración, partículas y textos flotantes */

const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxEnabled = () => state.settings.fx !== false && !reducedMotion();

/* ---------- sonido: un solo AudioContext, melodías cortas ---------- */
const Sound = (() => {
  let ctx = null;
  const SEQ = {
    menu: [[330, .05, 0]],
    select: [[440, .06, 0], [587, .08, .06]],
    complete: [[523, .09, 0], [659, .09, .09], [784, .18, .18]],
    fail: [[220, .12, 0], [165, .2, .12]],
    level: [[392, .1, 0], [523, .1, .1], [659, .1, .2], [784, .1, .3], [1047, .32, .4]],
    unlock: [[440, .1, 0], [554, .1, .1], [659, .1, .2], [880, .12, .3], [1109, .38, .42]]
  };
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function play(type) {
    if (!state.settings.sound || !(state.settings.sounds && state.settings.sounds[type])) return;
    const c = ac(); if (!c) return;
    const vol = clamp(Number(state.settings.volume), 0, 1) * .55;
    const t0 = c.currentTime + .01;
    (SEQ[type] || SEQ.select).forEach(n => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = n[0];
      const t = t0 + n[2];
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + .12);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + n[1] + .14);
    });
  }
  return { play };
})();
const sound = t => Sound.play(t);

/* ---------- música ambiental ---------- */
const ambient = new Audio('./assets/audio/ambient.mp3');
ambient.loop = true; ambient.preload = 'none';
function musicVolume() { ambient.volume = clamp(Number(state.settings.volume), 0, 1); }
function startMusic() {
  if (!state.settings.music || document.hidden) return;
  musicVolume();
  const p = ambient.play();
  if (p && p.catch) p.catch(() => toast('Toca la pantalla y vuelve a activar la música'));
}
function stopMusic() { ambient.pause(); }
function syncMusic() { if (state.settings.music) startMusic(); else stopMusic(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else syncMusic(); });

/* ---------- vibración ---------- */
function haptic(pattern) {
  if (state.settings.haptics === false) return;
  try {
    if (window.AndroidBridge && AndroidBridge.vibrate) AndroidBridge.vibrate(Array.isArray(pattern) ? pattern[0] : pattern);
    else if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pattern);
  } catch (e) { /* sin vibrador */ }
}

/* ---------- partículas ---------- */
const FX = (() => {
  let canvas, ctx, parts = [], raf = 0;
  function ensure() {
    if (canvas) return true;
    canvas = document.getElementById('fxCanvas');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    resize(); addEventListener('resize', resize);
    return true;
  }
  function resize() {
    const r = window.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * r); canvas.height = Math.round(innerHeight * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    return [cs.getPropertyValue('--acc').trim() || '#9c72ff', cs.getPropertyValue('--acc2').trim() || '#54d9ff', cs.getPropertyValue('--gold').trim() || '#f3c66e', '#ffffff'];
  }
  function burst(x, y, n, power) {
    if (!fxEnabled() || !ensure()) return;
    n = n || 34; power = power || 1;
    const cols = palette();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 5.5) * power;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.2 * power, g: .16 + Math.random() * .06, life: 1, decay: .012 + Math.random() * .014, size: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[i % cols.length], round: Math.random() < .4 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4)); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.3); ctx.fill(); } else { ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); }
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function originOf(el) {
    if (!el || !el.getBoundingClientRect) return { x: innerWidth / 2, y: innerHeight * .4 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function float(text, origin, cls) {
    if (!fxEnabled()) return;
    const p = origin && origin.x != null ? origin : originOf(origin);
    const d = document.createElement('div');
    d.className = 'float-text ' + (cls || '');
    d.textContent = text;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function celebrate(origin, n) { const p = originOf(origin); burst(p.x, p.y, n || 34); }
  function rain() { if (!fxEnabled()) return; for (let i = 0; i < 5; i++) setTimeout(() => burst(innerWidth * (.15 + Math.random() * .7), innerHeight * .25, 24, 1.1), i * 140); }
  return { burst, float, celebrate, rain, originOf };
})();

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
