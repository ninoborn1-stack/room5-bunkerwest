// Bunker West: interaktiver Grundriss + Verfügbarkeitskalender + Anfrage-Auswahl.
// Bereiche sind nur anfragbar. Belegung kommt aus /spaces/availability (frei · angefragt/reserviert · gebucht).
import { $, $$, icons, esc, toast, t, L } from './app.js';
import { SPACES, SPACE_COMBOS, SPACE_EXTRAS, PLAN_SIZE } from './config.js';
import { api } from './api.js';
import { ymd, parseYmd } from './pricing.js';
import { locale } from './i18n.js';

const RANK = { free: 0, held: 1, booked: 2 };
const MAX_DAYS = 30, MONTHS_AHEAD = 11;
const bookable = SPACES.filter((s) => !s.own);
const byId = Object.fromEntries(SPACES.map((s) => [s.id, s]));
const img = (n, sm = true) => `img/bunker/${n}${sm ? '-sm' : ''}.jpg`;
const pathD = (poly) => poly.split(' M').map((part) => `M${part.trim().split(' ').join(' L')}Z`).join(' ');
const fmt = (d, o = { day: 'numeric', month: 'short' }) => parseYmd(d).toLocaleDateString(locale, o);
const addDays = (d, n) => { const x = parseYmd(d); x.setDate(x.getDate() + n); return ymd(x); };
const between = (a, b) => { const out = []; for (let d = a; d <= b && out.length <= MAX_DAYS; d = addDays(d, 1)) out.push(d); return out; };

