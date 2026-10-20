import { gsap, $, $$, icons, toast, formError, esc, successSvg, userReady, scrollToEl, t, L, lang, isArtist, captcha } from './app.js';
import { SLOTS, ADDONS, MEMBERSHIP } from './config.js';
import { api } from './api.js';
import { ymd, parseYmd, euro, timeLabel, daysAhead, sessionRange, sessionSlots, sessionHours, sessionLabel, validateSession, priceSession, priceCart, artistSavings, roomPrice, pad, SLOT_IDS, startedSlots } from './pricing.js';
import { locale } from './i18n.js';

const CART_KEY = 'r5.cart.v3';
const fmtDate = (s, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => parseYmd(s).toLocaleDateString(locale, opts);
const uid = () => Math.random().toString(36).slice(2, 9);
const startSlots = (() => { const q = new URLSearchParams(location.search).get('slot'); return q === 'both' ? ['day', 'night'] : SLOTS[q] ? [q] : ['day']; })();
const emptyDraft = () => ({ slots: [], addons: {} });
const ERR = (code) => t(`err.${code}`);

const today = new Date();
const state = { month: new Date(today.getFullYear(), today.getMonth(), 1), selected: null, editing: null, draft: emptyDraft(), cart: [], booked: {}, user: null, artist: false, mode: 'request' };
try { state.cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { state.cart = []; }
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} };

const bookedSet = (date) => new Set([...(state.booked[date] || []), ...startedSlots(date)]);
function cartSet(date, exceptUid = null) {
  const set = new Set();
  for (const c of state.cart) if (c.date === date && c.uid !== exceptUid) sessionSlots(c).forEach((x) => set.add(x));
  return set;
}
const takenSet = (date, exceptUid = null) => new Set([...bookedSet(date), ...cartSet(date, exceptUid)]);

// ---------------- Kalender ----------------
function renderCalendar() {
  const m = state.month;
  $('[data-month-label]').textContent = m.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const first = (m.getDay() + 6) % 7;
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''));
  let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += '<div class="day empty"></div>';
  for (let d = 1; d <= days; d++) {
    const date = ymd(new Date(m.getFullYear(), m.getMonth(), d));
    const ahead = daysAhead(date);
    const off = ahead < 0 || ahead > MEMBERSHIP.bookingWindowDays;
    const booked = bookedSet(date), mine = cartSet(date);
    const full = !off && SLOT_IDS.every((id) => booked.has(id));
    const bar = SLOT_IDS.map((id) => `<i class="${mine.has(id) ? 's' : booked.has(id) ? 'b' : ''}"></i>`).join('');
    const cls = ['day', date === state.selected && 'is-selected', mine.size && 'in-cart', ahead === 0 && 'is-today', full && 'full'].filter(Boolean).join(' ');
    html += `<button class="${cls}" data-date="${date}" ${off || full ? 'disabled' : ''} aria-label="${fmtDate(date)}${full ? `, ${t('book.legend.taken')}` : ''}" aria-pressed="${date === state.selected}"><span class="d">${d}</span><span class="bar">${bar}</span></button>`;
  }
  $('[data-cal]').innerHTML = html;
  const min = new Date(today.getFullYear(), today.getMonth(), 1);
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MEMBERSHIP.bookingWindowDays);
  $('[data-month="-1"]').disabled = m <= min;
  $('[data-month="1"]').disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > max;
}

