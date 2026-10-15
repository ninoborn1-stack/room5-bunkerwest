import { $, $$, formError, userReady } from './app.js';
import { api } from './api.js';

const params = new URLSearchParams(location.search);
const next = params.get('next');
const safeNext = next && /^[a-z0-9-]+\.html$/.test(next) ? next : null;
const target = (u) => safeNext || (u.role === 'admin' ? 'admin.html' : 'konto.html');

userReady.then((u) => { if (u) location.replace(target(u)); });

// Tabs
function show(tab) {
  $$('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  $('[data-login]').hidden = tab !== 'login';
  $('[data-register]').hidden = tab !== 'register';
  $('[data-auth-title]').textContent = tab === 'login' ? 'Einloggen' : 'Profil anlegen';
}
$$('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
if (params.get('tab') === 'register') show('register');

async function submit(form, errBox, call) {
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const { user } = await call(data);
    location.href = target(user);
  } catch (ex) {
    formError(errBox, ex.message); btn.disabled = false;
  }
}

$('[data-login]').addEventListener('submit', (e) => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(e.target));
  if (!email || !password) return formError($('[data-login-error]'), 'Bitte E-Mail und Passwort eingeben.');
  submit(e.target, $('[data-login-error]'), (d) => api.login(d));
});

$('[data-register]').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return formError($('[data-register-error]'), 'Bitte Name und gültige E-Mail angeben.');
  if ((d.password || '').length < 8) return formError($('[data-register-error]'), 'Passwort mit mindestens 8 Zeichen wählen.');
  submit(e.target, $('[data-register-error]'), (x) => api.register(x));
});
