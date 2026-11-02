'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

/* ---------- Water geometry (EDIT to match Team 1's geometry) ---------- */
const GEOM = {
  OH: 0.9572,   // O–H bond length, Å
  angle: 104.5, // H–O–H angle, degrees
  note: 'Display geometry: standard reference water geometry used for visualisation only. Replace GEOM in script.js with the geometry used by the Hamiltonian team.'
};

/* ---------- Router with page transitions ---------- */
const views = $$('.view'), REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
let currentView = null;
function route() {
  const id = location.hash.slice(1) || 'home';
  const v = views.find(x => x.id === id) || views[0];
  $$('nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + v.id));
  $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
  const show = () => {
    views.forEach(x => x.classList.remove('active', 'leaving')); v.classList.add('active'); currentView = v;
    window.scrollTo(0, 0);
    v.id === 'water' ? water.start() : water.stop();
    if (hooks[v.id]) hooks[v.id]();
    if (v.id !== 'run') clearTimeout(run.timer);
  };
  if (currentView && currentView !== v && !REDUCE) { currentView.classList.add('leaving'); setTimeout(show, 260); } else show();
}
$('#menuBtn').onclick = () => { const o = $('#nav').classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', o); };

/* ---------- 3D water molecule (canvas, no libraries) ---------- */
const water = (() => {
  const stage = $('#stage'), cv = $('#molCanvas'), ctx = cv.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let yaw = .6, pitch = .25, zoom = 1, auto = !calm, labels = true, raf = 0, drag = null, W = 0, H = 0;
  const half = GEOM.angle * Math.PI / 360;
  const P = [[0, 0, 0], [GEOM.OH * Math.sin(half), GEOM.OH * Math.cos(half), 0], [-GEOM.OH * Math.sin(half), GEOM.OH * Math.cos(half), 0]];
  const cy = (P[0][1] + P[1][1] + P[2][1]) / 3; P.forEach(p => p[1] -= cy);
  const A = [
    { n: 'O', r: .5, c: ['#ff9a9e', '#e5484d', '#7a1218'] },
    { n: 'H₁', r: .3, c: ['#ffffff', '#dfe8ff', '#7d93d1'] },
    { n: 'H₂', r: .3, c: ['#ffffff', '#dfe8ff', '#7d93d1'] }];
  const d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const ang = Math.acos(P[1].reduce((s, v, i) => s + (v - P[0][i]) * (P[2][i] - P[0][i]), 0) / (d(P[1], P[0]) * d(P[2], P[0]))) * 180 / Math.PI;

  // geometry panel
  const rows = [['O–H₁ bond', d(P[0], P[1]).toFixed(4) + ' Å'], ['O–H₂ bond', d(P[0], P[2]).toFixed(4) + ' Å'], ['H–O–H angle', ang.toFixed(1) + '°'], ['H···H distance', d(P[1], P[2]).toFixed(4) + ' Å']];
  rows.forEach(([k, v]) => { $('#geom').append(el('dt', '', k), el('dd', '', v)); });
  $('#geomNote').textContent = GEOM.note;
  $('#hud').innerHTML = '<b>H₂O</b>Water molecule<br>' + rows.map(r => r.join(': ')).join('<br>');

  function rot([x, y, z]) {
    const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
    return [x1, y * cP - z1 * sP, y * sP + z1 * cP];
  }
  function resize() {
    const r = devicePixelRatio || 1; W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const u = Math.min(W, H) / 4.2 * zoom, F = 8;
    const pts = P.map((p, i) => { const q = rot(p), s = F / (F - q[2]); return { x: W / 2 + q[0] * u * s, y: H / 2 - q[1] * u * s, z: q[2], s, i }; });
    const items = [];
    [1, 2].forEach(k => items.push({ z: (pts[0].z + pts[k].z) / 2, f: () => {
      const a = pts[0], b = pts[k], g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, '#e5484d'); g.addColorStop(1, '#dfe8ff');
      ctx.strokeStyle = g; ctx.lineWidth = 9 * zoom * (a.s + b.s) / 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (labels) { ctx.fillStyle = '#67e8f9'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(GEOM.OH.toFixed(3) + ' Å', (a.x + b.x) / 2 + 6, (a.y + b.y) / 2 - 12); }
    } }));
    pts.forEach(p => items.push({ z: p.z, f: () => {
      const a = A[p.i], r = a.r * u * p.s * .62, g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .35, r * .1, p.x, p.y, r);
      g.addColorStop(0, a.c[0]); g.addColorStop(.5, a.c[1]); g.addColorStop(1, a.c[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      if (labels) { ctx.fillStyle = '#e6edff'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(a.n, p.x, p.y - r - 8); }
    } }));
    items.sort((a, b) => a.z - b.z).forEach(i => i.f());
    if (labels) { ctx.fillStyle = '#67e8f9'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ang.toFixed(1) + '°', pts[0].x, pts[0].y + 42 * zoom); }
  }
  function loop() { if (auto && !drag) yaw += .008; draw(); raf = requestAnimationFrame(loop); }

  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - drag.x) * .01; pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - drag.y) * .01)); drag = { x: e.clientX, y: e.clientY }; });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => drag = null));
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.5, Math.min(2.5, zoom * (e.deltaY < 0 ? 1.08 : .92))); }, { passive: false });
  const tog = (b, get, set) => b.onclick = () => { set(!get()); b.setAttribute('aria-pressed', get()); };
  tog($('#bLabels'), () => labels, v => labels = v);
  tog($('#bSpin'), () => auto, v => auto = v);
  $('#bSpin').setAttribute('aria-pressed', auto);
  $('#bZoomIn').onclick = () => zoom = Math.min(2.5, zoom * 1.15);
  $('#bZoomOut').onclick = () => zoom = Math.max(.5, zoom / 1.15);
  $('#bReset').onclick = () => { yaw = .6; pitch = .25; zoom = 1; };
  $('#fsBtn').onclick = () => {
    if (stage.requestFullscreen) document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen().catch(() => stage.classList.toggle('fs'));
    else stage.classList.toggle('fs');
  };
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
  addEventListener('keydown', e => { if (e.key === 'Escape') stage.classList.remove('fs'); });
  new ResizeObserver(resize).observe(stage);
  return { start() { resize(); if (!raf) loop(); }, stop() { cancelAnimationFrame(raf); raf = 0; } };
})();

