// Room 5 · Bunkerwest – lokaler Entwicklungsserver
// Statische Seite + kleine JSON-API. Daten liegen in data/db.json.
// Start: npm start  →  http://localhost:1102
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cleanSession, validateSession, priceCart, sessionSlots, seedBookings } from './public/js/pricing.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const SEED_FILE = path.join(ROOT, 'data', 'seed.json');
const PORT = Number(process.env.PORT) || 1102;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

// ---------- Datenbank (JSON-Datei) ----------
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`;
const checkPw = (pw, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(String(pw), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const id = (p) => `${p}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

let db;
async function loadDb() {
  try {
    db = JSON.parse(await fsp.readFile(DB_FILE, 'utf8'));
  } catch {
    const seed = JSON.parse(await fsp.readFile(SEED_FILE, 'utf8'));
    db = { users: [], bookings: [], memberships: [], messages: [], sessions: {} };
    for (const u of seed.users) {
      db.users.push({ id: id('U'), email: u.email.toLowerCase(), name: u.name, role: u.role, tier: u.tier || null, password: hashPw(u.password), createdAt: new Date().toISOString() });
    }
    for (const s of seedBookings()) {
      db.bookings.push({ id: id('B'), status: 'confirmed', mode: 'book', seeded: true, sessions: [s], contact: { name: 'Belegt' }, createdAt: new Date().toISOString() });
    }
    await saveDb();
    console.log('  Neue Datenbank angelegt (data/db.json) – Zugangsdaten siehe data/seed.json');
  }
}
let saving = Promise.resolve();
function saveDb() {
  saving = saving.then(() => fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2)));
  return saving;
}

const publicUser = (u) => u && { id: u.id, email: u.email, name: u.name, role: u.role, tier: u.tier };

function bookedSlotsByDate(excludeId) {
  const map = {};
  for (const b of db.bookings) {
    if (b.id === excludeId || b.status === 'declined' || b.status === 'cancelled') continue;
    for (const s of b.sessions) (map[s.date] ||= []).push(...sessionSlots(s));
  }
  return map;
}

