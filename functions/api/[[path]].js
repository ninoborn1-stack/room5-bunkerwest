// Cloudflare Pages Function: beantwortet /api/* mit dem gemeinsamen Backend-Kern.
// Daten liegen in Cloudflare D1 (Binding "DB"), Schlüssel kommen aus den Pages-Umgebungsvariablen.
import { createBackend } from '../../public/js/backend/core.js';
import { seedIfEmpty } from '../../public/js/backend/store.js';

/** D1-Ablage mit derselben Schnittstelle wie createObjectStore */
function d1Store(db) {
  return {
    async all(col) { const { results } = await db.prepare('SELECT data FROM docs WHERE col = ?').bind(col).all(); return results.map((r) => JSON.parse(r.data)); },
    async get(col, id) { const r = await db.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, id).first(); return r ? JSON.parse(r.data) : null; },
    async put(col, doc) { await db.prepare('INSERT INTO docs (col, id, data) VALUES (?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data').bind(col, doc.id, JSON.stringify(doc)).run(); return doc; },
    async del(col, id) { await db.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, id).run(); },
  };
}

let seeded = false;

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const store = d1Store(env.DB);
  // Beim allerersten Aufruf: Admin-Zugang aus Umgebungsvariablen anlegen (keine Test-Zugänge live!)
  if (!seeded && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await seedIfEmpty(store, { users: [{ email: env.ADMIN_EMAIL, name: 'Admin', role: 'admin', password: env.ADMIN_PASSWORD }] }, { iterations: Number(env.PBKDF2_ITER) || 20000, demo: false });
    seeded = true;
  }
  const rawBody = ['GET', 'HEAD'].includes(request.method) ? '' : await request.text();
  let body = {}; try { body = rawBody ? JSON.parse(rawBody) : {}; } catch {}
  const cookie = Object.fromEntries((request.headers.get('cookie') || '').split(';').filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))]; }));
  const backend = createBackend({ store, env: { PBKDF2_ITER: 20000, ...env } });
  const out = await backend.handle({
    method: request.method, path: url.pathname.replace(/^\/api/, ''), query: Object.fromEntries(url.searchParams),
    body, rawBody, headers: Object.fromEntries(request.headers), token: cookie.r5s, lang: request.headers.get('x-lang'),
    ip: request.headers.get('cf-connecting-ip'), site: url.origin, mode: 'server',
  });
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  if (out.setToken) headers.append('Set-Cookie', `r5s=${out.setToken}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=2592000`);
  if (out.clearToken) headers.append('Set-Cookie', 'r5s=; Secure; Path=/; Max-Age=0');
  return new Response(JSON.stringify(out.body), { status: out.status, headers });
}
