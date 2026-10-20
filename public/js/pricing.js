// Gemeinsame Buchungs- und Preislogik (Browser, Demo-Modus, lokaler Server, Cloudflare)
// Modell: pro Tag Day (12:00–18:00) und Night (18:30–00:30). Beide zusammen = Paketpreis.
// Artist-Member: 30 % auf Sessions (nach Paket-Nachlass). Add-ons ohne Rabatt.
import { SLOTS, PRICES, ADDONS, MEMBERSHIP } from './config.js';

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const SLOT_IDS = Object.keys(SLOTS);

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
  return SLOT_IDS.filter((id) => SLOTS[id].from <= mins);
}

export const sessionSlots = (s) => SLOT_IDS.filter((id) => s.slots?.includes(id));
export function sessionRange(s) {
  const sl = sessionSlots(s);
  if (!sl.length) return [0, 0];
  return [SLOTS[sl[0]].from, SLOTS[sl[sl.length - 1]].to];
}
/** Gebuchte Stunden (ohne die Pause zwischen den Sessions) */
export const sessionHours = (s) => sessionSlots(s).reduce((h, id) => h + (SLOTS[id].to - SLOTS[id].from) / 60, 0);
export function sessionLabel(s, lang = 'de') {
  const sl = sessionSlots(s);
  if (sl.length === 2) return 'Day + Night';
  return sl.length ? SLOTS[sl[0]].label[lang] : '–';
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

/** Normalpreis der Sessions (inkl. Paket-Nachlass) */
export function roomPrice(s) {
  const n = sessionSlots(s).length;
  return n === 2 ? PRICES.bundle : n * PRICES.slot;
}

/** Preis einer Session. isArtist = Artist-Member-Konditionen. */
export function priceSession(s, isArtist = false, lang = 'de') {
  const sl = sessionSlots(s);
  const hours = sessionHours(s);
  const room = roomPrice(s);
  const discount = isArtist ? round2(room * MEMBERSHIP.artistDiscount) : 0;
  const lines = [];
  if (sl.length === 2) lines.push({ key: 'bundle', label: 'Day + Night', amount: PRICES.bundle, note: PRICES.slot * 2 });
  else sl.forEach((id) => lines.push({ key: id, label: SLOTS[id].label[lang], amount: PRICES.slot }));
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
  out.slots = SLOT_IDS.filter((id) => Array.isArray(s?.slots) && s.slots.includes(id));
  out.addons = {};
  for (const a of ADDONS) out.addons[a.id] = Math.max(0, Math.min(a.kind === 'hourly' ? 12 : 20, Number(s?.addons?.[a.id]) | 0));
  return out;
}
