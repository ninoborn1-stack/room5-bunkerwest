import { gsap, $, $$, icons, formError, esc, successSvg, reduced, userReady } from './app.js';
import { STUDIO } from './config.js';
import { api } from './api.js';

$('[data-contact-info]').innerHTML = [
  ['mail', 'E-Mail', STUDIO.email, `mailto:${STUDIO.email}`],
  ['phone', 'Telefon', STUDIO.phone, `tel:${STUDIO.phone.replace(/\s/g, '')}`],
  ['map-pin', 'Adresse', `${STUDIO.street}<br>${STUDIO.city}`, null],
  ['at-sign', 'Instagram', '@bunkerwest', STUDIO.instagram],
  ['globe', 'Bunkerwest', STUDIO.bunkerwestUrl.replace(/^https?:\/\//, ''), STUDIO.bunkerwestUrl],
].map(([i, l, v, href]) => {
  const inner = `<span class="ci-ico"><i data-lucide="${i}"></i></span><div><small>${l}</small>${v}</div>`;
  return href ? `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>` : `<div class="ci">${inner}</div>`;
}).join('');
icons();

// Radar-Signal
if (!reduced) {
  $$('[data-signal] .pulse').forEach((c, i) => gsap.fromTo(c, { attr: { r: 8 }, opacity: 1 }, { attr: { r: 100 }, opacity: 0, duration: 3, repeat: -1, ease: 'power1.out', delay: i }));
  gsap.to('[data-signal] .sweep', { rotation: 360, svgOrigin: '110 110', duration: 4, repeat: -1, ease: 'none' });
}

const form = $('[data-contact]');
const typ = new URLSearchParams(location.search).get('typ');
if (typ) { const r = form.querySelector(`input[name=type][value="${CSS.escape(typ)}"]`); if (r) r.checked = true; }
userReady.then((u) => { if (u) { form.elements.name.value ||= u.name; form.elements.email.value ||= u.email; } });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  $$('.field', form).forEach((f) => f.classList.remove('invalid'));
  const bad = [];
  if (!d.name.trim()) bad.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) bad.push('email');
  if (d.message.trim().length < 10) bad.push('message');
  bad.forEach((n) => form.elements[n].closest('.field').classList.add('invalid'));
  if (bad.length) return formError($('[data-contact-error]'), 'Bitte Name, gültige E-Mail und eine Nachricht (min. 10 Zeichen) angeben.');
  if (!d.privacy) return formError($('[data-contact-error]'), 'Bitte bestätige die Einwilligung.');
  delete d.privacy;
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try {
    await api.contact(d);
    const wrap = $('[data-contact-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">Nachricht gesendet</span>
      <h3 class="display h3" style="margin:18px 0 14px">Signal<br>empfangen.</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">Danke, ${esc(d.name.split(' ')[0])}. Wir melden uns so schnell wie möglich an <b>${esc(d.email)}</b>.</p>
      <a href="buchen.html" class="btn btn-ghost">Inzwischen Session buchen</a></div>`;
    icons(wrap);
    gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) {
    formError($('[data-contact-error]'), ex.message); btn.disabled = false;
  }
});
