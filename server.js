// Bunker West / Room 5 – lokaler Entwicklungsserver
// Liefert public/ aus und beantwortet /api/* mit dem gemeinsamen Backend-Kern (public/js/backend/core.js).
// Daten: data/db.json · Schlüssel (optional): .env (siehe .env.example)
// Start: npm run dev  →  http://localhost:1102
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackend } from './public/js/backend/core.js';
import { createObjectStore, seedIfEmpty } from './public/js/backend/store.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = Number(process.env.PORT) || 1102;

// .env einlesen (ohne Zusatzpaket)
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

// ---------- Datenablage + Backend
let data = {};
try { data = JSON.parse(await fsp.readFile(DB_FILE, 'utf8')); } catch {}
const store = createObjectStore(data, (d) => fsp.writeFile(DB_FILE, JSON.stringify(d, null, 2)));
const seed = JSON.parse(await fsp.readFile(path.join(ROOT, 'data', 'seed.json'), 'utf8'));
if (await seedIfEmpty(store, seed)) { await store.flush(); console.log('  Neue Datenbank angelegt (data/db.json) – Test-Zugänge siehe data/seed.json'); }
const backend = createBackend({ store, env: process.env });

const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
  const i = c.indexOf('='); return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
}));

async function api(req, res, url) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 1e6) { res.writeHead(413); return res.end(); } chunks.push(c); }
  const rawBody = Buffer.concat(chunks).toString();
  let body = {}; try { body = rawBody ? JSON.parse(rawBody) : {}; } catch {}
  const out = await backend.handle({
    method: req.method, path: url.pathname.replace(/^\/api/, ''), query: Object.fromEntries(url.searchParams),
    body, rawBody, headers: req.headers, token: cookies(req).r5s, lang: req.headers['x-lang'],
    ip: req.socket.remoteAddress, site: `http://${req.headers.host}`, mode: 'server',
  });
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (out.setToken) headers['Set-Cookie'] = `r5s=${out.setToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`;
  if (out.clearToken) headers['Set-Cookie'] = 'r5s=; Path=/; Max-Age=0';
  res.writeHead(out.status, headers);
  res.end(JSON.stringify(out.body));
}

async function serveFile(res, file, cache = 'no-cache') {
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) return serveFile(res, path.join(file, 'index.html'), cache);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC, '404.html')).on('error', () => res.end('404')).pipe(res);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    else if (!path.extname(rel)) rel += '.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    return serveFile(res, file, rel.startsWith('/vendor/') ? 'public, max-age=86400' : 'no-cache');
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Serverfehler');
  }
}).listen(PORT, () => console.log(`\n  BUNKER WEST · ROOM 5\n  → http://localhost:${PORT}\n  Zahlungen: ${process.env.STRIPE_SECRET_KEY ? 'Stripe' : 'Testmodus'} · E-Mails: ${process.env.RESEND_API_KEY ? 'Resend' : 'nur Outbox'}\n`));
