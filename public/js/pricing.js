// Gemeinsame Buchungs- und Preislogik (Browser, Demo-Modus, lokaler Server, Cloudflare)
// Modell: pro Tag Day (12:00–18:00) und Night (18:30–00:30), buchbar stundenweise.
// Preis je Session: 1 h 50 €, 3 h 140 €, 6 h 250 € (dazwischen 3 h + Einzelstunden).
// Artist-Member: 30 % auf die Raummiete. Add-ons ohne Rabatt.
import { SLOTS, HOURS, BLOCKS, PRICES, ADDONS, MEMBERSHIP } from './config.js';

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const SLOT_IDS = HOURS.map((h) => h.id);
export const SESSION_IDS = Object.keys(SLOTS);
const HOUR = Object.fromEntries(HOURS.map((h) => [h.id, h]));
export const hoursOf = (session) => HOURS.filter((h) => h.session === session).map((h) => h.id);
/** Alte Buchungen mit 'day'/'night' auf Stunden umrechnen */
const expand = (ids = []) => ids.flatMap((id) => (SLOTS[id] ? hoursOf(id) : [id]));

let LOCALE = 'de-DE';
export const setLocale = (l) => { LOCALE = l; };
export const euro = (n) => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
/** Minuten ab Mitternacht -> "18:30" (auch über Mitternacht hinaus) */
export const timeLabel = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const round2 = (n) => Math.round(n * 100) / 100;

export function daysAhead(dateStr, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseYmd(dateStr) - t) / 86400000);
}

/** Sessions, die heute schon begonnen haben (nicht mehr buchbar/anfragbar). */
export function startedSlots(dateStr, now = new Date()) {
  if (daysAhead(dateStr, now) !== 0) return [];
  const mins = now.getHours() * 60 + now.getMinutes();
  return SLOT_IDS.filter((id) => HOUR[id].from <= mins);
}

/** Gebuchte Stunden-IDs einer Session (sortiert, inkl. Umrechnung alter Day/Night-Buchungen) */
export const sessionSlots = (s) => { const set = new Set(expand(s?.slots)); return SLOT_IDS.filter((id) => set.has(id)); };
export function sessionRange(s) {
  const sl = sessionSlots(s);
  if (!sl.length) return [0, 0];
  return [HOUR[sl[0]].from, HOUR[sl[sl.length - 1]].to];
}
export const sessionHours = (s) => sessionSlots(s).length;
/** Zusammenhängende Zeitfenster, z. B. [[720, 900], [1110, 1290]] */
export function sessionWindows(s) {
  const out = [];
  for (const id of sessionSlots(s)) { const h = HOUR[id]; const last = out[out.length - 1]; if (last && last[1] === h.from) last[1] = h.to; else out.push([h.from, h.to]); }
  return out;
}
export const windowsLabel = (s) => sessionWindows(s).map(([a, z]) => `${timeLabel(a)}–${timeLabel(z)}`).join(', ');
/** Stunden je Session, z. B. { day: 3, night: 6 } */
export const perSession = (s) => { const sl = sessionSlots(s); return Object.fromEntries(SESSION_IDS.map((id) => [id, sl.filter((x) => HOUR[x].session === id).length]).filter(([, n]) => n)); };
export function sessionLabel(s, lang = 'de') {
  const ps = perSession(s); const ids = Object.keys(ps);
  if (!ids.length) return '–';
  if (ids.length === 2 && ps.day === 6 && ps.night === 6) return 'Day + Night';
  return ids.map((id) => (ps[id] === 6 ? SLOTS[id].label[lang] : `${SLOTS[id].label[lang].split(' ')[0]} · ${ps[id]} h`)).join(' + ');
}
/** Raummiete für n Stunden innerhalb einer Session */
export function hoursPrice(n, early = false) {
  if (n >= 6) return PRICES.session;
  if (n >= 3) return (early && PRICES.earlyBlock ? PRICES.earlyBlock : PRICES.block) + (n - 3) * PRICES.hour;
  return n * PRICES.hour;
}

