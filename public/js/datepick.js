// Startseite: schlichter Verfügbarkeitskalender. Tag oder Zeitraum wählen -> direkt in die Anfrage (Kontakt).
import { $, $$, icons, t } from './app.js';
import { SPACES } from './config.js';
import { api } from './api.js';
import { ymd, parseYmd } from './pricing.js';
import { locale } from './i18n.js';

const MAX_DAYS = 30, MONTHS_AHEAD = 11;
const IDS = SPACES.filter((s) => !s.own).map((s) => s.id);
const fmt = (d, o = { weekday: 'short', day: 'numeric', month: 'long' }) => parseYmd(d).toLocaleDateString(locale, o);
const addDays = (d, n) => { const x = parseYmd(d); x.setDate(x.getDate() + n); return ymd(x); };
const span = (a, b) => { let n = 0; for (let d = a; d <= b; d = addDays(d, 1)) n++; return n; };

export function mountDatePick(root) {
  const today = ymd(new Date());
  const st = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), from: null, to: null, map: {}, loaded: new Set() };

  const dayState = (d) => {
    const s = IDS.map((id) => st.map[d]?.[id]);
    if (s.every((x) => x === 'booked')) return 'full';
    return s.some(Boolean) ? 'some' : 'free';
  };

  async function load() {
    const key = `${st.month.getFullYear()}-${st.month.getMonth()}`;
    if (st.loaded.has(key)) return;
    st.loaded.add(key);
    const start = ymd(st.month) < today ? today : ymd(st.month);
    try { Object.assign(st.map, (await api.spaces(start, 45)).days); } catch { st.loaded.delete(key); }
  }

  function draw() {
    const y = st.month.getFullYear(), m = st.month.getMonth();
    $('[data-dp-month]', root).textContent = st.month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const now = new Date(); const idx = (y - now.getFullYear()) * 12 + m - now.getMonth();
    $('[data-dp-nav="-1"]', root).disabled = idx <= 0;
    $('[data-dp-nav="1"]', root).disabled = idx >= MONTHS_AHEAD;
    const first = (new Date(y, m, 1).getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate();
    const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 2));
    const to = st.to || st.from;
    let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join('') + '<div class="day empty"></div>'.repeat(first);
    for (let n = 1; n <= count; n++) {
      const d = ymd(new Date(y, m, n));
      const state = dayState(d);
      const sel = st.from && d >= st.from && d <= to;
      const off = d < today || state === 'full';
      html += `<button type="button" class="day dp-${state}${sel ? ' is-selected' : ''}${d === today ? ' is-today' : ''}" data-day="${d}" ${off ? 'disabled' : ''} aria-pressed="${!!sel}" aria-label="${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}"><span class="d">${n}</span><i class="dp-dot"></i></button>`;
    }
    $('[data-dp-grid]', root).innerHTML = html;
    $('[data-dp-label]', root).textContent = !st.from ? t('bw.cal.none') : to !== st.from ? `${fmt(st.from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short' })}` : fmt(st.from);
    const q = new URLSearchParams({ typ: 'event' });
    if (st.from) { q.set('von', st.from); q.set('bis', to); }
    $('[data-dp-send]', root).href = `kontakt.html?${q}`;
  }

  root.addEventListener('click', async (e) => {
    const day = e.target.closest('[data-day]');
    if (day && !day.disabled) {
      const d = day.dataset.day;
      if (st.from && (!st.to || st.to === st.from) && d > st.from && span(st.from, d) <= MAX_DAYS) st.to = d;
      else { st.from = d; st.to = d; }
      return draw();
    }
    const nav = e.target.closest('[data-dp-nav]');
    if (nav && !nav.disabled) { st.month = new Date(st.month.getFullYear(), st.month.getMonth() + Number(nav.dataset.dpNav), 1); draw(); await load(); draw(); }
  });
  draw(); icons(root);
  load().then(draw);
}
