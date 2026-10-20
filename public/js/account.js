import { $, $$, icons, esc, toast, userReady, gsap, t, L, lang, verifiedBadge, isArtist, formError } from './app.js';
import { MEMBERSHIP, SLOTS, REQUEST_TYPES } from './config.js';
import { api } from './api.js';
import { parseYmd, sessionRange, sessionLabel, timeLabel, euro, ymd } from './pricing.js';
import { locale, setLang } from './i18n.js';
import { renderWeekPlan, renderEventCards, bindNotify } from './weekplan.js';

const fmt = (d) => parseYmd(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const user0 = await userReady;
if (!user0) location.replace('login.html?next=konto.html');
else load();

async function load() {
  const data = await api.overview();
  const u = data.user;
  const artist = isArtist(u);
  const tierLabel = u.role === 'admin' ? 'Admin' : artist ? t('role.artist') : t('role.community');
  $('[data-account-tier]').textContent = `Bunker West · ${tierLabel}`;
  $('[data-account-hello]').innerHTML = `${esc(t('acc.hello', { name: u.name.split(' ')[0] }))} ${verifiedBadge(u.role, 34)}`;
  $('[data-account-badge]').innerHTML = `<span class="${artist ? 'lock-badge' : 'profile-badge'}">${verifiedBadge(u.role, 16)}${tierLabel}</span>`;
  $('[data-account-name]').innerHTML = `${esc(u.name)}`;
  $('[data-account-email]').textContent = u.email;
  const f = $('[data-settings]');
  f.elements.name.value = u.name; f.elements.lang.value = u.lang || lang; f.elements.newsletter.checked = u.newsletter; f.elements.notifyEvents.checked = u.notifyEvents;
  if (artist) $('[data-book-cta] span').textContent = t('nav.bookNow');
  if (u.role === 'admin') $('[data-membership-card]').insertAdjacentHTML('beforebegin', `<a href="admin.html" class="btn btn-ghost btn-sm" style="width:max-content"><i data-lucide="shield-check"></i>${t('acc.toAdmin')}</a>`);
  renderMembership(u, data);
  renderBookings(data);
  renderTickets(data);
  await renderWeek(u);
  icons();
}

// Wochenplan + alle Events (Artists: Coworking freigeschaltet, Free-Tickets)
let week = null; let notifyBound = false;
async function renderWeek(u) {
  const { events } = await api.events();
  if (week) week.redraw(events);
  else week = renderWeekPlan($('[data-week]'), { user: u, events, eventHref: (e) => `#ev-${e.id}` });
  renderEventCards($('[data-events]'), events, u, { onChange: load });
  if (!notifyBound) { bindNotify($('[data-notify-toggle]'), u); notifyBound = true; }
  if (location.hash === '#wochenplan') setTimeout(() => document.getElementById('wochenplan')?.scrollIntoView(), 300);
}

function renderMembership(u, data) {
  const box = $('[data-membership-card]');
  const app = data.application;
  const cap = data.capacity;
  if (isArtist(u) && u.role !== 'admin') {
    const m = u.membership || {};
    box.innerHTML = `<div class="card card-pad member-upsell artist-card">
      <span class="ico">${verifiedBadge('artist', 26)}</span>
      <div style="flex:1;min-width:220px"><h3 class="h4">${t('acc.artistActive')}</h3>
        <p class="muted" style="margin:6px 0 0;font-size:15px">${m.kind === 'free' ? t('acc.freeSpot') : t('acc.paidSpot', { n: euro(cap.price) })} · ${t('acc.since', { d: new Date(m.since).toLocaleDateString(locale) })}</p>
        <ul class="perk-list"><li>${t('acc.perk1')}</li><li>${t('acc.perk2')}</li><li>${t('acc.perk3')}</li><li>${t('acc.perk4')}</li></ul></div>
      ${m.kind === 'paid' ? `<button class="btn btn-ghost btn-sm" data-cancel-membership>${t('acc.cancelMembership')}</button>` : ''}
    </div>`;
    return;
  }
  if (u.role === 'admin') { box.innerHTML = ''; return; }
  let html;
  if (app?.status === 'invited') {
    html = `<span class="ico gold-ico"><i data-lucide="party-popper"></i></span><div style="flex:1;min-width:220px"><h3 class="h4">${t('acc.invitedTitle')}</h3><p class="muted" style="margin:6px 0 0;font-size:15px">${t('acc.invitedText', { n: euro(cap.price) })}</p></div><button class="btn btn-primary btn-sm" data-activate>${t('acc.activate')}</button>`;
  } else if (app?.status === 'pending') {
    html = `<span class="ico"><i data-lucide="hourglass"></i></span><div style="flex:1;min-width:220px"><h3 class="h4">${t('acc.pendingTitle')}</h3><p class="muted" style="margin:6px 0 0;font-size:15px">${t('acc.pendingText')}</p></div><span class="status pending">${t('acc.inReview')}</span>`;
  } else if (app?.status === 'waitlist') {
    html = `<span class="ico"><i data-lucide="list-ordered"></i></span><div style="flex:1;min-width:220px"><h3 class="h4">${t('acc.waitTitle')}</h3><p class="muted" style="margin:6px 0 0;font-size:15px">${t('acc.waitText')}</p></div><span class="status pending">${t('acc.waitlist')}</span>`;
  } else {
    const rejected = app?.status === 'rejected';
    html = `<span class="ico gold-ico">${verifiedBadge('artist', 24)}</span><div style="flex:1;min-width:220px"><h3 class="h4">${rejected ? t('acc.rejectedTitle') : t('acc.upsellTitle')}</h3><p class="muted" style="margin:6px 0 0;font-size:15px">${rejected ? t('acc.rejectedText') : t('acc.upsellText', { n: cap.paidLeft })}</p></div><a href="membership.html#artist" class="btn btn-ghost btn-sm">${t('acc.apply')} <i data-lucide="arrow-right"></i></a>`;
  }
  box.innerHTML = `<div class="card card-pad member-upsell">${html}</div>`;
}

const STATUS = (s) => t(`status.${s}`);
function renderBookings(data) {
  const box = $('[data-bookings]');
  const items = [
    ...data.bookings.map((b) => ({ kind: 'booking', date: b.sessions[0]?.date || '', ...b })),
    ...data.requests.map((r) => ({ kind: 'request', date: r.sessions?.[0]?.date || r.createdAt.slice(0, 10), ...r })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  $('[data-booking-count]').textContent = String(items.length);
  if (!items.length) { box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar-plus-2"></i><p>${t('acc.none')}<br><a href="buchen.html" class="link-arrow" style="margin-top:12px">${t('acc.book')}</a></p></div>`; return; }
  const today = ymd(new Date());
  box.innerHTML = items.map((x) => {
    const type = x.kind === 'booking' ? t('acc.typeBooking') : L(REQUEST_TYPES.find((r) => r.id === x.type)?.label) || x.type;
    const sessions = (x.sessions || []).map((s) => { const [a, z] = sessionRange(s); return `<div style="margin-top:8px"><b>${fmt(s.date)}</b> <span class="mono muted" style="font-size:13px">· ${timeLabel(a)}–${timeLabel(z)} · ${sessionLabel(s, lang)}</span></div>`; }).join('');
    const canCancel = x.kind === 'booking' && x.sessions.some((s) => s.date >= today) && x.status === 'confirmed';
    return `<div class="booking-row"><div>
        <div class="row" style="gap:10px"><span class="mono muted" style="font-size:12px">${esc(x.id)}</span><span class="tag-soft">${esc(type)}</span><span class="status ${x.status}">${STATUS(x.status)}</span></div>
        ${sessions || `<p class="muted" style="margin:8px 0 0;font-size:14px">${esc((x.message || '').slice(0, 140))}</p>`}
      </div><div style="text-align:right">${x.total ? `<div class="h4">${euro(x.total)}</div>` : ''}
        ${canCancel ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-cancel="${esc(x.id)}"><i data-lucide="x"></i>${t('acc.cancel')}</button>` : ''}</div></div>`;
  }).join('');
}

function renderTickets(data) {
  if (!data.tickets.length) return;
  $('[data-tickets-card]').hidden = false;
  $('[data-tickets]').innerHTML = data.tickets.map((tk) => `<div class="booking-row"><div><b>${esc(L(tk.event?.title) || '–')}</b><div class="mono muted" style="font-size:13px;margin-top:4px">${tk.event ? `${fmt(tk.event.date)} · ${tk.event.start}` : ''}</div></div><span class="status confirmed">Free</span></div>`).join('');
}

$('[data-settings]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const { user } = await api.updateMe({ name: d.name, lang: d.lang, newsletter: !!d.newsletter, notifyEvents: !!d.notifyEvents });
  toast(t('acc.saved'));
  if (user.lang !== lang) setLang(user.lang); else load();
});
$('[data-password]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  try { await api.changePassword(d.current, d.password); e.target.reset(); toast(t('acc.pwSaved')); formError($('[data-password-error]'), ''); }
  catch (ex) { formError($('[data-password-error]'), ex.code ? t(`err.${ex.code}`) : ex.message); }
});

document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-cancel]');
  if (c) { if (!confirm(t('acc.confirmCancel'))) return; await api.cancelBooking(c.dataset.cancel); toast(t('acc.cancelled'), 'calendar-x-2'); load(); }
  if (e.target.closest('[data-logout]')) { await api.logout(); location.href = './'; }
  if (e.target.closest('[data-activate]')) { const { url } = await api.membershipCheckout(); location.href = url; }
  if (e.target.closest('[data-cancel-membership]')) {
    if (!confirm(t('acc.confirmEnd'))) return;
    const r = await api.membershipCancel();
    if (r.url) location.href = r.url; else { toast(t('acc.ended')); location.reload(); }
  }
});