/* ---------- Hamiltonian summary (Input page) ---------- */
function renderHam(a, host) {
  host.replaceChildren();
  const n = a.length, q = String(a[0].pauli).length;
  const idT = a.find(t => /^I+$/.test(t.pauli));
  const l1 = a.reduce((s, t) => s + Math.abs(t.real), 0);
  const maxIm = Math.max(...a.map(t => Math.abs(t.imag || 0)));
  const wt = a.map(t => [...t.pauli].filter(c => c !== 'I').length), hist = {};
  wt.forEach(w => hist[w] = (hist[w] || 0) + 1);
  const st = el('div', 'stats');
  [['Pauli terms', n], ['Qubits', q], ['Identity coefficient (Ha)', idT ? idT.real.toFixed(6) : '—'], ['Σ|coefficients| (Ha)', l1.toFixed(4)], ['Largest |imag part|', maxIm.toExponential(1)]]
    .forEach(([l, v]) => { const c = el('div'); c.append(el('span', '', l), el('b', '', String(v))); st.append(c); });
  host.append(st, el('h3', '', 'Terms by Pauli weight (non-identity operators)'));
  const hb = el('div', 'hbars'), mx = Math.max(...Object.values(hist));
  Object.keys(hist).sort((x, y) => x - y).forEach(w => { const r = el('div'), bar = el('i'); r.append(el('span', '', 'weight ' + w), bar, el('span', 'mono', String(hist[w]))); hb.append(r); setTimeout(() => bar.style.width = hist[w] / mx * 100 + '%', 80); });
  host.append(hb, el('h3', '', 'Ten largest terms'));
  const tb = el('table'), hr = el('tr'), w = el('div', 'tw');
  ['Pauli string', 'Coefficient (Ha)'].forEach(h => hr.append(el('th', '', h))); tb.append(hr);
  a.filter(t => !/^I+$/.test(t.pauli)).sort((x, y) => Math.abs(y.real) - Math.abs(x.real)).slice(0, 10)
    .forEach(t => { const tr = el('tr'); tr.append(el('td', 'mono', t.pauli), el('td', 'mono', t.real.toFixed(8))); tb.append(tr); });
  w.append(tb); host.append(w);
}
const isHam = j => Array.isArray(j) && j.length && typeof j[0].pauli === 'string' && typeof j[0].real === 'number';
let hamDone = false;
async function loadHam() {
  if (hamDone) return;
  try {
    const r = await fetch('data/water_hamiltonian.json'); if (!r.ok) throw 0;
    const j = await r.json(); if (!isHam(j)) throw 0;
    hamDone = true; renderHam(j, $('#ham'));
  } catch (e) { $('#ham').replaceChildren(el('p', 'note', 'Could not load data/water_hamiltonian.json. Open the site through a web server (see README), or drop the file in the box below.')); }
}