$$('[data-month]').forEach((b) => b.addEventListener('click', () => {
  const dir = Number(b.dataset.month);
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + dir, 1);
  renderCalendar();
  gsap.fromTo('[data-cal]', { opacity: 0, x: dir * 16 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
}));
$('[data-cal]').addEventListener('click', (e) => { const btn = e.target.closest('.day[data-date]'); if (btn && !btn.disabled) openEditor(btn.dataset.date); });

// ---------------- Editor ----------------
function openEditor(date, item = null) {
  state.selected = date; state.editing = item?.uid || null;
  if (item) state.draft = JSON.parse(JSON.stringify(item));
  else {
    const taken = takenSet(date);
    const pref = startSlots.filter((id) => !taken.has(id));
    state.draft = { ...emptyDraft(), slots: pref.length ? pref : SLOT_IDS.filter((id) => !taken.has(id)).slice(0, 1) };
  }
  const ed = $('[data-editor]'); const wasHidden = ed.hidden; ed.hidden = false;
  $('[data-editor-date]').textContent = fmtDate(date);
  $('[data-editor-mode]').textContent = item ? t('book.editing') : t('book.new');
  $('[data-add-label]').textContent = item ? t('book.apply') : t('book.add');
  renderCalendar(); renderEditor(); syncCartbar();
  if (wasHidden) gsap.fromTo(ed, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
  requestAnimationFrame(() => scrollToEl(ed, -100));
}
function closeEditor() { state.selected = null; state.editing = null; $('[data-editor]').hidden = true; renderCalendar(); syncCartbar(); }
$('[data-editor-close]').addEventListener('click', closeEditor);

const artistPrice = (n) => Math.round(n * (1 - MEMBERSHIP.artistDiscount) * 100) / 100;

function renderEditor() {
  const d = state.draft;
  const taken = takenSet(state.selected, state.editing);
  $('[data-slots]').innerHTML = SLOT_IDS.map((id) => {
    const sl = SLOTS[id]; const on = d.slots.includes(id); const busy = taken.has(id);
    const price = roomPrice({ slots: [id] });
    return `<button type="button" class="slot-card ${on ? 'is-on' : ''}" data-slot="${id}" ${busy ? 'disabled' : ''} aria-pressed="${on}">
      <span class="sc-top"><i data-lucide="${busy ? 'ban' : on ? 'check' : sl.icon}"></i><span class="mono">${busy ? t('book.legend.taken') : on ? t('book.chosen') : t('book.legend.free')}</span></span>
      <b>${L(sl.label)}</b><span class="sc-time">${timeLabel(sl.from)} – ${timeLabel(sl.to)}</span>
      <span class="sc-price">${state.artist ? `<s>${euro(price)}</s> <span class="gold">${euro(artistPrice(price))}</span>` : `${euro(price)} · <span class="gold">${t('book.artistPrice', { n: euro(artistPrice(price)) })}</span>`}</span></button>`;
  }).join('');
  const hours = sessionHours(d);
  $('[data-addons]').innerHTML = ADDONS.map((a) => {
    const v = Math.min(Number(d.addons[a.id] || 0), a.kind === 'hourly' ? hours : 20);
    const unit = a.kind === 'hourly' ? 'h' : '×';
    return `<div class="addon ${v ? 'is-on' : ''}"><span class="a-ico"><i data-lucide="${a.icon}"></i></span><div style="flex:1">
      <b>${L(a.label)}</b><small>${L(a.desc)}</small><span class="a-price">${euro(a.price)} / ${a.kind === 'hourly' ? t('unit.hour') : t('unit.track')}</span>
      <div class="stepper"><button type="button" data-addon="${a.id}" data-d="-1" aria-label="−"><i data-lucide="minus"></i></button><output>${v} ${unit}</output><button type="button" data-addon="${a.id}" data-d="1" aria-label="+"><i data-lucide="plus"></i></button></div>
      ${a.kind === 'hourly' && hours ? `<button type="button" class="mono muted" style="font-size:11px;margin-left:8px" data-addon="${a.id}" data-all="${hours}">${t('book.wholeSession')}</button>` : ''}
    </div></div>`;
  }).join('');
  const valid = d.slots.length > 0;
  const p = valid ? priceSession(d, state.artist, lang) : null;
  $('[data-draft-label]').textContent = t('book.thisSession');
  $('[data-draft-sum]').textContent = euro(p ? p.total : 0);
  $('[data-draft-artist]').innerHTML = valid && !state.artist ? `<span class="gold">${t('book.wouldSave', { n: euro(artistSavings([d])) })}</span>` : '';
  $('[data-add]').disabled = !valid;
  formError($('[data-editor-error]'), '');
  icons($('[data-editor]'));
}

$('[data-editor]').addEventListener('click', (e) => {
  const d = state.draft; const tg = e.target.closest('button'); if (!tg || tg.disabled) return;
  if (tg.dataset.slot) { const id = tg.dataset.slot; d.slots = d.slots.includes(id) ? d.slots.filter((x) => x !== id) : SLOT_IDS.filter((x) => x === id || d.slots.includes(x)); }
  else if (tg.dataset.addon) {
    const a = ADDONS.find((x) => x.id === tg.dataset.addon); const max = a.kind === 'hourly' ? sessionHours(d) : 20;
    const v = tg.dataset.all ? Number(tg.dataset.all) : Number(d.addons[a.id] || 0) + Number(tg.dataset.d);
    d.addons[a.id] = Math.max(0, Math.min(max, v));
  } else return;
  renderEditor();
});

$('[data-add]').addEventListener('click', () => {
  const s = { ...JSON.parse(JSON.stringify(state.draft)), date: state.selected, uid: state.editing || uid() };
  const err = validateSession(s, { booked: [...takenSet(s.date, state.editing)] });
  if (err) return formError($('[data-editor-error]'), ERR(err));
  if (state.editing) state.cart = state.cart.map((c) => (c.uid === state.editing ? s : c)); else state.cart.push(s);
  state.cart.sort((a, b) => (a.date + pad(sessionRange(a)[0])).localeCompare(b.date + pad(sessionRange(b)[0])));
  saveCart();
  toast(state.editing ? t('book.updated') : t('book.added'), 'calendar-check');
  closeEditor(); renderCart(true);
  scrollToEl(innerWidth <= 1100 ? '.cart' : '.booking-layout', -90);
});

// ---------------- Mobile-Leiste ----------------
const cartbar = $('[data-cartbar]'); let cartInView = false;
new IntersectionObserver(([e]) => { cartInView = e.isIntersecting; syncCartbar(); }, { threshold: 0.15 }).observe($('.cart'));
function syncCartbar() {
  const n = state.cart.length;
  const show = n > 0 && $('[data-editor]').hidden && !$('[data-step="1"]').hidden && !cartInView;
  cartbar.classList.toggle('is-visible', show); document.body.classList.toggle('has-cartbar', show);
  if (!n) return;
  $('[data-cartbar-total]').textContent = euro(priceCart(state.cart, state.artist).total);
  $('[data-cartbar-count]').textContent = t(n === 1 ? 'book.count1' : 'book.countN', { n });
}

// ---------------- Auswahl ----------------
function renderCart(pulse = false) {
  const box = $('[data-cart]'); const n = state.cart.length;
  $('[data-cart-count]').textContent = t(n === 1 ? 'book.count1' : 'book.countN', { n });
  if (!n) {
    box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar-plus-2"></i><p>${t('book.empty')}</p></div>`;
    icons(box); syncStepButtons(); syncCartbar(); return;
  }
  const sum = priceCart(state.cart, state.artist, lang);
  box.innerHTML = `
    <div class="cart-items">${state.cart.map((c, i) => {
      const p = sum.items[i]; const [a, z] = sessionRange(c);
      return `<div class="cart-item"><div class="ci-top"><div><div class="ci-date">${fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div class="ci-time">${timeLabel(a)} – ${timeLabel(z)} · ${sessionLabel(c, lang)}</div></div>
          <div class="ci-actions"><button data-edit="${c.uid}" aria-label="${t('ui.edit')}"><i data-lucide="pencil"></i></button><button data-remove="${c.uid}" aria-label="${t('ui.remove')}"><i data-lucide="trash-2"></i></button></div></div>
        <div class="ci-lines">${p.lines.map((l) => `<div><span>${esc(l.label)}${l.note ? ` <s>${euro(l.note)}</s>` : ''}</span><span>${euro(l.amount)}</span></div>`).join('')}</div></div>`;
    }).join('')}</div>
    <div class="cart-total">
      <div class="row-t"><span>${t('book.hoursTotal', { n: sum.hours })}</span><span>${t(n === 1 ? 'book.count1' : 'book.countN', { n })}</span></div>
      ${sum.discount ? `<div class="row-t gold"><span>${t('book.artistDiscount')}</span><span>− ${euro(sum.discount)}</span></div>` : ''}
      <div class="grand"><span class="label">${t('book.total')}</span><b data-total>${euro(sum.total)}</b></div>
      <span class="muted" style="font-size:12px">${state.artist ? t('book.vatPay') : t('book.vatRequest')}</span>
    </div>
    ${!state.artist ? `<div class="member-hint gold-hint"><i data-lucide="sparkles"></i><span>${t('book.artistHint', { n: euro(artistSavings(state.cart)) })} <a href="membership.html#artist">${t('book.learnMore')}</a></span></div>` : `<div class="member-hint gold-hint"><i data-lucide="badge-check"></i><span>${t('book.artistActive')}</span></div>`}
    <button class="btn btn-primary btn-block" style="margin-top:18px" data-goto="2" ${$('[data-step="1"]').hidden ? 'hidden' : ''}>${t('book.continue')} <i data-lucide="arrow-right"></i></button>`;
  icons(box);
  if (pulse) { const tt = $('[data-total]'); tt.classList.remove('flash'); void tt.offsetWidth; tt.classList.add('flash'); }
  syncStepButtons(); syncCartbar();
}
$('[data-cart]').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-edit]'); const rm = e.target.closest('[data-remove]');
  if (ed) { const item = state.cart.find((c) => c.uid === ed.dataset.edit); goto(1); openEditor(item.date, item); }
  if (rm) {
    gsap.to(rm.closest('.cart-item'), { x: 30, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
      state.cart = state.cart.filter((c) => c.uid !== rm.dataset.remove); saveCart(); renderCart(); renderCalendar();
    } });
  }
});

