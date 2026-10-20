// Einfache Dokumenten-Ablage: Sammlungen ("users", "bookings", …) mit Dokumenten (je mit id).
// Gleiche Schnittstelle für alle Umgebungen:
//   all(col) · get(col, id) · put(col, doc) · del(col, id)
// Diese Variante hält alles in einem Objekt und ruft save() nach Änderungen auf
// (Node: JSON-Datei, Browser: localStorage). Cloudflare nutzt eine D1-Variante mit gleicher Schnittstelle.
import { hashPassword, shortId } from './crypto.js';
import { WEEK } from '../config.js';
import { ymd } from '../pricing.js';

export function createObjectStore(data = {}, save = () => {}) {
  const col = (c) => (data[c] ||= {});
  let timer = null;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => save(data), 30); };
  return {
    data,
    async all(c) { return Object.values(col(c)).map((d) => structuredClone(d)); },
    async get(c, id) { const d = col(c)[id]; return d ? structuredClone(d) : null; },
    async put(c, doc) { col(c)[doc.id] = structuredClone(doc); persist(); return doc; },
    async del(c, id) { delete col(c)[id]; persist(); },
    async flush() { clearTimeout(timer); await save(data); },
  };
}

/** Legt Test-Zugänge, Beispiel-Events und -Belegungen an, wenn die Ablage leer ist. */
export async function seedIfEmpty(store, seed, { now = Date.now(), iterations = 60000, demo = true } = {}) {
  if ((await store.all('users')).length) return false;
  const iso = new Date(now).toISOString();
  for (const u of seed.users || []) {
    await store.put('users', {
      id: shortId('U'),
      name: u.name, email: u.email.toLowerCase(), role: u.role, lang: 'de', newsletter: true, notifyEvents: true,
      password: await hashPassword(u.password, iterations),
      membership: u.role === 'artist' ? { kind: u.kind || 'paid', status: 'active', since: iso } : null, createdAt: iso,
    });
  }
  if (!demo) return true;
  // Beispiel-Belegungen im Studio (damit der Kalender realistisch aussieht)
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const today = new Date(now);
  for (let i = 1; i < 60; i++) {
    const d = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
    const r = rnd();
    const slots = r < 0.1 ? ['day', 'night'] : r < 0.3 ? ['night'] : r < 0.45 ? ['day'] : null;
    if (slots) await store.put('bookings', { id: `SEED-${i}`, seeded: true, status: 'confirmed', sessions: [{ date: d, slots, addons: {} }], contact: { name: 'Belegt' }, total: 0, createdAt: iso });
  }
  // Beispiel-Events für die nächsten 3 Wochen nach Wochenplan
  const samples = {
    0: { category: 'membersday', de: 'Membersday: Kino & Networking', en: 'Members day: cinema & networking', membersOnly: true, desc: { de: 'Nur für Artist-Member + 1 Gast. Kein Eintritt, nur Getränke.', en: 'Artist Members + 1 guest only. No entry fee, just drinks.' } },
    1: { category: 'comedy', de: 'Comedy Night', en: 'Comedy Night' },
    2: { category: 'art', de: 'Sip & Paint', en: 'Sip & Paint' },
    3: { category: 'musik', de: 'Live Session: Konzert', en: 'Live session: concert', ticketsSold: 199, desc: { de: 'Großes Konzert – Artists bekommen 2 Free-Tickets (für sich + einen Freund).', en: 'Big concert – artists get 2 free tickets (for themselves + a friend).' } },
    4: { category: 'special', de: 'Bunker Friday', en: 'Bunker Friday' },
  };
  for (let i = 1; i <= 21; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const wd = (day.getDay() + 6) % 7;
    const smp = samples[wd];
    if (!smp || !WEEK[wd].some((b) => b.kind === 'event')) continue;
    await store.put('events', {
      id: `E-SEED${i}`, date: ymd(day), start: '19:00', end: '23:00', category: smp.category,
      title: { de: smp.de, en: smp.en }, description: smp.desc || { de: 'Beispiel-Event – wird im Admin-Bereich gepflegt.', en: 'Sample event – managed in the admin area.' },
      capacity: smp.membersOnly ? 40 : 100, freeTickets: smp.membersOnly ? 0 : 6, ticketsSold: smp.ticketsSold || 0, membersOnly: !!smp.membersOnly, published: true, createdAt: iso,
    });
  }
  return true;
}
