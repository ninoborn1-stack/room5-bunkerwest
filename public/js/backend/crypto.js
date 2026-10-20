// Kryptografie über Web Crypto – läuft identisch im Browser, in Node (>=20) und auf Cloudflare.
const enc = new TextEncoder();
const subtle = globalThis.crypto.subtle;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h) => new Uint8Array(h.match(/.{2}/g).map((x) => parseInt(x, 16)));

export function randomToken(bytes = 24) {
  const a = new Uint8Array(bytes); globalThis.crypto.getRandomValues(a); return hex(a);
}
export const shortId = (prefix) => `${prefix}-${randomToken(3).toUpperCase()}`;

export async function sha256(str) { return hex(await subtle.digest('SHA-256', enc.encode(str))); }

/** Passwort-Hash (PBKDF2-SHA256, eigenes Salz pro Nutzer). Format: pbkdf2$iter$salt$hash */
export async function hashPassword(password, iterations = 60000) {
  const salt = randomToken(16);
  const key = await subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256);
  return `pbkdf2$${iterations}$${salt}$${hex(bits)}`;
}
export async function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2' || !hash) return false;
  const key = await subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = hex(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations: Number(iter) }, key, 256));
  if (bits.length !== hash.length) return false;
  let diff = 0; for (let i = 0; i < bits.length; i++) diff |= bits.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret, message) {
  const key = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await subtle.sign('HMAC', key, enc.encode(message)));
}
