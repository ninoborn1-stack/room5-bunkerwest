// Backend-Kern – EIN Code für drei Umgebungen:
//   1. lokaler Node-Server (server.js, Daten in data/db.json)
//   2. Demo-Modus im Browser (api.js, Daten im localStorage)
//   3. Cloudflare Pages Functions (functions/api/[[path]].js, Daten in D1)
// Die Umgebung liefert nur einen "store" (Datenablage) und "env" (Schlüssel wie Stripe/Resend).
//
// Rollen: community (kostenlos, frei registrieren) · artist (kuratiert, Platz 40 zahlend + 10 frei) · admin
import { SLOTS, ADDONS, MEMBERSHIP, REQUEST_TYPES, EVENT_CATEGORIES } from '../config.js';
import { cleanSession, validateSession, priceCart, sessionSlots, sessionRange, sessionLabel, timeLabel, euro, ymd, parseYmd } from '../pricing.js';
import { hashPassword, verifyPassword, randomToken, shortId, sha256, hmacSha256Hex } from './crypto.js';
import { renderEmail } from './emails.js';

const DAY = 86400000;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const nowIso = (now) => new Date(now).toISOString();

// ---------------------------------------------------------------- Fehlertexte
const MSG = {
  de: {
    not_found: 'Nicht gefunden.', unauthorized: 'Bitte zuerst einloggen.', forbidden: 'Dafür fehlen dir die Rechte.',
    name_email: 'Bitte Name und gültige E-Mail angeben.', password_short: 'Passwort mit mindestens 8 Zeichen wählen.',
    email_taken: 'Mit dieser E-Mail gibt es schon ein Profil. Bitte einloggen.', login_failed: 'E-Mail oder Passwort falsch.',
    message_short: 'Bitte eine Nachricht mit mindestens 10 Zeichen schreiben.', type_invalid: 'Bitte wähle, worum es geht.',
    no_sessions: 'Keine Session ausgewählt.', artist_only: 'Direkt buchen können nur Artist-Member.',
    invalid_date: 'Ungültiges Datum.', no_slot: 'Bitte Day oder Night wählen.', past: 'Das Datum liegt in der Vergangenheit.',
    too_far: 'So weit im Voraus geht es leider noch nicht.', started: 'Diese Session hat heute schon begonnen.', taken: 'Diese Session ist schon belegt.',
    already_artist: 'Du bist bereits Artist-Member.', application_pending: 'Du hast bereits eine offene Bewerbung.',
    motivation_short: 'Erzähl uns etwas mehr über dich (mind. 20 Zeichen).', full_free: 'Alle Freiplätze sind vergeben.',
    token_invalid: 'Der Link ist ungültig oder abgelaufen.', wrong_password: 'Aktuelles Passwort stimmt nicht.',
    no_tickets: 'Die Free-Tickets sind leider schon weg.', ticket_have: 'Du hast schon ein Ticket.', captcha: 'Spam-Schutz fehlgeschlagen. Bitte neu laden.',
    not_invited: 'Für dich ist keine Aktivierung offen.', payments_live: 'Testzahlungen sind nur ohne Stripe möglich.', too_many: 'Zu viele Versuche. Bitte kurz warten.',
  },
  en: {
    not_found: 'Not found.', unauthorized: 'Please log in first.', forbidden: 'You are not allowed to do that.',
    name_email: 'Please enter your name and a valid email.', password_short: 'Choose a password with at least 8 characters.',
    email_taken: 'A profile with this email already exists. Please log in.', login_failed: 'Wrong email or password.',
    message_short: 'Please write a message with at least 10 characters.', type_invalid: 'Please choose a topic.',
    no_sessions: 'No session selected.', artist_only: 'Only Artist Members can book directly.',
    invalid_date: 'Invalid date.', no_slot: 'Please choose Day or Night.', past: 'This date is in the past.',
    too_far: 'That is too far in advance.', started: 'This session has already started today.', taken: 'This session is already booked.',
    already_artist: 'You are already an Artist Member.', application_pending: 'You already have an open application.',
    motivation_short: 'Tell us a bit more about you (min. 20 characters).', full_free: 'All free spots are taken.',
    token_invalid: 'This link is invalid or has expired.', wrong_password: 'Current password is incorrect.',
    no_tickets: 'The free tickets are already gone.', ticket_have: 'You already have a ticket.', captcha: 'Spam protection failed. Please reload.',
    not_invited: 'There is no pending activation for you.', payments_live: 'Test payments are only available without Stripe.', too_many: 'Too many attempts. Please wait a moment.',
  },
};

class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const fail = (status, code) => { throw new ApiError(status, code); };