// ---------- HTTP-Helfer ----------
function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > 1e6) throw new Error('too large'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
    const i = c.indexOf('='); return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
  }));
}
function currentUser(req) {
  const t = cookies(req).r5s;
  const uid = t && db.sessions[t];
  return uid ? db.users.find((u) => u.id === uid) : null;
}
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname.replace(/^\/api/, '');
  const m = req.method;
  const user = currentUser(req);
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member' || isAdmin;

  if (p === '/health') return send(res, 200, { ok: true, mode: 'server' });

  if (p === '/auth/me') return send(res, 200, { user: publicUser(user) });

  const startSession = async (u, status = 200, extra = {}) => {
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = u.id; await saveDb();
    return send(res, status, { user: publicUser(u), ...extra }, { 'Set-Cookie': `r5s=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
  };
  const createUser = (name, email, password) => {
    const u = { id: id('U'), email, name, role: 'user', tier: null, password: hashPw(String(password)), createdAt: new Date().toISOString() };
    db.users.push(u); return u;
  };

  if (p === '/auth/login' && m === 'POST') {
    const { email, password } = await body(req);
    const u = db.users.find((x) => x.email === str(email).toLowerCase());
    if (!u || !checkPw(password, u.password)) return send(res, 401, { error: 'E-Mail oder Passwort falsch.' });
    return startSession(u);
  }

  // Kostenloses Profil für alle (kein Member-Status)
  if (p === '/auth/register' && m === 'POST') {
    const b = await body(req);
    const name = str(b.name, 120), email = str(b.email, 160).toLowerCase();
    if (!name || !isEmail(email)) return send(res, 400, { error: 'Bitte Name und gültige E-Mail angeben.' });
    if (String(b.password || '').length < 8) return send(res, 400, { error: 'Passwort mit mindestens 8 Zeichen wählen.' });
    if (db.users.some((u) => u.email === email)) return send(res, 409, { error: 'Mit dieser E-Mail existiert bereits ein Profil. Bitte einloggen.' });
    return startSession(createUser(name, email, b.password), 201);
  }

  if (p === '/auth/logout' && m === 'POST') {
    const t = cookies(req).r5s; if (t) { delete db.sessions[t]; await saveDb(); }
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'r5s=; Path=/; Max-Age=0' });
  }

  if (p === '/availability') {
    const from = url.searchParams.get('from'), to = url.searchParams.get('to');
    const map = bookedSlotsByDate();
    const out = {};
    for (const [d, sl] of Object.entries(map)) if ((!from || d >= from) && (!to || d <= to)) out[d] = [...new Set(sl)];
    return send(res, 200, { booked: out });
  }

  if (p === '/bookings' && m === 'POST') {
    const b = await body(req);
    const sessions = (Array.isArray(b.sessions) ? b.sessions : []).slice(0, 30).map(cleanSession);
    const contact = { name: str(b.contact?.name, 120), email: str(b.contact?.email, 160).toLowerCase(), phone: str(b.contact?.phone, 60), project: str(b.contact?.project, 160), notes: str(b.contact?.notes, 2000) };
    if (!sessions.length) return send(res, 400, { error: 'Keine Sessions ausgewählt.' });
    if (!contact.name || !isEmail(contact.email)) return send(res, 400, { error: 'Bitte Name und gültige E-Mail angeben.' });
    const map = bookedSlotsByDate();
    for (const s of sessions) {
      const err = validateSession(s, { booked: map[s.date] || [], isMember });
      if (err) return send(res, 409, { error: `${s.date}: ${err}` });
      (map[s.date] ||= []).push(...sessionSlots(s)); // Überschneidungen innerhalb des Warenkorbs verhindern
    }
    const price = priceCart(sessions, isMember);
    const mode = b.mode === 'request' ? 'request' : 'book';
    const booking = { id: id('R5'), status: mode === 'book' ? 'confirmed' : 'pending', mode, sessions, contact, userId: user?.id || null, member: isMember, total: price.total, createdAt: new Date().toISOString() };
    db.bookings.push(booking); await saveDb();
    return send(res, 201, { booking });
  }

  if (p === '/bookings/mine') {
    if (!user) return send(res, 401, { error: 'Nicht angemeldet.' });
    return send(res, 200, { bookings: db.bookings.filter((b) => b.userId === user.id || b.contact?.email === user.email) });
  }

  const cancel = p.match(/^\/bookings\/([\w-]+)\/cancel$/);
  if (cancel && m === 'POST') {
    const bk = db.bookings.find((b) => b.id === cancel[1]);
    if (!bk || !user || (bk.userId !== user.id && !isAdmin)) return send(res, 404, { error: 'Nicht gefunden.' });
    bk.status = 'cancelled'; await saveDb();
    return send(res, 200, { booking: bk });
  }

  if (p === '/contact' && m === 'POST') {
    const b = await body(req);
    const msg = { id: id('M'), type: str(b.type, 40) || 'allgemein', name: str(b.name, 120), email: str(b.email, 160), company: str(b.company, 160), subject: str(b.subject, 200), message: str(b.message, 5000), createdAt: new Date().toISOString(), read: false };
    if (!msg.name || !isEmail(msg.email) || msg.message.length < 10) return send(res, 400, { error: 'Bitte Name, E-Mail und eine Nachricht (min. 10 Zeichen) angeben.' });
    db.messages.push(msg); await saveDb();
    return send(res, 201, { message: { id: msg.id } });
  }

  if (p === '/membership' && m === 'POST') {
    const b = await body(req);
    const r = {
      id: id('MB'), status: 'pending', createdAt: new Date().toISOString(),
      name: user ? user.name : str(b.name, 120), email: user ? user.email : str(b.email, 160).toLowerCase(),
      phone: str(b.phone, 60), city: str(b.city, 80),
      role: str(b.role, 60), genres: str(b.genres, 200), links: str(b.links, 600), usage: str(b.usage, 60),
      tier: b.tier === 'resident' ? 'resident' : 'member', referral: str(b.referral, 160), motivation: str(b.motivation, 3000),
    };
    if (!r.name || !isEmail(r.email) || r.motivation.length < 20) return send(res, 400, { error: 'Bitte Name, E-Mail und ein paar Sätze zu dir (min. 20 Zeichen).' });
    if (isMember) return send(res, 409, { error: 'Du bist bereits Member.' });
    if (db.memberships.some((x) => x.email === r.email && x.status === 'pending')) return send(res, 409, { error: 'Für diese E-Mail liegt bereits eine Anfrage vor.' });
    let u = user;
    if (!u) {
      if (db.users.some((x) => x.email === r.email)) return send(res, 409, { error: 'Mit dieser E-Mail existiert bereits ein Profil. Bitte zuerst einloggen.' });
      if (String(b.password || '').length < 8) return send(res, 400, { error: 'Passwort mit mindestens 8 Zeichen wählen.' });
      u = createUser(r.name, r.email, b.password);
    }
    r.userId = u.id;
    db.memberships.push(r);
    const payload = { request: { id: r.id, status: r.status } };
    return user ? (await saveDb(), send(res, 201, payload)) : startSession(u, 201, payload);
  }

  if (p === '/membership/status') {
    const email = (user ? user.email : str(url.searchParams.get('email'))).toLowerCase();
    const r = [...db.memberships].reverse().find((x) => x.email === email);
    return send(res, 200, { status: r ? r.status : null, tier: r?.tier || null });
  }

  // ----- Admin -----
  if (p.startsWith('/admin')) {
    if (!isAdmin) return send(res, 403, { error: 'Nur für Admins.' });
    if (p === '/admin/overview') {
      return send(res, 200, {
        bookings: db.bookings.filter((b) => !b.seeded).reverse(),
        memberships: [...db.memberships].reverse(),
        messages: [...db.messages].reverse(),
        users: db.users.map(publicUser),
      });
    }
    const mb = p.match(/^\/admin\/membership\/([\w-]+)\/(approve|reject)$/);
    if (mb && m === 'POST') {
      const r = db.memberships.find((x) => x.id === mb[1]);
      if (!r) return send(res, 404, { error: 'Nicht gefunden.' });
      r.status = mb[2] === 'approve' ? 'approved' : 'rejected';
      const u = db.users.find((x) => x.id === r.userId || x.email === r.email);
      if (r.status === 'approved' && u && u.role !== 'admin') { u.role = 'member'; u.tier = r.tier; }
      await saveDb();
      return send(res, 200, { ok: true });
    }
    const bk = p.match(/^\/admin\/bookings\/([\w-]+)\/(confirm|decline)$/);
    if (bk && m === 'POST') {
      const b = db.bookings.find((x) => x.id === bk[1]);
      if (!b) return send(res, 404, { error: 'Nicht gefunden.' });
      b.status = bk[2] === 'confirm' ? 'confirmed' : 'declined'; await saveDb();
      return send(res, 200, { ok: true });
    }
    const msg = p.match(/^\/admin\/messages\/([\w-]+)\/read$/);
    if (msg && m === 'POST') {
      const x = db.messages.find((y) => y.id === msg[1]); if (x) x.read = true; await saveDb();
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: 'Unbekannter Endpunkt.' });
}

// ---------- Statische Dateien ----------
async function serveFile(res, file, cache = 'no-cache') {
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) return serveFile(res, path.join(file, 'index.html'), cache);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  } catch {
    const nf = path.join(PUBLIC, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(nf).on('error', () => res.end('404')).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    else if (!path.extname(rel)) rel += '.html'; // saubere URLs: /buchen → buchen.html
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    return serveFile(res, file, rel.startsWith('/vendor/') ? 'public, max-age=86400' : 'no-cache');
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Serverfehler.' });
  }
});

await loadDb();
server.listen(PORT, () => {
  console.log(`\n  ROOM 5 · BUNKERWEST\n  → http://localhost:${PORT}\n`);
});