/* ---------- Input: local file viewer (nothing is uploaded) ---------- */
const fileList = $('#files'), inEmpty = $('#inEmpty');
const parseCSV = t => t.trim().split(/\r?\n/).map(l => { const r = []; let c = '', q = 0; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(c); c = ''; } else c += ch; } r.push(c); return r; });
const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
function addFile(f) {
  inEmpty.hidden = true;
  const card = el('div', 'file'), ext = (f.name.split('.').pop() || '').toLowerCase();
  card.append(el('h4', '', f.name), el('small', '', kb(f.size) + (f.type ? ' · ' + f.type : '')));
  fileList.append(card);
  if (/^(png|jpe?g|svg|gif|webp)$/.test(ext)) { const i = el('img'); i.src = URL.createObjectURL(f); i.alt = f.name; card.append(i); return; }
  if (!/^(json|csv|txt|md|ipynb)$/.test(ext)) { card.append(el('p', 'note', 'Stored in this session only. No preview for this file type.')); return; }
  const rd = new FileReader();
  rd.onerror = () => card.append(el('p', 'note', 'Could not read this file.'));
  rd.onload = () => {
    const t = String(rd.result);
    try {
      if (ext === 'csv') {
        const rows = parseCSV(t), tb = el('table'), w = el('div', 'tw');
        rows.slice(0, 51).forEach((r, i) => { const tr = el('tr'); r.forEach(c => tr.append(el(i ? 'td' : 'th', '', c))); tb.append(tr); });
        card.append(el('p', 'note', rows.length - 1 + ' data rows, ' + rows[0].length + ' columns' + (rows.length > 51 ? ' (first 50 shown)' : '')), w); w.append(tb);
      } else if (ext === 'json' || ext === 'ipynb') {
        const j = JSON.parse(t);
        if (isHam(j)) { const h = el('div'); card.append(h); renderHam(j, h); return; }
        const s = Array.isArray(j) ? 'Array with ' + j.length + ' items' : j && typeof j === 'object' ? 'Object with keys: ' + Object.keys(j).slice(0, 12).join(', ') + (Object.keys(j).length > 12 ? '…' : '') : String(typeof j);
        const out = JSON.stringify(j, null, 2);
        card.append(el('p', 'note', s), el('pre', '', out.length > 3000 ? out.slice(0, 3000) + '\n… (truncated)' : out));
      } else card.append(el('pre', '', t.length > 3000 ? t.slice(0, 3000) + '\n… (truncated)' : t));
    } catch (e) { card.append(el('p', 'note', 'Parse error: ' + e.message), el('pre', '', t.slice(0, 1500))); }
  };
  rd.readAsText(f);
}
const drop = $('#drop');
$('#fileIn').onchange = e => { [...e.target.files].forEach(addFile); e.target.value = ''; };
['dragover', 'dragenter'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => [...e.dataTransfer.files].forEach(addFile));
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileIn').click(); } });
$('#clearIn').onclick = () => { $$('.file', fileList).forEach(x => x.remove()); inEmpty.hidden = false; };

/* ---------- Recorded VQE run ---------- */
const CP = window.VQE_RUN.checkpoints, SUM = window.VQE_RUN.summary, SET = window.VQE_RUN.setup;
const f10 = v => v.toFixed(10);
const sp = (c, t) => { const s = el('span', c, t); return s; };
const ease = t => 1 - Math.pow(1 - t, 3);
function tween(ms, fn, done) { const t0 = performance.now(); (function s(now) { const p = Math.min(1, (now - t0) / ms); fn(ease(p)); p < 1 ? requestAnimationFrame(s) : done && done(); })(t0); }

