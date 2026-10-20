// Admin-Bereich (intern, Deutsch)
import { $, $$, icons, esc, toast, userReady, verifiedBadge } from './app.js';
import { REQUEST_TYPES, EVENT_CATEGORIES, MEMBERSHIP, SPACES, SPACE_EXTRAS } from './config.js';
import { api } from './api.js';
import { parseYmd, windowsLabel, sessionRange, sessionLabel, timeLabel, euro } from './pricing.js';

const user = await userReady;
if (user?.role !== 'admin') location.replace('login.html?next=admin.html');

const fmt = (d) => parseYmd(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
const when = (iso) => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const typeLabel = (id) => REQUEST_TYPES.find((r) => r.id === id)?.label.de || id;
const STATUS = { new: 'Neu', progress: 'In Bearbeitung', done: 'Erledigt', declined: 'Abgelehnt', confirmed: 'Bestätigt', awaiting_payment: 'Wartet auf Zahlung', cancelled: 'Storniert', expired: 'Abgelaufen', pending: 'Offen', invited: 'Eingeladen', waitlist: 'Warteliste', active: 'Aktiv', rejected: 'Abgelehnt' };
const status = (s) => `<span class="status ${s}">${STATUS[s] || s}</span>`;
const spaceName = (id) => SPACES.find((x) => x.id === id)?.name.de || id;
const range = (a, b) => (a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);
const OCC = { reserved: 'Reserviert', booked: 'Gebucht' };
const spaceInfo = (r) => (r.spaces?.length ? `<div class="meta space-meta"><b>${r.spaces.map(spaceName).join(' · ')}</b> · ${range(r.dateFrom, r.dateTo)}${r.extras?.length ? ' · Extras: ' + r.extras.map((x) => SPACE_EXTRAS.find((e) => e.id === x)?.label.de || x).join(', ') : ''}</div>` : '');
let editOcc = null;
const sessions = (list = []) => list.map((s) => { const ex = Object.entries(s.addons || {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`); return `<div style="margin-top:6px">${fmt(s.date)} <span class="mono muted" style="font-size:13px">${windowsLabel(s)} · ${sessionLabel(s)}${ex.length ? ' · ' + esc(ex.join(', ')) : ''}</span></div>`; }).join('');

let data = null;
let tab = new URLSearchParams(location.search).get('tab') || 'requests';
let filter = 'all';
let editEvent = null;

const TABS = [
  ['requests', 'Anfragen', (d) => d.requests.filter((r) => r.status === 'new').length],
  ['bookings', 'Buchungen', (d) => d.bookings.filter((b) => b.status === 'confirmed').length],
  ['applications', 'Bewerbungen & Mitglieder', (d) => d.applications.filter((a) => a.status === 'pending').length],
  ['occupancy', 'Belegung', (d) => d.occupancy.filter((o) => o.dateTo >= new Date().toISOString().slice(0, 10)).length],
  ['events', 'Events', (d) => d.events.length],
  ['settings', 'Einstellungen', () => ''],
  ['outbox', 'E-Mails', (d) => d.outbox.length],
];

function render() {
  const cap = data.capacity;
  $('[data-status-chips]').innerHTML = `<span class="chip"><span>Artist-Plätze: ${cap.paidUsed}/${cap.paidSlots} zahlend · ${cap.freeUsed}/${cap.freeSlots} frei · Warteliste ${cap.waitlist}</span></span>
    <span class="chip"><span>Zahlung: ${data.payments === 'stripe' ? 'Stripe live' : 'Testmodus'}</span></span><span class="chip"><span>E-Mail: ${data.mail === 'resend' ? 'Resend' : 'nur Protokoll'}</span></span>`;
  $('[data-tabs]').innerHTML = TABS.map(([k, l, c]) => `<button class="${tab === k ? 'is-active' : ''}" data-tab="${k}">${l}<span>${c(data)}</span></button>`).join('');
  const p = $('[data-panel]');
  const empty = (txt) => `<div class="cart-empty"><i data-lucide="inbox"></i><p>${txt}</p></div>`;

  if (tab === 'requests') {
    const list = data.requests.filter((r) => filter === 'all' || r.type === filter);
    p.innerHTML = `<div class="admin-filter"><button class="${filter === 'all' ? 'is-active' : ''}" data-filter="all">Alle</button>${REQUEST_TYPES.map((r) => `<button class="${filter === r.id ? 'is-active' : ''}" data-filter="${r.id}">${r.label.de}</button>`).join('')}</div>` +
      (list.length ? list.map((r) => `<div class="admin-item"><div>
        <div class="row" style="gap:10px"><b>${esc(r.name)}</b><span class="tag-soft">${typeLabel(r.type)}</span>${status(r.status)}<span class="mono muted" style="font-size:12px">${r.id}</span></div>
        <div class="meta"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${r.phone ? ' · ' + esc(r.phone) : ''}${r.company ? ' · ' + esc(r.company) : ''} · ${when(r.createdAt)}</div>
        ${sessions(r.sessions)}${spaceInfo(r)}${r.total ? `<div class="meta">Normalpreis: ${euro(r.total)}</div>` : ''}
        ${Object.keys(r.fields || {}).length ? `<div class="meta">${Object.entries(r.fields).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ')}</div>` : ''}
        ${r.message ? `<pre>${esc(r.message)}</pre>` : ''}</div>
        <div class="row" style="justify-content:flex-end">
          ${r.type === 'studio' && r.sessions?.length && ['new', 'progress'].includes(r.status) ? `<button class="btn btn-primary btn-sm" data-studio="${r.id}" data-act="accept">Termin bestätigen</button><button class="btn btn-ghost btn-sm" data-studio="${r.id}" data-act="decline">Absagen</button>` : ''}
          ${r.spaces?.length && ['new', 'progress'].includes(r.status) ? (() => { const o = data.occupancy.find((x) => x.requestId === r.id); return `${o ? status(o.status === 'booked' ? 'confirmed' : 'pending') : ''}${o?.status !== 'reserved' ? `<button class="btn btn-ghost btn-sm" data-space-req="${r.id}" data-act="reserve">Reservieren</button>` : ''}<button class="btn btn-primary btn-sm" data-space-req="${r.id}" data-act="book">Fest buchen</button><button class="btn btn-ghost btn-sm" data-space-req="${r.id}" data-act="decline">Absagen</button>`; })() : ''}
          <select data-req-status="${r.id}">${['new', 'progress', 'done', 'declined'].map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select>
        </div></div>`).join('') : empty('Keine Anfragen.'));
  }

  if (tab === 'bookings') {
    p.innerHTML = data.bookings.length ? data.bookings.map((b) => `<div class="admin-item"><div>
      <div class="row" style="gap:10px"><b>${esc(b.contact?.name)}</b>${status(b.status)}<span class="mono muted" style="font-size:12px">${b.id} · ${b.artist ? 'Artist-Direktbuchung' : 'aus Anfrage'}</span></div>
      <div class="meta">${esc(b.contact?.email || '')}${b.contact?.phone ? ' · ' + esc(b.contact.phone) : ''} · ${when(b.createdAt)}${b.paidAt ? ' · bezahlt ' + when(b.paidAt) : ''}</div>
      ${sessions(b.sessions)}${b.contact?.notes ? `<pre>${esc(b.contact.notes)}</pre>` : ''}</div>
      <div style="text-align:right"><div class="h4">${euro(b.total || 0)}</div>${['confirmed', 'awaiting_payment'].includes(b.status) ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-booking="${b.id}" data-status="cancelled">Stornieren</button>` : ''}</div></div>`).join('') : empty('Noch keine Buchungen.');
  }

  if (tab === 'applications') {
    const apps = data.applications;
    const members = data.users.filter((u) => u.role === 'artist');
    p.innerHTML = `<h3 class="h4 admin-sub">Bewerbungen</h3>` + (apps.length ? apps.map((a) => `<div class="admin-item"><div>
      <div class="row" style="gap:10px"><b>${esc(a.name)}</b>${status(a.status)}<span class="mono muted" style="font-size:12px">${esc(a.role || '')} · ${esc(a.usage || '')}</span></div>
      <div class="meta"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${a.phone ? ' · ' + esc(a.phone) : ''}${a.city ? ' · ' + esc(a.city) : ''} · ${when(a.createdAt)}</div>
      ${a.genres ? `<div class="meta">Genres: ${esc(a.genres)}${a.referral ? ' · Empfehlung: ' + esc(a.referral) : ''}</div>` : ''}${a.links ? `<div class="meta">Links: ${esc(a.links)}</div>` : ''}
      <pre>${esc(a.motivation)}</pre></div>
      <div class="row" style="justify-content:flex-end">${a.status === 'pending' || a.status === 'waitlist' ? `<button class="btn btn-primary btn-sm" data-app="${a.id}" data-act="approve" data-kind="paid">Annehmen (zahlend)</button><button class="btn btn-ghost btn-sm" data-app="${a.id}" data-act="approve" data-kind="free">Freiplatz</button><button class="btn btn-ghost btn-sm" data-app="${a.id}" data-act="reject">Ablehnen</button>` : ''}</div></div>`).join('') : empty('Keine Bewerbungen.')) +
      `<h3 class="h4 admin-sub">Artist-Member (${members.length})</h3>` + (members.length ? members.map((u) => `<div class="admin-item"><div><div class="row" style="gap:10px"><b class="name-line">${esc(u.name)} ${verifiedBadge(u.role, 16)}</b>${status(u.membership?.status || 'active')}<span class="mono muted" style="font-size:12px">${u.membership?.kind === 'free' ? 'Freiplatz' : 'zahlend'}</span></div><div class="meta">${esc(u.email)} · seit ${when(u.membership?.since)}</div></div>
      <div><button class="btn btn-ghost btn-sm" data-revoke="${u.id}">Membership beenden</button></div></div>`).join('') : empty('Noch keine Artist-Member.')) +
      `<h3 class="h4 admin-sub">Community (${data.users.filter((u) => u.role === 'community').length})</h3><div class="admin-item"><div class="meta">${data.users.filter((u) => u.role === 'community').map((u) => esc(u.name)).join(' · ') || '–'}</div><div><button class="btn btn-ghost btn-sm" data-newsletter>Newsletter-Liste (CSV)</button></div></div>`;
  }

  if (tab === 'occupancy') {
    const o = editOcc || {};
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = data.occupancy.filter((x) => x.dateTo >= today);
    p.innerHTML = `<form class="form admin-form" data-occ-form>
      <h3 class="h4">${o.id ? 'Belegung bearbeiten' : 'Belegung eintragen'}</h3>
      <p class="muted" style="margin:0;font-size:14px">Steuert den Kalender im Grundriss auf der Startseite. Öffentlich sichtbar ist nur frei / angefragt·reserviert / gebucht – nie Titel oder Namen. Anfragen mit Bereichen erscheinen automatisch als „angefragt“.</p>
      <div class="chips">${SPACES.filter((x) => !x.own).map((x) => `<label class="chip"><input type="checkbox" name="spaces" value="${x.id}" ${o.spaces?.includes(x.id) ? 'checked' : ''}><span>${x.name.de}</span></label>`).join('')}</div>
      <div class="form-grid">
        <div class="field"><label>Von</label><input name="dateFrom" type="date" required value="${o.dateFrom || ''}"></div>
        <div class="field"><label>Bis</label><input name="dateTo" type="date" value="${o.dateTo || ''}"></div>
        <div class="field"><label>Status</label><select name="status"><option value="booked" ${o.status !== 'reserved' ? 'selected' : ''}>Gebucht</option><option value="reserved" ${o.status === 'reserved' ? 'selected' : ''}>Reserviert / vorgemerkt</option></select></div>
        <div class="field"><label>Titel (intern)</label><input name="title" value="${esc(o.title || '')}" placeholder="z. B. Firmenfeier Müller"></div>
      </div>
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">${o.id ? 'Speichern' : 'Eintragen'}</button>${o.id ? '<button class="btn btn-ghost btn-sm" type="button" data-occ-new>Neu</button>' : ''}</div>
    </form>
    <h3 class="h4 admin-sub">Kommende Belegung (${upcoming.length})</h3>` + (upcoming.length ? upcoming.map((x) => `<div class="admin-item"><div>
      <div class="row" style="gap:10px"><b>${esc(x.title || 'Ohne Titel')}</b>${status(x.status === 'booked' ? 'confirmed' : 'pending').replace(/>[^<]*<\/span>$/, `>${OCC[x.status]}</span>`)}${x.requestId ? `<span class="mono muted" style="font-size:12px">aus Anfrage ${x.requestId}</span>` : ''}</div>
      <div class="meta">${range(x.dateFrom, x.dateTo)} · ${x.spaces.map(spaceName).join(' · ')}</div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-ghost btn-sm" data-occ-edit="${x.id}">Bearbeiten</button><button class="btn btn-ghost btn-sm" data-occ-del="${x.id}">Löschen</button></div></div>`).join('') : empty('Noch nichts eingetragen.'));
  }

  if (tab === 'events') {
    const e = editEvent || {};
    p.innerHTML = `<form class="form admin-form" data-event-form>
      <h3 class="h4">${e.id ? 'Event bearbeiten' : 'Neues Event'}</h3>
      <div class="form-grid">
        <div class="field"><label>Titel (DE) *</label><input name="title_de" required value="${esc(e.title?.de || '')}"></div>
        <div class="field"><label>Titel (EN)</label><input name="title_en" value="${esc(e.title?.en || '')}"></div>
        <div class="field"><label>Datum *</label><input name="date" type="date" required value="${e.date || ''}"></div>
        <div class="field"><label>Kategorie</label><select name="category">${Object.entries(EVENT_CATEGORIES).map(([k, v]) => `<option value="${k}" ${e.category === k ? 'selected' : ''}>${v.de}</option>`).join('')}</select></div>
        <div class="field"><label>Beginn</label><input name="start" type="time" value="${e.start || '19:00'}"></div>
        <div class="field"><label>Ende</label><input name="end" type="time" value="${e.end || '23:00'}"></div>
        <div class="field"><label>Kapazität</label><input name="capacity" type="number" min="0" value="${e.capacity ?? 100}"></div>
        <div class="field"><label>Free-Tickets für Artists (gesamt)</label><input name="freeTickets" type="number" min="0" value="${e.freeTickets ?? 6}"></div>
        <div class="field"><label>Verkaufte Tickets (ab ${MEMBERSHIP.bigEventThreshold}: +1 Freund)</label><input name="ticketsSold" type="number" min="0" value="${e.ticketsSold ?? 0}"></div>
        <div class="field full"><label>Beschreibung (DE)</label><textarea name="desc_de" style="min-height:80px">${esc(e.description?.de || '')}</textarea></div>
        <div class="field full"><label>Beschreibung (EN)</label><textarea name="desc_en" style="min-height:80px">${esc(e.description?.en || '')}</textarea></div>
      </div>
      <label class="check"><input type="checkbox" name="plusOne" ${e.plusOne ? 'checked' : ''}><span>Großes Event: Artists dürfen 2 Free-Tickets nehmen (für sich + einen Freund)</span></label>
      <label class="check"><input type="checkbox" name="membersOnly" ${e.membersOnly ? 'checked' : ''}><span>Nur für Artist-Member (Membersday): kein Eintritt, +1 Gast</span></label>
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Speichern</button>${e.id ? '<button class="btn btn-ghost btn-sm" type="button" data-event-new>Neu</button>' : ''}</div>
    </form>` + (data.events.length ? data.events.map((ev) => {
      const sold = data.tickets.filter((t) => t.eventId === ev.id).reduce((n, t) => n + (t.qty || 1), 0);
      const per = ev.membersOnly || ev.plusOne || (ev.ticketsSold || 0) >= MEMBERSHIP.bigEventThreshold ? 2 : 1;
      return `<div class="admin-item"><div><div class="row" style="gap:10px"><b>${esc(ev.title.de)}</b><span class="tag-soft">${EVENT_CATEGORIES[ev.category]?.de || ev.category}</span>${ev.notifiedAt ? '<span class="status confirmed">benachrichtigt</span>' : ''}</div>
        <div class="meta">${fmt(ev.date)} · ${ev.start}–${ev.end} · ${ev.membersOnly ? `Membersday · ${sold}/${ev.capacity || '∞'} Plätze` : `Free-Tickets ${sold}/${ev.freeTickets} · ${per} pro Artist`}${ev.ticketsSold ? ` · ${ev.ticketsSold} verkauft` : ''}</div></div>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-ghost btn-sm" data-event-edit="${ev.id}">Bearbeiten</button><button class="btn btn-ghost btn-sm" data-event-notify="${ev.id}">Benachrichtigen</button><button class="btn btn-ghost btn-sm" data-event-del="${ev.id}">Löschen</button></div></div>`;
    }).join('') : empty('Keine Events.'));
  }

  if (tab === 'settings') {
    const s = data.settings;
    p.innerHTML = `<form class="form admin-form" data-settings-form>
      <h3 class="h4">Artist-Membership</h3>
      <div class="form-grid">
        <div class="field"><label>Monatsbeitrag (€)</label><input name="artistPriceMonthly" type="number" min="0" step="0.01" value="${s.artistPriceMonthly}"></div>
        <div class="field"><label>Zahlende Plätze</label><input name="paidSlots" type="number" min="0" value="${s.paidSlots}"></div>
        <div class="field"><label>Freiplätze</label><input name="freeSlots" type="number" min="0" value="${s.freeSlots}"></div>
      </div>
      <p class="muted" style="font-size:14px;margin:0">Werden Plätze erhöht, rückt automatisch die Warteliste nach (mit E-Mail).</p>
      <div><button class="btn btn-primary btn-sm" type="submit">Speichern</button></div>
    </form>`;
  }

  if (tab === 'outbox') {
    p.innerHTML = `<div class="admin-item"><div class="meta">${data.mail === 'resend' ? 'E-Mails werden über Resend versendet.' : 'Noch kein Mail-Dienst verbunden – alle E-Mails landen hier im Protokoll (RESEND_API_KEY setzen, dann gehen sie raus).'}</div><div></div></div>` +
      (data.outbox.length ? data.outbox.map((m) => `<details class="admin-item mail-item"><summary><div><div class="row" style="gap:10px"><b>${esc(m.subject)}</b><span class="tag-soft">${m.template}</span><span class="status ${m.status === 'sent' ? 'confirmed' : m.status === 'queued' ? 'pending' : 'cancelled'}">${m.status}</span></div><div class="meta">an ${esc(m.to)} · ${when(m.createdAt)} · ${m.lang}</div></div></summary><iframe sandbox srcdoc="${esc(m.html)}"></iframe></details>`).join('') : empty('Noch keine E-Mails.'));
  }
  icons();
}

async function load() { data = await api.admin.overview(); render(); }

document.addEventListener('click', async (e) => {
  const tg = e.target.closest('button'); if (!tg) return;
  const ds = tg.dataset;
  try {
    if (e.target.closest('[data-logout]')) { await api.logout(); location.href = './'; return; }
    if (ds.tab) { tab = ds.tab; history.replaceState(null, '', `?tab=${tab}`); return render(); }
    if (ds.filter) { filter = ds.filter; return render(); }
    if (ds.studio) { await api.admin.studio(ds.studio, ds.act); toast(ds.act === 'accept' ? 'Termin bestätigt – E-Mail raus' : 'Abgesagt – E-Mail raus'); }
    else if (ds.spaceReq) { if (ds.act === 'decline' && !confirm('Anfrage absagen? Der Kunde bekommt eine E-Mail.')) return; await api.admin.spaceRequest(ds.spaceReq, ds.act); toast(ds.act === 'book' ? 'Fest gebucht – E-Mail raus' : ds.act === 'reserve' ? 'Reserviert – E-Mail raus' : 'Abgesagt – E-Mail raus'); }
    else if (ds.occEdit) { editOcc = data.occupancy.find((x) => x.id === ds.occEdit); render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (ds.occNew !== undefined) { editOcc = null; render(); return; }
    else if (ds.occDel) { if (!confirm('Eintrag löschen?')) return; await api.admin.deleteOccupancy(ds.occDel); toast('Gelöscht'); }
    else if (ds.booking) { if (!confirm('Buchung wirklich stornieren?')) return; await api.admin.booking(ds.booking, ds.status); toast('Buchung storniert'); }
    else if (ds.app) { const r = await api.admin.application(ds.app, ds.act, ds.kind); toast(r.application.status === 'invited' ? 'Eingeladen – Zahlungslink per E-Mail' : r.application.status === 'waitlist' ? 'Plätze voll – auf Warteliste gesetzt' : r.application.status === 'active' ? 'Freiplatz vergeben' : 'Abgelehnt'); }
    else if (ds.revoke) { if (!confirm('Membership wirklich beenden?')) return; await api.admin.revoke(ds.revoke); toast('Membership beendet – Warteliste rückt nach'); }
    else if (ds.eventEdit) { editEvent = data.events.find((x) => x.id === ds.eventEdit); render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (ds.eventNew !== undefined) { editEvent = null; render(); return; }
    else if (ds.eventDel) { if (!confirm('Event löschen?')) return; await api.admin.deleteEvent(ds.eventDel); toast('Event gelöscht'); }
    else if (ds.eventNotify) { const r = await api.admin.notifyEvent(ds.eventNotify); toast(`${r.sent} Benachrichtigungen verschickt`); }
    else if (ds.newsletter !== undefined) {
      const { csv } = await api.admin.newsletter();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'newsletter.csv'; a.click(); return;
    } else return;
    load();
  } catch (ex) { toast(ex.message, 'circle-alert'); }
});
document.addEventListener('change', async (e) => {
  const sel = e.target.closest('[data-req-status]');
  if (sel) { await api.admin.request(sel.dataset.reqStatus, { status: sel.value }); toast('Status gespeichert'); load(); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.matches('[data-event-form]')) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await api.admin.saveEvent({ ...d, id: editEvent?.id, plusOne: !!d.plusOne, membersOnly: !!d.membersOnly }); editEvent = null; toast('Event gespeichert'); load(); } catch (ex) { toast(ex.message, 'circle-alert'); }
  }
  if (e.target.matches('[data-occ-form]')) {
    e.preventDefault();
    const f = new FormData(e.target);
    try { await api.admin.saveOccupancy({ id: editOcc?.id, spaces: f.getAll('spaces'), dateFrom: f.get('dateFrom'), dateTo: f.get('dateTo') || f.get('dateFrom'), status: f.get('status'), title: f.get('title') }); editOcc = null; toast('Belegung gespeichert'); load(); } catch (ex) { toast(ex.message, 'circle-alert'); }
  }
  if (e.target.matches('[data-settings-form]')) {
    e.preventDefault();
    await api.admin.settings(Object.fromEntries(new FormData(e.target))); toast('Einstellungen gespeichert'); load();
  }
});

if (user?.role === 'admin') load();