export function mountFloorplan(root) {
  const today = ymd(new Date());
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem('bw-sel')) || {}; } catch { return {}; } })();
  const st = {
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    from: saved.from >= today ? saved.from : null, to: saved.to >= today ? saved.to : null,
    selected: new Set((saved.spaces || []).filter((id) => byId[id] && !byId[id].own)),
    extras: new Set(saved.extras || []),
    focus: null, map: {}, loaded: new Set(),
  };
  const persist = () => { try { sessionStorage.setItem('bw-sel', JSON.stringify({ from: st.from, to: st.to, spaces: [...st.selected], extras: [...st.extras] })); } catch {} };
  const days = () => (st.from ? between(st.from, st.to || st.from) : [today]);
  const stateOn = (id, d) => st.map[d]?.[id] || 'free';
  const stateOf = (id, list = days()) => (byId[id].own ? 'own' : list.reduce((w, d) => (RANK[stateOn(id, d)] > RANK[w] ? stateOn(id, d) : w), 'free'));
  const label = (s) => ({ free: t('bw.st.free'), held: t('bw.st.held'), booked: t('bw.st.booked'), own: t('bw.st.own') }[s]);

  // ---------- Daten laden (monatsweise, gecacht)
  async function load(month) {
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    if (st.loaded.has(key)) return;
    st.loaded.add(key);
    const start = ymd(month) < today ? today : ymd(month);
    try { const r = await api.spaces(start, 45); Object.assign(st.map, r.days); } catch { st.loaded.delete(key); }
  }

  // ---------- Grundriss
  const plan = $('[data-plan]', root);
  plan.innerHTML = `<img class="plan-img plan-dark" src="img/bunker/plan-dark.jpg" alt="" draggable="false"><img class="plan-img plan-light" src="img/bunker/plan-light.jpg" alt="" draggable="false">
    <svg class="plan-svg" viewBox="0 0 ${PLAN_SIZE[0]} ${PLAN_SIZE[1]}" role="group" aria-label="${t('bw.plan.aria')}">
      ${SPACES.map((s) => `<path class="hs" data-space="${s.id}" d="${pathD(s.poly)}" tabindex="0" role="button"><title>${esc(L(s.name))}</title></path>`).join('')}
    </svg>`;
  const list = $('[data-space-list]', root);

  function drawPlan() {
    const dd = days();
    $$('.hs', plan).forEach((el) => {
      const id = el.dataset.space, s = stateOf(id, dd);
      el.setAttribute('class', `hs is-${s}${st.selected.has(id) ? ' is-selected' : ''}${st.focus === id ? ' is-focus' : ''}`);
      el.setAttribute('aria-pressed', st.selected.has(id));
      el.setAttribute('aria-label', `${L(byId[id].name)} – ${label(s)}`);
    });
    list.innerHTML = SPACES.map((s) => { const state = stateOf(s.id, dd); return `<button type="button" class="space-pill is-${state} ${st.selected.has(s.id) ? 'is-selected' : ''}" data-space="${s.id}" aria-pressed="${st.selected.has(s.id)}"><i class="dot"></i><b>${esc(L(s.name))}</b><span>${s.area} m²</span></button>`; }).join('');
    const dl = $('[data-plan-date] span', root);
    dl.textContent = st.from ? (st.to && st.to !== st.from ? `${fmt(st.from)} – ${fmt(st.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : fmt(st.from, { weekday: 'short', day: 'numeric', month: 'long' })) : `${t('bw.today')} · ${t('bw.pickDate')}`;
  }

  // ---------- Kalender
  const cal = $('[data-cal]', root);
  function drawCal() {
    const m = st.month; const y = m.getFullYear(), mo = m.getMonth();
    $('[data-month]', root).textContent = m.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const nowM = new Date(); const idx = (y - nowM.getFullYear()) * 12 + mo - nowM.getMonth();
    $('[data-month-nav="-1"]', root).disabled = idx <= 0;
    $('[data-month-nav="1"]', root).disabled = idx >= MONTHS_AHEAD;
    const first = (new Date(y, mo, 1).getDay() + 6) % 7, count = new Date(y, mo + 1, 0).getDate();
    const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 2));
    const focusIds = st.selected.size ? [...st.selected] : bookable.map((s) => s.id);
    const range = st.from ? between(st.from, st.to || st.from) : [];
    let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join('') + '<div class="day empty"></div>'.repeat(first);
    for (let n = 1; n <= count; n++) {
      const d = ymd(new Date(y, mo, n));
      const states = focusIds.map((id) => stateOn(id, d));
      const worst = states.reduce((w, s) => (RANK[s] > RANK[w] ? s : w), 'free');
      const allBooked = states.every((s) => s === 'booked');
      const cls = ['day', d === today ? 'is-today' : '', range.includes(d) ? 'is-selected' : '', d === st.from ? 'r-start' : '', d === (st.to || st.from) ? 'r-end' : '',
        allBooked ? 'full' : '', st.selected.size ? `sel-${worst}` : ''].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-day="${d}" ${d < today ? 'disabled' : ''} aria-label="${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}"><span class="d">${n}</span><span class="bar">${states.slice(0, 7).map((s) => `<i class="${s === 'booked' ? 'b' : s === 'held' ? 'h' : ''}"></i>`).join('')}</span></button>`;
    }
    cal.innerHTML = html;
    $('[data-cal-hint]', root).textContent = st.selected.size ? t('bw.cal.hintSel') : t('bw.cal.hint');
  }

  // ---------- Raumkarte
  const card = $('[data-space-card]', root);
  function drawCard() {
    const s = byId[st.focus];
    if (!s) {
      const free = bookable.filter((x) => stateOf(x.id) === 'free').length;
      card.innerHTML = `<div class="sc-empty"><span class="ico"><i data-lucide="mouse-pointer-click"></i></span><h3 class="h4">${t('bw.card.emptyTitle')}</h3><p>${t('bw.card.emptyText')}</p>
        <ul><li><i data-lucide="check"></i>${t('bw.card.emptyFree', { n: free, total: bookable.length })}</li><li><i data-lucide="layers"></i>${t('bw.card.emptyCombine')}</li><li><i data-lucide="mail"></i>${t('bw.card.emptyRequest')}</li></ul></div>`;
      icons(card); return;
    }
    const state = stateOf(s.id), sel = st.selected.has(s.id);
    card.innerHTML = `<button type="button" class="icon-btn sc-close" data-card-close aria-label="${t('bw.card.close')}"><i data-lucide="x"></i></button>
      <div class="sc-media"><img src="${img(s.images[0], false)}" alt="${esc(L(s.name))}" data-sc-main>${s.images.length > 1 ? `<div class="sc-thumbs">${s.images.map((n, i) => `<button type="button" data-sc-img="${n}" class="${i === 0 ? 'is-active' : ''}"><img src="${img(n)}" alt=""></button>`).join('')}</div>` : ''}</div>
      <div class="sc-head"><h3 class="h4">${esc(L(s.name))}</h3><span class="space-state is-${state}"><i class="dot"></i>${label(state)}</span></div>
      <div class="mono muted sc-meta">${s.area} m² · ${t(`bw.cat.${s.cat}`)}</div>
      <p class="muted">${esc(L(s.desc))}</p>
      <ul class="sc-feats">${L(s.features).map((f) => `<li><i data-lucide="check"></i>${esc(f)}</li>`).join('')}</ul>
      ${s.own ? `<a href="${s.link}" class="btn btn-primary btn-block">${t('bw.card.toRoom5')} <i data-lucide="arrow-right"></i></a>`
        : state === 'booked' && !sel ? `<button type="button" class="btn btn-ghost btn-block" disabled>${t('bw.toast.booked')}</button>`
        : `<button type="button" class="btn ${sel ? 'btn-ghost' : 'btn-primary'} btn-block" data-toggle="${s.id}">${sel ? t('bw.card.remove') : t('bw.card.add')} <i data-lucide="${sel ? 'minus' : 'plus'}"></i></button>`}
      ${state === 'held' && !s.own ? `<p class="sc-note"><i data-lucide="info"></i>${t('bw.sel.heldNote')}</p>` : ''}`;
    icons(card);
  }

  // ---------- Auswahl
  const selRoot = $('[data-selection]', root);
  $('[data-combos]', root).innerHTML = SPACE_COMBOS.map((c) => `<button type="button" class="combo" data-combo="${c.id}"><i data-lucide="layers"></i>${esc(L(c.label))}</button>`).join('');
  $('[data-extras]', root).innerHTML = SPACE_EXTRAS.map((x) => `<label class="chip"><input type="checkbox" value="${x.id}" data-extra ${st.extras.has(x.id) ? 'checked' : ''}><span><i data-lucide="${x.icon}"></i>${esc(L(x.label))}</span></label>`).join('');
  function drawSel() {
    const ids = [...st.selected];
    const dd = days();
    const blocked = ids.filter((id) => stateOf(id, dd) === 'booked');
    const area = ids.reduce((n, id) => n + byId[id].area, 0);
    $('[data-sel-list]', root).innerHTML = ids.length
      ? `<div class="sel-date"><i data-lucide="calendar-days"></i>${st.from ? $('[data-plan-date] span', root).textContent : t('bw.sel.noDate')}</div>` +
        ids.map((id) => { const s = stateOf(id, dd); return `<div class="sel-item is-${s}"><i class="dot"></i><div><b>${esc(L(byId[id].name))}</b><span>${byId[id].area} m²${s === 'booked' ? ` · ${t('bw.sel.bookedWarn')}` : s === 'held' ? ` · ${t('bw.st.held')}` : ''}</span></div><button type="button" class="icon-btn" data-toggle="${id}" aria-label="${t('bw.card.remove')}"><i data-lucide="x"></i></button></div>`; }).join('') +
        `<div class="sel-total"><span>${t('bw.sel.total')}</span><b>${Math.round(area)} m²</b></div>`
      : `<p class="muted sel-empty"><i data-lucide="mouse-pointer-click"></i>${t('bw.sel.empty')}</p>`;
    $('[data-sel-clear]', root).hidden = !ids.length;
    const send = $('[data-sel-send]', root);
    const q = new URLSearchParams({ typ: 'event' });
    if (ids.length) q.set('raeume', ids.join(','));
    if (st.from) { q.set('von', st.from); q.set('bis', st.to || st.from); }
    if (st.extras.size) q.set('extras', [...st.extras].join(','));
    send.href = `kontakt.html?${q}`;
    send.classList.toggle('is-disabled', blocked.length > 0);
    send.setAttribute('aria-disabled', blocked.length > 0);
    icons(selRoot);
  }

  const drawAll = () => { drawPlan(); drawCal(); drawCard(); drawSel(); persist(); };

  function toggle(id) {
    const s = byId[id]; if (!s) return;
    if (s.own) { st.focus = id; drawAll(); return; }
    if (st.selected.has(id)) { st.selected.delete(id); toast(t('bw.toast.removed', { s: L(s.name) }), 'minus'); }
    else if (stateOf(id) === 'booked') { st.focus = id; drawAll(); toast(t('bw.toast.booked'), 'calendar-x'); return; }
    else { st.selected.add(id); toast(t('bw.toast.added', { s: L(s.name) }), 'plus'); }
    st.focus = id; drawAll();
  }

  // ---------- Events
  root.addEventListener('click', async (e) => {
    const sp = e.target.closest('[data-space]'); if (sp) return toggle(sp.dataset.space);
    const tg = e.target.closest('[data-toggle]'); if (tg) return toggle(tg.dataset.toggle);
    const day = e.target.closest('[data-day]');
    if (day && !day.disabled) {
      const d = day.dataset.day;
      if (st.from && (!st.to || st.to === st.from) && d > st.from && between(st.from, d).length <= MAX_DAYS) st.to = d;
      else { st.from = d; st.to = d; }
      return drawAll();
    }
    const nav = e.target.closest('[data-month-nav]');
    if (nav && !nav.disabled) { st.month = new Date(st.month.getFullYear(), st.month.getMonth() + Number(nav.dataset.monthNav), 1); drawCal(); await load(st.month); return drawAll(); }
    const combo = e.target.closest('[data-combo]');
    if (combo) {
      const c = SPACE_COMBOS.find((x) => x.id === combo.dataset.combo);
      const free = c.ids.filter((id) => stateOf(id) !== 'booked');
      free.forEach((id) => st.selected.add(id));
      if (free.length < c.ids.length) toast(t('bw.toast.someBooked'), 'calendar-x');
      st.focus = null; return drawAll();
    }
    if (e.target.closest('[data-sel-clear]')) { st.selected.clear(); st.focus = null; return drawAll(); }
    if (e.target.closest('[data-card-close]')) { st.focus = null; return drawAll(); }
    const th = e.target.closest('[data-sc-img]');
    if (th) { $('[data-sc-main]', card).src = img(th.dataset.scImg, false); $$('[data-sc-img]', card).forEach((b) => b.classList.toggle('is-active', b === th)); }
    if (e.target.closest('[data-sel-send].is-disabled')) { e.preventDefault(); toast(t('bw.sel.bookedWarn'), 'calendar-x'); }
  });
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('hs')) { e.preventDefault(); toggle(e.target.dataset.space); } });
  root.addEventListener('change', (e) => { if (e.target.matches('[data-extra]')) { e.target.checked ? st.extras.add(e.target.value) : st.extras.delete(e.target.value); drawSel(); persist(); } });

  if (st.from) st.month = new Date(parseYmd(st.from).getFullYear(), parseYmd(st.from).getMonth(), 1);
  drawAll();
  load(st.month).then(drawAll);
}
