import { $, $$, formError, userReady, t, lang, captcha } from './app.js';
import { api } from './api.js';

const params = new URLSearchParams(location.search);
const next = params.get('next');
const safeNext = next && /^[a-z0-9-]+\.html$/.test(next) ? next : null;
const target = (u) => safeNext || (u.role === 'admin' ? 'admin.html' : 'konto.html');
const resetToken = params.get('reset');

userReady.then((u) => { if (u && !resetToken) location.replace(target(u)); });

const TITLES = { login: 'auth.login', register: 'auth.register', forgot: 'auth.forgotTitle', reset: 'auth.resetTitle' };
function show(tab) {
  $$('[data-tabs] [data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  ['login', 'register', 'forgot', 'reset'].forEach((k) => ($(`[data-${k}]`).hidden = k !== tab));
  $('[data-tabs]').hidden = tab === 'reset';
  $('[data-auth-title]').textContent = t(TITLES[tab]);
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
show(resetToken ? 'reset' : params.get('tab') === 'register' ? 'register' : 'login');

const err = (box, ex) => formError(box, ex.code ? t(`err.${ex.code}`) : ex.message);
let getCaptcha = () => null;
captcha($('[data-captcha]')).then((g) => (getCaptcha = g));

$('[data-login]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (!d.email || !d.password) return formError($('[data-login-error]'), t('err.login_failed'));
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try { const { user } = await api.login(d); location.href = target(user); } catch (ex) { err($('[data-login-error]'), ex); btn.disabled = false; }
});

$('[data-register]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return formError($('[data-register-error]'), t('err.name_email'));
  if ((d.password || '').length < 8) return formError($('[data-register-error]'), t('err.password_short'));
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    const { user } = await api.register({ ...d, newsletter: !!d.newsletter, notifyEvents: !!d.notifyEvents, lang, captcha: getCaptcha() });
    location.href = target(user);
  } catch (ex) { err($('[data-register-error]'), ex); btn.disabled = false; }
});

$('[data-forgot]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = $('[data-forgot-msg]');
  await api.forgot(new FormData(e.target).get('email')).catch(() => {});
  box.hidden = false; box.className = 'alert ok'; box.textContent = t('auth.linkSent');
});

$('[data-reset]').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { const { user } = await api.reset(resetToken, new FormData(e.target).get('password')); location.href = target(user); }
  catch (ex) { err($('[data-reset-error]'), ex); }
});
