import { $, icons, esc, toast, userReady } from './app.js';
import { api } from './api.js';
import { parseYmd, sessionRange, sessionLabel, hourLabel, euro } from './pricing.js';

const user = await userReady;
if (user?.role !== 'admin') location.replace('login.html?next=admin.html');

const STATUS = { confirmed: 'Bestätigt', pending: 'Offen', declined: 'Abgelehnt', cancelled: 'Storniert', approved: 'Freigegeben', rejected: 'Abgelehnt' };
const fmt = (d) => parseYmd(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
const when = (iso) => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '');
let data = { bookings: [], memberships: [], messages: [] };
let tab = new URLSearchParams(location.search).get('tab') || 'memberships';

const TABS = [
  ['memberships', 'Mitgliedschaften', (d) => d.memberships.filter((m) => m.status === 'pending').length],
  ['bookings', 'Buchungen', (d) => d.bookings.filter((b) => b.status === 'pending').length],
  ['messages', 'Nachrichten', (d) => d.messages.filter((m) => !m.read).length],
  ['users', 'Accounts', (d) => d.users.length],
];

function render() {
  $('[data-tabs]').innerHTML = TABS.map(([k, l, c]) => `<button class="${tab === k ? 'is-active' : ''}" data-tab="${k}">${l}<span>${c(data)}</span></button>`).join('');
  const panel = $('[data-panel]');
  const empty = (t) => `<div class="cart-empty"><i data-lucide="inbox"></i><p>${t}</p></div>`;
  if (tab === 'memberships') panel.innerHTML = data.memberships.length ? data.memberships.map((m) => `
    <div class="admin-item"><div>
      <div class="row" style="gap:10px"><b>${esc(m.name)}</b><span class="status ${m.status}">${STATUS[m.status]}</span><span class="mono muted" style="font-size:12px">${esc(m.tier)} · ${esc(m.role || '')}</span></div>
      <div class="meta">${esc(m.email)} ${m.phone ? '· ' + esc(m.phone) : ''} ${m.city ? '· ' + esc(m.city) : ''} · ${when(m.createdAt)}</div>
      ${m.genres ? `<div class="meta">Genres: ${esc(m.genres)} · Nutzung: ${esc(m.usage || '')}${m.referral ? ' · Empfehlung: ' + esc(m.referral) : ''}</div>` : ''}
      ${m.links ? `<div class="meta">Links: ${esc(m.links)}</div>` : ''}
      <pre>${esc(m.motivation)}</pre></div>
      <div class="row">${m.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-mb="${m.id}" data-act="approve"><i data-lucide="check"></i>Freigeben</button><button class="btn btn-ghost btn-sm" data-mb="${m.id}" data-act="reject">Ablehnen</button>` : ''}</div>
    </div>`).join('') : empty('Keine Anfragen.');
  if (tab === 'bookings') panel.innerHTML = data.bookings.length ? data.bookings.map((b) => `
    <div class="admin-item"><div>
      <div class="row" style="gap:10px"><b>${esc(b.contact?.name)}</b><span class="status ${b.status}">${STATUS[b.status]}</span><span class="mono muted" style="font-size:12px">${esc(b.id)} · ${b.mode === 'book' ? 'Direktbuchung' : 'Anfrage'}${b.member ? ' · Member' : ''}</span></div>
      <div class="meta">${esc(b.contact?.email)} ${b.contact?.phone ? '· ' + esc(b.contact.phone) : ''} ${b.contact?.project ? '· ' + esc(b.contact.project) : ''} · ${when(b.createdAt)}</div>
      ${b.sessions.map((s) => { const [a, z] = sessionRange(s); const ex = [...Object.entries(s.staff || {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}h`), ...Object.entries(s.services || {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}×`), ...(s.upgrades || [])]; return `<div style="margin-top:6px">${fmt(s.date)} <span class="mono muted" style="font-size:13px">${hourLabel(a)}–${hourLabel(z)} · ${sessionLabel(s)}${ex.length ? ' · ' + esc(ex.join(', ')) : ''}</span></div>`; }).join('')}
      ${b.contact?.notes ? `<pre>${esc(b.contact.notes)}</pre>` : ''}</div>
      <div style="text-align:right"><div class="h4">${euro(b.total || 0)}</div><div class="row" style="margin-top:10px;justify-content:flex-end">
        ${b.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-bk="${b.id}" data-act="confirm">Bestätigen</button>` : ''}
        ${['pending', 'confirmed'].includes(b.status) ? `<button class="btn btn-ghost btn-sm" data-bk="${b.id}" data-act="decline">Absagen</button>` : ''}</div></div>
    </div>`).join('') : empty('Noch keine Buchungen.');
  if (tab === 'messages') panel.innerHTML = data.messages.length ? data.messages.map((m) => `
    <div class="admin-item" style="${m.read ? 'opacity:.6' : ''}"><div>
      <div class="row" style="gap:10px"><b>${esc(m.subject || '(ohne Betreff)')}</b><span class="status ${m.read ? 'approved' : 'pending'}">${esc(m.type)}</span></div>
      <div class="meta">${esc(m.name)} · <a href="mailto:${esc(m.email)}" style="text-decoration:underline">${esc(m.email)}</a>${m.company ? ' · ' + esc(m.company) : ''} · ${when(m.createdAt)}</div>
      <pre>${esc(m.message)}</pre></div>
      <div>${m.read ? '' : `<button class="btn btn-ghost btn-sm" data-msg="${m.id}">Gelesen</button>`}</div>
    </div>`).join('') : empty('Keine Nachrichten.');
  if (tab === 'users') panel.innerHTML = data.users.map((u) => `
    <div class="admin-item"><div><div class="row" style="gap:10px"><b>${esc(u.name)}</b><span class="status approved">${esc(u.role)}${u.tier ? ' · ' + esc(u.tier) : ''}</span></div><div class="meta">${esc(u.email)}</div></div><div></div></div>`).join('');
  icons();
}

async function load() { data = await api.adminOverview(); render(); }

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-logout]')) { await api.logout(); location.href = './'; return; }
  const t = e.target.closest('[data-tab], [data-mb], [data-bk], [data-msg]');
  if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; history.replaceState(null, '', `?tab=${tab}`); return render(); }
  if (t.dataset.mb) { await api.adminMembership(t.dataset.mb, t.dataset.act); toast(t.dataset.act === 'approve' ? 'Freigegeben – Account angelegt' : 'Anfrage abgelehnt'); }
  if (t.dataset.bk) { await api.adminBooking(t.dataset.bk, t.dataset.act); toast(t.dataset.act === 'confirm' ? 'Buchung bestätigt' : 'Buchung abgesagt'); }
  if (t.dataset.msg) await api.adminRead(t.dataset.msg);
  load();
});

if (user?.role === 'admin') load();
