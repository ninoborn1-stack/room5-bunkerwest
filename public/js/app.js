// Gemeinsame Shell: Header, Footer, Hintergrund, Reveals, Seitenübergänge, Theme & Sprache
import { STUDIO } from './config.js';
import { api, backendMode } from './api.js';
import { t, lang, locale, applyI18n, setLang } from './i18n.js';
import { setLocale } from './pricing.js';

const { gsap, ScrollTrigger, lucide } = window;
gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger, t, lang };
setLocale(locale);

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const page = document.body.dataset.page || '';

export const icons = (root = document) => lucide.createIcons({ attrs: { 'stroke-width': 1.6 }, root });
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Text aus {de, en}-Objekten in der aktiven Sprache */
export const L = (o) => (o && typeof o === 'object' ? o[lang] ?? o.de : o ?? '');

export const brandMark = `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
  <rect x="1" y="1" width="38" height="38" rx="10" stroke="currentColor" stroke-opacity=".35"/>
  <g fill="currentColor">
    <rect class="bm-bar" x="9"  y="16" width="3" height="8"  rx="1.5"/>
    <rect class="bm-bar" x="14" y="11" width="3" height="18" rx="1.5"/>
    <rect class="bm-bar" x="19" y="8"  width="3" height="24" rx="1.5" style="fill:var(--accent)"/>
    <rect class="bm-bar" x="24" y="13" width="3" height="14" rx="1.5"/>
    <rect class="bm-bar" x="29" y="17" width="3" height="6"  rx="1.5"/>
  </g></svg>`;

