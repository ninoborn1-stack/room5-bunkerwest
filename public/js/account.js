// Profil: Member-Navigation (Wochenplan · Events/Free-Tickets · Buchungen · Membership | Einstellungen · Logout)
import { $, $$, icons, esc, toast, userReady, t, L, lang, verifiedBadge, isArtist, formError, publicConfig } from './app.js';
import { REQUEST_TYPES, MEMBERSHIP } from './config.js';
import { api } from './api.js';
import { parseYmd, windowsLabel, sessionRange, sessionLabel, timeLabel, euro, ymd } from './pricing.js';
import { locale, setLang } from './i18n.js';
import { renderWeekPlan, renderEventCards, bindNotify, mondayOf } from './weekplan.js';

const fmt = (d) => parseYmd(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const user0 = await userReady;
if (!user0) location.replace('login.html?next=konto.html');

let data = null, events = [], week = null, notifyBound = false;
const TABS = ['wochenplan', 'events', 'buchungen', 'membership', 'einstellungen'];

// ---------- Tabs (über #hash, damit Links direkt auf einen Bereich zeigen können) ----------
function showTab(name) {
  if (!TABS.includes(name)) name = 'wochenplan';
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
  $$('.profile-nav [data-tab]').forEach((b) => { b.classList.toggle('is-active', b.dataset.tab === name); b.setAttribute('aria-selected', b.dataset.tab === name); });
  if (location.hash.slice(1) !== name) history.replaceState(null, '', `#${name}`);
}
$$('.profile-nav [data-tab]').forEach((b) => b.addEventListener('click', () => { showTab(b.dataset.tab); $('.profile-nav').scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
addEventListener('hashchange', () => showTab(location.hash.slice(1)));

async function load() {
  [data, { events }] = await Promise.all([api.overview(), api.events()]);
  const u = data.user;
  const artist = isArtist(u);
  renderHeader(u, artist);
  renderWeek(u);
  renderEvents(u, artist);
  renderBookings();
  await renderMembership(u, artist);
  renderSettings(u);
  icons();
}

// ---------- Kopf ----------
function renderHeader(u, artist) {
  const tier = u.role === 'admin' ? 'Admin' : artist ? t('role.artist') : t('role.community');
  const initials = u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  $('[data-avatar]').innerHTML = `<span>${esc(initials)}</span>${verifiedBadge(u.role, 26)}`;
  $('[data-avatar]').classList.toggle('is-artist', artist);
  $('[data-account-tier]').textContent = `Bunker West · ${tier}`;
  $('[data-account-hello]').innerHTML = `${esc(t('acc.hello', { name: u.name.split(' ')[0] }))}`;
  $('[data-account-meta]').textContent = `${u.email} · ${t('acc.memberSince', { d: new Date(u.membership?.since || u.createdAt).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) })}`;
  const today = ymd(new Date());
  const nextBooking = data.bookings.filter((b) => b.status === 'confirmed').flatMap((b) => b.sessions).map((s) => s.date).filter((d) => d >= today).sort()[0];
  const mon = mondayOf(); const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const weekEvents = events.filter((e) => e.date >= today && e.date <= ymd(sun)).length;
  const myTickets = data.tickets.filter((tk) => tk.event && tk.event.date >= today).reduce((n, tk) => n + (tk.qty || 1), 0);
  const openReq = data.requests.filter((r) => ['new', 'progress'].includes(r.status)).length;
  const stats = artist
    ? [['calendar-check', t('st.nextSession'), nextBooking ? parseYmd(nextBooking).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '–'], ['ticket', t('st.tickets'), myTickets], ['party-popper', t('st.weekEvents'), weekEvents]]
    : [['party-popper', t('st.weekEvents'), weekEvents], ['message-square', t('st.openRequests'), openReq], ['badge-check', 'Membership', data.application ? t(`status.${data.application.status}`) : 'Community']];
  $('[data-stats]').innerHTML = stats.map(([i, l, v]) => `<div class="ph-stat"><i data-lucide="${i}"></i><div><b>${esc(String(v))}</b><span>${l}</span></div></div>`).join('');
  if (artist) $('[data-book-cta] span').textContent = t('nav.bookNow');
  $('[data-events-tab-label]').textContent = artist ? 'Free-Tickets' : 'Events';
  if (u.role === 'admin' && !$('[data-admin-link]')) $('.ph-id').insertAdjacentHTML('beforeend', `<a href="admin.html" class="btn btn-ghost btn-sm" data-admin-link style="margin-top:12px"><i data-lucide="shield-check"></i>${t('acc.toAdmin')}</a>`);
}

// ---------- Wochenplan ----------
function renderWeek(u) {
  $('[data-week-sub]').textContent = isArtist(u) ? t('wp.subArtist') : t('wp.subCommunity');
  if (week) week.redraw(events);
  else week = renderWeekPlan($('[data-week]'), { user: u, events, eventHref: (e) => `#ev-${e.id}` });
  // Klick auf ein Event im Plan -> Events-Tab und dorthin scrollen
  $('[data-week]').onclick = (e) => {
    const a = e.target.closest('a[href^="#ev-"]'); if (!a) return;
    e.preventDefault(); showTab('events');
    setTimeout(() => document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };
  if (!notifyBound) { bindNotify($('[data-notify-toggle]'), u); notifyBound = true; }
}

// ---------- Events / Free-Tickets ----------
function renderEvents(u, artist) {
  $('[data-events-title]').textContent = artist ? 'Free-Tickets' : t('wp.allEvents');
  $('[data-events-sub]').textContent = artist ? t('ft.rule', { n: MEMBERSHIP.bigEventThreshold }) : t('ft.community');
  const mine = data.tickets.filter((tk) => tk.event && tk.event.date >= ymd(new Date()));
  $('[data-my-tickets]').innerHTML = artist && mine.length ? `<div class="my-tickets"><span class="label">${t('ft.mine')}</span>${mine.map((tk) => `<div class="ticket-stub"><i data-lucide="ticket"></i><div><b>${esc(L(tk.event.title))}</b><span>${fmt(tk.event.date)} · ${tk.event.start}</span></div><em>${tk.qty > 1 ? t('ft.qty2') : t('ft.qty1')}</em></div>`).join('')}</div>` : '';
  renderEventCards($('[data-events]'), events, u, { onChange: load });
}

// ---------- Buchungen ----------
function renderBookings() {
  const box = $('[data-bookings]');
  const items = [
    ...data.bookings.map((b) => ({ kind: 'booking', date: b.sessions[0]?.date || '', ...b })),
    ...data.requests.map((r) => ({ kind: 'request', date: r.sessions?.[0]?.date || r.createdAt.slice(0, 10), ...r })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) { box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar-plus-2"></i><p>${t('acc.none')}</p></div>`; return; }
  const today = ymd(new Date());
  box.innerHTML = items.map((x) => {
    const type = x.kind === 'booking' ? t('acc.typeBooking') : L(REQUEST_TYPES.find((r) => r.id === x.type)?.label) || x.type;
    const sessions = (x.sessions || []).map((s) => { return `<div style="margin-top:8px"><b>${fmt(s.date)}</b> <span class="mono muted" style="font-size:13px">· ${windowsLabel(s)} · ${sessionLabel(s, lang)}</span></div>`; }).join('');
    const canCancel = x.kind === 'booking' && x.sessions.some((s) => s.date >= today) && x.status === 'confirmed';
    return `<div class="booking-row"><div>
        <div class="row" style="gap:10px"><span class="mono muted" style="font-size:12px">${esc(x.id)}</span><span class="tag-soft">${esc(type)}</span><span class="status ${x.status}">${t(`status.${x.status}`)}</span></div>
        ${sessions || `<p class="muted" style="margin:8px 0 0;font-size:14px">${esc((x.message || '').slice(0, 140))}</p>`}
      </div><div style="text-align:right">${x.total ? `<div class="h4">${euro(x.total)}</div>` : ''}
        ${canCancel ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-cancel="${esc(x.id)}"><i data-lucide="x"></i>${t('acc.cancel')}</button>` : ''}</div></div>`;
  }).join('');
}

// ---------- Membership ----------
async function renderMembership(u, artist) {
  const box = $('[data-membership-card]');
  const cap = data.capacity; const app = data.application;
  if (u.role === 'admin') { box.innerHTML = `<div class="card card-pad"><p class="muted" style="margin:0">${t('acc.adminNote')}</p></div>`; return; }
  const perks = (list) => `<ul class="perk-grid">${list.map(([i, k]) => `<li><i data-lucide="${i}"></i><span>${t(k)}</span></li>`).join('')}</ul>`;
  if (artist) {
    const m = u.membership || {};
    box.innerHTML = `<div class="card card-pad membership-hero is-artist">
        <div class="mh-top">${verifiedBadge('artist', 40)}<div><span class="label">${t('acc.artistActive')}</span><h3 class="display h3">Artist</h3>
          <p class="muted" style="margin:6px 0 0">${m.kind === 'free' ? t('acc.freeSpot') : cap.price ? t('acc.paidSpot', { n: euro(cap.price) }) : ''} · ${t('acc.since', { d: new Date(m.since).toLocaleDateString(locale) })}</p></div></div>
        ${perks([['calendar-check', 'acc.perk1'], ['laptop', 'acc.perk2'], ['coffee', 'acc.perk3'], ['ticket', 'acc.perk4'], ['clapperboard', 'acc.perk5']])}
        ${m.kind === 'paid' ? `<div class="mh-foot"><button class="btn btn-ghost btn-sm" data-manage-membership><i data-lucide="settings-2"></i>${t('acc.cancelMembership')}</button></div>` : ''}
      </div>`;
    return;
  }
  let status = '';
  if (app?.status === 'invited') status = `<div class="alert ok"><i data-lucide="party-popper"></i><span><b>${t('acc.invitedTitle')}</b> ${t('acc.invitedText', { n: cap.price ? euro(cap.price) : '' })}</span><button class="btn btn-primary btn-sm" data-activate>${t('acc.activate')}</button></div>`;
  else if (app?.status === 'pending') status = `<div class="alert info"><i data-lucide="hourglass"></i><span><b>${t('acc.pendingTitle')}</b> ${t('acc.pendingText')}</span></div>`;
  else if (app?.status === 'waitlist') status = `<div class="alert info"><i data-lucide="list-ordered"></i><span><b>${t('acc.waitTitle')}</b> ${t('acc.waitText')}</span></div>`;
  else if (app?.status === 'rejected') status = `<div class="alert info"><i data-lucide="circle-slash"></i><span><b>${t('acc.rejectedTitle')}</b> ${t('acc.rejectedText')}</span></div>`;
  box.innerHTML = `<div class="membership-split">
      <div class="card card-pad membership-hero">
        <div class="mh-top">${verifiedBadge('community', 40)}<div><span class="label">${t('acc.currentTier')}</span><h3 class="display h3">Community</h3><p class="muted" style="margin:6px 0 0">${t('acc.communityFree')}</p></div></div>
        ${perks([['calendar-days', 'acc.cperk1'], ['bell', 'acc.cperk2'], ['ticket-percent', 'acc.cperk3'], ['party-popper', 'acc.cperk4']])}
      </div>
      <div class="card card-pad membership-hero is-upsell">
        <div class="mh-top">${verifiedBadge('artist', 40)}<div><span class="label">${t('acc.nextLevel')}</span><h3 class="display h3">Artist</h3><p class="muted" style="margin:6px 0 0">${t('acc.upsellText', { n: cap.paidLeft })}</p></div></div>
        ${status}
        ${perks([['calendar-check', 'acc.perk1'], ['laptop', 'acc.perk2'], ['ticket', 'acc.perk4'], ['clapperboard', 'acc.perk5']])}
        ${!app || app.status === 'rejected' ? `<div class="mh-foot"><a href="membership.html#artist" class="btn btn-primary btn-sm">${t('acc.apply')} <i data-lucide="arrow-right"></i></a></div>` : ''}
      </div></div>`;
}

// ---------- Einstellungen ----------
function renderSettings(u) {
  const f = $('[data-settings]');
  f.elements.name.value = u.name; f.elements.email.value = u.email; f.elements.lang.value = u.lang || lang;
  f.elements.newsletter.checked = u.newsletter; f.elements.notifyEvents.checked = u.notifyEvents;
  $('[data-danger]').hidden = u.role === 'admin';
}
$('[data-settings]').addEventListener('change', (e) => {
});
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

// ---------- Bestätigungsdialog ----------
function confirmDialog({ title, text, ok, password = false, action }) {
  const dlg = $('[data-modal]');
  $('[data-modal-title]').textContent = title; $('[data-modal-text]').textContent = text; $('[data-modal-ok]').textContent = ok;
  $('[data-modal-pw]').hidden = !password; $('#m-pw-confirm').value = ''; formError($('[data-modal-error]'), '');
  dlg.showModal();
  const form = $('[data-modal-form]');
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    try { await action($('#m-pw-confirm').value); dlg.close(); } catch (ex) { formError($('[data-modal-error]'), ex.code ? t(`err.${ex.code}`) : ex.message); }
  };
}

document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-cancel]');
  if (c) confirmDialog({ title: t('acc.cancelTitle'), text: t('acc.confirmCancel'), ok: t('acc.cancel'), action: async () => { await api.cancelBooking(c.dataset.cancel); toast(t('acc.cancelled'), 'calendar-x-2'); load(); } });
  if (e.target.closest('[data-logout]')) { await api.logout(); location.href = './'; }
  if (e.target.closest('[data-activate]')) { const { url } = await api.membershipCheckout(); location.href = url; }
  if (e.target.closest('[data-manage-membership]')) {
    const cfg = await publicConfig();
    confirmDialog({
      title: t('acc.manageTitle'), text: cfg.payments === 'stripe' ? t('acc.manageStripe') : t('acc.manageDemo'), ok: cfg.payments === 'stripe' ? t('acc.toPortal') : t('acc.endNow'),
      action: async () => { const r = await api.membershipCancel(); if (r.url) location.href = r.url; else { toast(t('acc.ended')); location.reload(); } },
    });
  }
  if (e.target.closest('[data-delete-open]')) {
    confirmDialog({ title: t('set.delete'), text: t('set.deleteConfirm'), ok: t('set.deleteFinal'), password: true, action: async (pw) => { await api.deleteAccount(pw); location.href = './'; } });
  }
});

if (user0) { showTab(location.hash.slice(1)); load(); }
