// Startseite Bunker West: Hero, Manifest, Grundriss & Verfügbarkeit, nächste Events, Galerie, Anfahrt
import { gsap, ScrollTrigger, $, $$, icons, reduced, splitWords, t, userReady } from './app.js';
import { STUDIO } from './config.js';
import { api } from './api.js';
import { mountFloorplan } from './floorplan.js';
import { renderEventCards } from './weekplan.js';

mountFloorplan($('[data-plan-app]'));

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

// ---------- Laufband ----------
const track = $('[data-marquee]');
track.innerHTML += track.innerHTML; icons(track);

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
  tl.fromTo('.hero-media img', { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8 })
    .fromTo('.hero-wordmark .wordmark', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.8, ease: 'expo.inOut' }, 0.3)
    .fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5);
  gsap.to('.hero-media img', { yPercent: 12, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  gsap.to(manifest.querySelectorAll('.word'), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: manifest, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  $$('[data-cta-row]').forEach((r) => {
    const d = Number(r.dataset.ctaRow);
    gsap.fromTo(r, { xPercent: 22 * d }, { xPercent: -22 * d, ease: 'none', scrollTrigger: { trigger: '.big-cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