/* Output 1: gradual replay */
const run = { timer: 0, i: 0, prevBest: null };
const term = $('#term');
function line(parts, cls) { const d = el('span', 'ln ' + (cls || '')); parts.forEach(p => d.append(typeof p === 'string' ? document.createTextNode(p) : p)); term.append(d); term.scrollTop = term.scrollHeight; return d; }
function setLive(c) { $('#lvN').textContent = c ? c[0] : 0; $('#lvC').textContent = c ? f10(c[1]) : '—'; $('#lvB').textContent = c ? f10(c[2]) : '—'; $('#lvT').textContent = (c ? c[3].toFixed(1) : '0.0') + ' s'; $('#bar').style.width = c ? c[0] / SET.maxEvaluations * 100 + '%' : '0%'; }
function runReset() { clearTimeout(run.timer); run.i = 0; run.prevBest = null; term.replaceChildren(); setLive(null); line([sp('d', '$ python vqe_uccsd_cobyla.py')]); line([sp('d', 'Ansatz: '), SET.ansatz, sp('d', '  ·  Optimiser: '), SET.optimizer, sp('d', '  ·  Max evaluations: '), String(SET.maxEvaluations)]); }
function runLine(c) {
  const nb = run.prevBest !== null && c[2] < run.prevBest - 1e-12;
  const parts = [sp('d', 'Evaluations: '), String(c[0]).padEnd(4), sp('d', '| Current: '), sp('cu', f10(c[1]) + ' Ha'), sp('d', ' | Best: '), sp('be', f10(c[2]) + ' Ha'), sp('d', ' | Time: '), sp('ti', c[3].toFixed(1) + 's')];
  if (nb) parts.push(sp('ok', '  ▲ new best'));
  run.prevBest = c[2]; line(parts); setLive(c);
}
function runFinish() {
  line(['']); line([sp('ok', 'Optimization finished')]);
  line([sp('d', 'Best electronic energy: '), sp('be', SUM.bestElectronicEnergy + ' Hartree')]);
  line([sp('d', 'Evaluations: '), String(SUM.evaluations)]);
  line([sp('d', 'Optimizer converged: '), sp(SUM.converged ? 'ok' : 'bad', SUM.converged ? 'True' : 'False')]);
  line([sp('d', 'Message: '), SUM.message]); line([sp('d', 'Elapsed time: '), sp('ti', SUM.elapsedSeconds + ' seconds')]);
}
function runStep() { if (run.i >= CP.length) return runFinish(); runLine(CP[run.i++]); run.timer = setTimeout(runStep, 520); }
function runPlay() { runReset(); run.timer = setTimeout(runStep, 600); }
function runSkip() { clearTimeout(run.timer); while (run.i < CP.length) runLine(CP[run.i++]); if (!term.textContent.includes('Optimization finished')) runFinish(); }
$('#runPlay').onclick = runPlay; $('#runSkip').onclick = runSkip;