// ---------------- Schritte ----------------
function syncStepButtons() { $$('.booking-steps [data-goto]').forEach((b) => { if (b.dataset.goto === '2') b.disabled = !state.cart.length; }); }
function goto(step) {
  step = Number(step);
  if (step === 2 && !state.cart.length) { toast(t('book.pickFirst'), 'calendar-x-2'); return; }
  $$('[data-step]').forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
  $$('.booking-steps button').forEach((b) => { const n = Number(b.dataset.goto); b.classList.toggle('is-active', n === step); b.classList.toggle('is-done', n < step); if (step === 3) b.disabled = true; });
  gsap.fromTo(`[data-step="${step}"]`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
  if (step === 2) renderMode();
  renderCart(); scrollToEl('.booking-layout', -110);
}
document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g && !g.disabled) goto(g.dataset.goto); });

// Anfrage vs. Direktbuchung
function renderMode() {
  $('[data-mode="book"]').classList.toggle('is-locked', !state.artist);
  $('[data-mode-book-title]').classList.toggle('strike-gold', !state.artist);
  $('[data-mode-book-sub]').textContent = state.artist ? t('book.mode.bookSub') : t('book.mode.locked');
  $$('[data-mode]').forEach((b) => b.classList.toggle('is-active', b.dataset.mode === state.mode));
  $$('[data-guest-only]').forEach((f) => (f.hidden = !!state.user));
  const hint = $('[data-artist-hint]');
  hint.hidden = state.artist;
  if (!state.artist) { hint.innerHTML = `<i data-lucide="lock-keyhole"></i><span>${t('book.lockedHint', { n: euro(artistSavings(state.cart)) })} <a href="membership.html#artist">${t('book.learnMore')}</a></span>`; icons(hint); }
  $('[data-submit] span').textContent = state.mode === 'book' ? t('book.payNow', { n: euro(priceCart(state.cart, true).total) }) : t('book.sendRequest');
}
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.mode === 'book' && !state.artist) { toast(t('book.mode.locked'), 'lock-keyhole'); return; }
  state.mode = b.dataset.mode; renderMode();
}));

