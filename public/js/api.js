// API-Client
// 1. Läuft ein Server (lokal: npm run dev, live: Cloudflare) → Anfragen gehen an /api.
// 2. Kein Server erreichbar (z. B. GitHub Pages) → derselbe Backend-Kern läuft im Browser,
//    Daten im localStorage ("Demo-Modus").
import { createBackend } from './backend/core.js';
import { createObjectStore, seedIfEmpty } from './backend/store.js';

const LANG = document.documentElement.lang === 'en' ? 'en' : 'de';
const SITE = new URL('.', location.href).href.replace(/\/$/, '');
const DB_KEY = 'r5.demo.db.v3';
const TOKEN_KEY = 'r5.demo.token';

let modePromise;
export function backendMode() {
  modePromise ||= fetch('/api/health', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => (j.mode === 'server' ? 'server' : 'demo'))
    .catch(() => 'demo');
  return modePromise;
}

// ---------- Server
async function remote(method, path, body) {
  const r = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: { 'x-lang': LANG, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Fehler ${r.status}`), { code: j.code, status: r.status });
  return j;
}

// ---------- Demo (Backend im Browser)
let demoBackend;
async function demo() {
  if (demoBackend) return demoBackend;
  let data = {};
  try { data = JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch {}
  const store = createObjectStore(data, (d) => { try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch {} });
  const seed = await fetch('data-seed.json').then((r) => r.json()).catch(() => ({ users: [] }));
  if (await seedIfEmpty(store, seed, { iterations: 20000 })) await store.flush();
  demoBackend = createBackend({ store, env: { PBKDF2_ITER: 20000 } });
  return demoBackend;
}
async function local(method, path, body) {
  const be = await demo();
  let token = null; try { token = localStorage.getItem(TOKEN_KEY); } catch {}
  const [p, qs] = path.split('?');
  const out = await be.handle({ method, path: p, query: Object.fromEntries(new URLSearchParams(qs || '')), body: body || {}, token, lang: LANG, site: SITE, mode: 'demo' });
  try {
    if (out.setToken) localStorage.setItem(TOKEN_KEY, out.setToken);
    if (out.clearToken) localStorage.removeItem(TOKEN_KEY);
  } catch {}
  if (out.status >= 400) throw Object.assign(new Error(out.body.error), { code: out.body.code, status: out.status });
  return out.body;
}

export async function call(method, path, body) {
  return (await backendMode()) === 'server' ? remote(method, path, body) : local(method, path, body);
}

export const api = {
  config: () => call('GET', '/config/public'),
  me: () => call('GET', '/auth/me'),
  register: (d) => call('POST', '/auth/register', d),
  login: (d) => call('POST', '/auth/login', d),
  logout: () => call('POST', '/auth/logout'),
  forgot: (email) => call('POST', '/auth/forgot', { email }),
  reset: (token, password) => call('POST', '/auth/reset', { token, password }),
  updateMe: (d) => call('PUT', '/me', d),
  changePassword: (current, password) => call('POST', '/me/password', { current, password }),
  overview: () => call('GET', '/me/overview'),
  availability: (from = '', to = '') => call('GET', `/availability?from=${from}&to=${to}`),
  checkout: (d) => call('POST', '/bookings/checkout', d),
  cancelBooking: (id) => call('POST', `/bookings/${id}/cancel`),
  request: (d) => call('POST', '/requests', d),
  apply: (d) => call('POST', '/applications', d),
  membershipCheckout: () => call('POST', '/membership/checkout'),
  membershipCancel: () => call('POST', '/membership/cancel'),
  demoPay: (kind, ref) => call('POST', '/payments/demo-confirm', { kind, ref }),
  events: (from = '') => call('GET', `/events?from=${from}`),
  claimTicket: (id) => call('POST', `/events/${id}/ticket`),
  admin: {
    overview: () => call('GET', '/admin/overview'),
    request: (id, d) => call('POST', `/admin/requests/${id}`, d),
    studio: (id, action) => call('POST', `/admin/requests/${id}/${action}-studio`),
    booking: (id, status) => call('POST', `/admin/bookings/${id}`, { status }),
    application: (id, action, kind) => call('POST', `/admin/applications/${id}/${action}`, { kind }),
    revoke: (userId) => call('POST', `/admin/members/${userId}/revoke`),
    saveEvent: (d) => call('POST', '/admin/events', d),
    deleteEvent: (id) => call('POST', `/admin/events/${id}/delete`),
    notifyEvent: (id) => call('POST', `/admin/events/${id}/notify`),
    settings: (d) => call('POST', '/admin/settings', d),
    newsletter: () => call('GET', '/admin/newsletter.csv'),
  },
};
