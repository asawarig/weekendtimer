(() => {
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const COLORS = ['#e2352b', '#3a9bd9', '#6a4ce0', '#f5b82e', '#a2482a', '#1f6b6b', '#2fa35a', '#ef7d2d'];
  // Where a "work day" starts when comparing times. Logging off at 6 AM is very late, not early.
  const DAY_START = 600;    // 10:00 AM for regular workers
  const NIGHT_START = 1080; // 6:00 PM for night-shift workers
  const STORE_KEY = 'logoff-clock-answer';

  const cfg = window.CLOCK_CONFIG || {};
  const LIVE = Boolean(cfg.sheetUrl);
  const CITY_SET = new Set(window.CITIES);
  const JOB_SET = new Set(window.OCCUPATIONS);

  // ---------- Helpers ----------
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmt = mins => {
    const h24 = Math.floor(mins / 60) % 24, m = mins % 60;
    const h = h24 % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  };
  const norm = (t, start = DAY_START) => (t - start + 1440) % 1440;
  const avg = (list, start = DAY_START) => {
    if (!list.length) return null;
    const s = list.reduce((a, t) => a + norm(t, start), 0) / list.length;
    return Math.round((s + start) % 1440);
  };
  const diffText = (mine, other, start = DAY_START) => {
    const d = norm(mine, start) - norm(other, start);
    if (Math.abs(d) < 5) return 'right on time with';
    const h = Math.floor(Math.abs(d) / 60), m = Math.abs(d) % 60;
    const span = (h ? `${h}h ` : '') + (m ? `${m}m` : '');
    return `${span.trim()} ${d < 0 ? 'earlier than' : 'later than'}`;
  };
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const today = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Clock face ----------
  function drawFace(svg, { fill = '#f5b82e' } = {}) {
    svg.innerHTML = '';
    const face = el('g', { filter: 'url(#crayon)' }, svg);
    el('circle', { cx: 200, cy: 200, r: 186, fill: '#161616' }, face);
    el('circle', { cx: 200, cy: 200, r: 176, fill }, face);
    el('circle', { cx: 200, cy: 200, r: 150, fill: '#fffdf8', opacity: 0.55 }, face);
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, big = i % 5 === 0;
      const r1 = big ? 152 : 160, r2 = 170;
      el('line', {
        x1: 200 + Math.sin(a) * r1, y1: 200 - Math.cos(a) * r1,
        x2: 200 + Math.sin(a) * r2, y2: 200 - Math.cos(a) * r2,
        stroke: '#161616', 'stroke-width': big ? 6 : 2.5, 'stroke-linecap': 'round',
      }, face);
    }
    const nums = el('g', {}, svg);
    for (let i = 1; i <= 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const t = el('text', {
        x: 200 + Math.sin(a) * 126, y: 200 - Math.cos(a) * 126 + 11,
        'text-anchor': 'middle', 'font-size': 34, fill: '#161616',
      }, nums);
      t.textContent = i;
    }
    return svg;
  }

  function hand(parent, angleDeg, length, width, color) {
    const g = el('g', { transform: `rotate(${angleDeg} 200 200)`, filter: 'url(#crayon)' }, parent);
    el('path', {
      d: `M200 ${200 + 18} L200 ${200 - length}`,
      stroke: '#161616', 'stroke-width': width + 6, 'stroke-linecap': 'round',
    }, g);
    el('path', {
      d: `M200 ${200 + 18} L200 ${200 - length}`,
      stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
    }, g);
    return g;
  }

  // ---------- Step 1: picker clock ----------
  const pick = $('pickClock');
  let minutes = 18 * 60; // default 6:00 PM

  function renderPicker() {
    drawFace(pick);
    const h12 = (minutes % 720) / 60, m = minutes % 60;
    const hands = el('g', {}, pick);
    hand(hands, h12 * 30, 88, 14, '#e2352b');
    hand(hands, m * 6, 132, 9, '#3a9bd9');
    el('circle', { cx: 200, cy: 200, r: 14, fill: '#161616', filter: 'url(#crayon)' }, hands);
    if (!typing) { timeInput.value = fmt(minutes); timeInput.classList.remove('bad'); }
    setSky(minutes);
    pick.setAttribute('aria-valuenow', minutes);
    pick.setAttribute('aria-valuetext', fmt(minutes));
    document.querySelectorAll('[data-ampm]').forEach(b =>
      b.setAttribute('aria-pressed', String((b.dataset.ampm === 'pm') === (minutes >= 720))));
    $('nightShift').setAttribute('aria-pressed', String(nightShift));
    $('shiftHint').hidden = nightShift || minutes >= DAY_START;
  }
  let nightShift = false;
  $('nightShift').addEventListener('click', () => { nightShift = !nightShift; renderPicker(); });

  function setFromPointer(e) {
    const r = pick.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    let deg = Math.atan2(x, -y) * 180 / Math.PI;
    if (deg < 0) deg += 360;
    const m12 = (Math.round(deg / 360 * 720 / 5) * 5) % 720;
    // Move by the shortest way round the dial, so passing 12 flips AM/PM.
    const delta = ((m12 - (minutes % 720) + 1080) % 720) - 360;
    minutes = (minutes + delta + 1440) % 1440;
    renderPicker();
  }
  let dragging = false;
  pick.addEventListener('pointerdown', e => { dragging = true; pick.setPointerCapture(e.pointerId); setFromPointer(e); });
  pick.addEventListener('pointermove', e => { if (dragging) setFromPointer(e); });
  pick.addEventListener('pointerup', () => { dragging = false; });
  pick.addEventListener('pointercancel', () => { dragging = false; });
  pick.addEventListener('keydown', e => {
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 60, PageDown: -60 }[e.key];
    if (!step) return;
    e.preventDefault();
    minutes = (minutes + step + 1440) % 1440;
    renderPicker();
  });
  document.querySelectorAll('[data-ampm]').forEach(b => b.addEventListener('click', () => {
    minutes = (minutes % 720) + (b.dataset.ampm === 'pm' ? 720 : 0);
    renderPicker();
  }));

  // ---------- Typing a time ----------
  const timeInput = $('timeReadout');
  let typing = false;
  // Accepts "7:30 pm", "7.30pm", "19:30", "7pm", "730pm". Without AM/PM, 1-12 keeps the current half of the day.
  function parseTime(text) {
    const t = text.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, ':');
    const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/);
    if (!m) return null;
    let h = Number(m[1]); const min = Number(m[2] || 0); const mer = m[3];
    if (min > 59 || h > 23) return null;
    if (mer) {
      if (h < 1 || h > 12) return null;
      h = (h % 12) + (mer[0] === 'p' ? 12 : 0);
    } else if (h >= 1 && h <= 12) {
      h = (h % 12) + (minutes >= 720 ? 12 : 0);
    }
    return h * 60 + min;
  }
  timeInput.addEventListener('focus', () => { typing = true; timeInput.select(); });
  timeInput.addEventListener('input', () => {
    const v = parseTime(timeInput.value);
    timeInput.classList.toggle('bad', v === null && timeInput.value.trim() !== '');
    if (v !== null) { minutes = v; renderPicker(); }
  });
  timeInput.addEventListener('keydown', e => { if (e.key === 'Enter') timeInput.blur(); });
  timeInput.addEventListener('blur', () => { typing = false; renderPicker(); });

  // ---------- Day and night sky ----------
  // [minute of day, top colour, bottom colour]
  const SKY = [
    [0,    '#121a3a', '#26305e'],
    [300,  '#1d2552', '#3a3f7a'],
    [360,  '#f6a46b', '#fbe3c4'],
    [480,  '#a9dcf4', '#f4f1ea'],
    [960,  '#b6e0f2', '#f4f1ea'],
    [1080, '#f58a5c', '#f6c38f'],
    [1170, '#5b3f8c', '#d9776a'],
    [1260, '#151d42', '#2a3263'],
    [1440, '#121a3a', '#26305e'],
  ];
  const mix = (a, b, t) => {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const lum = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  function setSky(t) {
    let i = 0;
    while (SKY[i + 1][0] <= t) i++;
    const [t0, a0, b0] = SKY[i], [t1, a1, b1] = SKY[i + 1];
    const f = (t - t0) / (t1 - t0);
    const skyTop = mix(a0, a1, f), bottom = mix(b0, b1, f);
    const root = document.documentElement.style;
    root.setProperty('--sky-top', skyTop);
    root.setProperty('--sky-bottom', bottom);
    const dark = lum(skyTop) < 0.45;
    document.body.classList.toggle('night', dark);

    // Sun by day (6 AM to 7 PM), moon at night, each travelling in an arc.
    const sky = $('sky');
    const isDay = t >= 360 && t < 1140;
    const p = isDay ? (t - 360) / 780 : ((t - 1140 + 1440) % 1440) / 660;
    // Rise at the bottom-left, arc over the top, set at the bottom-right.
    const w = window.innerWidth, h = window.innerHeight, small = w < 700;
    const k0 = small ? 0.6 : 1;
    const edge = small ? 34 : 70, horizon = h - edge, top = small ? 14 : 22;
    const x = w / 2 - (w / 2 - edge) * Math.cos(Math.PI * p);
    const y = horizon - (horizon - top) * Math.sin(Math.PI * p);
    sky.setAttribute('viewBox', `0 0 ${w} ${window.innerHeight}`);
    sky.innerHTML = '';
    const g = el('g', { filter: 'url(#crayon)' }, sky);
    if (isDay) {
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2;
        el('line', { x1: x + Math.cos(a) * 44 * k0, y1: y + Math.sin(a) * 44 * k0, x2: x + Math.cos(a) * 64 * k0, y2: y + Math.sin(a) * 64 * k0,
          stroke: '#f5b82e', 'stroke-width': 8 * k0, 'stroke-linecap': 'round' }, g);
      }
      el('circle', { cx: x, cy: y, r: 36 * k0, fill: '#f5b82e', stroke: '#161616', 'stroke-width': 4 }, g);
    } else {
      let seed = 3;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 26; k++) {
        const sx = rnd() * w, sy = rnd() * window.innerHeight, r = 2 + rnd() * 3;
        el('circle', { cx: sx, cy: sy, r, fill: '#fff6c9' }, g);
      }
      el('circle', { cx: x, cy: y, r: 34 * k0, fill: '#fff3c4', stroke: '#161616', 'stroke-width': 4 }, g);
      el('circle', { cx: x + 16 * k0, cy: y - 10 * k0, r: 30 * k0, fill: mix(skyTop, bottom, Math.min(1, Math.max(0, y / h))) }, g);
    }
  }
  window.addEventListener('resize', () => setSky(me ? me.minutes : minutes));

  // ---------- Steps ----------
  function showStep(n) {
    document.querySelectorAll('.step').forEach(s => { s.hidden = s.dataset.step !== String(n); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => showStep(b.dataset.next)));

  // ---------- Searchable dropdown ----------
  function combo({ input, list, options, onPick }) {
    let shown = [], active = -1;
    const open = v => { list.parentElement.hidden = !v; input.setAttribute('aria-expanded', String(v)); };
    function render() {
      const q = input.value.trim().toLowerCase();
      shown = options.filter(o => o.toLowerCase().includes(q));
      // Starts-with matches first.
      shown.sort((a, b) => (b.toLowerCase().startsWith(q)) - (a.toLowerCase().startsWith(q)));
      list.innerHTML = shown.length
        ? shown.map((o, i) => `<li role="option" id="${list.id}-${i}" aria-selected="${i === active}">${escapeHtml(o)}</li>`).join('')
        : '<li class="empty">No match. Try another spelling, or pick "Other".</li>';
      input.setAttribute('aria-activedescendant', active >= 0 ? `${list.id}-${active}` : '');
      open(true);
    }
    function choose(i) {
      if (i < 0 || i >= shown.length) return;
      input.value = shown[i];
      open(false);
      onPick(shown[i]);
    }
    input.addEventListener('focus', () => { active = -1; render(); });
    input.addEventListener('input', () => { onPick(null); active = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
      else if (e.key === 'Escape') open(false);
      const li = list.children[active];
      if (li) li.scrollIntoView({ block: 'nearest' });
    });
    list.addEventListener('mousedown', e => {
      const li = e.target.closest('li[role="option"]');
      if (li) { e.preventDefault(); choose([...list.children].indexOf(li)); }
    });
    input.addEventListener('blur', () => setTimeout(() => open(false), 120));
    return { set(v) { input.value = v || ''; } };
  }

  // City
  let city = null, job = null;
  const cityChips = $('cityChips');
  cityChips.innerHTML = window.POPULAR_CITIES.map(c => `<button type="button" class="chip" aria-pressed="false">${c}</button>`).join('');
  function setCity(c) {
    city = c;
    cityChips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === c)));
    $('cityNext').disabled = !c;
  }
  const cityCombo = combo({ input: $('cityInput'), list: $('cityList'), options: window.CITIES, onPick: setCity });
  cityChips.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    setCity(b.textContent);
    cityCombo.set(b.textContent);
  });

  // Occupation
  combo({
    input: $('jobInput'), list: $('jobList'), options: window.OCCUPATIONS,
    onPick: j => { job = j; $('submitBtn').disabled = !j; },
  });

  // ---------- Data (Google Sheet via Apps Script web app) ----------
  async function saveAnswer(a) {
    if (!LIVE) return;
    // text/plain keeps this a "simple" request, which Apps Script accepts from any site.
    const res = await fetch(cfg.sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ minutes: a.minutes, city: a.city, job: a.job, night: a.night }),
    });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || 'save failed');
  }

  async function loadCrowd() {
    if (!LIVE) return sampleCrowd();
    const res = await fetch(cfg.sheetUrl);
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || 'load failed');
    return out.rows
      .map(([minutes, city, job, night]) => ({
        minutes: Number(minutes), city, job, night: night === true || String(night).toUpperCase() === 'TRUE',
      }))
      .filter(r => Number.isInteger(r.minutes) && r.minutes >= 0 && r.minutes < 1440
        && CITY_SET.has(r.city) && JOB_SET.has(r.job));
  }

  // Made-up answers so the design can be previewed before the database is connected.
  function sampleCrowd() {
    let s = 42;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const cityWeights = [...window.POPULAR_CITIES, ...window.POPULAR_CITIES, ...window.CITIES.slice(0, -1)];
    const jobs = window.OCCUPATIONS.slice(0, -1);
    const out = [];
    for (let i = 0; i < 220; i++) {
      const c = cityWeights[Math.floor(rnd() * cityWeights.length)];
      const j = jobs[Math.floor(rnd() * jobs.length)];
      const bias = (hash(c) % 60) - 20 + (hash(j) % 90) - 40;
      let m = Math.round((18 * 60 + 30 + bias + gauss() * 75) / 5) * 5;
      let night = false;
      if (rnd() < 0.05) m = Math.round((60 + rnd() * 360) / 5) * 5; // a few working through the night
      else if (rnd() < 0.09) { night = true; m = Math.round((7 * 60 + gauss() * 60) / 5) * 5; } // night shifts
      out.push({ minutes: (m + 1440) % 1440, city: c, job: j, night });
    }
    return out;
  }

  // ---------- Results ----------
  let crowd = [], me = null, filter = 'all', half = 'pm';
  // People are only compared with others on the same kind of shift.
  const peers = () => crowd.filter(a => !!a.night === !!me.night);
  const startFor = () => (me.night ? NIGHT_START : DAY_START);
  const groupName = () => (me.night ? 'night-shift workers' : 'everyone');

  function renderCrowdClock() {
    const svg = $('crowdClock');
    drawFace(svg, { fill: '#cfe8fa' });
    const dots = el('g', { filter: 'url(#crayon)' }, svg);
    const match = a => filter === 'all' || (filter === 'city' ? a.city === me.city : a.job === me.job);
    const inHalf = t => (t >= 720) === (half === 'pm');
    const pool = peers();
    const subset = pool.filter(match);
    // Only the chosen half of the day is drawn, as dots on a ring round the clock.
    pool.forEach((a, i) => {
      if (!inHalf(a.minutes)) return;
      const h = hash(`${a.city}|${a.job}|${i}`);
      const ang = ((a.minutes % 720) / 720) * Math.PI * 2;
      const r = 196 + ((h % 1000) / 1000) * 30;
      el('circle', {
        cx: 200 + Math.sin(ang) * r, cy: 200 - Math.cos(ang) * r, r: 6.5,
        fill: COLORS[h % COLORS.length], stroke: '#161616', 'stroke-width': 2,
        opacity: match(a) ? 1 : 0.12,
      }, dots);
    });
    const a = avg(subset.map(x => x.minutes), startFor());
    if (a !== null && inHalf(a)) {
      hand(svg, ((a % 720) / 60) * 30, 120, 12, '#e2352b');
    }
    el('circle', { cx: 200, cy: 200, r: 13, fill: '#161616', filter: 'url(#crayon)' }, svg);

    // You: a star on the ring, with a crayon arrow and a "you" label pointing at it.
    if (inHalf(me.minutes)) {
      const ang = ((me.minutes % 720) / 720) * Math.PI * 2;
      const ux = Math.sin(ang), uy = -Math.cos(ang);
      const at = rr => [200 + ux * rr, 200 + uy * rr];
      const [sx, sy] = at(246);
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const t = k * Math.PI / 5, rr = k % 2 ? 9 : 21;
        pts.push(`${(sx + Math.sin(t) * rr).toFixed(1)},${(sy - Math.cos(t) * rr).toFixed(1)}`);
      }
      el('polygon', { points: pts.join(' '), fill: '#e2352b', stroke: '#161616', 'stroke-width': 3,
        'stroke-linejoin': 'round', filter: 'url(#crayon)' }, svg);

      // "you" sits beside the star (along the ring, a little outward), with a curved arrow to it.
      const tx = Math.cos(ang), ty = Math.sin(ang);
      const lx = sx + tx * 80 + ux * 34, ly = sy + ty * 80 + uy * 34;
      const vx = sx - lx, vy = sy - ly, vl = Math.hypot(vx, vy);
      const x0 = lx + vx / vl * 22, y0 = ly + vy / vl * 22;
      const x1 = sx - vx / vl * 25, y1 = sy - vy / vl * 25;
      const cx = (x0 + x1) / 2 + ux * 16, cy = (y0 + y1) / 2 + uy * 16;
      const g = el('g', { filter: 'url(#crayon)', fill: 'none', stroke: '#161616', 'stroke-width': 4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      el('path', { d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}` }, g);
      const dx = x1 - cx, dy = y1 - cy, len = Math.hypot(dx, dy) || 1;
      const bx = dx / len, by = dy / len, head = 11;
      const wing = k => `${(x1 - bx * head - by * head * 0.65 * k).toFixed(1)} ${(y1 - by * head + bx * head * 0.65 * k).toFixed(1)}`;
      el('path', { d: `M${wing(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${wing(-1)}` }, g);

      const label = el('text', {
        x: lx.toFixed(1), y: (ly + 11).toFixed(1), 'font-size': 34, fill: '#e2352b',
        stroke: '#161616', 'stroke-width': 1.2, 'paint-order': 'stroke', 'text-anchor': 'middle',
      }, svg);
      label.textContent = 'you';
    }

    const night = me.night ? 'night-shift ' : '';
    const who = filter === 'all' ? groupName() : filter === 'city' ? `${night}people in ${me.city}` : `${night}${me.job}s`;
    const shown = subset.filter(x => inHalf(x.minutes)).length;
    $('crowdSub').textContent = a === null
      ? `No answers from ${who} yet.`
      : `${subset.length} ${subset.length === 1 ? 'answer' : 'answers'} from ${who}, ${shown} in the ${half.toUpperCase()}. Their average is ${fmt(a)}${inHalf(a) ? ' (the red hand)' : ''}.`;
    document.querySelectorAll('#filters .pill').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
    document.querySelectorAll('.half-toggle .pill').forEach(b => {
      const n = subset.filter(x => (x.minutes >= 720) === (b.dataset.half === 'pm')).length;
      b.textContent = `${b.dataset.half.toUpperCase()} · ${n}`;
      b.setAttribute('aria-pressed', String(b.dataset.half === half));
    });
  }

  function board(listEl, key, latest) {
    const groups = {}, start = startFor();
    peers().forEach(a => (groups[a[key]] ||= []).push(a.minutes));
    const rows = Object.entries(groups)
      .filter(([name, v]) => v.length >= 3 && !name.startsWith('Other'))
      .map(([name, v]) => ({ name, t: avg(v, start), n: v.length }))
      .sort((x, y) => latest ? norm(y.t, start) - norm(x.t, start) : norm(x.t, start) - norm(y.t, start))
      .slice(0, 5);
    listEl.innerHTML = rows.length
      ? rows.map(r => `<li>${escapeHtml(r.name)} · <b>${fmt(r.t)}</b></li>`).join('')
      : '<li class="none">Needs a few more answers. Check back soon!</li>';
  }

  function youLine(pool, start) {
    const others = pool.length - 1;
    if (others < 4) {
      return me.night
        ? 'Not many night-shift answers yet. Check back soon to see how you compare.'
        : 'Not many answers yet. Check back soon to see how you compare.';
    }
    const everyone = avg(pool.map(a => a.minutes), start);
    const later = pool.filter(a => norm(a.minutes, start) > norm(me.minutes, start)).length;
    const pct = Math.round(later / pool.length * 100);
    const vs = me.night ? 'other night-shift workers' : 'everyone else';
    const lead = !me.night && me.minutes < DAY_START ? 'Burning the midnight oil! ' : '';
    const tail = pct === 0
      ? `Hardly anyone ${me.night ? 'on nights ' : ''}works later than you. Get some rest!`
      : `${pct}% of ${me.night ? 'night-shift workers' : 'people'} are still working after you.`;
    return `${lead}That's ${diffText(me.minutes, everyone, start)} ${vs}. ${tail}`;
  }

  function renderResults() {
    const pool = peers(), start = startFor();
    $('youCard').innerHTML = `
      <span class="label">You're logging off at</span>
      <span class="big">${fmt(me.minutes)}</span>
      ${me.night ? '<span class="label night-label"><svg class="icon" aria-hidden="true"><use href="#i-moon"/></svg> after a night shift</span>' : ''}
      <p class="line">${youLine(pool, start)}</p>`;

    const cityTimes = pool.filter(a => a.city === me.city).map(a => a.minutes);
    const jobTimes = pool.filter(a => a.job === me.job).map(a => a.minutes);
    const nightLabel = me.night ? ' on nights' : '';
    $('statAllLabel').textContent = me.night ? 'Night shifts log off around' : 'Everyone logs off around';
    $('statAll').textContent = pool.length ? fmt(avg(pool.map(a => a.minutes), start)) : '–';
    $('statCityLabel').textContent = `${me.city}${nightLabel} logs off around`;
    $('statCity').textContent = cityTimes.length ? fmt(avg(cityTimes, start)) : '–';
    $('statJobLabel').textContent = `${me.job}${nightLabel} logs off around`;
    $('statJob').textContent = jobTimes.length ? fmt(avg(jobTimes, start)) : '–';

    $('filters').innerHTML = [
      ['all', me.night ? 'All night shifts' : 'Everyone'], ['city', `Only ${me.city}`], ['job', `Only ${me.job}`],
    ].map(([f, label]) => `<button type="button" class="pill" data-f="${f}">${escapeHtml(label)}</button>`).join('');

    half = me.minutes >= 720 ? 'pm' : 'am';
    board($('boardCities'), 'city', true);
    board($('boardJobs'), 'job', false);
    renderCrowdClock();

    setSky(me.minutes);
    document.querySelectorAll('.step').forEach(s => { s.hidden = true; });
    $('results').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelector('.half-toggle').addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    half = b.dataset.half;
    renderCrowdClock();
  });

  $('filters').addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    filter = b.dataset.f;
    renderCrowdClock();
  });

  $('submitBtn').addEventListener('click', async () => {
    const btn = $('submitBtn');
    btn.disabled = true;
    $('submitError').hidden = true;
    me = { minutes, city, job, night: nightShift, date: today() };
    try {
      await saveAnswer(me);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(me)); } catch {}
      crowd = await loadCrowd();
      if (!LIVE) crowd.push({ minutes: me.minutes, city: me.city, job: me.job, night: !!me.night });
      renderResults();
    } catch (err) {
      console.error(err);
      $('submitError').textContent = "Couldn't reach the crowd clock. Check your connection and try again.";
      $('submitError').hidden = false;
      btn.disabled = false;
    }
  });

  $('shareBtn').addEventListener('click', async () => {
    const cityAvg = avg(peers().filter(a => a.city === me.city).map(a => a.minutes), startFor());
    const shiftNote = me.night ? ' after a night shift' : '';
    const text = `Log your logoff: I'm logging off at ${fmt(me.minutes)}${shiftNote} today. ${me.city}${me.night ? ' night shifts log' : ' logs'} off around ${fmt(cityAvg)}. When do you stop working?`;
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: "Log your logoff", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        $('shareStatus').textContent = 'Copied! Paste it anywhere.';
      }
    } catch { /* share sheet closed */ }
  });

  // Start over: forget today's answer and go back to step 1.
  $('resetBtn').addEventListener('click', () => {
    try { localStorage.removeItem(STORE_KEY); } catch {}
    me = null; crowd = []; filter = 'all';
    minutes = 18 * 60;
    nightShift = false;
    setCity(null);
    cityCombo.set('');
    $('jobInput').value = '';
    job = null;
    $('submitBtn').disabled = true;
    $('shareStatus').textContent = '';
    renderPicker();
    $('results').hidden = true;
    showStep(1);
  });

  // ---------- Start ----------
  $('previewNote').hidden = LIVE;
  renderPicker();

  // Already answered today? Go straight to the crowd.
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch {}
  if (saved && saved.date === today() && CITY_SET.has(saved.city) && JOB_SET.has(saved.job)) {
    me = saved;
    loadCrowd().then(c => {
      crowd = c;
      if (!LIVE) crowd.push({ minutes: me.minutes, city: me.city, job: me.job, night: !!me.night });
      renderResults();
    }).catch(err => console.error(err));
  }
})();
