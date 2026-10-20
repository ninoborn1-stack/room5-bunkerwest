import { gsap, ScrollTrigger, $, $$, icons, reduced, splitWords, t, L, isTouch, lang } from './app.js';
import { SLOTS, PRICES, ADDONS, GEAR, MEMBERSHIP } from './config.js';
import { euro, timeLabel } from './pricing.js';

// ---------- Preiskarten: Normalpreis durchgestrichen, Artist-Preis in Gold, Ersparnis ----------
const artist = (n) => Math.round(n * (1 - MEMBERSHIP.artistDiscount) * 100) / 100;
const cards = [
  { id: 'hour', title: t('home.card.hourT'), price: PRICES.hour, time: '1 h', feats: [t('home.card.hour1'), t('home.card.incl')] },
  { id: 'block', title: t('home.card.blockT'), price: PRICES.block, was: PRICES.hour * 3, time: '3 h', feats: [t('home.card.block1'), t('home.card.incl')], tag: t('home.card.popular') },
  { id: 'session', title: t('home.card.sessionT'), price: PRICES.session, was: PRICES.hour * 6, time: `6 h · ${timeLabel(SLOTS.day.from)}–${timeLabel(SLOTS.day.to)} / ${timeLabel(SLOTS.night.from)}–${timeLabel(SLOTS.night.to)}`, feats: [t('home.card.session1'), t('home.card.incl')], featured: true },
];
$('[data-price-grid]').innerHTML = cards.map((c, i) => `
  <article class="price-card ${c.featured ? 'featured' : ''}" data-reveal data-delay="${i * 0.08}">
    ${c.tag ? `<span class="tag">${c.tag}</span>` : ''}${c.featured ? `<span class="tag">${t('home.card.best')}</span>` : ''}
    <span class="mono muted">0${i + 1} / ${c.time}</span>
    <h3 class="h4" style="margin:22px 0 0">${c.title}</h3>
    <div class="amount">${euro(c.price)}${c.was ? `<small class="was">${euro(c.was)}</small>` : ''}</div>
    <div class="member-price"><svg class="verified is-artist" width="16" height="16" viewBox="0 0 24 24"><path class="v-shape" d="M12 1.6l2.5 1.9 3.1-.3 1.2 2.9 2.9 1.2-.3 3.1 1.9 2.5-1.9 2.5.3 3.1-2.9 1.2-1.2 2.9-3.1-.3L12 22.4l-2.5-1.9-3.1.3-1.2-2.9-2.9-1.2.3-3.1L.7 12l1.9-2.5-.3-3.1 2.9-1.2 1.2-2.9 3.1.3z"/><path class="v-check" d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>${t('home.card.artist')}</span><b>${euro(artist(c.price))}</b><em>${t('home.card.save', { n: euro(c.price - artist(c.price)) })}</em></div>
    <ul>${c.feats.map((f) => `<li><i data-lucide="check"></i>${f}</li>`).join('')}</ul>
    <a href="buchen.html?slot=${c.id}" class="btn ${c.featured ? 'btn-primary' : 'btn-ghost'} btn-block">${t('home.card.request', { s: c.title })} <i data-lucide="arrow-right"></i></a>
  </article>`).join('');

$('[data-extras]').innerHTML = ADDONS.map((a) => `<div class="extra"><i data-lucide="${a.icon}"></i><div><b>${L(a.label)}</b><span>${euro(a.price)} / ${a.kind === 'hourly' ? t('unit.hour') : t('unit.track')}</span></div></div>`).join('');
const GEAR_EN = { 'Neumann Großmembran-Mikrofon': 'Neumann large-diaphragm microphone', 'Popschutz & Shockmount': 'Pop filter & shock mount', 'ADAM Audio Studiomonitore': 'ADAM Audio studio monitors', 'Studio-Kopfhörer': 'Studio headphones', 'E-Gitarren & E-Bass': 'Electric guitars & bass', 'Holz-Diffusor-Wand': 'Wooden diffuser wall', 'Deckensegel & Absorber': 'Ceiling clouds & absorbers', 'Vocal-Ecke': 'Vocal corner' };
$('[data-gear]').innerHTML = GEAR.map((g) => `<div class="gear-col"><h4>${L(g.group)}</h4><ul>${g.items.map((i) => `<li>${lang === 'en' ? GEAR_EN[i] || i : i}</li>`).join('')}</ul></div>`).join('');
icons();

// ---------- Laufband (CSS-Animation, Inhalt verdoppelt für nahtlose Schleife) ----------
const track = $('[data-marquee]');
track.innerHTML += track.innerHTML; icons(track);

// ---------- Artist-Galerie: wischen/klicken + langsamer Auto-Lauf, pausiert bei Berührung ----------
(function gallery() {
  const root = $('[data-gallery]'); if (!root) return;
  const tr = $('.gallery-track', root); const slides = $$('figure', tr); const dots = $('.gallery-dots', root);
  if (slides.length < 2) return;
  let i = 0, timer = null;
  dots.innerHTML = slides.map((_, n) => `<button type="button" role="tab" aria-label="${n + 1}"></button>`).join('');
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    tr.style.transform = `translate3d(${-i * 100}%,0,0)`;
    $$('button', dots).forEach((b, k) => b.setAttribute('aria-selected', k === i));
  };
  const play = () => { stop(); if (!reduced) timer = setInterval(() => go(i + 1), 4500); };
  const stop = () => clearInterval(timer);
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { go($$('button', dots).indexOf(b)); play(); } });
  let x0 = null;
  root.addEventListener('pointerdown', (e) => { x0 = e.clientX; stop(); });
  root.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(i + (e.clientX < x0 ? 1 : -1)); x0 = null; play(); });
  root.addEventListener('pointerenter', () => !isTouch && stop());
  root.addEventListener('pointerleave', () => { x0 = null; play(); });
  go(0); play();
})();

// ---------- Manifest: Wörter vorbereiten ----------
const manifest = $('[data-manifest]');
splitWords(manifest).forEach((w) => w.parentElement.classList.add('word'));

if (reduced) {
  manifest.querySelectorAll('.word').forEach((w) => (w.style.opacity = 1));
} else {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero-media img', { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8 })
    .fromTo('.hero-title .line > span', { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: 1.3, stagger: 0.08 }, 0.2)
    .fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5);
  gsap.to('.hero-media img', { yPercent: 12, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  gsap.to(manifest.querySelectorAll('.word'), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: manifest, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  $$('[data-cta-row]').forEach((r) => {
    const d = Number(r.dataset.ctaRow);
    gsap.fromTo(r, { xPercent: 22 * d }, { xPercent: -22 * d, ease: 'none', scrollTrigger: { trigger: '.big-cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// Zähler
$$('[data-count]').forEach((el) => {
  const o = { v: 0 }, to = Number(el.dataset.count);
  if (reduced) { el.textContent = to; return; }
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }) });
});

addEventListener('load', () => ScrollTrigger.refresh());