/** Verifizierungs-Haken (Twitter-Stil): Community = Outline, Artist = gefüllt */
export function verifiedBadge(role, size = 18) {
  if (!['community', 'artist', 'admin'].includes(role)) return '';
  const filled = role !== 'community';
  const label = role === 'community' ? t('role.community') : role === 'artist' ? t('role.artist') : 'Admin';
  return `<svg class="verified ${filled ? 'is-artist' : 'is-community'}" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${label}"><title>${label}</title>
    <path class="v-shape" d="M12 1.6l2.5 1.9 3.1-.3 1.2 2.9 2.9 1.2-.3 3.1 1.9 2.5-1.9 2.5.3 3.1-2.9 1.2-1.2 2.9-3.1-.3L12 22.4l-2.5-1.9-3.1.3-1.2-2.9-2.9-1.2.3-3.1L.7 12l1.9-2.5-.3-3.1 2.9-1.2 1.2-2.9 3.1.3z"/>
    <path class="v-check" d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const NAV = [
  { href: './', label: t('nav.studio'), key: 'home' },
  { href: 'buchen.html', label: t('nav.book'), key: 'buchen' },
  { href: 'events.html', label: t('nav.events'), key: 'events' },
  { href: 'membership.html', label: t('nav.membership'), key: 'membership' },
  { href: 'ueber-uns.html', label: t('nav.about'), key: 'about' },
  { href: 'kontakt.html', label: t('nav.contact'), key: 'kontakt' },
];

function toggles() {
  const theme = document.documentElement.getAttribute('data-theme');
  return `<div class="toggle-group" role="group" aria-label="${t('ui.theme')}">
      <button type="button" data-set-theme="light" aria-pressed="${theme === 'light'}" aria-label="${t('ui.light')}"><i data-lucide="sun"></i></button>
      <button type="button" data-set-theme="dark" aria-pressed="${theme === 'dark'}" aria-label="${t('ui.dark')}"><i data-lucide="moon"></i></button>
    </div>
    <div class="toggle-group" role="group" aria-label="${t('ui.language')}">
      <button type="button" data-set-lang="de" aria-pressed="${lang === 'de'}">DE</button>
      <button type="button" data-set-lang="en" aria-pressed="${lang === 'en'}">EN</button>
    </div>`;
}

// ---------------- Shell einfügen ----------------
function shell() {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <a href="./" class="brand" aria-label="Room 5">${brandMark}<span>ROOM 5<small>BUNKER WEST</small></span></a>
    <nav class="nav" aria-label="${t('ui.mainnav')}">
      ${NAV.map((n) => `<a class="nav-link ${n.key === page ? 'is-active' : ''}" href="${n.href}">${n.label}</a>`).join('')}
    </nav>
    <div class="nav-actions">
      ${toggles()}
      <a href="login.html" class="icon-btn auth-btn" data-auth-link aria-label="${t('nav.login')}"><i data-lucide="user-round"></i></a>
      <a href="kontakt.html" class="btn btn-primary btn-sm" data-cta>${t('slogan')} <i data-lucide="arrow-right"></i></a>
      <button class="icon-btn menu-toggle" aria-label="${t('ui.menu')}" aria-expanded="false"><i data-lucide="menu"></i></button>
    </div>`;
  document.body.prepend(header);

  const menu = document.createElement('div');
  menu.className = 'menu-panel';
  menu.innerHTML = `${NAV.map((n, i) => `<a href="${n.href}"><span>0${i + 1}</span>${n.label}</a>`).join('')}
    <a href="login.html" data-auth-link><span>07</span>${t('nav.login')}</a>
    <a href="kontakt.html" class="btn btn-primary menu-cta" data-cta>${t('slogan')} <i data-lucide="arrow-right"></i></a>
    <div class="menu-toggles">${toggles()}</div>
    <div class="menu-foot"><a href="mailto:${STUDIO.email}">${STUDIO.email}</a><span>${STUDIO.house} · ${STUDIO.name}</span></div>`;
  document.body.append(menu);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a href="./" class="brand">${brandMark}<span>ROOM 5<small>BUNKER WEST</small></span></a>
          <p class="muted" style="max-width:34ch;margin-top:22px">${t('footer.claim')}</p>
          <a href="kontakt.html" class="link-arrow" style="margin-top:10px">${t('slogan')} <i data-lucide="arrow-up-right"></i></a>
        </div>
        <div><h5>Studio</h5><ul>
          <li><a href="./">Room 5</a></li><li><a href="buchen.html">${t('footer.prices')}</a></li><li><a href="events.html">${t('nav.events')}</a></li><li><a href="ueber-uns.html">${t('nav.about')}</a></li>
        </ul></div>
        <div><h5>${t('nav.contact')}</h5><ul>
          <li><a href="kontakt.html">${t('footer.form')}</a></li><li><a href="kontakt.html?typ=kooperation">${t('footer.coop')}</a></li><li><a href="mailto:${STUDIO.email}">${STUDIO.email}</a></li><li><a href="${STUDIO.instagram}" target="_blank" rel="noopener">Instagram</a></li>
        </ul></div>
        <div><h5>Community</h5><ul>
          <li><a href="login.html">${t('nav.login')}</a></li><li><a href="login.html?tab=register">${t('footer.join')}</a></li><li><a href="membership.html#artist">${t('footer.apply')}</a></li><li><a href="konto.html">${t('footer.profile')}</a></li><li><a href="admin.html">${t('footer.internal')}</a></li>
        </ul></div>
      </div>
      <div class="footer-word" aria-hidden="true">Bunker West</div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${STUDIO.house} · ${STUDIO.name}</span>
        <span class="mode-badge" data-mode-badge><i></i><span>…</span></span>
        <span><a href="rechtliches.html#impressum">${t('footer.imprint')}</a> · <a href="rechtliches.html#datenschutz">${t('footer.privacy')}</a> · <a href="rechtliches.html#agb">${t('footer.terms')}</a></span>
      </div>
    </div>`;
  const main = document.querySelector('main');
  if (!document.body.hasAttribute('data-no-footer')) main.after(footer);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="grain"></div>
    <div class="toasts" role="status" aria-live="polite"></div>`);

  // Theme & Sprache
  document.addEventListener('click', (e) => {
    const th = e.target.closest('[data-set-theme]');
    if (th) {
      const v = th.dataset.setTheme;
      document.documentElement.setAttribute('data-theme', v);
      try { localStorage.setItem('r5-theme', v); } catch {}
      $$('[data-set-theme]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.setTheme === v));
    }
    const lg = e.target.closest('[data-set-lang]');
    if (lg && lg.dataset.setLang !== lang) {
      if (currentUser) api.updateMe({ lang: lg.dataset.setLang }).catch(() => {});
      setLang(lg.dataset.setLang);
    }
  });

  // Mobile-Menü
  const toggle = header.querySelector('.menu-toggle');
  toggle.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}"></i>`;
    icons(toggle);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) gsap.fromTo(menu.querySelectorAll(':scope > a'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: 'expo.out', delay: 0.15 });
  });

  // Header ein-/ausblenden
  let last = 0;
  const onScroll = (y) => {
    header.classList.toggle('is-solid', y > 40);
    header.classList.toggle('is-hidden', y > last && y > 300 && !menu.classList.contains('is-open'));
    last = y;
  };
  window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
}

