import { $, icons, successSvg, t, esc, formError } from './app.js';
import { api } from './api.js';

const q = new URLSearchParams(location.search);
const kind = q.get('kind'), ref = q.get('ref') || '';
const box = $('[data-pay]');
const next = kind === 'membership' ? `<a href="konto.html" class="btn btn-primary">${t('pay.toProfile')}</a>` : `<a href="konto.html" class="btn btn-primary">${t('pay.toBookings')}</a>`;

function done() {
  box.innerHTML = `${successSvg}<span class="eyebrow plain mono">${esc(ref)}</span>
    <h1 class="display h3" style="margin:18px 0 14px">${kind === 'membership' ? t('pay.okMember') : t('pay.okBooking')}</h1>
    <p class="muted" style="max-width:40ch;margin:0 auto 26px">${t('pay.okText')}</p>${next}`;
  icons(box);
}

if (q.get('test') === '1') {
  // Testzahlung: nur lokal / Demo-Modus, solange Stripe nicht verbunden ist
  box.innerHTML = `<span class="lock-badge"><i data-lucide="flask-conical"></i>${t('pay.testBadge')}</span>
    <h1 class="display h3" style="margin:22px 0 12px">${t('pay.testTitle')}</h1>
    <p class="muted" style="max-width:44ch;margin:0 auto 24px">${t('pay.testText')}</p>
    <div class="alert err" data-err hidden></div>
    <div class="row" style="justify-content:center"><button class="btn btn-primary" data-confirm>${t('pay.testConfirm')}</button><a href="${kind === 'membership' ? 'konto.html' : 'buchen.html'}" class="btn btn-ghost">${t('ui.cancel')}</a></div>`;
  icons(box);
  $('[data-confirm]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await api.demoPay(kind, ref); done(); } catch (err) { formError($('[data-err]'), err.message); e.target.disabled = false; }
  });
} else if (q.get('status') === 'ok') {
  done();
} else {
  box.innerHTML = `<h1 class="display h3" style="margin:0 0 14px">${t('pay.cancelTitle')}</h1><p class="muted" style="margin:0 auto 26px;max-width:40ch">${t('pay.cancelText')}</p>
    <a href="${kind === 'membership' ? 'konto.html' : 'buchen.html'}" class="btn btn-ghost">${t('ui.back')}</a>`;
}