// Abschicken
const form = $('[data-checkout]');
let getCaptcha = () => null;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(form));
  $$('.field', form).forEach((f) => f.classList.remove('invalid'));
  if (!state.user) {
    const bad = [];
    if (!fd.name?.trim()) bad.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email || '')) bad.push('email');
    bad.forEach((n) => form.elements[n].closest('.field').classList.add('invalid'));
    if (bad.length) return formError($('[data-checkout-error]'), ERR('name_email'));
  }
  if (!fd.terms) return formError($('[data-checkout-error]'), t('book.acceptTerms'));
  formError($('[data-checkout-error]'), '');
  const btn = $('[data-submit]'); btn.disabled = true;
  const sessions = state.cart.map(({ uid: _u, ...s }) => s);
  try {
    if (state.mode === 'book' && state.artist) {
      const { url } = await api.checkout({ sessions, phone: fd.phone, project: fd.project, notes: fd.notes });
      state.cart = []; saveCart();
      location.href = url;
      return;
    }
    await api.request({ type: 'studio', name: fd.name, email: fd.email, phone: fd.phone, company: fd.project, message: fd.notes, sessions, fields: { project: fd.project }, captcha: getCaptcha() });
    state.cart = []; saveCart();
    showSuccess(sessions, fd.email || state.user?.email);
  } catch (err) {
    formError($('[data-checkout-error]'), err.code ? ERR(err.code) : err.message);
  } finally { btn.disabled = false; }
});