/* Output 2: iterations vs energy graph */
const gc = { prog: 1, zoom: false, hover: -1 };
function drawGraph() {
  const cv = $('#gchart'); if (cv.offsetParent === null) return;
  const r = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * r; cv.height = H * r;
  const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, W, H);
  const m = { l: 88, r: 22, t: 22, b: 56 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const all = CP.flatMap(p => [p[1], p[2]]); let lo = Math.min(...all), hi = Math.max(...all);
  if (gc.zoom) { lo = -84.251; hi = -84.222; } else { const pd = (hi - lo) * .06; lo -= pd; hi += pd; }
  const X = n => m.l + n / 300 * pw, Y = v => H - m.b - (v - lo) / (hi - lo) * ph, dec = gc.zoom ? 4 : 3;
  c.font = '12px "JetBrains Mono",monospace'; c.lineWidth = 1;
  for (let k = 0; k <= 6; k++) { const v = lo + (hi - lo) * k / 6, y = Y(v); c.strokeStyle = 'rgba(120,140,220,.18)'; c.beginPath(); c.moveTo(m.l, y); c.lineTo(W - m.r, y); c.stroke(); c.fillStyle = '#9fb0dc'; c.textAlign = 'right'; c.fillText(v.toFixed(dec), m.l - 8, y + 4); }
  for (let n = 0; n <= 300; n += 50) { const x = X(n); c.strokeStyle = 'rgba(120,140,220,.12)'; c.beginPath(); c.moveTo(x, m.t); c.lineTo(x, H - m.b); c.stroke(); c.fillStyle = '#9fb0dc'; c.textAlign = 'center'; c.fillText(n, x, H - m.b + 20); }
  c.font = '600 13px Inter,system-ui'; c.fillStyle = '#c7d2fe'; c.textAlign = 'center'; c.fillText('Iteration (function evaluations)', m.l + pw / 2, H - 10);
  c.save(); c.translate(18, m.t + ph / 2); c.rotate(-Math.PI / 2); c.fillText('Energy (Hartree)', 0, 0); c.restore();
  c.save(); c.beginPath(); c.rect(m.l - 6, m.t, pw * gc.prog + 6, ph); c.clip();
  const line = (i, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); CP.forEach((p, k) => k ? c.lineTo(X(p[0]), Y(p[i])) : c.moveTo(X(p[0]), Y(p[i]))); c.stroke(); };
  const g = c.createLinearGradient(0, m.t, 0, H - m.b); g.addColorStop(0, 'rgba(34,211,238,.22)'); g.addColorStop(1, 'rgba(34,211,238,0)');
  c.fillStyle = g; c.beginPath(); CP.forEach((p, k) => k ? c.lineTo(X(p[0]), Y(p[2])) : c.moveTo(X(p[0]), Y(p[2]))); c.lineTo(X(300), H - m.b); c.lineTo(X(10), H - m.b); c.fill();
  c.shadowColor = '#f472b6'; c.shadowBlur = 10; line(1, '#f472b6', 2.5); c.shadowColor = '#22d3ee'; line(2, '#22d3ee', 3); c.shadowBlur = 0;
  CP.forEach(p => { [[1, '#f472b6'], [2, '#22d3ee']].forEach(([i, col]) => { c.fillStyle = col; c.beginPath(); c.arc(X(p[0]), Y(p[i]), 3.6, 0, 7); c.fill(); }); });
  c.restore();
  if (gc.hover >= 0 && gc.prog >= 1) {
    const p = CP[gc.hover], x = X(p[0]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x, m.t); c.lineTo(x, H - m.b); c.stroke(); c.setLineDash([]);
    const tx = ['Iteration ' + p[0], 'Current ' + p[1].toFixed(8) + ' Ha', 'Best    ' + p[2].toFixed(8) + ' Ha'], bw = 250, bh = 64, bx = Math.min(Math.max(x + 12, m.l), W - bw - 6);
    c.fillStyle = 'rgba(6,10,32,.94)'; c.strokeStyle = '#a78bfa'; c.lineWidth = 1; c.beginPath(); c.roundRect(bx, m.t + 8, bw, bh, 8); c.fill(); c.stroke();
    c.textAlign = 'left'; c.font = '12px "JetBrains Mono",monospace'; ['#fbbf24', '#f9a8d4', '#67e8f9'].forEach((col, k) => { c.fillStyle = col; c.fillText(tx[k], bx + 10, m.t + 28 + k * 17); });
  }
}
function playGraph() { gc.prog = 0; gc.hover = -1; tween(1500, p => { gc.prog = p; drawGraph(); }); }
$('#gchart').addEventListener('pointermove', e => {
  const cv = e.target, b = cv.getBoundingClientRect(), n = ((e.clientX - b.left) - 88) / (b.width - 110) * 300;
  const i = Math.max(0, Math.min(CP.length - 1, Math.round(n / 10) - 1)); if (i !== gc.hover) { gc.hover = i; drawGraph(); }
});
$('#gchart').addEventListener('pointerleave', () => { gc.hover = -1; drawGraph(); });
$('#gZoom').onclick = e => { gc.zoom = !gc.zoom; e.target.setAttribute('aria-pressed', gc.zoom); e.target.textContent = gc.zoom ? 'Show full range' : 'Zoom to converged region'; playGraph(); };
const hiC = CP.reduce((a, p) => p[1] > a[1] ? p : a);
$('#gNote').textContent = 'Energies are electronic-only. The spike between evaluations 30 and 60 (peak ' + hiC[1].toFixed(4) + ' Ha at iteration ' + hiC[0] + ') is where COBYLA explored worse parameters; the best-so-far line never rose. It was still falling slowly at evaluation 300.';
addEventListener('resize', drawGraph);

/* Output 3: final results */
let resShown = false;
function showResults() {
  const e = $('#bigE'), fin = SUM.bestElectronicEnergy, st = $('#resStats'), first = CP[0][2];
  tween(1800, p => { e.textContent = p < 1 ? (-84 + (fin + 84) * p).toFixed(8) : String(fin); });
  if (resShown) return; resShown = true;
  [['Evaluations', SUM.evaluations], ['Elapsed time', SUM.elapsedSeconds + ' s'], ['Optimizer', SET.optimizer + ' (' + SET.ansatz + ' ansatz)'], ['Converged', SUM.converged ? 'True' : 'False'], ['Improvement since eval 10 (best)', (first - fin).toFixed(6) + ' Ha']]
    .forEach(([l, v]) => { const c = el('div'); c.append(el('span', '', l), el('b', '', String(v))); st.append(c); });
  [['Stop reason: ' + SUM.message + ' So the optimiser stopped because it ran out of evaluations, not because it found a minimum.'],
   ['The best-so-far energy was still decreasing at the end, so more evaluations could lower it further.'],
   ['This is the electronic energy only. Nuclear repulsion is added separately for the total energy, and it is not included here.'],
   ['No reference value was provided, so this page makes no claim about accuracy against experiment or other methods.']]
    .forEach(([t]) => $('#resNotes').append(el('li', '', t)));
}

/* page hooks */
const hooks = { input: loadHam, run: runPlay, graph: playGraph, results: showResults };
addEventListener('hashchange', route);
route();
