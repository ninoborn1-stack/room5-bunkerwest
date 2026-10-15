import { gsap, ScrollTrigger, $, $$, icons, reduced, splitWords } from './app.js';
import { SLOTS, SLOT_PRICE, EXTENSION, STAFF, SERVICES, UPGRADES, GEAR } from './config.js';
import { euro, hourLabel } from './pricing.js';

// ---------- Inhalte aus Konfiguration ----------
const cards = [
  { id: 'day', title: SLOTS.day.label, price: SLOT_PRICE, unit: '6 Stunden', time: `${hourLabel(SLOTS.day.from)} – ${hourLabel(SLOTS.day.to)}`, feats: ['Tageslicht-Rhythmus, frischer Kopf', 'Grundausstattung inklusive', 'Ideal für Vocals & Songwriting'] },
  { id: 'night', title: SLOTS.night.label, price: SLOT_PRICE, unit: '6 Stunden', time: `${hourLabel(SLOTS.night.from)} – ${hourLabel(SLOTS.night.to)}`, feats: ['Wenn die Stadt leiser wird', `Verlängerbar nach 0 Uhr · ${euro(EXTENSION.pricePerHour)}/h`, 'Grundausstattung inklusive'], tag: 'Beliebt' },
  { id: 'both', title: 'Day + Night', price: SLOT_PRICE * 2, unit: '12 Stunden', time: `${hourLabel(SLOTS.day.from)} – ${hourLabel(SLOTS.night.to)}`, feats: ['Der ganze Tag gehört dir', 'Für Produktionstage & Bands', 'Plus Verlängerung möglich'], featured: true },
];
$('[data-price-grid]').innerHTML = cards.map((c, i) => `
  <article class="price-card ${c.featured ? 'featured' : ''}" data-reveal data-delay="${i * 0.08}">
    ${c.tag ? `<span class="tag">${c.tag}</span>` : ''}${c.featured ? '<span class="tag">Ganzer Tag</span>' : ''}
    <span class="mono muted">0${i + 1} / ${c.time}</span>
    <div class="amount">${euro(c.price)}<small>${c.unit}</small></div>
    <h3 class="h4" style="margin:4px 0 0">${c.title}</h3>
    <ul>${c.feats.map((f) => `<li><i data-lucide="check"></i>${f}</li>`).join('')}</ul>
    <a href="buchen.html?slot=${c.id}" class="btn ${c.featured ? 'btn-primary' : 'btn-ghost'} btn-block">${c.title} buchen <i data-lucide="arrow-right"></i></a>
  </article>`).join('');
const minUpgrade = Math.min(...UPGRADES.map((u) => u.price));
$('[data-extras]').innerHTML = [
  { icon: 'moon-star', t: 'Verlängerung nach 0 Uhr', d: `+ ${euro(EXTENSION.pricePerHour)} / Stunde` },
  { icon: 'package-plus', t: 'Premium-Equipment', d: `ab ${euro(minUpgrade)} / Session` },
  ...STAFF.map((s) => ({ icon: s.icon, t: s.label, d: `+ ${euro(s.price)} / Stunde` })),
  ...SERVICES.map((s) => ({ icon: s.icon, t: s.label, d: `${euro(s.price)} / ${s.unit}` })),
].map((e) => `<div class="extra"><i data-lucide="${e.icon}"></i><div><b>${e.t}</b><span>${e.d}</span></div></div>`).join('');
$('[data-gear]').innerHTML = GEAR.map((g) => `<div class="gear-col"><h4>${g.group}</h4><ul>${g.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`).join('');
icons();

// ---------- Marquee: reine CSS-Animation (Inhalt verdoppeln für nahtlose Schleife) ----------
const track = $('[data-marquee]');
track.innerHTML += track.innerHTML; icons(track);

// ---------- Manifest: Wörter vorbereiten ----------
const manifest = $('[data-manifest]');
splitWords(manifest).forEach((w) => w.parentElement.classList.add('word'));

if (reduced) {
  manifest.querySelectorAll('.word').forEach((w) => (w.style.opacity = 1));
} else {
  // Hero-Intro: einmalig, nur Transforms/Opacity
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero-media img', { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8 })
    .fromTo('.hero-title .line > span', { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: 1.3, stagger: 0.08 }, 0.2)
    .fromTo('[data-hero-fade]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5);

  // Hero beim Scrollen: Bild driftet langsam, Inhalt hebt sich ab – kein Pinning
  gsap.to('.hero-media img', { yPercent: 12, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  // Manifest: Wörter hellen beim Scrollen auf
  gsap.to(manifest.querySelectorAll('.word'), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: manifest, start: 'top 80%', end: 'bottom 50%', scrub: true } });

  // Big CTA: Zeilen gegenläufig
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