function showSuccess(sessions, email) {
  const total = priceCart(sessions, false).total;
  $('[data-success]').innerHTML = `${successSvg}
    <span class="eyebrow plain mono">${t('book.success.eyebrow')}</span>
    <h2 class="display h3" style="margin:18px 0 14px">${t('book.success.title')}</h2>
    <p class="muted" style="max-width:44ch;margin:0 auto 26px">${t('book.success.text', { email: esc(email) })}</p>
    <div style="max-width:440px;margin:0 auto 30px;text-align:left">${sessions.map((s) => { const [a, z] = sessionRange(s); return `<div class="row" style="justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)"><span>${fmtDate(s.date)}</span><span class="mono muted">${timeLabel(a)}–${timeLabel(z)}</span></div>`; }).join('')}
      <div class="row" style="justify-content:space-between;padding:14px 0"><span class="label">${t('book.estimate')}</span><b class="h4">${euro(total)}</b></div></div>
    ${!state.artist ? `<div class="member-hint gold-hint" style="max-width:440px;margin:0 auto 24px;text-align:left"><i data-lucide="sparkles"></i><span>${t('book.artistHint', { n: euro(artistSavings(sessions)) })} <a href="membership.html#artist">${t('book.learnMore')}</a></span></div>` : ''}
    <button class="btn btn-ghost" data-goto="1">${t('book.another')}</button>`;
  goto(3); icons($('[data-success]'));
  loadAvailability().then(() => { renderCalendar(); renderCart(); });
}

async function loadAvailability() {
  const from = ymd(today); const to = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + MEMBERSHIP.bookingWindowDays + 1));
  try { state.booked = (await api.availability(from, to)).booked || {}; } catch { state.booked = {}; }
}

(async function init() {
  state.user = await userReady;
  state.artist = isArtist(state.user);
  state.mode = state.artist ? 'book' : 'request';
  if (state.artist) $('[data-i18n-html="book.title"]').innerHTML = t('book.titleArtist');
  getCaptcha = await captcha($('[data-captcha]'));
  await loadAvailability();
  const before = state.cart.length;
  state.cart = state.cart.filter((c) => c.slots && !validateSession(c, { booked: [...bookedSet(c.date)] }));
  if (state.cart.length < before) { saveCart(); toast(t('book.removedOld'), 'info'); }
  renderCalendar(); renderCart();
})();