// ---------------- Auth-Status & Backend-Modus ----------------
export let currentUser = null;
export const isArtist = (u = currentUser) => !!u && (u.role === 'admin' || (u.role === 'artist' && u.membership?.status === 'active'));
export const userReady = api.me().then((r) => (currentUser = r.user)).catch(() => null);
async function authUi() {
  const u = await userReady;
  $$('[data-auth-link]').forEach((a) => {
    if (!u) return;
    a.href = u.role === 'admin' ? 'admin.html' : 'konto.html';
    a.setAttribute('aria-label', t('footer.profile'));
    if (a.classList.contains('icon-btn')) a.innerHTML = `<i data-lucide="user-round-check"></i>${verifiedBadge(u.role, 16)}`;
    else a.innerHTML = `<span>07</span>${t('footer.profile')}`;
  });
  // Artist-Member sehen "Jetzt buchen", alle anderen "Anfragen"
  if (isArtist(u)) $$('[data-cta]').forEach((b) => { b.href = 'buchen.html'; b.innerHTML = `${t('nav.bookNow')} <i data-lucide="arrow-right"></i>`; });
  const mode = await backendMode();
  // Demo-Leiste: zeigt den aktiven Test-Zugang, Wechsel mit einem Klick
  if (mode === 'demo' && page !== 'login') {
    const build = document.querySelector('meta[name=build]')?.content;
    document.body.insertAdjacentHTML('beforeend', `<a class="demo-pill" href="login.html">${u ? verifiedBadge(u.role, 14) : '<i data-lucide="flask-conical"></i>'}<span>Demo · ${u ? esc(u.name) : t('demo.guest')}</span><b>${t('demo.switch')}</b>${build ? `<small>v${build}</small>` : ''}</a>`);
  }
  const badge = $('[data-mode-badge]');
  if (badge) {
    badge.classList.toggle('local', mode !== 'server');
    badge.querySelector('span').textContent = mode === 'server' ? t('ui.modeServer') : t('ui.modeDemo');
  }
  icons();
}

// ---------------- Scrollen ----------------
// Bewusst natives Scrollen (kein Smooth-Scroll-Script) – am flüssigsten, besonders in Safari.
export function scrollToEl(target, offset = -90) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
}
function smooth() {
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); scrollToEl(t, -70);
  }));
}

