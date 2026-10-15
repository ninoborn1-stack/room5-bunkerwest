// Gemeinsame Buchungslogik (Browser, lokaler Fallback & Server)
// Modell: pro Tag zwei feste Sessions (Day 12–18, Night 18–24), je SLOT_PRICE.
// Night Session kann nach 0 Uhr stundenweise verlängert werden.
import { SLOTS, SLOT_PRICE, EXTENSION, STAFF, SERVICES, UPGRADES, MEMBER } from './config.js';

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const euro = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const hourLabel = (h) => `${pad(h % 24)}:00`;
export const SLOT_IDS = Object.keys(SLOTS);

export function daysAhead(dateStr, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseYmd(dateStr) - t) / 86400000);
}

/** Gewählte Sessions in fester Reihenfolge. */
export const sessionSlots = (s) => SLOT_IDS.filter((id) => s.slots?.includes(id));

/** Gesamtzeitraum [von, bis] – bis kann > 24 sein (Verlängerung nach Mitternacht). */
export function sessionRange(s) {
  const sl = sessionSlots(s);
  if (!sl.length) return [0, 0];
  const from = SLOTS[sl[0]].from;
  const to = SLOTS[sl[sl.length - 1]].to + (sl.includes('night') ? Number(s.extra || 0) : 0);
  return [from, to];
}

export const sessionHours = (s) => sessionSlots(s).length * 6 + (sessionSlots(s).includes('night') ? Number(s.extra || 0) : 0);

export function sessionLabel(s) {
  const sl = sessionSlots(s);
  const name = sl.length === 2 ? 'Day + Night' : sl.length ? SLOTS[sl[0]].label : '–';
  return s.extra && sl.includes('night') ? `${name} + ${s.extra} h` : name;
}

/** Prüft eine Session gegen Regeln & belegte Sessions des Tages. Gibt Fehlertext oder null zurück. */
export function validateSession(s, { booked = [], isMember = false, today = new Date() } = {}) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) return 'Ungültiges Datum.';
  const sl = sessionSlots(s);
  if (!sl.length) return 'Bitte mindestens eine Session wählen.';
  const ahead = daysAhead(s.date, today);
  if (ahead < 0) return 'Datum liegt in der Vergangenheit.';
  const win = isMember ? MEMBER.windowMember : MEMBER.windowPublic;
  if (ahead > win) return isMember ? 'Außerhalb des Buchungsfensters.' : `Mehr als ${MEMBER.windowPublic} Tage im Voraus nur für Members.`;
  const extra = Number(s.extra || 0);
  if (extra < 0 || extra > EXTENSION.maxHours) return 'Ungültige Verlängerung.';
  if (extra && !sl.includes('night')) return 'Verlängerung nur mit Night Session.';
  if (sl.some((id) => booked.includes(id))) return 'Session ist bereits belegt.';
  return null;
}

/** Preisberechnung einer einzelnen Session. */
export function priceSession(s, isMember = false) {
  const sl = sessionSlots(s);
  const hours = sessionHours(s);
  const extra = sl.includes('night') ? Number(s.extra || 0) : 0;
  const lines = sl.map((id) => ({ label: `${SLOTS[id].label} · ${hourLabel(SLOTS[id].from)}–${hourLabel(SLOTS[id].to)}`, amount: SLOT_PRICE }));
  if (extra) lines.push({ label: `Verlängerung · ${extra} h`, amount: extra * EXTENSION.pricePerHour });
  const room = sl.length * SLOT_PRICE + extra * EXTENSION.pricePerHour;
  const discount = isMember ? Math.round(room * MEMBER.discount * 100) / 100 : 0;
  let extras = 0;
  for (const st of STAFF) {
    const h = Math.max(0, Math.min(hours, Number(s.staff?.[st.id] || 0)));
    if (h) { const a = h * st.price; extras += a; lines.push({ label: `${st.label} · ${h} h`, amount: a }); }
  }
  for (const sv of SERVICES) {
    const n = Math.max(0, Math.min(20, Number(s.services?.[sv.id] || 0)));
    if (n) { const a = n * sv.price; extras += a; lines.push({ label: `${sv.label} · ${n}×`, amount: a }); }
  }
  for (const u of UPGRADES) {
    if (s.upgrades?.includes(u.id)) { extras += u.price; lines.push({ label: u.label, amount: u.price }); }
  }
  if (discount) lines.push({ label: `Member −${Math.round(MEMBER.discount * 100)} %`, amount: -discount });
  return { hours, room, extras, discount, total: room + extras - discount, lines };
}

export function priceCart(sessions, isMember = false) {
  const items = sessions.map((s) => priceSession(s, isMember));
  return {
    items,
    discount: items.reduce((a, i) => a + i.discount, 0),
    total: items.reduce((a, i) => a + i.total, 0),
    hours: items.reduce((a, i) => a + i.hours, 0),
  };
}

/** Bereinigt Session-Eingaben (gegen Manipulation). */
export function cleanSession(s) {
  const out = { date: String(s.date || '') };
  out.slots = SLOT_IDS.filter((id) => Array.isArray(s.slots) && s.slots.includes(id));
  out.extra = out.slots.includes('night') ? Math.max(0, Math.min(EXTENSION.maxHours, Number(s.extra) | 0)) : 0;
  out.staff = {}; for (const st of STAFF) out.staff[st.id] = Math.max(0, Number(s.staff?.[st.id]) | 0);
  out.services = {}; for (const sv of SERVICES) out.services[sv.id] = Math.max(0, Number(s.services?.[sv.id]) | 0);
  out.upgrades = UPGRADES.map((u) => u.id).filter((id) => Array.isArray(s.upgrades) && s.upgrades.includes(id));
  return out;
}

/** Deterministische Beispiel-Belegungen, damit der Kalender realistisch aussieht. */
export function seedBookings(today = new Date()) {
  const list = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 1; i < 60; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const r = rnd();
    if (r < 0.1) list.push({ date: ymd(d), slots: ['day', 'night'], extra: 0 });
    else if (r < 0.3) list.push({ date: ymd(d), slots: ['night'], extra: rnd() < 0.4 ? 2 : 0 });
    else if (r < 0.45) list.push({ date: ymd(d), slots: ['day'], extra: 0 });
  }
  return list;
}
