import { $, $$, formError, userReady, t, lang, captcha } from './app.js';
import { api, backendMode } from './api.js';
import { verifiedBadge, icons } from './app.js';

const params = new URLSearchParams(location.search);
const next = params.get('next');
const safeNext = next && /^[a-z0-9-]+\.html$/.test(next) ? next : null;
const target = (u) => safeNext || (u.role === 'admin' ? 'admin.html' : 'konto.html');
const resetToken = params.get('reset');

// Eingeloggt: nicht mehr automatisch weiterleiten – Status zeigen, Wechsel (z. B. Demo-Zugänge) bleibt möglich
userReady.then((u) => {
  if (!u || resetToken) return;
  const bar = document.createElement('div');
  bar.className = 'alert ok logged-bar';
  bar.innerHTML = `<i data-lucide="user-round-check"></i><span>${t('auth.loggedAs', { name: u.name, email: u.email })}</span><a href="${target(u)}">${t('auth.toProfile')}</a><button type="button" data-logout-here>${t('acc.logout')}</button>`;
  $('[data-auth-title]').after(bar); icons(bar);
  bar.querySelector('[data-logout-here]').addEventListener('click', async () => { await api.logout(); location.reload(); });
});

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

// Demo-Zugänge: nur im Demo-Modus (z. B. GitHub-Link) und lokal – nie auf der echten Seite
(async () => {
  const mode = await backendMode();
  if (mode !== 'demo' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  const seed = await fetch('data-seed.json').then((r) => r.json()).catch(() => ({ users: [] }));
  if (!seed.users?.length) return;
  const order = ['artist', 'community', 'admin'];
  const box = $('[data-demo-logins]');
  $('.demo-grid', box).innerHTML = order.map((role) => seed.users.find((u) => u.role === role)).filter(Boolean).map((u) => `
    <button type="button" class="demo-login" data-demo="${u.role}">${u.role === 'admin' ? '<i data-lucide="shield-check"></i>' : verifiedBadge(u.role, 20)}
      <span><b>${t(`auth.demo.${u.role}`)}</b><small>${u.email}</small></span><i data-lucide="arrow-right"></i></button>`).join('');
  box.hidden = false; icons(box);
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-demo]'); if (!b) return;
    const u = seed.users.find((x) => x.role === b.dataset.demo);
    b.disabled = true;
    try { await api.logout().catch(() => {}); const { user } = await api.login({ email: u.email, password: u.password }); location.href = target(user); }
    catch (ex) { formError($('[data-login-error]'), ex.message); b.disabled = false; }
  });
})();