/** Prüft eine Session. booked = schon belegte Session-IDs des Tages. Gibt Fehler-Code oder null zurück. */
export function validateSession(s, { booked = [], today = new Date() } = {}) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) return 'invalid_date';
  const sl = sessionSlots(s);
  if (!sl.length) return 'no_slot';
  const ahead = daysAhead(s.date, today);
  if (ahead < 0) return 'past';
  if (ahead > MEMBERSHIP.bookingWindowDays) return 'too_far';
  if (sl.some((id) => startedSlots(s.date, today).includes(id))) return 'started';
  if (sl.some((id) => booked.includes(id))) return 'taken';
  return null;
}

/** Normalpreis der Raummiete */
export function roomPrice(s) {
  const ps = perSession(s); const sl = sessionSlots(s);
  return Object.entries(ps).reduce((sum, [id, n]) => sum + hoursPrice(n, id === 'day' && BLOCKS[0].hours.every((h) => sl.includes(h)) && n === 3), 0);
}

/** Preis einer Session. isArtist = Artist-Member-Konditionen. */
export function priceSession(s, isArtist = false, lang = 'de') {
  const sl = sessionSlots(s);
  const hours = sessionHours(s);
  const room = roomPrice(s);
  const discount = isArtist ? round2(room * MEMBERSHIP.artistDiscount) : 0;
  const lines = [];
  for (const [id, n] of Object.entries(perSession(s))) {
    const win = sessionWindows({ slots: sl.filter((x) => HOUR[x].session === id) }).map(([a, z]) => `${timeLabel(a)}–${timeLabel(z)}`).join(', ');
    lines.push({ key: id, label: `${SLOTS[id].label[lang]} · ${n} h · ${win}`, amount: roomPrice({ slots: sl.filter((x) => HOUR[x].session === id) }), note: n > 1 && hoursPrice(n) < n * PRICES.hour ? n * PRICES.hour : null });
  }
  let extras = 0;
  for (const a of ADDONS) {
    const raw = Number(s.addons?.[a.id] || 0);
    const n = a.kind === 'hourly' ? Math.max(0, Math.min(hours, raw)) : Math.max(0, Math.min(20, raw));
    if (n) { const amt = round2(n * a.price); extras += amt; lines.push({ key: a.id, label: `${a.label[lang]} · ${n}${a.kind === 'hourly' ? ' h' : '×'}`, amount: amt }); }
  }
  if (discount) lines.push({ key: 'discount', label: `Artist −${Math.round(MEMBERSHIP.artistDiscount * 100)} %`, amount: -discount });
  return { hours, room, extras: round2(extras), discount, total: round2(room + extras - discount), lines };
}

export function priceCart(sessions, isArtist = false, lang = 'de') {
  const items = sessions.map((s) => priceSession(s, isArtist, lang));
  return {
    items,
    discount: round2(items.reduce((a, i) => a + i.discount, 0)),
    total: round2(items.reduce((a, i) => a + i.total, 0)),
    hours: items.reduce((a, i) => a + i.hours, 0),
  };
}

/** Wieviel würde ein Nicht-Member als Artist sparen? */
export const artistSavings = (sessions) => round2(priceCart(sessions, false).total - priceCart(sessions, true).total);

/** Bereinigt Eingaben (gegen Manipulation). */
export function cleanSession(s) {
  const out = { date: String(s?.date || '').slice(0, 10) };
  out.slots = Array.isArray(s?.slots) ? sessionSlots({ slots: s.slots }) : [];
  out.addons = {};
  for (const a of ADDONS) out.addons[a.id] = Math.max(0, Math.min(a.kind === 'hourly' ? 12 : 20, Number(s?.addons?.[a.id]) | 0));
  return out;
}
