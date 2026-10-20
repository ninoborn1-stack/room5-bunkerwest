// Wochenplan-Baustein: echte Woche mit Datum, Grundprogramm aus config.WEEK + echte Events aus dem Backend.
// Verwendet im Profil (voll) und auf der Events-Seite (angeteasert).
import { $, $$, icons, esc, toast, t, L, isArtist, currentUser } from './app.js';
import { WEEK, EVENT_CATEGORIES } from './config.js';
import { api } from './api.js';
import { ymd, parseYmd, timeLabel } from './pricing.js';
import { locale } from './i18n.js';

const START = 7 * 60, END = 24 * 60;
const KIND = () => ({ yoga: t('ev.kind.yoga'), cowork: t('ev.kind.cowork'), setup: t('ev.kind.setup'), event: t('ev.kind.event') });
const toMin = (hhmm) => { const [h, m] = String(hhmm || '19:00').split(':').map(Number); return h * 60 + (m || 0) + (h < 6 ? 1440 : 0); };
const pct = (m) => ((Math.min(Math.max(m, START), END) - START) / (END - START)) * 100;

export function mondayOf(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

/** Blöcke eines Tages: Grundprogramm, Abend-Programm durch echte Events ersetzt */
function blocksFor(date, wd, events) {
  const real = events.filter((e) => e.date === date);
  const out = [];
  for (const b of WEEK[wd]) {
    if (b.kind === 'event' && real.length) continue;
    out.push({ ...b, generic: b.kind === 'event' });
  }
  for (const e of real) out.push({ kind: 'event', from: toMin(e.start), to: toMin(e.end), title: e.title, event: e });
  return out.sort((a, b) => a.from - b.from);
}

/**
 * root: Container · opts.user · opts.events (aus api.events) · opts.teaser (Events-Seite: nur anteasern)
 * opts.eventHref(e): Ziel beim Klick auf ein Event
 */
export function renderWeekPlan(root, opts) {
  const state = { offset: 0 };
  const draw = () => {
    const user = opts.user; const artist = isArtist(user);
    const monday = mondayOf(); monday.setDate(monday.getDate() + state.offset * 7);
    const days = [...Array(7)].map((_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
    const today = ymd(new Date());
    const k = KIND();
    const label = `${days[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
    const isLocked = (b) => (b.kind === 'cowork' || b.membersOnly || b.event?.membersOnly) && !artist;
    const block = (b, date) => {
      const locked = isLocked(b);
      const title = b.title ? L(b.title) : k[b.kind];
      const note = locked ? (b.kind === 'cowork' ? t('ev.artistsOnly') : t('ev.membersOnly')) : b.kind === 'setup' ? t('ev.kind.setupNote') : b.event ? (L(EVENT_CATEGORIES[b.event.category]) || '') : b.note ? L(b.note) : b.generic ? t('wp.programme') : '';
      const inner = `<b>${locked ? '<i data-lucide="lock-keyhole"></i>' : ''}${esc(title)}</b><span>${timeLabel(b.from)}–${timeLabel(b.to)}</span>${note ? `<small>${esc(note)}</small>` : ''}${b.event?.mine ? `<em class="wb-tag">${t('ev.haveTicket')}</em>` : ''}`;
      const cls = `wb k-${b.kind} ${locked ? 'is-locked' : ''} ${b.event ? 'is-event' : ''} ${b.generic ? 'is-generic' : ''}`;
      const style = `top:${pct(b.from)}%;height:${pct(b.to) - pct(b.from)}%`;
      return b.event ? `<a class="${cls}" style="${style}" href="${opts.eventHref(b.event)}">${inner}</a>` : `<div class="${cls}" style="${style}">${inner}</div>`;
    };
    const listItem = (b) => {
      const locked = isLocked(b);
      const title = b.title ? L(b.title) : k[b.kind];
      const inner = `<span>${timeLabel(b.from)}–${timeLabel(b.to)}</span><b>${locked ? '<i data-lucide="lock-keyhole"></i>' : ''}${esc(title)}</b>${locked ? `<small>${t('ev.artistsOnly')}</small>` : b.kind === 'setup' ? `<small>${t('ev.kind.setupNote')}</small>` : ''}`;
      return b.event ? `<a class="wl k-event is-event" href="${opts.eventHref(b.event)}">${inner}</a>` : `<div class="wl k-${b.kind} ${locked ? 'is-locked' : ''}">${inner}</div>`;
    };
    const hours = []; for (let h = 7; h <= 24; h++) hours.push(h);
    root.innerHTML = `
      <div class="wp-head">
        <div class="wp-nav">
          <button class="icon-btn" data-wp="-1" ${state.offset <= 0 ? 'disabled' : ''} aria-label="${t('book.prev')}"><i data-lucide="arrow-left"></i></button>
          <div><span class="label">${state.offset === 0 ? t('wp.thisWeek') : state.offset === 1 ? t('wp.nextWeek') : t('wp.inWeeks', { n: state.offset })}</span><b>${label}</b></div>
          <button class="icon-btn" data-wp="1" ${state.offset >= 3 || opts.teaser ? 'disabled' : ''} aria-label="${t('book.next')}"><i data-lucide="arrow-right"></i></button>
        </div>
        <div class="week-legend">${Object.entries(k).map(([key, v]) => `<span><i class="k-${key}"></i>${v}</span>`).join('')}</div>
      </div>
      <div class="wp-body ${opts.teaser ? 'is-teaser' : ''}">
        <div class="week-grid">
          <div class="wk-times">${hours.map((h) => `<span style="top:${pct(h * 60)}%">${String(h % 24).padStart(2, '0')}</span>`).join('')}</div>
          ${days.map((d, i) => { const date = ymd(d); return `<div class="wk-day ${date === today ? 'is-today' : ''} ${date < today ? 'is-past' : ''}"><div class="wk-head">${d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}<small>${d.getDate()}.</small></div><div class="wk-col">${blocksFor(date, i, opts.events).map((b) => block(b, date)).join('')}</div></div>`; }).join('')}
        </div>
        <div class="week-list">${days.map((d, i) => { const date = ymd(d); return `<details ${date === today || (state.offset > 0 && i === 0) ? 'open' : ''} class="${date < today ? 'is-past' : ''}"><summary>${d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}</summary>${blocksFor(date, i, opts.events).map(listItem).join('')}</details>`; }).join('')}</div>
        ${opts.teaser ? `<div class="wp-lock"><div class="wp-lock-card">${user ? `<i data-lucide="calendar-heart"></i><b>${t('wp.teaserUserTitle')}</b><p>${t('wp.teaserUserText')}</p><a href="konto.html#wochenplan" class="btn btn-primary btn-sm">${t('wp.toProfile')} <i data-lucide="arrow-right"></i></a>`
          : `<i data-lucide="lock-keyhole"></i><b>${t('wp.teaserTitle')}</b><p>${t('wp.teaserText')}</p><a href="login.html?tab=register" class="btn btn-primary btn-sm">${t('home.community.join')} <i data-lucide="arrow-right"></i></a><a href="login.html" class="link-arrow" style="margin-top:6px">${t('nav.login')}</a>`}</div></div>` : ''}
      </div>`;
    icons(root);
  };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-wp]'); if (b && !b.disabled) { state.offset += Number(b.dataset.wp); draw(); } });
  draw();
  return { redraw: (events) => { if (events) opts.events = events; draw(); } };
}

/** Event-Karten (mit Free-Ticket für Artists) */
export function renderEventCards(root, events, user, { limit = Infinity, onChange } = {}) {
  const artist = isArtist(user);
  const list = events.slice(0, limit);
  if (!list.length) { root.innerHTML = `<div class="cart-empty"><i data-lucide="calendar"></i><p>${t('ev.none')}</p></div>`; icons(root); return; }
  root.innerHTML = list.map((e) => {
    const d = parseYmd(e.date);
    const two = e.perArtist > 1;
    const cta = e.mine ? `<span class="status confirmed">${e.mineQty > 1 ? t('ev.haveTicket2') : t('ev.haveTicket')}</span>`
      : artist && (e.freeTickets || e.membersOnly) ? (e.freeLeft > 0
        ? `<div class="ticket-cta"><button class="btn btn-primary btn-sm" data-ticket="${e.id}" data-qty="1">${e.membersOnly ? t('ev.reserve') : t('ev.claim1')}</button>${two && e.freeLeft > 1 ? `<button class="btn btn-ghost btn-sm" data-ticket="${e.id}" data-qty="2">${e.membersOnly ? t('ev.reserve2') : t('ev.claim2')}</button>` : ''}<small>${e.membersOnly ? t('ev.membersFree') : t('ev.left', { n: e.freeLeft })}</small></div>`
        : `<span class="status cancelled">${t('ev.soldOut')}</span>`)
      : e.membersOnly ? `<span class="gold-note"><i data-lucide="lock-keyhole"></i>${t('ev.membersOnly')}</span>`
      : e.freeTickets ? `<span class="gold-note"><i data-lucide="ticket"></i>${two ? t('ev.freeForArtists2') : t('ev.freeForArtists1')}</span>` : '';
    return `<article class="event-card ${e.membersOnly ? 'is-members' : ''}" id="ev-${e.id}">
      <div class="ev-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString(locale, { month: 'short' })}</span><small>${d.toLocaleDateString(locale, { weekday: 'short' })}</small></div>
      <div class="ev-body"><span class="tag-soft">${esc(L(EVENT_CATEGORIES[e.category]) || e.category)}</span>
        <h3 class="h4">${esc(L(e.title))}</h3><p class="muted">${esc(L(e.description) || '')}</p>
        <div class="mono muted" style="font-size:12px">${e.start}–${e.end}${two && !e.membersOnly ? ` · ${t('ev.bigEvent')}` : ''}</div></div>
      <div class="ev-cta">${cta}</div></article>`;
  }).join('');
  icons(root);
  if (!root.dataset.bound) {
    root.dataset.bound = '1';
    root.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-ticket]'); if (!b) return;
      b.disabled = true;
      try { await api.claimTicket(b.dataset.ticket, Number(b.dataset.qty) || 1); toast(t('ev.claimed'), 'ticket'); onChange?.(); }
      catch (ex) { toast(ex.code ? t(`err.${ex.code}`) : ex.message, 'circle-alert'); b.disabled = false; }
    });
  }
}

/** Glocken-Button "Bei neuen Events benachrichtigen" */
export function bindNotify(btn, user) {
  if (!btn || !user) return;
  btn.hidden = false;
  const set = (on) => { btn.querySelector('span').textContent = on ? t('ev.notifyOn') : t('ev.notifyOff'); btn.classList.toggle('btn-primary', on); btn.classList.toggle('btn-ghost', !on); };
  set(user.notifyEvents);
  btn.addEventListener('click', async () => { const { user: u } = await api.updateMe({ notifyEvents: !currentUser.notifyEvents }); Object.assign(currentUser, u); set(u.notifyEvents); toast(u.notifyEvents ? t('ev.notifyOn') : t('ev.notifyOff'), 'bell'); });
}
