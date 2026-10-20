import { gsap, $, $$, icons, formError, esc, successSvg, reduced, userReady, t, L, captcha } from './app.js';
import { STUDIO, REQUEST_TYPES } from './config.js';
import { api } from './api.js';

$('[data-contact-info]').innerHTML = [
  ['mail', t('contact.email'), STUDIO.email, `mailto:${STUDIO.email}`],
  ['phone', t('contact.phone'), STUDIO.phone, `tel:${STUDIO.phone.replace(/\s/g, '')}`],
  ['map-pin', t('contact.address'), `${STUDIO.street}<br>${STUDIO.city}`, null],
  ['at-sign', 'Instagram', '@bunkerwest', STUDIO.instagram],
].map(([i, l, v, href]) => {
  const inner = `<span class="ci-ico"><i data-lucide="${i}"></i></span><div><small>${l}</small>${v}</div>`;
  return href ? `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>` : `<div class="ci">${inner}</div>`;
}).join('');

// Arten aus der Konfiguration
const form = $('[data-contact]');
$('[data-types]').innerHTML = REQUEST_TYPES.map((r, i) => `<label class="chip"><input type="radio" name="type" value="${r.id}" ${i === 0 ? 'checked' : ''}><span><i data-lucide="${r.icon}"></i>${L(r.label)}</span></label>`).join('');

// Zusatzfelder je nach Art
const EXTRA = {
  studio: [['date', 'date', t('contact.f.date')], ['slot', ['', 'Day 12–18', 'Night 18:30–00:30', 'Day + Night'], t('contact.f.slot')]],
  membership: [['tier', ['Community', 'Artist'], t('contact.f.tier')]],
  event: [['eventType', 'text', t('contact.f.eventType')], ['date', 'date', t('contact.f.date')], ['guests', 'number', t('contact.f.guests')], ['duration', 'text', t('contact.f.duration')]],
  kooperation: [['website', 'url', 'Website'], ['idea', 'text', t('contact.f.idea')]],
  booking: [['date', 'date', t('contact.f.date')], ['location', 'text', t('contact.f.location')]],
  presse: [['medium', 'text', t('contact.f.medium')], ['deadline', 'date', 'Deadline']],
  sonstiges: [],
};
const HINT = {
  studio: `${t('contact.hint.studio')} <a href="buchen.html">${t('contact.hint.studioLink')}</a>`,
  membership: `${t('contact.hint.membership')} <a href="membership.html#artist">${t('contact.hint.membershipLink')}</a>`,
  event: t('contact.hint.event'),
};
function renderExtra() {
  const type = form.elements.type.value;
  $('[data-extra-fields]').innerHTML = (EXTRA[type] || []).map(([name, kind, label]) => `<div class="field"><label for="x-${name}">${label}</label>${Array.isArray(kind)
    ? `<select id="x-${name}" name="x_${name}">${kind.map((o) => `<option value="${o}">${o || '–'}</option>`).join('')}</select>`
    : `<input id="x-${name}" name="x_${name}" type="${kind}" ${kind === 'number' ? 'min="1"' : ''}>`}</div>`).join('');
  const hint = $('[data-type-hint]'); hint.hidden = !HINT[type]; hint.innerHTML = HINT[type] ? `<i data-lucide="info"></i><span>${HINT[type]}</span>` : '';
  icons(form);
}
const typ = new URLSearchParams(location.search).get('typ');
if (typ) { const r = form.querySelector(`input[name=type][value="${CSS.escape(typ)}"]`); if (r) r.checked = true; }
form.addEventListener('change', (e) => { if (e.target.name === 'type') renderExtra(); });
renderExtra(); icons();

let getCaptcha = () => null;
captcha($('[data-captcha]')).then((g) => (getCaptcha = g));
userReady.then((u) => { if (u) $$('[data-guest-only]').forEach((f) => { f.hidden = true; f.querySelector('input').required = false; }); });

if (!reduced) {
  $$('[data-signal] .pulse').forEach((c, i) => gsap.fromTo(c, { attr: { r: 8 }, opacity: 1 }, { attr: { r: 100 }, opacity: 0, duration: 3, repeat: -1, ease: 'power1.out', delay: i }));
  gsap.to('[data-signal] .sweep', { rotation: 360, svgOrigin: '110 110', duration: 4, repeat: -1, ease: 'none' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const user = await userReady;
  $$('.field', form).forEach((f) => f.classList.remove('invalid'));
  const bad = [];
  if (!user && !d.name?.trim()) bad.push('name');
  if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) bad.push('email');
  if ((d.message || '').trim().length < 10) bad.push('message');
  bad.forEach((n) => form.elements[n].closest('.field').classList.add('invalid'));
  if (bad.length) return formError($('[data-contact-error]'), bad.includes('message') && bad.length === 1 ? t('err.message_short') : t('err.name_email'));
  if (!d.privacy) return formError($('[data-contact-error]'), t('mem.consent'));
  const fields = {};
  for (const [k, v] of Object.entries(d)) if (k.startsWith('x_') && v) fields[k.slice(2)] = v;
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try {
    await api.request({ type: d.type, name: d.name, email: d.email, phone: d.phone, company: d.company, message: d.message, fields, captcha: getCaptcha() });
    const wrap = $('[data-contact-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">${t('contact.sent')}</span>
      <h3 class="display h3" style="margin:18px 0 14px">${t('contact.sentTitle')}</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">${t('contact.sentText', { name: esc((user?.name || d.name).split(' ')[0]), email: esc(user?.email || d.email) })}</p>
      <a href="./" class="btn btn-ghost">${t('contact.back')}</a></div>`;
    icons(wrap); gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) { formError($('[data-contact-error]'), ex.code ? t(`err.${ex.code}`) : ex.message); btn.disabled = false; }
});
