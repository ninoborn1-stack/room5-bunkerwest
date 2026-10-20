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

// ---------- Galerie-Streifen: Mausrad horizontal nur, wenn der Streifen scrollen kann ----------
const strip = $('[data-strip]');
strip.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const max = strip.scrollWidth - strip.clientWidth;
  if ((e.deltaY > 0 && strip.scrollLeft < max - 2) || (e.deltaY < 0 && strip.scrollLeft > 2)) { strip.scrollLeft += e.deltaY; e.preventDefault(); }
}, { passive: false });

// ---------- Manifest & Hero-Animation ----------
const manifest = $('[data-manifest]');
splitWords(manifest).forEach((w) => w.parentElement.classList.add('word'));

if (reduced) {
  manifest.querySelectorAll('.word').forEach((w) => (w.style.opacity = 1));
} else {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero-media img', { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8 })
    .fromTo('.hero-title .line > span', { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.2)
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
