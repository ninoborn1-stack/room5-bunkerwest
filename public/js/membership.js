import { gsap, $, $$, icons, formError, esc, successSvg, userReady, t, isArtist, publicConfig, captcha, L } from './app.js';
import { api } from './api.js';
import { PRICES, ADDONS, SLOTS } from './config.js';
import { euro, timeLabel } from './pricing.js';

// ---------- Community: reguläre Studiopreise (nur auf Anfrage) ----------
$('[data-community-prices]').innerHTML = [
  [t('home.card.hourT'), euro(PRICES.hour)],
  [t('home.card.blockT'), euro(PRICES.block)],
  [`${t('home.card.sessionT')} · Day ${timeLabel(SLOTS.day.from)}–${timeLabel(SLOTS.day.to)} / Night ${timeLabel(SLOTS.night.from)}–${timeLabel(SLOTS.night.to)}`, euro(PRICES.session)],
  ...ADDONS.map((a) => [L(a.label), `${euro(a.price)} / ${a.kind === 'hourly' ? t('unit.hour') : t('unit.track')}`]),
].map(([k, v], i) => `<div class="${i === 3 ? 'tp-sep' : ''}"><span>${k}</span><b>${v}</b></div>`).join('') + `<a href="buchen.html" class="link-arrow">${t('mem.c.request')} <i data-lucide="arrow-up-right"></i></a>`;
icons($('[data-community-prices]'));

// ---------- Preis & freie Plätze ----------
publicConfig().then((cfg) => {
  const cap = cfg.capacity || {};
  $('[data-artist-price]').textContent = t('mem.a.priceOnRequest');
  const left = cap.paidLeft ?? 0, total = cap.paidSlots ?? 40;
  $('[data-capacity]').innerHTML = `<div class="cap-bar"><i style="width:${Math.round(((total - left) / total) * 100)}%"></i></div>
    <div class="cap-text">${left > 0 ? t('mem.a.left', { n: left, total }) : t('mem.a.full', { n: cap.waitlist || 0 })}</div>`;
});

