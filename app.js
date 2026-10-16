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

  // Instructions written round the outside of the clock: top half and bottom half,
  // each running left to right so both read the right way up.
  function ringText(svg) {
    const defs = el('defs', {}, svg);
    el('path', { id: 'ringTop', d: 'M 0 200 A 200 200 0 0 1 400 200' }, defs);
    el('path', { id: 'ringBottom', d: 'M -22 200 A 222 222 0 0 0 422 200' }, defs);
    const style = { 'font-size': 27, fill: '#333', 'text-anchor': 'middle', 'letter-spacing': 0.5 };
    [['#ringTop', 'Wind the crown or drag the hands,'], ['#ringBottom', 'or tap the time below and type it.']].forEach(([p, words]) => {
      const t = el('text', style, svg);
      const tp = el('textPath', { href: p, startOffset: '50%' }, t);
      tp.textContent = words;
    });
  }

  function renderPicker() {
    drawFace(pick);
    ringText(pick);
    const h12 = (minutes % 720) / 60, m = minutes % 60;
    const hands = el('g', {}, pick);
    hand(hands, h12 * 30, 88, 14, '#e2352b');
    hand(hands, m * 6, 132, 9, '#3a9bd9');
    el('circle', { cx: 200, cy: 200, r: 14, fill: '#161616', filter: 'url(#crayon)' }, hands);

    // The winding crown on the right edge (3 o'clock), like a watch. Its ridges roll as the time changes.
    const crown = el('g', { class: 'crown', filter: 'url(#crayon)' }, pick);
    el('rect', { x: 372, y: 150, width: 80, height: 100, fill: 'transparent' }, crown); // easy touch target
    el('rect', { x: 382, y: 189, width: 16, height: 22, rx: 3, fill: '#c98b12', stroke: '#161616', 'stroke-width': 4 }, crown);
    el('rect', { x: 395, y: 170, width: 38, height: 60, rx: 11, fill: '#f5b82e', stroke: '#161616', 'stroke-width': 5 }, crown);
    const ridges = el('g', { stroke: '#161616', 'stroke-width': 3, 'stroke-linecap': 'round' }, crown);
    const roll = (minutes / 5) % 3; // ridges shift a little with every 5-minute step
    for (let k = -1; k < 10; k++) {
      const y = 176 + (k + roll / 3) * 7;
      if (y > 174 && y < 226) el('line', { x1: 401, y1: y, x2: 427, y2: y }, ridges);
    }
    // Up/down hint arrows above and below the crown.
    const hint = el('g', { fill: 'none', stroke: '#555', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, crown);
    el('path', { d: 'M406 156 L414 147 L422 156' }, hint);
    el('path', { d: 'M406 244 L414 253 L422 244' }, hint);
    if (!typing) { timeInput.value = fmt(minutes); timeInput.classList.remove('bad'); }
    setSky(minutes);
    pick.setAttribute('aria-valuenow', minutes);
    pick.setAttribute('aria-valuetext', fmt(minutes));
    document.querySelectorAll('[data-ampm]').forEach(b =>
      b.setAttribute('aria-pressed', String((b.dataset.ampm === 'pm') === (minutes >= 720))));
  }
  let nightShift = false;

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
  // Dragging the clock face sets the time by angle; dragging the crown up/down winds it forward/back.
  let dragging = false, winding = null;
  pick.addEventListener('pointerdown', e => {
    pick.setPointerCapture(e.pointerId);
    if (e.target.closest('.crown')) { winding = { y: e.clientY, carry: 0 }; return; }
    dragging = true; setFromPointer(e);
  });
  pick.addEventListener('pointermove', e => {
    if (winding) {
      // Every 8px of drag is one 5-minute step; up = later.
      const steps = Math.trunc((winding.y - e.clientY) / 8);
      if (steps) { minutes = (minutes + steps * 5 + 1440) % 1440; winding.y -= steps * 8; renderPicker(); }
    } else if (dragging) setFromPointer(e);
  });
  const stop = () => { dragging = false; winding = null; };
  pick.addEventListener('pointerup', stop);
  pick.addEventListener('pointercancel', stop);
  // Scroll wheel / trackpad over the crown winds it too.
  pick.addEventListener('wheel', e => {
    if (!e.target.closest('.crown')) return;
    e.preventDefault();
    minutes = (minutes + (e.deltaY < 0 ? 5 : -5) + 1440) % 1440;
    renderPicker();
  }, { passive: false });
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

  function skyAt(t) {
    let i = 0;
    while (SKY[i + 1][0] <= t) i++;
    const [t0, a0, b0] = SKY[i], [t1, a1, b1] = SKY[i + 1];
    const f = (t - t0) / (t1 - t0);
    return [mix(a0, a1, f), mix(b0, b1, f)];
  }

  function setSky(t) {
    const [skyTop, bottom] = skyAt(t);
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
    const g = el('g', { filter: 'url(#crayon-sky)' }, sky);
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
    // The anonymity note appears once we start asking for city and job (step 2 onwards).
    $('privacyNote').hidden = String(n) === '1';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => {
    // Leaving step 1 with a time between midnight and 10 AM: ask whether it's a night shift first.
    if (b.closest('#step-time') && b.dataset.next === '2') {
      if (minutes < DAY_START) { openNightAsk(); return; }
      nightShift = false;
      showTeaser();
      return;
    }
    showStep(b.dataset.next);
  }));

  function openNightAsk() {
    $('nightAsk').hidden = false;
    document.body.classList.add('modal-open');
    $('nightYes').focus();
  }
  function answerNight(yes) {
    nightShift = yes;
    $('nightAsk').hidden = true;
    document.body.classList.remove('modal-open');
    showTeaser();
  }
  $('nightYes').addEventListener('click', () => answerNight(true));
  $('nightNo').addEventListener('click', () => answerNight(false));
  $('nightAsk').addEventListener('keydown', e => {
    if (e.key === 'Escape') { $('nightAsk').hidden = true; document.body.classList.remove('modal-open'); }
  });

  // ---------- Searchable dropdown ----------
  function combo({ input, list, options, onPick, match }) {
    let shown = [], active = -1;
    const open = v => { list.parentElement.hidden = !v; input.setAttribute('aria-expanded', String(v)); };
    function render() {
      const q = input.value.trim().toLowerCase();
      shown = options.filter(o => match ? match(o, q) : o.toLowerCase().includes(q));
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
    input.addEventListener('focus', () => {
      active = -1; render();
      // On phones the keyboard takes half the screen: bring the field up so it and its list stay visible.
      if (window.matchMedia('(max-width: 640px)').matches) {
        setTimeout(() => {
          const top = input.getBoundingClientRect().top + window.scrollY - 70;
          window.scrollTo({ top, behavior: 'smooth' });
        }, 300);
      }
    });
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

  // Occupation: searchable dropdown of areas of work. Typing a job title also finds its area
  // (e.g. "nurse" -> Healthcare), matching the start of words so "ca" finds Finance only.
  const AREA = Object.fromEntries(window.JOB_AREAS.map(a => [a.name, `${a.name} ${a.examples} ${a.keywords}`.toLowerCase()]));
  const jobMatch = (o, q) => {
    if (!q) return true;
    const text = AREA[o] || o.toLowerCase(), words = text.split(/[^a-z0-9]+/);
    return q.length <= 2 ? words.includes(q) || o.toLowerCase().startsWith(q) : words.some(w => w.startsWith(q)) || text.includes(q);
  };
  function setJob(j) { job = j; $('submitBtn').disabled = !j; }
  const jobCombo = combo({ input: $('jobInput'), list: $('jobList'), options: window.OCCUPATIONS, onPick: setJob, match: jobMatch });

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
    const jobs = window.OCCUPATIONS.filter(o => o !== 'Something else');
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
  // Filters: city and job can be combined; with neither on, it shows everyone.
  let crowd = [], me = null, filter = { city: false, job: false }, half = 'pm';
  // People are only compared with others on the same kind of shift.
  const peers = () => crowd.filter(a => !!a.night === !!me.night);
  const startFor = () => (me.night ? NIGHT_START : DAY_START);
  const groupName = () => (me.night ? 'night-shift workers' : 'everyone');

  function renderCrowdClock() {
    const svg = $('crowdClock');
    drawFace(svg, { fill: '#cfe8fa' });
    const dots = el('g', { filter: 'url(#crayon)' }, svg);
    const match = a => (!filter.city || a.city === me.city) && (!filter.job || a.job === me.job);
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
    const who = filter.city && filter.job ? `${night}people in ${me.job} in ${me.city}`
      : filter.city ? `${night}people in ${me.city}`
      : filter.job ? `${night}people in ${me.job}` : groupName();
    const shown = subset.filter(x => inHalf(x.minutes)).length;
    $('crowdSub').textContent = a === null
      ? `No answers from ${who} yet.`
      : `Each dot is someone logging off. On average, ${who === 'everyone' ? 'people' : who} log off at ${fmt(a)}${inHalf(a) ? ' (the red hand)' : ''}.`;
    document.querySelectorAll('#filters .pill').forEach(b => b.setAttribute('aria-pressed', String(
      b.dataset.f === 'all' ? !filter.city && !filter.job : filter[b.dataset.f])));
    $('halfSwitch').setAttribute('aria-checked', String(half === 'pm'));
    drawCityRefs(svg);
  }

  // Reference average log-off time (PLFS-based) for the visitor's city, or India before a city is
  // known / for cities without data. A green crayon band on the rim, explained by a legend above.
  function refFor(c) {
    const key = c && (window.CITY_LOGOFF[c] ? c : window.CITY_LOGOFF_ALIAS[c]);
    return key ? { label: `${c}'s`, t: window.CITY_LOGOFF[key] } : { label: "India's", t: window.INDIA_LOGOFF, india: true };
  }
  // For a city with no research data: how many other real answers are there from it?
  function cityNewcomer() {
    if (!me || !me.city || me.night || me.city.startsWith('Other')) return null;
    if (!refFor(me.city).india) return null;
    const others = LIVE ? crowd.filter(a => a.city === me.city).length - 1 : 0;
    return others < 4 ? Math.max(0, others) : null;
  }
  function drawCityRefs(svg) {
    const legend = $('refLegend');
    const fresh = cityNewcomer();
    legend.classList.toggle('newcomer', fresh !== null);
    if (fresh !== null) {
      // No data for this city yet: celebrate them instead of showing an average.
      legend.hidden = false;
      legend.querySelector('.rl-text').textContent = fresh === 0
        ? `You're the first from ${me.city}! You just put ${me.city} on the clock.`
        : `You're one of the first ${fresh + 1} from ${me.city}! ${me.city}'s average unlocks at 5.`;
      legend.title = '';
      return;
    }
    const ref = refFor(me && me.city);
    const show = !(me && me.night) && (ref.t >= 720) === (half === 'pm');
    legend.hidden = !show;
    if (!show) return;
    legend.querySelector('.rl-text').textContent = `${ref.label} average log-off time (${fmt(ref.t)})`;
    legend.title = `Estimated from average weekly hours (${window.PLFS_SOURCE.name}), 9 AM start, 5-day week`;
    const A = m => ((m % 720) / 720) * Math.PI * 2;
    const P = (a, r) => `${(200 + Math.sin(a) * r).toFixed(1)} ${(200 - Math.cos(a) * r).toFixed(1)}`;
    const g = el('g', { class: 'india-ref' }, svg);
    const R = 161, a0 = A(ref.t - 7), a1 = A(ref.t + 7);
    el('path', { d: `M${P(a0, R)} A${R} ${R} 0 0 1 ${P(a1, R)}`, fill: 'none', stroke: '#2fa35a',
      'stroke-width': 24, 'stroke-opacity': .75, 'stroke-linecap': 'round', filter: 'url(#crayon)' }, g);
  }





  // Groups (cities or jobs) with at least 3 answers, ranked by their typical log-off time.
  function ranking(key, latest) {
    const groups = {}, start = startFor();
    peers().forEach(a => (groups[a[key]] ||= []).push(a.minutes));
    return Object.entries(groups)
      .filter(([name, v]) => v.length >= 3 && !name.startsWith('Other') && name !== 'Something else')
      .map(([name, v]) => ({ name, t: avg(v, start), n: v.length }))
      .sort((x, y) => latest ? norm(y.t, start) - norm(x.t, start) : norm(x.t, start) - norm(y.t, start));
  }

  // ---------- Explore: a wall of crayon clocks ----------
  function miniClock(t) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-8 -8 416 416');
    svg.setAttribute('class', 'mini-clock');
    svg.setAttribute('aria-hidden', 'true');
    drawFace(svg);
    const h12 = (t % 720) / 60, m = t % 60;
    hand(svg, h12 * 30, 92, 18, '#e2352b');
    hand(svg, m * 6, 136, 12, '#3a9bd9');
    el('circle', { cx: 200, cy: 200, r: 16, fill: '#161616', filter: 'url(#crayon)' }, svg);
    return svg;
  }

  const exShowAll = { city: false, job: false };

  function clockCard(row, { rank, first = false, tag = '', note = '', key = null }) {
    const [top, bottom] = skyAt(row.t);
    const card = document.createElement('div');
    card.className = 'clock-card crayon-box' + (first ? ' first' : '') + (tag ? ' mine' : '')
      + (lum(top) < 0.45 ? ' dark' : '');
    card.style.setProperty('--fill', `linear-gradient(${top}, ${bottom})`);
    card.innerHTML = `
      ${rank ? `<span class="cc-rank">${rank}</span>` : ''}
      ${tag ? `<span class="cc-tag">${escapeHtml(tag)}</span>` : ''}
      <div class="cc-name">${escapeHtml(row.name)}</div>
      <div class="cc-time">${fmt(row.t)}</div>
      <div class="cc-n">${row.n} ${row.n === 1 ? 'answer' : 'answers'}</div>
      ${note ? `<div class="cc-note">${note}</div>` : ''}`;
    card.insertBefore(miniClock(row.t), card.querySelector('.cc-name'));
    if (key) {
      // Clickable: opens the detail pop-up for this city or job.
      card.classList.add('clickable');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open ${row.name}: logs off around ${fmt(row.t)}`);
      const go = () => openDetail(key, row.name);
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    }
    return card;
  }

  // Look up any city or job and show its clock.
  function showLookup(name) {
    const out = $('exResult');
    out.innerHTML = '';
    if (!name) return;
    const key = CITY_SET.has(name) ? 'city' : 'job';
    const latest = key === 'city';
    const times = peers().filter(a => a[key] === name).map(a => a.minutes);
    if (!times.length) {
      out.innerHTML = `<p class="ex-none crayon-box">No answers from ${escapeHtml(name)} yet. Check back soon!</p>`;
      return;
    }
    const row = { name, t: avg(times, startFor()), n: times.length };
    const rows = ranking(key, latest);
    const pos = rows.findIndex(x => x.name === name);
    const list = key === 'city' ? 'cities' : 'jobs';
    const note = pos >= 0
      ? `#${pos + 1} of ${rows.length} ${list} that log off ${latest ? 'latest' : 'earliest'}`
      : 'Not ranked yet: needs at least 3 answers';
    const mine = (key === 'city' ? me.city : me.job) === name;
    out.appendChild(clockCard(row, { tag: mine ? `your ${key}` : '', note, first: true, key }));
  }

  // ---------- Detail pop-up: one clock large, plus a searchable list of the other side ----------
  // A city lists its jobs; a job lists its cities. Only entries with answers are listed.
  let detail = null; // { key, name, other, pick, lastFocus }

  function smallClock(t) {
    const svg = miniClock(t);
    svg.setAttribute('class', 'row-clock');
    return svg;
  }

  function renderDetail() {
    const { key, name, pick } = detail;
    const other = key === 'city' ? 'job' : 'city';
    const start = startFor();
    const inGroup = peers().filter(a => a[key] === name);
    const focus = pick ? inGroup.filter(a => a[other] === pick) : inGroup;
    const title = pick
      ? (key === 'city' ? `${pick} in ${name}` : `${name} in ${pick}`)
      : name;
    $('dtTitle').textContent = title;
    const card = $('dtCard');
    card.innerHTML = '';
    if (focus.length) {
      const mine = key === 'city' ? me.city === name && (!pick || me.job === pick) : me.job === name && (!pick || me.city === pick);
      const note = pick ? '' : `${new Set(inGroup.map(a => a[other])).size} ${other === 'job' ? 'jobs' : 'cities'} answered`;
      card.appendChild(clockCard({ name: title, t: avg(focus.map(a => a.minutes), start), n: focus.length },
        { first: true, tag: mine ? (pick ? 'you' : `your ${key}`) : '', note }));
    }
    $('dtAll').hidden = !pick;
    $('dtAll').textContent = `Show all of ${name}`;

    // The list on the right.
    const groups = {};
    inGroup.forEach(a => (groups[a[other]] ||= []).push(a.minutes));
    const q = $('dtSearch').value.trim().toLowerCase();
    const rows = Object.entries(groups)
      .map(([n, v]) => ({ name: n, t: avg(v, start), n: v.length }))
      .filter(x => x.name.toLowerCase().includes(q))
      .sort((x, y) => norm(y.t, start) - norm(x.t, start));
    const noun = other === 'job' ? 'Jobs' : 'Cities';
    $('dtListTitle').textContent = key === 'city' ? `Areas of work in ${name}` : `Where people in ${name} work`;
    $('dtSearch').placeholder = `Search ${noun.toLowerCase()}…`;
    const list = $('dtList');
    list.innerHTML = '';
    if (!rows.length) list.innerHTML = `<li class="dt-empty">${q ? 'No match.' : 'No answers yet.'}</li>`;
    rows.forEach(x => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dt-row' + (x.name === pick ? ' on' : '');
      b.setAttribute('aria-pressed', String(x.name === pick));
      b.innerHTML = `<span class="dt-name">${escapeHtml(x.name)}</span><span class="dt-time">${fmt(x.t)}</span><span class="dt-n">${x.n}</span>`;
      b.prepend(smallClock(x.t));
      b.addEventListener('click', () => { detail.pick = x.name === pick ? null : x.name; renderDetail(); });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function openDetail(key, name) {
    detail = { key, name, pick: null, lastFocus: document.activeElement };
    $('dtSearch').value = '';
    renderDetail();
    $('detail').hidden = false;
    document.body.classList.add('modal-open');
    $('dtClose').focus();
  }

  function closeDetail() {
    if (!detail) return;
    $('detail').hidden = true;
    document.body.classList.remove('modal-open');
    const f = detail.lastFocus;
    detail = null;
    if (f && f.focus) f.focus();
  }

  function clockCards(gridEl, moreBtn, key, latest, noun) {
    const rows = ranking(key, latest);
    const mine = key === 'city' ? me.city : me.job;
    const shown = exShowAll[key] ? rows : rows.slice(0, 5);
    gridEl.innerHTML = '';
    if (!rows.length) {
      gridEl.innerHTML = '<p class="ex-empty">Needs a few more answers. Check back soon!</p>';
    }
    shown.forEach((row, i) => {
      gridEl.appendChild(clockCard(row, { rank: i + 1, first: i === 0, tag: row.name === mine ? `your ${noun}` : '', key }));
    });
    moreBtn.hidden = rows.length <= 5;
    moreBtn.innerHTML = exShowAll[key]
      ? `Show top 5 only`
      : `See all ${rows.length} ${noun === 'city' ? 'cities' : 'jobs'}`;
  }

  function renderExplore() {
    const pool = peers();
    $('exSub').textContent = `${pool.length} ${me.night ? 'night-shift ' : ''}answers. Each clock shows the typical time that group logs off; the card is coloured like the sky at that hour.`;
    clockCards($('exCities'), $('exMoreCities'), 'city', true, 'city');
    clockCards($('exJobs'), $('exMoreJobs'), 'job', false, 'job');
  }

  function showExplore(on) {
    $('results').hidden = on;
    $('explore').hidden = !on;
    if (on) { renderExplore(); $('exSearch').value = ''; showLookup(null); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // The 'you' card as a tilted crayon hourglass: sand left on top = people still working after
  // you, sand at the bottom = people who've already logged off. You sit at the neck.
  function hourglass(pctLater, timeText, avgText, avgLabel) {
    const f = pctLater / 100, id = 'hg' + Math.random().toString(36).slice(2, 7);
    const top = 'M24 22 L96 22 C96 62 64 84 62 100 L58 100 C56 84 24 62 24 22 Z';
    const bot = 'M58 100 L62 100 C64 116 96 138 96 178 L24 178 C24 138 56 116 58 100 Z';
    const topY = 100 - 74 * f, botY = 178 - 74 * (1 - f);
    const marks = [0.25, 0.5, 0.75].map(m => `<path d="M28 ${100 - 74 * m}h8M28 ${178 - 74 * m}h8" stroke="#161616" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`).join('');
    return `<svg class="hourglass" viewBox="0 0 400 230" role="img" aria-label="${pctLater}% still working, ${100 - pctLater}% already logged off">
      <defs><clipPath id="${id}t"><path d="${top}"/></clipPath><clipPath id="${id}b"><path d="${bot}"/></clipPath></defs>
      <g transform="translate(140 15) rotate(-14 60 100)" filter="url(#crayon)">
        <path d="${top}" fill="#fffdf8" fill-opacity=".6"/>
        <path d="${bot}" fill="#fffdf8" fill-opacity=".6"/>
        <rect x="18" y="${topY}" width="84" height="${100 - topY + 2}" fill="#f5b82e" clip-path="url(#${id}t)"/>
        <rect x="18" y="${botY}" width="84" height="${178 - botY}" fill="#f5b82e" clip-path="url(#${id}b)"/>
        ${f > 0 && f < 1 ? `<path d="M60 100 L60 ${botY}" stroke="#f5b82e" stroke-width="3" stroke-dasharray="3 4"/>` : ''}
        ${marks}
        <path d="${top}" fill="none" stroke="#161616" stroke-width="4" stroke-linejoin="round"/>
        <path d="${bot}" fill="none" stroke="#161616" stroke-width="4" stroke-linejoin="round"/>
        <rect x="10" y="10" width="100" height="14" rx="4" fill="#a2482a" stroke="#161616" stroke-width="4"/>
        <rect x="10" y="176" width="100" height="14" rx="4" fill="#a2482a" stroke="#161616" stroke-width="4"/>
        <path d="M18 24 V176 M102 24 V176" stroke="#161616" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g font-family="'Gochi Hand', cursive" fill="#fff">
        <text x="128" y="62" font-size="36" text-anchor="end">${pctLater}%</text>
        <text x="128" y="84" font-size="17" text-anchor="end">still working</text>
        <text x="282" y="172" font-size="36">${100 - pctLater}%</text>
        <text x="282" y="194" font-size="17">already logged off</text>
        <text x="128" y="128" font-size="17" text-anchor="end">${avgLabel}</text>
        <text x="128" y="156" font-size="30" text-anchor="end">${avgText}</text>
        <text x="282" y="104" font-size="17">you</text>
        <text x="282" y="132" font-size="30">${timeText}</text>
      </g>
      <path d="M276 112 Q246 108 214 118" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M224 110 L212 118 L225 124" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function renderResults() {
    const pool = peers(), start = startFor();
    $('youCard').innerHTML = `
      <span class="label">You're logging off at</span>
      <span class="big">${fmt(me.minutes)}</span>
      ${me.night ? '<span class="label night-label"><svg class="icon" aria-hidden="true"><use href="#i-moon"/></svg> after a night shift</span>' : ''}
      <p class="line">${youLine(pool, start)}</p>`;
    if (pool.length - 1 >= 4) {
      // Enough answers: the hourglass carries the numbers; keep just the comparison line.
      const later = pool.filter(a => norm(a.minutes, start) > norm(me.minutes, start)).length;
      const everyone = avg(pool.map(a => a.minutes), start);
      const lead = !me.night && me.minutes < DAY_START ? 'Burning the midnight oil! ' : '';
      $('youCard').innerHTML = `
        ${hourglass(Math.round(later / pool.length * 100), fmt(me.minutes), fmt(everyone), me.night ? 'night shifts avg' : 'everyone avg')}
        ${me.night ? '<span class="label night-label"><svg class="icon" aria-hidden="true"><use href="#i-moon"/></svg> after a night shift</span>' : ''}
        <p class="line">${lead}That's ${diffText(me.minutes, everyone, start)} ${me.night ? 'other night-shift workers' : 'everyone else'}.</p>`;
      $('youCard').classList.add('has-glass');
    } else $('youCard').classList.remove('has-glass');

    const partial = !!me.partial;
    $('results').classList.toggle('partial', partial);
    $('curious').hidden = !partial;
    $('exploreBtn').hidden = partial;
    // Before city and job are known there's nothing to filter by, so no filter buttons.
    $('filters').hidden = partial;
    $('statCity').parentElement.hidden = partial;
    // The hourglass already shows the overall average, so its separate box goes.
    $('statAll').parentElement.hidden = $('youCard').classList.contains('has-glass');
    document.querySelector('.stats').hidden = [...document.querySelectorAll('.stat')].every(x => x.hidden);
    $('statJob').parentElement.hidden = partial;
    const cityTimes = pool.filter(a => a.city === me.city).map(a => a.minutes);
    const jobTimes = pool.filter(a => a.job === me.job).map(a => a.minutes);
    const nightLabel = me.night ? ' on nights' : '';
    $('statAllLabel').textContent = me.night ? 'Night shifts log off around' : 'Everyone logs off around';
    $('statAll').textContent = pool.length ? fmt(avg(pool.map(a => a.minutes), start)) : '–';
    $('statCityLabel').textContent = `${me.city}${nightLabel} logs off around`;
    $('statCity').textContent = cityTimes.length ? fmt(avg(cityTimes, start)) : '–';
    $('statJobLabel').textContent = `People in ${me.job}${nightLabel} log off around`;
    $('statJob').textContent = jobTimes.length ? fmt(avg(jobTimes, start)) : '–';

    $('filters').innerHTML = (partial
      ? [['all', me.night ? 'All night shifts' : 'Everyone']]
      : [['all', me.night ? 'All night shifts' : 'Everyone'], ['city', me.city], ['job', me.job]]).map(([f, label]) => `<button type="button" class="pill" data-f="${f}">${escapeHtml(label)}</button>`).join('');

    half = me.minutes >= 720 ? 'pm' : 'am';
    renderCrowdClock();

    setSky(me.minutes);
    document.querySelectorAll('.step').forEach(s => { s.hidden = true; });
    $('results').hidden = false;
    $('privacyNote').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('halfSwitch').addEventListener('click', () => {
    half = half === 'pm' ? 'am' : 'pm';
    renderCrowdClock();
  });

  $('filters').addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    const f = b.dataset.f;
    if (f === 'all') filter = { city: false, job: false };
    else filter[f] = !filter[f];
    renderCrowdClock();
  });

  // After the time only: show where they stand among everyone, then invite them to add city and job.
  async function showTeaser() {
    me = { minutes, city: null, job: null, night: nightShift, partial: true };
    filter = { city: false, job: false };
    try {
      crowd = await loadCrowd();
      if (!LIVE) crowd.push({ minutes, city: null, job: null, night: nightShift });
    } catch (err) {
      console.error(err);
      crowd = [];
    }
    renderResults();
  }

  $('cityBack').addEventListener('click', () => renderResults());

  $('curiousBtn').addEventListener('click', () => {
    $('results').hidden = true;
    $('explore').hidden = true;
    showStep(2);
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

  combo({
    input: $('exSearch'), list: $('exSearchList'),
    options: [...window.CITIES, ...window.OCCUPATIONS].filter(o => !o.startsWith('Other') && o !== 'Something else'),
    onPick: showLookup,
  });
  $('exploreBtn').addEventListener('click', () => showExplore(true));
  $('dtClose').addEventListener('click', closeDetail);
  $('detail').addEventListener('click', e => { if (e.target === $('detail')) closeDetail(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && detail) closeDetail(); });
  $('dtSearch').addEventListener('input', () => renderDetail());
  $('dtAll').addEventListener('click', () => { detail.pick = null; renderDetail(); });
  $('exBack').addEventListener('click', () => showExplore(false));
  $('exMoreCities').addEventListener('click', () => { exShowAll.city = !exShowAll.city; renderExplore(); });
  $('exMoreJobs').addEventListener('click', () => { exShowAll.job = !exShowAll.job; renderExplore(); });

  // Start over: forget today's answer and go back to step 1.
  $('resetBtn').addEventListener('click', () => {
    try { localStorage.removeItem(STORE_KEY); } catch {}
    me = null; crowd = []; filter = { city: false, job: false };
    minutes = 18 * 60;
    nightShift = false;
    setCity(null);
    cityCombo.set('');
    jobCombo.set('');
    setJob(null);
    $('explore').hidden = true;
    renderPicker();
    $('results').hidden = true;
    $('privacyNote').hidden = false;
    showStep(1);
  });

  // The logo always takes you back to the first screen.
  document.querySelector('.nav-brand').addEventListener('click', e => {
    e.preventDefault();
    if (detail) closeDetail();
    $('nightAsk').hidden = true;
    document.body.classList.remove('modal-open');
    $('resetBtn').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------- Start ----------
  $('privacyNote').hidden = true;
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
