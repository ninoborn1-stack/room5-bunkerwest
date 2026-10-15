import { $, icons, esc, toast, userReady, gsap } from './app.js';
import { MEMBER } from './config.js';
import { api } from './api.js';
import { parseYmd, sessionRange, sessionLabel, hourLabel, euro, ymd } from './pricing.js';

const STATUS = { confirmed: 'Bestätigt', pending: 'Angefragt', declined: 'Abgelehnt', cancelled: 'Storniert' };
const fmt = (d) => parseYmd(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

const user = await userReady;
if (!user) location.replace('login.html?next=konto.html');
else render();

async function render() {
  const member = ['member', 'admin'].includes(user.role);
  const tier = user.role === 'admin' ? 'Admin' : user.role === 'member' ? (user.tier === 'resident' ? 'Resident' : 'Member') : 'Profil';
  $('[data-account-tier]').textContent = member ? `Bunkerwest Community · ${tier}` : 'Dein Profil';
  $('[data-account-hello]').textContent = `Hallo, ${user.name.split(' ')[0]}.`;
  $('[data-account-badge]').outerHTML = member
    ? `<span class="lock-badge"><i data-lucide="badge-check"></i>${tier}</span>`
    : '<span class="profile-badge"><i data-lucide="user-round"></i>Profil</span>';
  $('[data-account-name]').textContent = user.name;
  $('[data-account-email]').textContent = user.email;
  $('[data-account-benefits]').innerHTML = (member ? [
    ['badge-percent', `${Math.round(MEMBER.discount * 100)} % auf alle Sessions`, 'Wird beim Buchen automatisch abgezogen.'],
    ['calendar-clock', `${MEMBER.windowMember} Tage Buchungsfenster`, `Öffentlich nur ${MEMBER.windowPublic} Tage.`],
    ['users-round', 'Community & Events', 'Infos kommen per Mail.'],
  ] : [
    ['calendar-check', 'Buchungen im Überblick', 'Alle Termine an einem Ort, stornierbar bis 48 h vorher.'],
    ['zap', 'Schneller buchen', 'Name und E-Mail sind beim Buchen schon ausgefüllt.'],
  ]).map(([i, b, s]) => `<li><i data-lucide="${i}"></i><div><b>${b}</b><span>${s}</span></div></li>`).join('');
  if (user.role === 'admin') $('[data-account-benefits]').insertAdjacentHTML('afterend', '<a href="admin.html" class="link-arrow" style="margin-bottom:20px">Zum Admin-Bereich <i data-lucide="arrow-up-right"></i></a>');
  if (!member) await membershipCard();
  icons();
  await loadBookings();
}

async function membershipCard() {
  let status = null;
  try { ({ status } = await api.membershipStatus()); } catch {}
  const box = $('[data-membership-card]');
  const text = status === 'pending'
    ? ['hourglass', 'Deine Membership-Anfrage wird geprüft', 'Wir melden uns per Mail, sobald wir reingehört haben.', null]
    : status === 'rejected'
      ? ['circle-slash', 'Deine letzte Anfrage wurde abgelehnt', 'Du kannst jederzeit eine neue Anfrage stellen.', 'Neue Anfrage stellen']
      : ['lock-keyhole', 'Bunkerwest Community', `Members sparen ${Math.round(MEMBER.discount * 100)} % auf jede Session und buchen bis zu ${MEMBER.windowMember} Tage im Voraus. Nur auf Anfrage.`, 'Mitgliedschaft anfragen'];
  box.innerHTML = `<div class="card card-pad member-upsell">
    <span class="ico"><i data-lucide="${text[0]}"></i></span>
    <div style="flex:1;min-width:220px"><h3 class="h4">${text[1]}</h3><p class="muted" style="margin:6px 0 0;font-size:15px">${text[2]}</p></div>
    ${text[3] ? `<a href="membership.html#anfrage" class="btn btn-ghost btn-sm">${text[3]} <i data-lucide="arrow-right"></i></a>` : '<span class="status pending">In Prüfung</span>'}
  </div>`;
}

async function loadBookings() {
  const box = $('[data-bookings]');
  const { bookings } = await api.myBookings();
  const list = [...bookings].sort((a, b) => (b.sessions[0]?.date || '').localeCompare(a.sessions[0]?.date || ''));
  $('[data-booking-count]').textContent = `${list.length} Buchung${list.length === 1 ? '' : 'en'}`;
  if (!list.length) {
    box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar-plus-2"></i><p>Noch keine Buchungen.<br><a href="buchen.html" class="link-arrow" style="margin-top:12px">Erste Session buchen</a></p></div>`;
    icons(box); return;
  }
  const today = ymd(new Date());
  box.innerHTML = list.map((b) => {
    const upcoming = b.sessions.some((s) => s.date >= today);
    const canCancel = upcoming && ['confirmed', 'pending'].includes(b.status);
    return `<div class="booking-row">
      <div>
        <div class="row" style="gap:10px"><span class="mono muted" style="font-size:12px">${esc(b.id)}</span><span class="status ${b.status}">${STATUS[b.status] || b.status}</span></div>
        ${b.sessions.map((s) => { const [a, z] = sessionRange(s); return `<div style="margin-top:8px"><b>${fmt(s.date)}</b> <span class="mono muted" style="font-size:13px">· ${hourLabel(a)}–${hourLabel(z)} · ${sessionLabel(s)}</span></div>`; }).join('')}
      </div>
      <div style="text-align:right"><div class="h4">${euro(b.total || 0)}</div>
        ${canCancel ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-cancel="${esc(b.id)}"><i data-lucide="x"></i>Stornieren</button>` : ''}</div>
    </div>`;
  }).join('');
  icons(box);
  gsap.from(box.children, { y: 20, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' });
}

document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-cancel]');
  if (c) {
    if (!confirm('Diese Buchung wirklich stornieren?')) return;
    await api.cancel(c.dataset.cancel); toast('Buchung storniert', 'calendar-x-2'); loadBookings();
  }
  if (e.target.closest('[data-logout]')) { await api.logout(); location.href = './'; }
});
