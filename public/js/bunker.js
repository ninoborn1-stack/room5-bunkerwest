// Startseite Bunker West: Hero, Manifest, Grundriss & Verfügbarkeit, nächste Events, Galerie, Anfahrt
import { gsap, ScrollTrigger, $, $$, icons, reduced, splitWords, t, userReady } from './app.js';
import { STUDIO } from './config.js';
import { api } from './api.js';
import { FEATURES } from './config.js';
import { renderEventCards } from './weekplan.js';

// Grundriss-System ist vorerst versteckt; Kalender übernimmt den Wunschtermin in die Anfrage
if (FEATURES.spacePlan) import('./floorplan.js').then(({ mountFloorplan }) => { const tpl = $('#tpl-raeume'); tpl.replaceWith(tpl.content); mountFloorplan($('[data-plan-app]')); });

// ---------- Navbar im Hero (Desktop): großes Logo auf Navbar-Höhe, Navigation rechts daneben.
// Der Übergang folgt dem Scrollen (weich nachgezogen, gestaffelt): Logo & Navigation gleiten an ihren Platz,
// dann erscheinen Profil/DE-EN, zum Schluss landet der Hero-CTA "Contact us" oben rechts.
(function heroNav() {
  const root = document.documentElement;
  const mq = matchMedia('(min-width: 1181px)');
  const header = $('.site-header');
  const brand = $('.site-header .brand');
  const nav = $('.site-header .nav');
  const actions = $('.site-header .nav-actions');
  const headCta = $('.site-header .nav-actions [data-cta]');
  const heroCta = $('[data-hero-cta]');
  const DIST = 320;                       // Scrollweg für den kompletten Übergang
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  let L = null, cur = null, raf = 0, ctaShift = [0, 0];

  function layout() {
    const gutter = parseFloat(getComputedStyle(header).paddingLeft);
    const bw = brand.offsetWidth, vw = innerWidth, nw = nav.offsetWidth, cx0 = vw / 2;
    const home = gutter + bw / 2;
    // Navigation im Hero etwas kleiner (min. 80 %), damit das Logo echt mittig groß stehen kann
    const need = cx0 + (bw * 1.5) / 2 + 48;                   // so weit rechts darf die Navigation frühestens beginnen
    const ns = Math.max(0.8, Math.min(1, (vw - gutter - need) / nw));
    let navStart = vw - gutter - nw * ns, cx = cx0, half = Math.min(cx0 - gutter, navStart - 48 - cx0);
    let navScale = ns;
    if (half * 2 < bw * 1.5) { navScale = 1; navStart = vw - gutter - nw; cx = (gutter + navStart - 48) / 2; half = (navStart - 48 - gutter) / 2; }  // zu eng: mittig im freien Bereich
    L = { dx: cx - home, s: Math.max(1, Math.min(1.9, (half * 2) / bw)), ns: navScale, right: vw - gutter };
  }
  function clear() {
    [brand, nav, actions, headCta, heroCta].forEach((el) => el && el.removeAttribute('style'));
    root.classList.remove('nav-hero');
  }
  function render(p) {
    const e1 = ease(seg(p, 0, 0.75));                        // Logo & Navigation
    const e2 = ease(seg(p, 0.45, 0.9));                      // Profil, DE/EN
    const e3 = ease(seg(p, 0.15, 1));                        // CTA-Flug
    brand.style.transform = `translate3d(${L.dx * (1 - e1)}px,0,0) scale(${1 + (L.s - 1) * (1 - e1)})`;
    const tx = L.right - (nav.offsetLeft + nav.offsetWidth);       // live: Navigation im Hero bündig rechts
    nav.style.transform = `translate3d(${tx * (1 - e1)}px,0,0) scale(${1 - (1 - L.ns) * (1 - e1)})`;
    actions.style.opacity = e2;
    actions.style.transform = `translate3d(0,${-10 * (1 - e2)}px,0)`;
    actions.style.pointerEvents = e2 > 0.9 ? '' : 'none';
    if (headCta) headCta.style.opacity = seg(p, 0.86, 1);
    if (heroCta && headCta) {
      if (p < 0.02) ctaShift = [0, 0];
      const hr = heroCta.getBoundingClientRect(), tr = headCta.getBoundingClientRect();
      const baseX = hr.left - ctaShift[0], baseY = hr.top - ctaShift[1];
      ctaShift = [(tr.left - baseX) * e3, (tr.top - baseY) * e3];
      heroCta.style.transform = `translate3d(${ctaShift[0]}px,${ctaShift[1]}px,0)`;
      heroCta.style.opacity = 1 - seg(p, 0.86, 1);
      heroCta.style.pointerEvents = p > 0.5 ? 'none' : '';
    }
    root.classList.toggle('nav-hero', p < 0.97);
  }
  function tick() {
    const target = clamp(scrollY / DIST);
    cur = cur === null || reduced ? target : cur + (target - cur) * 0.085;
    if (Math.abs(target - cur) < 0.001) cur = target;
    render(cur);
    raf = cur === target ? 0 : requestAnimationFrame(tick);
  }
  const kick = () => { if (!mq.matches) return; if (!raf) raf = requestAnimationFrame(tick); };
  function setup() {
    cancelAnimationFrame(raf); raf = 0;
    if (!mq.matches) return clear();
    clear(); layout(); cur = null; tick();
  }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', setup);
  document.fonts?.ready.then(setup);
  document.fonts?.addEventListener?.('loadingdone', setup);
  addEventListener('load', setup);
  // CTA-Text (z. B. 'Jetzt buchen' für Artists) ändert die Breite rechts -> neu ausrichten
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (mq.matches && L && cur !== null) render(cur); }).observe(actions);
  setup();
})();

