// API-Client mit Ausweichweg:
// 1. Läuft server.js (npm start) → echte lokale API unter /api.
// 2. Ist kein Server erreichbar (z. B. Datei direkt geöffnet oder statisch gehostet)
//    → identische Logik im Browser mit localStorage ("Demo-Modus").
import { cleanSession, validateSession, priceCart, sessionSlots, seedBookings } from './pricing.js';

let modePromise;
export function backendMode() {
  modePromise ||= fetch('/api/health', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => (j.mode === 'server' ? 'server' : 'local'))
    .catch(() => 'local');
  return modePromise;
}

async function http(method, path, data) {
  const r = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Fehler ${r.status}`);
  return j;
}

// ---------------- lokaler Fallback ----------------
const KEY = 'room5.localdb.v2';
const SESSION_KEY = 'room5.localsession';
const rid = (p) => `${p}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`room5:${s}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function store() {
  const s = { db: null };
  try { s.db = JSON.parse(localStorage.getItem(KEY)); } catch { s.db = null; }
  s.save = () => { try { localStorage.setItem(KEY, JSON.stringify(s.db)); } catch {} };
  return s;
}
async function localDb() {
  const s = store();
  if (!s.db) {
    // Gleiche Test-Zugänge wie data/seed.json
    let seed = { users: [] };
    try { seed = await fetch('data-seed.json').then((r) => r.json()); } catch {}
    s.db = { users: [], bookings: [], memberships: [], messages: [] };
    for (const u of seed.users || []) s.db.users.push({ id: rid('U'), email: u.email, name: u.name, role: u.role, tier: u.tier || null, password: await sha(u.password) });
    for (const b of seedBookings()) s.db.bookings.push({ id: rid('B'), status: 'confirmed', seeded: true, sessions: [b], contact: { name: 'Belegt' } });
    s.save();
  }
  return s;
}
const pub = (u) => u && { id: u.id, email: u.email, name: u.name, role: u.role, tier: u.tier };
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function bookedMap(db) {
  const map = {};
  for (const b of db.bookings) {
    if (['declined', 'cancelled'].includes(b.status)) continue;
    for (const s of b.sessions) (map[s.date] ||= []).push(...sessionSlots(s));
  }
  return map;
}

const local = {
  async me() {
    const { db } = await localDb();
    let uid = null; try { uid = localStorage.getItem(SESSION_KEY); } catch {}
    return { user: pub(db.users.find((u) => u.id === uid)) };
  },
  async login({ email, password }) {
    const { db } = await localDb();
    const u = db.users.find((x) => x.email === String(email).trim().toLowerCase());
    if (!u || u.password !== (await sha(password))) throw new Error('E-Mail oder Passwort falsch.');
    try { localStorage.setItem(SESSION_KEY, u.id); } catch {}
    return { user: pub(u) };
  },
  async logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} return { ok: true }; },
  async register({ name, email, password }) {
    const s = await localDb(); email = String(email || '').trim().toLowerCase();
    if (!name || !isEmail(email)) throw new Error('Bitte Name und gültige E-Mail angeben.');
    if (String(password || '').length < 8) throw new Error('Passwort mit mindestens 8 Zeichen wählen.');
    if (s.db.users.some((u) => u.email === email)) throw new Error('Mit dieser E-Mail existiert bereits ein Profil. Bitte einloggen.');
    const u = { id: rid('U'), email, name, role: 'user', tier: null, password: await sha(password) };
    s.db.users.push(u); s.save();
    try { localStorage.setItem(SESSION_KEY, u.id); } catch {}
    return { user: pub(u) };
  },
  async availability() {
    const { db } = await localDb();
    const map = bookedMap(db);
    for (const k in map) map[k] = [...new Set(map[k])];
    return { booked: map };
  },
  async book(payload) {
    const s = await localDb(); const { db } = s;
    const { user } = await local.me();
    const isMember = user && ['member', 'admin'].includes(user.role);
    const sessions = (payload.sessions || []).map(cleanSession);
    if (!sessions.length) throw new Error('Keine Sessions ausgewählt.');
    const c = payload.contact || {};
    if (!c.name || !isEmail(c.email || '')) throw new Error('Bitte Name und gültige E-Mail angeben.');
    const map = bookedMap(db);
    for (const x of sessions) {
      const err = validateSession(x, { booked: map[x.date] || [], isMember });
      if (err) throw new Error(`${x.date}: ${err}`);
      (map[x.date] ||= []).push(...sessionSlots(x));
    }
    const mode = payload.mode === 'request' ? 'request' : 'book';
    const booking = { id: rid('R5'), status: mode === 'book' ? 'confirmed' : 'pending', mode, sessions, contact: { ...c, email: c.email.toLowerCase() }, userId: user?.id || null, member: !!isMember, total: priceCart(sessions, isMember).total, createdAt: new Date().toISOString() };
    db.bookings.push(booking); s.save();
    return { booking };
  },
  async myBookings() {
    const { db } = await localDb(); const { user } = await local.me();
    if (!user) throw new Error('Nicht angemeldet.');
    return { bookings: db.bookings.filter((b) => b.userId === user.id || b.contact?.email === user.email) };
  },
  async cancel(id) {
    const s = await localDb(); const b = s.db.bookings.find((x) => x.id === id);
    if (b) { b.status = 'cancelled'; s.save(); } return { booking: b };
  },
  async contact(d) {
    const s = await localDb();
    if (!d.name || !isEmail(d.email || '') || String(d.message || '').length < 10) throw new Error('Bitte Name, E-Mail und eine Nachricht (min. 10 Zeichen) angeben.');
    const m = { id: rid('M'), ...d, createdAt: new Date().toISOString(), read: false };
    s.db.messages.push(m); s.save(); return { message: { id: m.id } };
  },
  async membership(d) {
    const s = await localDb(); const { user } = await local.me();
    const name = user ? user.name : d.name; const email = String(user ? user.email : d.email || '').toLowerCase();
    if (!name || !isEmail(email) || String(d.motivation || '').length < 20) throw new Error('Bitte Name, E-Mail und ein paar Sätze zu dir (min. 20 Zeichen).');
    if (user && ['member', 'admin'].includes(user.role)) throw new Error('Du bist bereits Member.');
    if (s.db.memberships.some((x) => x.email === email && x.status === 'pending')) throw new Error('Für diese E-Mail liegt bereits eine Anfrage vor.');
    let uid = user?.id;
    if (!user) {
      if (s.db.users.some((u) => u.email === email)) throw new Error('Mit dieser E-Mail existiert bereits ein Profil. Bitte zuerst einloggen.');
      if (String(d.password || '').length < 8) throw new Error('Passwort mit mindestens 8 Zeichen wählen.');
      const u = { id: rid('U'), email, name, role: 'user', tier: null, password: await sha(d.password) };
      s.db.users.push(u); uid = u.id;
      try { localStorage.setItem(SESSION_KEY, u.id); } catch {}
    }
    const { password, ...rest } = d;
    const r = { ...rest, name, email, userId: uid, id: rid('MB'), status: 'pending', createdAt: new Date().toISOString() };
    s.db.memberships.push(r); s.save(); return { request: { id: r.id, status: r.status } };
  },
  async membershipStatus(email) {
    const { db } = await localDb(); const { user } = await local.me();
    const e = String(user ? user.email : email || '').toLowerCase();
    const r = [...db.memberships].reverse().find((x) => x.email === e);
    return { status: r ? r.status : null, tier: r?.tier || null };
  },
  async adminOverview() {
    const { db } = await localDb(); const { user } = await local.me();
    if (user?.role !== 'admin') throw new Error('Nur für Admins.');
    return { bookings: db.bookings.filter((b) => !b.seeded).reverse(), memberships: [...db.memberships].reverse(), messages: [...db.messages].reverse(), users: db.users.map(pub) };
  },
  async adminMembership(id, action) {
    const s = await localDb(); const r = s.db.memberships.find((x) => x.id === id);
    if (!r) throw new Error('Nicht gefunden.');
    r.status = action === 'approve' ? 'approved' : 'rejected';
    const u = s.db.users.find((x) => x.id === r.userId || x.email === r.email);
    if (r.status === 'approved' && u && u.role !== 'admin') { u.role = 'member'; u.tier = r.tier; }
    s.save(); return { ok: true };
  },
  async adminBooking(id, action) {
    const s = await localDb(); const b = s.db.bookings.find((x) => x.id === id);
    if (b) { b.status = action === 'confirm' ? 'confirmed' : 'declined'; s.save(); } return { ok: true };
  },
  async adminRead(id) {
    const s = await localDb(); const m = s.db.messages.find((x) => x.id === id); if (m) { m.read = true; s.save(); } return { ok: true };
  },
};

// ---------------- öffentliche API ----------------
const remote = {
  me: () => http('GET', '/auth/me'),
  login: (d) => http('POST', '/auth/login', d),
  register: (d) => http('POST', '/auth/register', d),
  logout: () => http('POST', '/auth/logout'),
  availability: (from, to) => http('GET', `/availability?from=${from || ''}&to=${to || ''}`),
  book: (d) => http('POST', '/bookings', d),
  myBookings: () => http('GET', '/bookings/mine'),
  cancel: (id) => http('POST', `/bookings/${id}/cancel`),
  contact: (d) => http('POST', '/contact', d),
  membership: (d) => http('POST', '/membership', d),
  membershipStatus: (email = '') => http('GET', `/membership/status?email=${encodeURIComponent(email)}`),
  adminOverview: () => http('GET', '/admin/overview'),
  adminMembership: (id, action) => http('POST', `/admin/membership/${id}/${action}`),
  adminBooking: (id, action) => http('POST', `/admin/bookings/${id}/${action}`),
  adminRead: (id) => http('POST', `/admin/messages/${id}/read`),
};

export const api = new Proxy({}, {
  get: (_, key) => async (...args) => ((await backendMode()) === 'server' ? remote : local)[key](...args),
});
