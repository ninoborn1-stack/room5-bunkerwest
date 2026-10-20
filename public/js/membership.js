import { gsap, $, $$, icons, formError, esc, successSvg, userReady, t, isArtist, publicConfig, captcha } from './app.js';
import { api } from './api.js';
import { euro } from './pricing.js';

// ---------- Preis & freie Plätze ----------
publicConfig().then((cfg) => {
  const cap = cfg.capacity || {};
  $('[data-artist-price]').textContent = cfg.artistPrice ? t('mem.a.price', { n: euro(cfg.artistPrice) }) : t('mem.a.priceTbd');
  const left = cap.paidLeft ?? 0, total = cap.paidSlots ?? 40;
  $('[data-capacity]').innerHTML = `<div class="cap-bar"><i style="width:${Math.round(((total - left) / total) * 100)}%"></i></div>
    <div class="cap-text">${left > 0 ? t('mem.a.left', { n: left, total }) : t('mem.a.full', { n: cap.waitlist || 0 })}</div>`;
});

// ---------- Bewerbung (3 Schritte) ----------
const form = $('[data-membership]');
const err = $('[data-membership-error]');
let step = 1; let user = null; let getCaptcha = () => null;
const steps = $$('[data-fstep]'); const bars = $$('.form-steps i');

userReady.then(async (u) => {
  user = u;
  getCaptcha = await captcha($('[data-captcha]'));
  if (!u) return;
  const wrap = $('[data-membership-wrap]');
  if (isArtist(u)) {
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">${t('role.artist')}</span><h3 class="display h3" style="margin:18px 0 14px">${t('mem.already')}</h3><a href="konto.html" class="btn btn-ghost">${t('footer.profile')}</a></div>`;
    return;
  }
  ['name', 'email'].forEach((n) => { const el = form.elements[n]; el.value = u[n]; el.readOnly = true; el.required = false; });
  const pw = form.elements.password; pw.required = false; $('[data-pw-field]').hidden = true;
  $('[data-fstep="1"] h3').insertAdjacentHTML('afterend', `<div class="alert info"><i data-lucide="user-round-check"></i><span>${t('mem.withProfile', { email: esc(u.email) })}</span></div>`);
  icons(form);
});

function show(n) {
  step = n;
  steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.fstep) === n));
  bars.forEach((b, i) => b.classList.toggle('on', i < n));
  $('[data-prev]').hidden = n === 1; $('[data-next]').hidden = n === steps.length; $('[data-send]').hidden = n !== steps.length;
  formError(err, '');
}
function validate(n) {
  let msg = '';
  $$(`[data-fstep="${n}"] [required]`, form).forEach((el) => {
    let ok = el.type === 'checkbox' ? el.checked : el.value.trim().length > 0;
    if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
    if (ok && el.name === 'motivation') ok = el.value.trim().length >= 20;
    if (ok && el.name === 'password') ok = el.value.length >= 8;
    if (el.readOnly) ok = true;
    el.closest('.field')?.classList.toggle('invalid', !ok);
    if (!ok && !msg) msg = el.name === 'motivation' ? t('err.motivation_short') : el.name === 'password' ? t('err.password_short') : el.type === 'checkbox' ? t('mem.consent') : t('mem.fillAll');
  });
  formError(err, msg);
  return !msg;
}
$('[data-next]').addEventListener('click', () => { if (validate(step)) show(step + 1); });
$('[data-prev]').addEventListener('click', () => show(step - 1));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate(step)) return;
  const data = Object.fromEntries(new FormData(form)); delete data.privacy;
  const btn = $('[data-send]'); btn.disabled = true;
  try {
    await api.apply({ ...data, captcha: getCaptcha() });
    const wrap = $('[data-membership-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">${t('mem.sent.eyebrow')}</span>
      <h3 class="display h3" style="margin:18px 0 14px">${t('mem.sent.title', { name: esc((user?.name || data.name).split(' ')[0]) })}</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">${user ? t('mem.sent.textUser') : t('mem.sent.textNew')}</p>
      <a href="konto.html" class="btn btn-ghost">${t('footer.profile')}</a></div>`;
    icons(wrap); gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) { formError(err, ex.code ? t(`err.${ex.code}`) : ex.message); btn.disabled = false; }
});
