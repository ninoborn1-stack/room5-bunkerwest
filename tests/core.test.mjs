// Backend-Kern: Ablauf-Test (ohne Server). Start: npm test
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { createBackend } = await import(root + '/public/js/backend/core.js');
const { createObjectStore, seedIfEmpty } = await import(root + '/public/js/backend/store.js');
const { ymd } = await import(root + '/public/js/pricing.js');
const fs = await import('node:fs');
const seed = JSON.parse(fs.readFileSync(root + '/data/seed.json', 'utf8'));
const store = createObjectStore({});
await seedIfEmpty(store, seed, { iterations: 2000 });
const be = createBackend({ store, env: { PBKDF2_ITER: 2000 } });
let tok = {};
const call = async (who, method, path, body, extra = {}) => { const r = await be.handle({ method, path, body, token: tok[who], lang: 'de', site: 'http://x', ...extra }); if (r.setToken) tok[who] = r.setToken; return r; };
let failed = 0;
const ok = (label, cond, info='') => { if (!cond) failed++; console.log(cond ? 'OK  ' : 'FAIL', label, cond ? '' : JSON.stringify(info)); };
const pw = (role) => seed.users.find((u) => u.role === role).password;
const em = (role) => seed.users.find((u) => u.role === role).email;
// Community-Registrierung
let r = await call('c', 'POST', '/auth/register', { name: 'Neu', email: 'neu@room5.test', password: 'testpass-1', newsletter: true });
ok('community register', r.status === 201 && r.body.user.role === 'community', r.body);
r = await call('c', 'POST', '/auth/register', { name: 'Neu', email: 'neu@room5.test', password: 'testpass-1' });
ok('duplicate blocked', r.status === 409);
// Free day finden
const av = (await call('c', 'GET', '/availability')).body.booked;
let day; for (let i = 3; i < 40; i++) { const d = ymd(new Date(Date.now() + i * 864e5)); if (!av[d]) { day = d; break; } }
// Community darf nicht direkt buchen
r = await call('c', 'POST', '/bookings/checkout', { sessions: [{ date: day, slots: ['day'] }] });
ok('community cannot checkout', r.status === 403, r.body);
// Studio-Anfrage als Community
r = await call('c', 'POST', '/requests', { type: 'studio', sessions: [{ date: day, slots: ['day', 'night'], addons: { engineer: 3 } }], message: '' });
ok('studio request', r.status === 201, r.body);
// Artist login + checkout
r = await call('a', 'POST', '/auth/login', { email: em('artist'), password: pw('artist') });
ok('artist login', r.status === 200 && r.body.user.role === 'artist', r.body);
r = await call('a', 'POST', '/bookings/checkout', { sessions: [{ date: day, slots: ['day', 'night'], addons: { producer: 2, mix: 1 } }] });
ok('artist checkout', r.status === 201 && r.body.url.includes('test=1'), r.body);
ok('price (2×250)×0.7 + 2×30 + 250', r.body.booking?.total === 660, r.body.booking?.total);
const bid = r.body.booking?.id;
r = await call('c', 'GET', '/availability'); ok('hold blocks hours', (r.body.booked[day] || []).includes('d12') && (r.body.booked[day] || []).includes('n23'));
r = await call('a', 'POST', '/payments/demo-confirm', { kind: 'booking', ref: bid });
const b = await store.get('bookings', bid); ok('booking confirmed after payment', b.status === 'confirmed', b.status);
// Bewerbung ohne Profil
r = await call('x', 'POST', '/applications', { name: 'Bewerber', email: 'bew@room5.test', password: 'testpass-2', motivation: 'Ich produziere Rap und Elektronik seit Jahren.' });
ok('application creates profile', r.status === 201 && r.body.user.role === 'community', r.body);
// Admin
r = await call('ad', 'POST', '/auth/login', { email: em('admin'), password: pw('admin') });
let ov = (await call('ad', 'GET', '/admin/overview')).body;
const app = ov.applications.find((a) => a.email === 'bew@room5.test');
r = await call('ad', 'POST', `/admin/applications/${app.id}/approve`, { kind: 'paid' });
ok('approve -> invited', r.body.application?.status === 'invited', r.body);
r = await call('x', 'POST', '/membership/checkout', {});
ok('membership checkout url', r.body.url?.includes('kind=membership'), r.body);
await call('x', 'POST', '/payments/demo-confirm', { kind: 'membership', ref: app.id });
r = await call('x', 'GET', '/auth/me'); ok('now artist', r.body.user.role === 'artist', r.body.user);
// Kapazität / Warteliste
await call('ad', 'POST', '/admin/settings', { paidSlots: 2 });
r = await call('w', 'POST', '/applications', { name: 'Warte', email: 'w@room5.test', password: 'testpass-3', motivation: 'Ich bin Gitarrist und Songwriter aus der Stadt.' });
ov = (await call('ad', 'GET', '/admin/overview')).body;
const wapp = ov.applications.find((a) => a.email === 'w@room5.test');
r = await call('ad', 'POST', `/admin/applications/${wapp.id}/approve`, { kind: 'paid' });
ok('full -> waitlist', r.body.application?.status === 'waitlist', r.body);
const xu = (await store.all('users')).find((u) => u.email === 'bew@room5.test');
await call('ad', 'POST', `/admin/members/${xu.id}/revoke`, {});
const w2 = await store.get('applications', wapp.id); ok('waitlist promoted', w2.status === 'invited', w2.status);
// Free slot
r = await call('ad', 'POST', `/admin/applications/${(await call('ad','GET','/admin/overview')).body.applications.find(a=>a.email==='bew@room5.test')?.id}/approve`, { kind: 'free' });
// Events + Ticket
const evs = (await call('a', 'GET', '/events')).body.events; ok('events listed', evs.length > 0);
r = await call('a', 'POST', `/events/${evs[0].id}/ticket`, {}); ok('artist ticket', r.status === 201, r.body);
const big = evs.find((e) => e.ticketsSold >= 150 && e.id !== evs[0].id);
if (big) { r = await call('a', 'POST', `/events/${big.id}/ticket`, { qty: 2 }); ok('big event: 2 tickets', r.status === 201 && r.body.qty === 2, r.body); }
const small = evs.find((e) => !e.membersOnly && e.ticketsSold < 150 && e.id !== evs[0].id);
if (small) { r = await call('a', 'POST', `/events/${small.id}/ticket`, { qty: 2 }); ok('small event: capped at 1', r.status === 201 && r.body.qty === 1, r.body); }
const md = evs.find((e) => e.membersOnly);
if (md) { r = await call('c', 'POST', `/events/${md.id}/ticket`, {}); ok('membersday: community blocked', r.status === 403); }
r = await call('a', 'POST', `/events/${evs[0].id}/ticket`, {}); ok('no double ticket', r.status === 409);
r = await call('c', 'POST', `/events/${evs[0].id}/ticket`, {}); ok('community no ticket', r.status === 403);
// Kontakt
r = await call('g', 'POST', '/requests', { type: 'event', name: 'Yoga Anna', email: 'anna@room5.test', message: 'Ich möchte einen Yoga-Workshop im Bunker machen.', fields: { guests: '20' } });
ok('event request', r.status === 201);
// Reset
r = await call('g', 'POST', '/auth/forgot', { email: 'neu@room5.test' }); ok('forgot ok', r.status === 200);
const outbox = await store.all('outbox');
console.log('outbox mails:', outbox.length, [...new Set(outbox.map((m) => m.template))].join(', '));
const started = await call('a', 'POST', '/bookings/checkout', { sessions: [{ date: ymd(new Date()), slots: ['day'] }] });
console.log('today day session (depends on time):', started.status, started.body.code || 'ok');