// ---------- Hero: Tippen/Klicken taucht das Bild in goldenes Licht ----------
const hero = $('.hero');
hero.addEventListener('click', (e) => { if (e.target.closest('a, button')) return; hero.classList.toggle('is-lit'); });

// ---------- Anfahrt & Kontakt ----------
$('[data-visit-street]').innerHTML = `${STUDIO.street}<br><span class="outline">${STUDIO.city}</span>`;
$('[data-maps]').href = STUDIO.mapsUrl;
$('[data-visit-info]').innerHTML = [
  ['mail', t('contact.email'), STUDIO.email, `mailto:${STUDIO.email}`],
  ['phone', t('contact.phone'), STUDIO.phone, `tel:${STUDIO.phone.replace(/\s/g, '')}`],
  ['at-sign', 'Instagram', STUDIO.instagramHandle, STUDIO.instagram],
].map(([i, l, v, href]) => `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}><span class="ci-ico"><i data-lucide="${i}"></i></span><div><small>${l}</small>${v}</div></a>`).join('');

// ---------- Nächste Events ----------
(async () => {
  const root = $('[data-events]');
  try {
    const [user, { events }] = await Promise.all([userReady, api.events()]);
    renderEventCards(root, events.filter((e) => !e.membersOnly || user), user, { limit: 3, onChange: async () => { const r = await api.events(); renderEventCards(root, r.events, user, { limit: 3 }); } });
  } catch { root.innerHTML = ''; }
  ScrollTrigger.refresh();
})();

// ---------- Galerie: Pfeile, Wischen (nur horizontal), automatischer Durchlauf ----------
(function slider() {
  const root = $('[data-slider]'); if (!root) return;
  const track = $('[data-slider-track]'), figs = $$('figure', track);
  const count = $('[data-slider-count]'), bar = $('[data-slider-bar]');
  let i = 0, timer = null;
  const maxIndex = () => { const w = root.clientWidth; let total = 0; for (let k = figs.length - 1; k >= 0; k--) { total += figs[k].offsetWidth + 14; if (total > w) return k + 1; } return 0; };
  const go = (n) => {
    const max = maxIndex();
    i = n > max ? 0 : n < 0 ? max : n;
    track.style.transform = `translate3d(${-figs[i].offsetLeft}px,0,0)`;
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(max + 1).padStart(2, '0')}`;
    bar.style.transform = `scaleX(${(i + 1) / (max + 1)})`;
  };
  const play = () => { stop(); if (!reduced) timer = setInterval(() => go(i + 1), 4200); };
  const stop = () => clearInterval(timer);
  $('[data-slider-prev]').addEventListener('click', () => { go(i - 1); play(); });
  $('[data-slider-next]').addEventListener('click', () => { go(i + 1); play(); });
  let x0 = null, y0 = null;
  root.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; stop(); });
  root.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40 && Math.abs(e.clientX - x0) > Math.abs(e.clientY - y0)) go(i + (e.clientX < x0 ? 1 : -1)); x0 = null; play(); });
  root.addEventListener('pointercancel', () => { x0 = null; play(); });
  root.addEventListener('mouseenter', stop); root.addEventListener('mouseleave', play);
  addEventListener('resize', () => go(Math.min(i, maxIndex())));
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? play() : stop()) });
  go(0);
})();

// ---------- Manifest & Hero-Animation ----------
const manifest = $('[data-manifest]');
splitWords(manifest).forEach((w) => w.parentElement.classList.add('word'));

if (reduced) {
  manifest.querySelectorAll('.word').forEach((w) => (w.style.opacity = 1));
} else {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero-media .hero-bw', { opacity: 0 }, { opacity: 1, duration: 1.8 })
    .fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5);
  const small = matchMedia('(max-width: 700px)').matches; // Handy: kein Zoom, damit mehr vom Raum sichtbar bleibt
  gsap.to('.hero-media img', { yPercent: small ? 0 : -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  gsap.to(manifest.querySelectorAll('.word'), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: manifest, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  $$('[data-cta-row]').forEach((r) => {
    const d = Number(r.dataset.ctaRow);
    gsap.fromTo(r, { xPercent: 22 * d }, { xPercent: -22 * d, ease: 'none', scrollTrigger: { trigger: '.big-cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
