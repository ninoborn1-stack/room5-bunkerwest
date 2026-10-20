import { $, $$, icons, esc, toast, userReady, t, L, lang, isArtist, currentUser } from './app.js';
import { WEEK, EVENT_CATEGORIES } from './config.js';
import { api } from './api.js';
import { parseYmd, timeLabel } from './pricing.js';
import { locale } from './i18n.js';

const KIND = { yoga: t('ev.kind.yoga'), cowork: t('ev.kind.cowork'), setup: t('ev.kind.setup'), event: t('ev.kind.event') };
const START = 7 * 60, END = 24 * 60;

function renderWeek(user) {
  const artist = isArtist(user);
  const days = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''));
  $('[data-legend]').innerHTML = Object.entries(KIND).map(([k, v]) => `<span><i class="k-${k}"></i>${v}</span>`).join('');
  const hours = []; for (let h = 7; h <= 24; h += 1) hours.push(h);
  const pct = (m) => ((m - START) / (END - START)) * 100;
  const block = (b) => {
    const locked = b.kind === 'cowork' && !artist;
    const title = b.title ? L(b.title) : KIND[b.kind];
    return `<div class="wb k-${b.kind} ${locked ? 'is-locked' : ''}" style="top:${pct(b.from)}%;height:${pct(b.to) - pct(b.from)}%">
      <b>${locked ? `<i data-lucide="lock-keyhole"></i>` : ''}${esc(title)}</b><span>${timeLabel(b.from)}–${timeLabel(b.to)}</span>${locked ? `<small>${t('ev.artistsOnly')}</small>` : b.note ? `<small>${esc(L(b.note))}</small>` : ''}</div>`;
  };
  $('[data-week]').innerHTML = `
    <div class="week-grid">
      <div class="wk-times">${hours.map((h) => `<span style="top:${pct(h * 60)}%">${String(h % 24).padStart(2, '0')}</span>`).join('')}</div>
      ${WEEK.map((blocks, i) => `<div class="wk-day"><div class="wk-head">${days[i]}</div><div class="wk-col">${blocks.map(block).join('')}</div></div>`).join('')}
    </div>
    <div class="week-list">${WEEK.map((blocks, i) => `<details ${i === (new Date().getDay() + 6) % 7 ? 'open' : ''}><summary>${days[i]}</summary>${blocks.map((b) => {
      const locked = b.kind === 'cowork' && !artist;
      return `<div class="wl k-${b.kind} ${locked ? 'is-locked' : ''}"><span>${timeLabel(b.from)}–${timeLabel(b.to)}</span><b>${locked ? '<i data-lucide="lock-keyhole"></i>' : ''}${esc(b.title ? L(b.title) : KIND[b.kind])}</b>${locked ? `<small>${t('ev.artistsOnly')}</small>` : ''}</div>`;
    }).join('')}</details>`).join('')}</div>`;
  icons($('[data-week]'));
}

async function renderEvents(user) {
  const artist = isArtist(user);
  const { events } = await api.events();
  const box = $('[data-events]');
  if (!events.length) { box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar"></i><p>${t('ev.none')}</p></div>`; icons(box); return; }
  box.innerHTML = events.map((e) => {
    const d = parseYmd(e.date);
    const cta = e.mine ? `<span class="status confirmed">${t('ev.haveTicket')}</span>`
      : artist && e.freeTickets ? (e.freeLeft > 0 ? `<button class="btn btn-primary btn-sm" data-ticket="${e.id}">${t('ev.claim', { n: e.freeLeft })}</button>` : `<span class="status cancelled">${t('ev.soldOut')}</span>`)
      : e.freeTickets ? `<span class="gold-note"><i data-lucide="ticket"></i>${t('ev.freeForArtists', { n: e.freeLeft })}</span>` : '';
    return `<article class="event-card" id="${e.id}">
      <div class="ev-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString(locale, { month: 'short' })}</span><small>${d.toLocaleDateString(locale, { weekday: 'short' })}</small></div>
      <div class="ev-body"><span class="tag-soft">${esc(L(EVENT_CATEGORIES[e.category]) || e.category)}</span>
        <h3 class="h4">${esc(L(e.title))}</h3><p class="muted">${esc(L(e.description) || '')}</p>
        <div class="mono muted" style="font-size:12px">${e.start}–${e.end}${e.artistFree ? ` · ${t('ev.artistFree')}` : ''}</div></div>
      <div class="ev-cta">${cta}</div></article>`;
  }).join('');
  icons(box);
}

function renderNotify(user) {
  const btn = $('[data-notify-toggle]');
  if (!user) {
    const hint = $('[data-guest-hint]'); hint.hidden = false;
    hint.innerHTML = `<i data-lucide="bell"></i><span>${t('ev.guestHint')} <a href="login.html?tab=register">${t('home.community.join')}</a></span>`; icons(hint);
    return;
  }
  btn.hidden = false;
  const set = (on) => { btn.querySelector('span').textContent = on ? t('ev.notifyOn') : t('ev.notifyOff'); btn.classList.toggle('btn-primary', on); btn.classList.toggle('btn-ghost', !on); };
  set(user.notifyEvents);
  btn.addEventListener('click', async () => { const { user: u } = await api.updateMe({ notifyEvents: !currentUser.notifyEvents }); Object.assign(currentUser, u); set(u.notifyEvents); toast(u.notifyEvents ? t('ev.notifyOn') : t('ev.notifyOff'), 'bell'); });
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ticket]');
  if (!b) return;
  b.disabled = true;
  try { await api.claimTicket(b.dataset.ticket); toast(t('ev.claimed'), 'ticket'); renderEvents(await userReady); }
  catch (ex) { toast(ex.code ? t(`err.${ex.code}`) : ex.message, 'circle-alert'); b.disabled = false; }
});

const user = await userReady;
renderWeek(user); renderNotify(user); renderEvents(user);