// Konto löschen
{
  await call('del', 'POST', '/auth/register', { name: 'Weg', email: 'weg@room5.test', password: 'testpass-7' });
  let r = await call('del', 'POST', '/me/delete', { password: 'falsch' }); ok('delete needs password', r.status === 400);
  r = await call('del', 'POST', '/me/delete', { password: 'testpass-7' }); ok('account deleted', r.status === 200 && !(await store.all('users')).some((u) => u.email === 'weg@room5.test'));
}

// Login-Begrenzung: nach 10 Fehlversuchen gesperrt
{
  let last;
  for (let i = 0; i < 11; i++) last = await be.handle({ method: 'POST', path: '/auth/login', body: { email: 'brute@room5.test', password: 'x' }, ip: '9.9.9.9', lang: 'de' });
  ok('login rate limit', last.status === 429, last.body);
}

// Bunker-Bereiche: anfragen -> angefragt, reservieren, buchen, Konflikt
{
  const d = (n) => ymd(new Date(Date.now() + n * 864e5));
  let r = await call('g', 'POST', '/requests', { type: 'event', name: 'Firma X', email: 'x@room5.test', message: 'Sommerfest für 120 Gäste.', spaces: ['halle1', 'foyer', 'quatsch'], dateFrom: d(50), dateTo: d(51), extras: ['bar'] });
  ok('space request', r.status === 201, r.body);
  const reqId = r.body.request.id;
  r = await call('g', 'GET', '/spaces/availability', null, { query: { from: d(50), days: 3 } });
  ok('space held after request', r.body.days[d(50)]?.halle1 === 'held' && r.body.days[d(51)]?.foyer === 'held' && !r.body.days[d(52)], r.body);
  ok('no personal data public', !JSON.stringify(r.body).includes('Firma'));
  r = await call('g', 'POST', '/requests', { type: 'event', name: 'Y', email: 'y@room5.test', message: 'Zu lang angefragt hier.', spaces: ['halle1'], dateFrom: d(1), dateTo: d(40) });
  ok('space range max 30 days', r.status === 400 && r.body.code === 'space_dates', r.body);
  r = await call('g', 'POST', '/requests', { type: 'event', name: 'Y', email: 'y@room5.test', message: 'Vergangenheit geht nicht.', spaces: ['halle1'], dateFrom: d(-2), dateTo: d(-2) });
  ok('space past blocked', r.status === 400, r.body);
  const admin = await call('adm', 'POST', '/auth/login', { email: em('admin'), password: pw('admin') });
  r = await call('adm', 'POST', `/admin/requests/${reqId}/space`, { action: 'reserve' });
  ok('space reserve', r.status === 200 && r.body.request.status === 'progress', r.body);
  r = await call('adm', 'POST', `/admin/requests/${reqId}/space`, { action: 'book' });
  r = await call('g', 'GET', '/spaces/availability', null, { query: { from: d(50), days: 2 } });
  ok('space booked', r.body.days[d(51)]?.halle1 === 'booked', r.body);
  r = await call('adm', 'POST', '/admin/occupancy', { spaces: ['halle1'], dateFrom: d(51), dateTo: d(52), status: 'booked', title: 'Doppelt' });
  ok('space conflict blocked', r.status === 409 && r.body.code === 'space_taken', r.body);
  r = await call('adm', 'POST', '/admin/occupancy', { spaces: ['history'], dateFrom: d(51), dateTo: d(52), status: 'reserved', title: 'Workshop' });
  ok('manual occupancy', r.status === 200, r.body);
  r = await call('c', 'POST', '/admin/occupancy', { spaces: ['history'], dateFrom: d(51) });
  ok('occupancy admin only', r.status === 403);
  ok('space mail sent', (await store.all('outbox')).some((m) => m.template === 'space_answered'));
}

if (failed) { console.error(`\n${failed} Test(s) fehlgeschlagen`); process.exit(1); } else console.log('\nAlle Tests bestanden.');
