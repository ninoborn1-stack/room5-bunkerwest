import { gsap, $, $$, icons, reduced } from './app.js';

// Marquee
const track = $('[data-marquee]');
track.innerHTML += track.innerHTML; icons(track); // Animation per CSS

if (!reduced) {
  // Big CTA
  $$('[data-cta-row]').forEach((r) => gsap.fromTo(r, { xPercent: 20 }, { xPercent: -20, ease: 'none', scrollTrigger: { trigger: '.big-cta', start: 'top bottom', end: 'bottom top', scrub: true } }));
}