// ---------------- Hintergrund ----------------
// Bewusst leichtgewichtig: nur CSS-Transforms (GPU), kein Canvas, kein JS pro Frame.
function background() {
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="bg" aria-hidden="true">
      <span class="bg-blob b1"></span><span class="bg-blob b2"></span><span class="bg-blob b3"></span>
      <svg class="bg-lines" viewBox="0 0 1200 600" preserveAspectRatio="none">
        ${Array.from({ length: 9 }, (_, i) => { const y = 80 + i * 55; return `<path d="M0 ${y} C 200 ${y - 22}, 400 ${y + 22}, 600 ${y} S 1000 ${y - 22}, 1200 ${y}"/>`; }).join('')}
      </svg>
    </div>`);
}

// ---------------- Magnetische Buttons ----------------
export function magnetic(root = document) {
  if (isTouch || reduced) return;
  $$('[data-magnetic]', root).forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.4); });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

// ---------------- Text-Split & Reveals ----------------
export function splitWords(el) {
  if (el.dataset.splitDone) return $$('.split-line > span', el);
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
          const outer = document.createElement('span'); outer.className = 'split-line';
          const inner = document.createElement('span'); inner.textContent = part;
          outer.append(inner); frag.append(outer);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('img-inline')) walk(n);
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  return $$('.split-line > span', el);
}

export function reveals(root = document) {
  $$('[data-split]', root).forEach((el) => {
    const words = splitWords(el);
    el.style.visibility = 'visible';
    if (reduced) return;
    gsap.from(words, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 88%' }, delay: Number(el.dataset.delay || 0) });
  });
  $$('[data-reveal]', root).forEach((el) => {
    if (reduced) return;
    const type = el.dataset.reveal;
    const from = type === 'scale' ? { scale: 0.88, opacity: 0 } : type === 'left' ? { x: -60, opacity: 0 } : type === 'clip' ? { clipPath: 'inset(100% 0 0 0)', opacity: 1 } : { y: 40, opacity: 0 };
    const to = type === 'clip' ? { clipPath: 'inset(0% 0 0 0)', opacity: 1 } : { x: 0, y: 0, scale: 1, opacity: 1 };
    gsap.fromTo(el, from, { ...to, duration: 1.3, ease: 'expo.out', delay: Number(el.dataset.delay || 0), scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('[data-stagger]', root).forEach((el) => {
    if (reduced) return;
    gsap.fromTo(el.children, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('[data-parallax]', root).forEach((el) => {
    if (reduced) return;
    const amt = Number(el.dataset.parallax || 15);
    gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// ---------------- Seitenübergänge ----------------
// Der Vorhang läuft als reine CSS-Animation (GPU), dadurch bleibt er flüssig,
// auch wenn die Seite im Hintergrund lädt. Einblenden startet schon per Inline-Script im <head>.
function transitions() {
  const root = document.documentElement;
  const lbl = $('.curtain-label');
  const internal = (a) => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('blob:')) return null;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api')) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    return url;
  };
  // Zielseite schon beim Hovern vorladen
  const warmed = new Set();
  const warm = (e) => { const url = internal(e.target.closest?.('a')); if (url && !warmed.has(url.pathname)) { warmed.add(url.pathname); fetch(url.pathname, { credentials: 'same-origin' }).catch(() => {}); } };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('touchstart', warm, { passive: true });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = e.target.closest('a'); const url = internal(a);
    if (!url) return;
    if (reduced || !lbl) return;
    e.preventDefault();
    try { sessionStorage.setItem('r5-transition', '1'); } catch {}
    lbl.textContent = (a.dataset.label || a.textContent).trim().slice(0, 24) || 'Room 5';
    root.classList.remove('is-entering');
    void root.offsetWidth; // Animation neu starten
    root.classList.add('is-leaving');
    setTimeout(() => (location.href = url.href), 760);
  });
  root.addEventListener('animationend', (e) => { if (e.animationName === 'curtainOut') root.classList.remove('is-entering'); });
  addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('is-leaving', 'is-entering'); });
}

// ---------------- Spam-Schutz (Cloudflare Turnstile, nur wenn Schlüssel gesetzt) ----------------
let cfgPromise;
export const publicConfig = () => (cfgPromise ||= api.config().catch(() => ({})));
export async function captcha(container) {
  const cfg = await publicConfig();
  if (!cfg.turnstileSiteKey || !container) return () => null;
  if (!window.turnstile) await new Promise((res) => { const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.onload = res; document.head.append(sc); });
  const id = window.turnstile.render(container, { sitekey: cfg.turnstileSiteKey, theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', language: lang });
  return () => window.turnstile.getResponse(id);
}

// ---------------- Toast ----------------
export function toast(msg, icon = 'check') {
  const box = $('.toasts');
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = `<i data-lucide="${icon}"></i><span>${esc(msg)}</span>`;
  box.append(t); icons(t);
  setTimeout(() => gsap.to(t, { opacity: 0, y: 10, duration: 0.4, onComplete: () => t.remove() }), 3600);
}

export function formError(box, msg) {
  if (!box) return;
  box.hidden = !msg;
  box.innerHTML = msg ? `<i data-lucide="circle-alert"></i><span>${esc(msg)}</span>` : '';
  if (msg) icons(box);
}

export const successSvg = `<svg class="check-anim" viewBox="0 0 110 110" fill="none"><circle cx="55" cy="55" r="52" style="stroke:var(--accent)" stroke-width="2"/><path d="M34 56l14 14 28-30" style="stroke:var(--text)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------------- Selbst-Aktualisierung ----------------
// Liegt eine neuere Version online als die geladene (Browser-Cache), einmal automatisch neu laden.
function checkVersion() {
  const build = document.querySelector('meta[name=build]')?.content;
  if (!build) return;
  fetch('version.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j?.v || j.v === build) return;
    const key = `r5-reloaded-${j.v}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { return; }
    location.reload();
  }).catch(() => {});
}

// ---------------- Init ----------------
window.__r5 = true;
checkVersion();
applyI18n();
shell();
icons();
smooth();
background();
transitions();
authUi();
document.fonts?.ready.then(() => { reveals(); magnetic(); ScrollTrigger.refresh(); });