// ---------------------------------------------------------------- Hilfen
export const publicUser = (u) => u && {
  id: u.id, name: u.name, email: u.email, role: u.role, lang: u.lang || 'de',
  newsletter: !!u.newsletter, notifyEvents: !!u.notifyEvents,
  membership: u.membership ? { kind: u.membership.kind, status: u.membership.status, since: u.membership.since } : null,
  createdAt: u.createdAt,
};
const isArtist = (u) => u?.role === 'artist' && u.membership?.status === 'active' || u?.role === 'admin';
const typeLabel = (id, lang) => REQUEST_TYPES.find((t) => t.id === id)?.label[lang] || id;
const fmtDay = (date, lang) => parseYmd(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const sessionSummary = (sessions, lang) => sessions.map((s) => { const [a, z] = sessionRange(s); return [fmtDay(s.date, lang), `${sessionLabel(s, lang)} · ${timeLabel(a)}–${timeLabel(z)}`]; });

async function settings(store) {
  const s = (await store.get('settings', 'main')) || {};
  return { paidSlots: s.paidSlots ?? MEMBERSHIP.paidSlots, freeSlots: s.freeSlots ?? MEMBERSHIP.freeSlots, artistPriceMonthly: s.artistPriceMonthly ?? MEMBERSHIP.artistPriceMonthly };
}

/** Plätze-Zähler für Artist-Membership */
async function capacity(store) {
  const [users, apps, cfg] = [await store.all('users'), await store.all('applications'), await settings(store)];
  const artists = users.filter((u) => u.role === 'artist' && u.membership?.status === 'active');
  const paidUsed = artists.filter((u) => u.membership.kind === 'paid').length + apps.filter((a) => a.status === 'invited').length;
  const freeUsed = artists.filter((u) => u.membership.kind === 'free').length;
  const waitlist = apps.filter((a) => a.status === 'waitlist').length;
  return { paidSlots: cfg.paidSlots, freeSlots: cfg.freeSlots, paidUsed, freeUsed, paidLeft: Math.max(0, cfg.paidSlots - paidUsed), freeLeft: Math.max(0, cfg.freeSlots - freeUsed), waitlist, price: cfg.artistPriceMonthly };
}

/** Belegte Sessions pro Tag (bestätigte Buchungen + laufende Bezahl-Reservierungen) */
async function bookedMap(store, now, exceptId = null) {
  const map = {};
  for (const b of await store.all('bookings')) {
    if (b.id === exceptId) continue;
    const holding = b.status === 'awaiting_payment' && new Date(b.holdUntil).getTime() > now;
    if (b.status !== 'confirmed' && !holding) continue;
    for (const s of b.sessions) (map[s.date] ||= []).push(...sessionSlots(s));
  }
  return map;
}

// ---------------------------------------------------------------- Kern
export function createBackend({ store, env = {}, now: nowFn = () => Date.now() }) {
  const iterations = Number(env.PBKDF2_ITER) || 60000;
  const stripeOn = !!env.STRIPE_SECRET_KEY;

  async function mail(to, template, data, lang = 'de', ctx = {}) {
    if (!to) return;
    const { subject, html } = renderEmail(template, data, lang);
    const item = { id: shortId('MAIL'), to, template, subject, html, lang, status: 'queued', createdAt: nowIso(nowFn()) };
    if (env.RESEND_API_KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM || 'Bunker West <noreply@bunkerwest.de>', to, subject, html }),
        });
        item.status = r.ok ? 'sent' : `error ${r.status}`;
      } catch (e) { item.status = `error ${e.message}`; }
    }
    await store.put('outbox', item);
  }
  const teamMail = (template, data, ctx) => mail(env.TEAM_EMAIL || 'team@bunkerwest.de', template, data, 'de', ctx);

  async function verifyCaptcha(token, ip) {
    if (!env.TURNSTILE_SECRET) return true;
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token || '', remoteip: ip || '' }),
    }).then((x) => x.json()).catch(() => ({ success: false }));
    return !!r.success;
  }

  /** Einfache Begrenzung pro Schlüssel (z. B. Login je E-Mail+IP): max Versuche pro Zeitfenster */
  async function limit(key, max, windowMs) {
    const id = await sha256(`rl:${key}`);
    const now = nowFn();
    const rec = (await store.get('ratelimits', id)) || { id, count: 0, reset: now + windowMs };
    if (rec.reset < now) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count += 1;
    await store.put('ratelimits', rec);
    if (rec.count > max) fail(429, 'too_many');
  }
  const clearLimit = async (key) => store.del('ratelimits', await sha256(`rl:${key}`));

  /** Reservierungen, deren Bezahl-Zeit abgelaufen ist, als "expired" markieren */
  async function expireHolds() {
    const now = nowFn();
    for (const b of await store.all('bookings')) {
      if (b.status === 'awaiting_payment' && new Date(b.holdUntil).getTime() < now) { b.status = 'expired'; await store.put('bookings', b); }
    }
  }

  async function currentUser(token) {
    if (!token) return null;
    const sess = await store.get('sessions', await sha256(token));
    if (!sess || new Date(sess.expires).getTime() < nowFn()) return null;
    return store.get('users', sess.userId);
  }
  async function startSession(user) {
    const token = randomToken(32);
    await store.put('sessions', { id: await sha256(token), userId: user.id, expires: nowIso(nowFn() + 30 * DAY) });
    return token;
  }
  async function userByEmail(email) {
    const e = String(email || '').toLowerCase();
    return (await store.all('users')).find((u) => u.email === e) || null;
  }
  async function createUser({ name, email, password, newsletter, notifyEvents, lang }) {
    const user = {
      id: shortId('U'), name: str(name, 120), email: String(email).toLowerCase().trim(), role: 'community',
      password: await hashPassword(password, iterations), newsletter: !!newsletter, notifyEvents: !!notifyEvents,
      lang: lang === 'en' ? 'en' : 'de', membership: null, createdAt: nowIso(nowFn()),
    };
    await store.put('users', user);
    return user;
  }

  // ----- Stripe
  async function stripe(path, params) {
    const body = new URLSearchParams();
    const add = (prefix, val) => {
      if (val && typeof val === 'object') Object.entries(val).forEach(([k, v]) => add(prefix ? `${prefix}[${k}]` : k, v));
      else if (val !== undefined && val !== null) body.append(prefix, String(val));
    };
    add('', params);
    const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'Stripe-Fehler');
    return j;
  }
  async function checkoutUrl({ kind, ref, user, amount, label, site, recurring }) {
    if (!stripeOn) return `${site}/zahlung.html?demo=1&kind=${kind}&ref=${encodeURIComponent(ref)}`;
    const session = await stripe('checkout/sessions', {
      mode: recurring ? 'subscription' : 'payment',
      customer_email: user.email,
      success_url: `${site}/zahlung.html?status=ok&kind=${kind}&ref=${encodeURIComponent(ref)}`,
      cancel_url: `${site}/zahlung.html?status=cancel&kind=${kind}&ref=${encodeURIComponent(ref)}`,
      metadata: { kind, ref, userId: user.id },
      ...(recurring ? { subscription_data: { metadata: { kind, ref, userId: user.id } } } : {}),
      line_items: { 0: { quantity: 1, price_data: { currency: 'eur', unit_amount: Math.round(amount * 100), product_data: { name: label }, ...(recurring ? { recurring: { interval: 'month' } } : {}) } } },
    });
    return session.url;
  }

  // ----- Zahlungs-Ergebnisse (von Stripe-Webhook oder Testzahlung)
  async function markBookingPaid(id, site) {
    const b = await store.get('bookings', id);
    if (!b || b.status === 'confirmed') return;
    b.status = 'confirmed'; b.paidAt = nowIso(nowFn());
    await store.put('bookings', b);
    const summary = sessionSummary(b.sessions, b.lang);
    await mail(b.contact.email, 'booking_paid', { id: b.id, summary, total: euro(b.total) }, b.lang);
    await teamMail('team_booking', { id: b.id, name: b.contact.name, email: b.contact.email, summary, total: euro(b.total), link: `${site}/admin.html?tab=bookings` });
  }
  async function activateMembership(appId, extra = {}, site) {
    const app = await store.get('applications', appId);
    if (!app) return;
    const user = await store.get('users', app.userId);
    if (!user) return;
    app.status = 'active'; await store.put('applications', app);
    user.role = user.role === 'admin' ? 'admin' : 'artist';
    user.membership = { kind: 'paid', status: 'active', since: nowIso(nowFn()), ...extra };
    await store.put('users', user);
    await mail(user.email, 'membership_active', { link: `${site}/buchen.html` }, user.lang);
  }
  async function endMembership(user, site) {
    if (!user || user.role === 'admin') return;
    user.role = 'community';
    if (user.membership) user.membership.status = 'ended';
    await store.put('users', user);
    await mail(user.email, 'membership_ended', {}, user.lang);
    await promoteWaitlist(site);
  }
  /** Wird ein zahlender Platz frei, rückt der Nächste von der Warteliste nach */
  async function promoteWaitlist(site) {
    const cap = await capacity(store);
    if (cap.paidLeft <= 0) return;
    const next = (await store.all('applications')).filter((a) => a.status === 'waitlist').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!next) return;
    next.status = 'invited'; next.invitedAt = nowIso(nowFn());
    await store.put('applications', next);
    const u = await store.get('users', next.userId);
    await mail(next.email, 'application_invited', { price: euro(cap.price), link: `${site}/konto.html` }, u?.lang || 'de');
  }

  // ---------------------------------------------------------------- Routen
  async function route(req, ctx) {
    const { method, path } = req;
    const body = req.body || {};
    const user = ctx.user;
    const lang = ctx.lang;
    const site = ctx.site;
    const needUser = () => user || fail(401, 'unauthorized');
    const needAdmin = () => (user?.role === 'admin' ? user : fail(403, 'forbidden'));
    const now = nowFn();

    if (path === '/health') return { body: { ok: true, mode: ctx.mode } };

    if (path === '/config/public') {
      const cap = await capacity(store);
      return { body: { capacity: { paidLeft: cap.paidLeft, freeLeft: cap.freeLeft, waitlist: cap.waitlist, paidSlots: cap.paidSlots }, payments: stripeOn ? 'stripe' : 'demo', turnstileSiteKey: env.TURNSTILE_SITE_KEY || null } };
    }

    // ----- Auth
    if (path === '/auth/me') return { body: { user: publicUser(user) } };

    if (path === '/auth/register' && method === 'POST') {
      await limit(`register:${ctx.ip || ''}`, 10, 3600000);
      if (!(await verifyCaptcha(body.captcha, ctx.ip))) fail(400, 'captcha');
      if (!str(body.name) || !isEmail(body.email)) fail(400, 'name_email');
      if (String(body.password || '').length < 8) fail(400, 'password_short');
      if (await userByEmail(body.email)) fail(409, 'email_taken');
      const u = await createUser({ ...body, lang: body.lang || lang });
      await mail(u.email, 'welcome', { name: u.name, link: `${site}/konto.html` }, u.lang);
      return { status: 201, body: { user: publicUser(u) }, setToken: await startSession(u) };
    }

    if (path === '/auth/login' && method === 'POST') {
      const lkey = `login:${String(body.email || '').toLowerCase()}:${ctx.ip || ''}`;
      await limit(lkey, 10, 15 * 60000);
      const u = await userByEmail(body.email);
      if (!u || !(await verifyPassword(body.password, u.password))) fail(401, 'login_failed');
      await clearLimit(lkey);
      return { body: { user: publicUser(u) }, setToken: await startSession(u) };
    }

    if (path === '/auth/logout' && method === 'POST') {
      if (req.token) await store.del('sessions', await sha256(req.token));
      return { body: { ok: true }, clearToken: true };
    }

    if (path === '/auth/forgot' && method === 'POST') {
      await limit(`forgot:${ctx.ip || ''}`, 5, 3600000);
      const u = await userByEmail(body.email);
      if (u) {
        const token = randomToken(24);
        await store.put('resets', { id: await sha256(token), userId: u.id, expires: nowIso(now + 3600000) });
        await mail(u.email, 'reset', { link: `${site}/login.html?reset=${token}` }, u.lang);
      }
      return { body: { ok: true } }; // immer ok – verrät nicht, ob es die E-Mail gibt
    }

    if (path === '/auth/reset' && method === 'POST') {
      const rec = await store.get('resets', await sha256(String(body.token || '')));
      if (!rec || new Date(rec.expires).getTime() < now) fail(400, 'token_invalid');
      if (String(body.password || '').length < 8) fail(400, 'password_short');
      const u = await store.get('users', rec.userId);
      u.password = await hashPassword(body.password, iterations);
      await store.put('users', u); await store.del('resets', rec.id);
      return { body: { user: publicUser(u) }, setToken: await startSession(u) };
    }

    // ----- Profil
    if (path === '/me' && method === 'PUT') {
      const u = needUser();
      if (body.name !== undefined) u.name = str(body.name, 120) || u.name;
      if (body.lang) u.lang = body.lang === 'en' ? 'en' : 'de';
      if (body.newsletter !== undefined) u.newsletter = !!body.newsletter;
      if (body.notifyEvents !== undefined) u.notifyEvents = !!body.notifyEvents;
      await store.put('users', u);
      return { body: { user: publicUser(u) } };
    }
    if (path === '/me/password' && method === 'POST') {
      const u = needUser();
      if (!(await verifyPassword(body.current, u.password))) fail(400, 'wrong_password');
      if (String(body.password || '').length < 8) fail(400, 'password_short');
      u.password = await hashPassword(body.password, iterations); await store.put('users', u);
      return { body: { ok: true } };
    }
    if (path === '/me/overview') {
      const u = needUser();
      await expireHolds();
      const mine = (x) => x.userId === u.id || x.contact?.email === u.email || x.email === u.email;
      const bookings = (await store.all('bookings')).filter(mine).filter((b) => b.status !== 'expired');
      const requests = (await store.all('requests')).filter(mine);
      const application = (await store.all('applications')).filter((a) => a.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
      const tickets = (await store.all('tickets')).filter((t) => t.userId === u.id);
      const events = await store.all('events');
      const cap = await capacity(store);
      // Preis nur für Eingeladene und Artists (öffentlich: "auf Anfrage")
      if (!(application?.status === 'invited' || isArtist(u))) delete cap.price;
      return { body: { user: publicUser(u), bookings, requests, application, tickets: tickets.map((t) => ({ ...t, event: events.find((e) => e.id === t.eventId) || null })), capacity: cap } };
    }

    // ----- Studio
    if (path === '/availability') {
      const map = await bookedMap(store, now);
      const from = req.query.from, to = req.query.to;
      const out = {};
      for (const [d, sl] of Object.entries(map)) if ((!from || d >= from) && (!to || d <= to)) out[d] = [...new Set(sl)];
      return { body: { booked: out } };
    }

    // Direkt buchen & bezahlen – nur Artist-Member
    if (path === '/bookings/checkout' && method === 'POST') {
      const u = needUser();
      if (!isArtist(u)) fail(403, 'artist_only');
      const sessions = (Array.isArray(body.sessions) ? body.sessions : []).slice(0, 20).map(cleanSession);
      if (!sessions.length) fail(400, 'no_sessions');
      const map = await bookedMap(store, now);
      for (const s of sessions) {
        const err = validateSession(s, { booked: map[s.date] || [], today: new Date(now) });
        if (err) fail(409, err);
        (map[s.date] ||= []).push(...sessionSlots(s));
      }
      const price = priceCart(sessions, true, lang);
      const b = {
        id: shortId('R5'), status: 'awaiting_payment', holdUntil: nowIso(now + MEMBERSHIP.holdMinutes * 60000), sessions,
        contact: { name: u.name, email: u.email, phone: str(body.phone, 60), project: str(body.project, 160), notes: str(body.notes, 2000) },
        userId: u.id, artist: true, total: price.total, lang: u.lang || lang, createdAt: nowIso(now),
      };
      await store.put('bookings', b);
      const url = await checkoutUrl({ kind: 'booking', ref: b.id, user: u, amount: b.total, label: `Room 5 · ${sessions.length}× Session`, site });
      return { status: 201, body: { booking: b, url } };
    }

    const cancel = path.match(/^\/bookings\/([\w-]+)\/cancel$/);
    if (cancel && method === 'POST') {
      const u = needUser();
      const b = await store.get('bookings', cancel[1]);
      if (!b || (b.userId !== u.id && u.role !== 'admin')) fail(404, 'not_found');
      b.status = 'cancelled'; await store.put('bookings', b);
      return { body: { booking: b } };
    }

    // ----- Zentrales Kontaktformular (alle Anfragen, inkl. Studio-Anfragen)
    if (path === '/requests' && method === 'POST') {
      await limit(`requests:${ctx.ip || ''}`, 20, 3600000);
      if (!(await verifyCaptcha(body.captcha, ctx.ip))) fail(400, 'captcha');
      const type = REQUEST_TYPES.find((t) => t.id === body.type)?.id;
      if (!type) fail(400, 'type_invalid');
      const name = user?.name || str(body.name, 120), email = (user?.email || str(body.email, 160)).toLowerCase();
      if (!name || !isEmail(email)) fail(400, 'name_email');
      const fields = {};
      for (const [k, v] of Object.entries(body.fields || {}).slice(0, 20)) fields[str(k, 40)] = str(v, 500);
      const sessions = type === 'studio' ? (Array.isArray(body.sessions) ? body.sessions : []).slice(0, 20).map(cleanSession) : [];
      if (type === 'studio' && sessions.length) {
        for (const s of sessions) { const err = validateSession(s, { today: new Date(now) }); if (err) fail(409, err); }
      }
      const message = str(body.message, 5000);
      if (!sessions.length && message.length < 10) fail(400, 'message_short');
      const total = sessions.length ? priceCart(sessions, false).total : null;
      const r = { id: shortId('A'), type, status: 'new', name, email, phone: str(body.phone, 60), company: str(body.company, 160), message, fields, sessions, total, userId: user?.id || null, lang, createdAt: nowIso(now) };
      await store.put('requests', r);
      const summary = [...sessionSummary(sessions, lang), ...Object.entries(fields).filter(([, v]) => v)];
      await mail(email, 'request_received', { name, typeLabel: typeLabel(type, lang), summary }, lang);
      await teamMail('team_request', { name, email, typeLabel: typeLabel(type, 'de'), summary: [...sessionSummary(sessions, 'de'), ...Object.entries(fields).filter(([, v]) => v)], message, link: `${site}/admin.html?tab=requests` });
      return { status: 201, body: { request: { id: r.id } } };
    }

    // ----- Artist-Bewerbung (legt bei Bedarf gleich ein Community-Profil an)
    if (path === '/applications' && method === 'POST') {
      await limit(`applications:${ctx.ip || ''}`, 5, 3600000);
      if (!(await verifyCaptcha(body.captcha, ctx.ip))) fail(400, 'captcha');
      let u = user;
      if (u && isArtist(u)) fail(409, 'already_artist');
      const motivation = str(body.motivation, 3000);
      if (motivation.length < 20) fail(400, 'motivation_short');
      let token = null;
      if (!u) {
        if (!str(body.name) || !isEmail(body.email)) fail(400, 'name_email');
        if (await userByEmail(body.email)) fail(409, 'email_taken');
        if (String(body.password || '').length < 8) fail(400, 'password_short');
        u = await createUser({ name: body.name, email: body.email, password: body.password, newsletter: true, notifyEvents: true, lang });
        token = await startSession(u);
      }
      const open = (await store.all('applications')).find((a) => a.userId === u.id && ['pending', 'invited', 'waitlist'].includes(a.status));
      if (open) fail(409, 'application_pending');
      const app = {
        id: shortId('AP'), userId: u.id, name: u.name, email: u.email, status: 'pending', createdAt: nowIso(now),
        role: str(body.role, 60), genres: str(body.genres, 200), links: str(body.links, 800), city: str(body.city, 80), phone: str(body.phone, 60),
        usage: str(body.usage, 60), referral: str(body.referral, 160), motivation,
      };
      await store.put('applications', app);
      await mail(u.email, 'application_received', {}, u.lang);
      await teamMail('team_application', { name: u.name, email: u.email, summary: [['Rolle', app.role], ['Genres', app.genres], ['Links', app.links], ['Nutzung', app.usage]], link: `${site}/admin.html?tab=applications` });
      return { status: 201, body: { application: { id: app.id, status: app.status }, user: publicUser(u) }, setToken: token };
    }

    // Eingeladen → Membership bezahlen (Abo)
    if (path === '/membership/checkout' && method === 'POST') {
      const u = needUser();
      const app = (await store.all('applications')).find((a) => a.userId === u.id && a.status === 'invited');
      if (!app) fail(400, 'not_invited');
      const cap = await capacity(store);
      const url = await checkoutUrl({ kind: 'membership', ref: app.id, user: u, amount: cap.price, label: 'Bunker West · Artist Membership', site, recurring: true });
      return { body: { url } };
    }
    if (path === '/membership/cancel' && method === 'POST') {
      const u = needUser();
      if (u.role !== 'artist') fail(400, 'not_found');
      if (stripeOn && u.membership?.stripeCustomer) {
        const portal = await stripe('billing_portal/sessions', { customer: u.membership.stripeCustomer, return_url: `${site}/konto.html` });
        return { body: { url: portal.url } };
      }
      await endMembership(u, site);
      return { body: { user: publicUser(u) } };
    }

    // Testzahlung (nur ohne Stripe – lokal & Demo)
    if (path === '/payments/demo-confirm' && method === 'POST') {
      if (stripeOn) fail(400, 'payments_live');
      if (body.kind === 'booking') await markBookingPaid(String(body.ref), site);
      else if (body.kind === 'membership') await activateMembership(String(body.ref), { demo: true }, site);
      return { body: { ok: true } };
    }

    // Stripe-Webhook
    if (path === '/stripe/webhook' && method === 'POST') {
      const sig = Object.fromEntries(String(req.headers?.['stripe-signature'] || '').split(',').map((p) => p.split('=')));
      if (!env.STRIPE_WEBHOOK_SECRET || !sig.t || !sig.v1) fail(400, 'forbidden');
      if ((await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, `${sig.t}.${req.rawBody}`)) !== sig.v1) fail(400, 'forbidden');
      const evt = JSON.parse(req.rawBody);
      const o = evt.data?.object || {};
      if (evt.type === 'checkout.session.completed') {
        if (o.metadata?.kind === 'booking') await markBookingPaid(o.metadata.ref, site);
        if (o.metadata?.kind === 'membership') await activateMembership(o.metadata.ref, { stripeCustomer: o.customer, stripeSubscription: o.subscription }, site);
      }
      if (evt.type === 'customer.subscription.deleted' || evt.type === 'invoice.payment_failed') {
        const u = (await store.all('users')).find((x) => x.membership?.stripeSubscription === (o.subscription || o.id));
        if (u && evt.type === 'customer.subscription.deleted') await endMembership(u, site);
        if (u && evt.type === 'invoice.payment_failed') { u.membership.status = 'past_due'; await store.put('users', u); await mail(u.email, 'payment_failed', { link: `${site}/konto.html` }, u.lang); }
      }
      return { body: { received: true } };
    }

    // ----- Events
    if (path === '/events') {
      const from = req.query.from || ymd(new Date(now));
      const events = (await store.all('events')).filter((e) => e.published !== false && e.date >= from).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      const tickets = await store.all('tickets');
      return { body: { events: events.map((e) => {
        const claimed = tickets.filter((t) => t.eventId === e.id).length;
        return { ...e, freeLeft: Math.max(0, (e.freeTickets || 0) - claimed), mine: !!user && tickets.some((t) => t.eventId === e.id && t.userId === user.id) };
      }) } };
    }
    const ticket = path.match(/^\/events\/([\w-]+)\/ticket$/);
    if (ticket && method === 'POST') {
      const u = needUser();
      if (!isArtist(u)) fail(403, 'artist_only');
      const e = await store.get('events', ticket[1]);
      if (!e) fail(404, 'not_found');
      const tickets = (await store.all('tickets')).filter((t) => t.eventId === e.id);
      if (tickets.some((t) => t.userId === u.id)) fail(409, 'ticket_have');
      if (tickets.length >= (e.freeTickets || 0)) fail(409, 'no_tickets');
      await store.put('tickets', { id: shortId('T'), eventId: e.id, userId: u.id, createdAt: nowIso(now) });
      await mail(u.email, 'ticket_claimed', { title: e.title[u.lang] || e.title.de, when: `${fmtDay(e.date, u.lang)} · ${e.start}` }, u.lang);
      return { status: 201, body: { ok: true } };
    }

    // ----- Admin
    if (path.startsWith('/admin')) {
      needAdmin();
      if (path === '/admin/overview') {
        await expireHolds();
        const users = await store.all('users');
        return { body: {
          requests: (await store.all('requests')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          bookings: (await store.all('bookings')).filter((b) => !b.seeded).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          applications: (await store.all('applications')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          users: users.map(publicUser),
          events: (await store.all('events')).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
          tickets: await store.all('tickets'),
          outbox: (await store.all('outbox')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200),
          capacity: await capacity(store), settings: await settings(store), payments: stripeOn ? 'stripe' : 'demo', mail: env.RESEND_API_KEY ? 'resend' : 'outbox',
        } };
      }
      let m;
      if ((m = path.match(/^\/admin\/requests\/([\w-]+)$/)) && method === 'POST') {
        const r = await store.get('requests', m[1]); if (!r) fail(404, 'not_found');
        if (['new', 'progress', 'done', 'declined'].includes(body.status)) r.status = body.status;
        if (body.note !== undefined) r.note = str(body.note, 2000);
        await store.put('requests', r);
        return { body: { request: r } };
      }
      if ((m = path.match(/^\/admin\/requests\/([\w-]+)\/(accept|decline)-studio$/)) && method === 'POST') {
        const r = await store.get('requests', m[1]); if (!r || r.type !== 'studio') fail(404, 'not_found');
        const accept = m[2] === 'accept';
        if (accept) {
          const map = await bookedMap(store, now);
          for (const s of r.sessions) { const err = validateSession(s, { booked: map[s.date] || [], today: new Date(now) }); if (err) fail(409, err); }
          await store.put('bookings', { id: shortId('R5'), status: 'confirmed', sessions: r.sessions, contact: { name: r.name, email: r.email, phone: r.phone }, userId: r.userId, artist: false, total: r.total, fromRequest: r.id, lang: r.lang, createdAt: nowIso(now) });
        }
        r.status = accept ? 'done' : 'declined'; await store.put('requests', r);
        await mail(r.email, 'request_answered', { accepted: accept, summary: sessionSummary(r.sessions, r.lang) }, r.lang);
        return { body: { request: r } };
      }
      if ((m = path.match(/^\/admin\/bookings\/([\w-]+)$/)) && method === 'POST') {
        const b = await store.get('bookings', m[1]); if (!b) fail(404, 'not_found');
        if (['confirmed', 'cancelled'].includes(body.status)) b.status = body.status;
        await store.put('bookings', b);
        return { body: { booking: b } };
      }
      if ((m = path.match(/^\/admin\/applications\/([\w-]+)\/(approve|reject)$/)) && method === 'POST') {
        const app = await store.get('applications', m[1]); if (!app) fail(404, 'not_found');
        const u = await store.get('users', app.userId);
        const cap = await capacity(store);
        if (m[2] === 'reject') {
          app.status = 'rejected'; await store.put('applications', app);
          await mail(app.email, 'application_rejected', {}, u?.lang);
        } else if (body.kind === 'free') {
          if (cap.freeLeft <= 0) fail(409, 'full_free');
          app.status = 'active'; await store.put('applications', app);
          u.role = 'artist'; u.membership = { kind: 'free', status: 'active', since: nowIso(now) }; await store.put('users', u);
          await mail(app.email, 'application_free', { link: `${site}/konto.html` }, u.lang);
        } else if (cap.paidLeft > 0) {
          app.status = 'invited'; app.invitedAt = nowIso(now); await store.put('applications', app);
          await mail(app.email, 'application_invited', { price: euro(cap.price), link: `${site}/konto.html` }, u?.lang);
        } else {
          app.status = 'waitlist'; await store.put('applications', app);
          await mail(app.email, 'application_waitlist', {}, u?.lang);
        }
        return { body: { application: app, capacity: await capacity(store) } };
      }
      if ((m = path.match(/^\/admin\/members\/([\w-]+)\/revoke$/)) && method === 'POST') {
        const u = await store.get('users', m[1]); if (!u) fail(404, 'not_found');
        await endMembership(u, site);
        return { body: { user: publicUser(u) } };
      }
      if (path === '/admin/events' && method === 'POST') {
        const e = body.id ? (await store.get('events', body.id)) || {} : {};
        Object.assign(e, {
          id: e.id || shortId('E'), date: str(body.date, 10), start: str(body.start, 5) || '19:00', end: str(body.end, 5) || '23:00',
          category: EVENT_CATEGORIES[body.category] ? body.category : 'special',
          title: { de: str(body.title_de || body.title?.de, 140), en: str(body.title_en || body.title?.en || body.title_de, 140) },
          description: { de: str(body.desc_de || body.description?.de, 1000), en: str(body.desc_en || body.description?.en || body.desc_de, 1000) },
          capacity: Math.max(0, Number(body.capacity) | 0), freeTickets: Math.max(0, Number(body.freeTickets) | 0),
          artistFree: !!body.artistFree, published: body.published !== false, updatedAt: nowIso(now), createdAt: e.createdAt || nowIso(now),
        });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !e.title.de) fail(400, 'invalid_date');
        await store.put('events', e);
        return { body: { event: e } };
      }
      if ((m = path.match(/^\/admin\/events\/([\w-]+)\/delete$/)) && method === 'POST') { await store.del('events', m[1]); return { body: { ok: true } }; }
      if ((m = path.match(/^\/admin\/events\/([\w-]+)\/notify$/)) && method === 'POST') {
        const e = await store.get('events', m[1]); if (!e) fail(404, 'not_found');
        const subs = (await store.all('users')).filter((u) => u.notifyEvents);
        for (const u of subs) await mail(u.email, 'event_new', { title: e.title[u.lang] || e.title.de, description: e.description?.[u.lang] || '', when: `${fmtDay(e.date, u.lang)} · ${e.start}`, link: `${site}/events.html#${e.id}` }, u.lang);
        e.notifiedAt = nowIso(now); await store.put('events', e);
        return { body: { sent: subs.length } };
      }
      if (path === '/admin/settings' && method === 'POST') {
        const cur = (await store.get('settings', 'main')) || { id: 'main' };
        for (const k of ['paidSlots', 'freeSlots', 'artistPriceMonthly']) if (body[k] !== undefined && Number(body[k]) >= 0) cur[k] = Number(body[k]);
        await store.put('settings', { ...cur, id: 'main' });
        await promoteWaitlist(site);
        return { body: { settings: await settings(store), capacity: await capacity(store) } };
      }
      if (path === '/admin/newsletter.csv') {
        const rows = (await store.all('users')).filter((u) => u.newsletter).map((u) => [u.email, u.name, u.role, u.lang].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return { body: { csv: ['email,name,role,lang', ...rows].join('\n') } };
      }
    }

    fail(404, 'not_found');
  }

  /** Einstiegspunkt: req = { method, path, query, body, rawBody, headers, token, lang, ip, site } */
  async function handle(req) {
    const lang = req.lang === 'en' ? 'en' : 'de';
    try {
      const user = await currentUser(req.token);
      const res = await route({ ...req, query: req.query || {} }, { user, lang: user?.lang && !req.lang ? user.lang : lang, site: (env.SITE_URL || req.site || '').replace(/\/$/, ''), ip: req.ip, mode: req.mode || 'server' });
      return { status: res.status || 200, body: res.body, setToken: res.setToken || null, clearToken: !!res.clearToken };
    } catch (e) {
      if (e instanceof ApiError) return { status: e.status, body: { error: MSG[lang][e.code] || e.code, code: e.code } };
      console.error(e);
      return { status: 500, body: { error: lang === 'en' ? 'Server error.' : 'Serverfehler.', detail: String(e.message || e) } };
    }
  }

  return { handle, capacity: () => capacity(store) };
}
