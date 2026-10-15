import { gsap, $, $$, icons, formError, esc, successSvg, userReady } from './app.js';
import { MEMBER } from './config.js';
import { api } from './api.js';

$('[data-window-text]').textContent = `Bis zu ${MEMBER.windowMember} Tage im Voraus buchen – öffentliche Buchungen nur ${MEMBER.windowPublic} Tage.`;
$('[data-discount-text]').textContent = `${Math.round(MEMBER.discount * 100)} % auf alle Raumpakete, automatisch bei jeder Buchung.`;

const form = $('[data-membership]');
let user = null;

// Eingeloggt: Name/E-Mail aus dem Profil, kein Passwort nötig
userReady.then((u) => {
  user = u;
  if (!u) return;
  const wrap = $('[data-membership-wrap]');
  if (['member', 'admin'].includes(u.role)) {
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">Schon dabei</span><h3 class="display h3" style="margin:18px 0 14px">Du bist Member.</h3><p class="muted" style="margin:0 auto 26px;max-width:36ch">Deine Vorteile gelten automatisch bei jeder Buchung.</p><a href="konto.html" class="btn btn-ghost">Zu deinem Profil</a></div>`;
    return;
  }
  ['name', 'email'].forEach((n) => { const el = form.elements[n]; el.value = u[n]; el.readOnly = true; el.required = false; });
  const pw = form.elements.password; pw.required = false; pw.closest('.field').hidden = true;
  $('[data-fstep="1"] h3').insertAdjacentHTML('afterend', `<div class="alert info"><i data-lucide="user-round-check"></i><span>Du fragst mit deinem Profil <b>${esc(u.email)}</b> an.</span></div>`);
  icons(form);
});
const err = $('[data-membership-error]');
let step = 1;
const steps = $$('[data-fstep]');
const bars = $$('.form-steps i');

function show(n) {
  step = n;
  steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.fstep) === n));
  bars.forEach((b, i) => b.classList.toggle('on', i < n));
  $('[data-prev]').hidden = n === 1;
  $('[data-next]').hidden = n === steps.length;
  $('[data-send]').hidden = n !== steps.length;
  formError(err, '');
}

function validate(n) {
  const req = $$(`[data-fstep="${n}"] [required]`, form);
  let msg = '';
  req.forEach((el) => {
    const f = el.closest('.field');
    let ok = el.type === 'checkbox' ? el.checked : el.value.trim().length > 0;
    if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
    if (ok && el.name === 'motivation') ok = el.value.trim().length >= 20;
    if (ok && el.name === 'password') ok = el.value.length >= 8;
    if (el.readOnly) ok = true;
    f?.classList.toggle('invalid', !ok);
    if (!ok && !msg) msg = el.name === 'motivation' ? 'Erzähl uns etwas mehr über dich (mind. 20 Zeichen).' : el.name === 'password' ? 'Passwort mit mindestens 8 Zeichen wählen.' : el.type === 'checkbox' ? 'Bitte bestätige die Einwilligung.' : 'Bitte fülle alle Pflichtfelder korrekt aus.';
  });
  formError(err, msg);
  return !msg;
}

$('[data-next]').addEventListener('click', () => { if (validate(step)) show(step + 1); });
$('[data-prev]').addEventListener('click', () => show(step - 1));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate(step)) return;
  const data = Object.fromEntries(new FormData(form));
  delete data.privacy;
  const btn = $('[data-send]'); btn.disabled = true;
  try {
    await api.membership(data);
    const wrap = $('[data-membership-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}
      <span class="eyebrow plain mono">Anfrage eingegangen</span>
      <h3 class="display h3" style="margin:18px 0 14px">Danke, ${esc(data.name.split(' ')[0])}.</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">Wir hören rein und melden uns an <b>${esc(user?.email || data.email)}</b>. ${user ? 'Den Status siehst du in deinem Profil.' : 'Dein Profil ist schon angelegt und du bist eingeloggt – nach Freigabe wird es automatisch zum Member-Profil.'}</p>
      <a href="konto.html" class="btn btn-ghost">Zu deinem Profil</a></div>`;
    icons(wrap);
    gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) {
    formError(err, ex.message);
    btn.disabled = false;
  }
});

// Status-Abfrage
const LABEL = { pending: ['In Prüfung', 'pending'], approved: ['Freigegeben – du kannst dich einloggen', 'approved'], rejected: ['Leider abgelehnt', 'rejected'] };
$('[data-status-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const out = $('[data-status-out]');
  try {
    const { status } = await api.membershipStatus(email);
    out.innerHTML = status ? `<span class="status ${LABEL[status][1]}">${LABEL[status][0]}</span>${status === 'approved' ? ' <a class="link-arrow" style="margin-left:10px" href="login.html">Login</a>' : ''}` : 'Keine Anfrage zu dieser E-Mail gefunden.';
  } catch (ex) { out.textContent = ex.message; }
});
