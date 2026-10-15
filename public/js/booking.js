import { gsap, $, $$, icons, toast, formError, esc, successSvg, userReady, scrollToEl } from './app.js';
import { SLOTS, SLOT_PRICE, EXTENSION, STAFF, SERVICES, UPGRADES, MEMBER, STUDIO } from './config.js';
import { api } from './api.js';
import { ymd, parseYmd, euro, hourLabel, daysAhead, sessionRange, sessionSlots, sessionHours, sessionLabel, validateSession, priceSession, priceCart, pad, SLOT_IDS, startedSlots } from './pricing.js';

const CART_KEY = 'room5.cart.v2';
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const fmtDate = (s, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => parseYmd(s).toLocaleDateString('de-DE', opts);
const uid = () => Math.random().toString(36).slice(2, 9);
const startSlots = (() => { const q = new URLSearchParams(location.search).get('slot'); return q === 'both' ? ['day', 'night'] : SLOTS[q] ? [q] : ['night']; })();
const emptyDraft = () => ({ slots: [], extra: 0, staff: {}, services: {}, upgrades: [] });
const scrollTo = (el, offset = -100) => scrollToEl(el, offset);

const today = new Date();
const state = {
  month: new Date(today.getFullYear(), today.getMonth(), 1),
  selected: null,
  editing: null,         // uid eines Warenkorb-Eintrags
  draft: emptyDraft(),
  repeat: 1,
  cart: [],
  booked: {},            // { 'YYYY-MM-DD': ['day', 'night'] }
  user: null,
  mode: 'book',
};
try { state.cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { state.cart = []; }
const isMember = () => ['member', 'admin'].includes(state.user?.role);
const windowDays = () => (isMember() ? MEMBER.windowMember : MEMBER.windowPublic);
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} };

// Belegte Sessions eines Tages (Server + eigene Auswahl, optional ohne bestimmten Eintrag)
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
  $('[data-month-label]').textContent = `${MONTHS[m.getMonth()]} ${m.getFullYear()}`;
  const first = (m.getDay() + 6) % 7;
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  let html = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += '<div class="day empty"></div>';
  for (let d = 1; d <= days; d++) {
    const date = ymd(new Date(m.getFullYear(), m.getMonth(), d));
    const ahead = daysAhead(date);
    const past = ahead < 0;
    const locked = !past && ahead > windowDays() && ahead <= MEMBER.windowMember;
    const out = ahead > MEMBER.windowMember;
    const booked = bookedSet(date), mine = cartSet(date);
    const full = !past && !locked && !out && SLOT_IDS.every((id) => booked.has(id));
    const bar = SLOT_IDS.map((id) => `<i class="${mine.has(id) ? 's' : booked.has(id) ? 'b' : ''}"></i>`).join('');
    const cls = ['day', date === state.selected && 'is-selected', mine.size && 'in-cart', ahead === 0 && 'is-today', full && 'full', locked && 'locked'].filter(Boolean).join(' ');
    const label = `${fmtDate(date)}${full ? ', ausgebucht' : locked ? ', nur für Members' : ''}`;
    html += `<button class="${cls}" data-date="${date}" ${past || out || full ? 'disabled' : ''} aria-label="${label}" aria-pressed="${date === state.selected}">
      <span class="d">${d}</span>${locked ? '<i data-lucide="lock-keyhole" class="lk"></i>' : ''}<span class="bar">${bar}</span></button>`;
  }
  const cal = $('[data-cal]');
  cal.innerHTML = html;
  icons(cal);
  const min = new Date(today.getFullYear(), today.getMonth(), 1);
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MEMBER.windowMember);
  $('[data-month="-1"]').disabled = m <= min;
  $('[data-month="1"]').disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > max;
}

$$('[data-month]').forEach((b) => b.addEventListener('click', () => {
  const dir = Number(b.dataset.month);
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + dir, 1);
  renderCalendar();
  gsap.fromTo('[data-cal]', { opacity: 0, x: dir * 16 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
}));

$('[data-cal]').addEventListener('click', (e) => {
  const btn = e.target.closest('.day[data-date]');
  if (!btn || btn.disabled) return;
  if (btn.classList.contains('locked')) { toast(`Mehr als ${MEMBER.windowPublic} Tage im Voraus buchen nur Members.`, 'lock-keyhole'); return; }
  openEditor(btn.dataset.date);
});

// ---------------- Session-Editor ----------------
function openEditor(date, item = null) {
  state.selected = date;
  state.editing = item?.uid || null;
  state.repeat = 1;
  if (item) state.draft = JSON.parse(JSON.stringify(item));
  else {
    const taken = takenSet(date);
    const pref = startSlots.filter((id) => !taken.has(id));
    state.draft = { ...emptyDraft(), slots: pref.length ? pref : SLOT_IDS.filter((id) => !taken.has(id)).slice(0, 1) };
  }
  const ed = $('[data-editor]');
  const wasHidden = ed.hidden;
  ed.hidden = false;
  $('[data-editor-date]').textContent = fmtDate(date);
  $('[data-editor-mode]').textContent = item ? 'Buchung bearbeiten' : 'Neue Buchung';
  $('[data-add] span').textContent = item ? 'Änderungen übernehmen' : 'Zur Auswahl hinzufügen';
  $('[data-repeat-row]').hidden = !!item;
  renderCalendar();
  renderEditor();
  syncCartbar();
  if (wasHidden) gsap.fromTo(ed, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
  requestAnimationFrame(() => scrollTo(ed));
}

function closeEditor() {
  state.selected = null; state.editing = null;
  $('[data-editor]').hidden = true;
  renderCalendar();
  syncCartbar();
}
$('[data-editor-close]').addEventListener('click', closeEditor);

function renderEditor() {
  const d = state.draft;
  const taken = takenSet(state.selected, state.editing);
  $('[data-slots]').innerHTML = SLOT_IDS.map((id) => {
    const sl = SLOTS[id]; const on = d.slots.includes(id); const busy = taken.has(id);
    return `<button type="button" class="slot-card ${on ? 'is-on' : ''}" data-slot="${id}" ${busy ? 'disabled' : ''} aria-pressed="${on}">
      <span class="sc-top"><i data-lucide="${busy ? 'ban' : on ? 'check' : sl.icon}"></i><span class="mono">${busy ? 'belegt' : on ? 'gewählt' : 'frei'}</span></span>
      <b>${sl.label}</b><span class="sc-time">${hourLabel(sl.from)} – ${hourLabel(sl.to)}</span>
      <span class="sc-price">${euro(SLOT_PRICE)} · 6 Stunden</span></button>`;
  }).join('');

  const night = d.slots.includes('night');
  if (!night) d.extra = 0;
  $('[data-extension]').innerHTML = `<div class="extension ${night ? '' : 'is-off'}">
    <i data-lucide="moon-star"></i>
    <div style="flex:1;min-width:200px"><b>Verlängerung nach 0 Uhr</b>
      <div class="muted" style="font-size:14px">${night ? `Im Stundentakt, je ${euro(EXTENSION.pricePerHour)}.${d.extra ? ` Session endet um ${hourLabel(24 + d.extra)}.` : ''}` : 'Nur im Anschluss an die Night Session möglich.'}</div></div>
    <div class="stepper"><button type="button" data-extra="-1" aria-label="weniger" ${night ? '' : 'disabled'}><i data-lucide="minus"></i></button><output>+${d.extra} h</output><button type="button" data-extra="1" aria-label="mehr" ${night ? '' : 'disabled'}><i data-lucide="plus"></i></button></div>
  </div>`;

  const hours = sessionHours(d);
  $('[data-staff]').innerHTML = STAFF.map((s) => {
    const v = Math.min(Number(d.staff[s.id] || 0), hours);
    return `<div class="addon ${v ? 'is-on' : ''}"><span class="a-ico"><i data-lucide="${s.icon}"></i></span><div style="flex:1">
      <b>${s.label}</b><small>${s.desc}</small><span class="a-price">${euro(s.price)} / Stunde</span>
      <div class="stepper"><button type="button" data-staff-id="${s.id}" data-d="-1" aria-label="weniger"><i data-lucide="minus"></i></button><output>${v} h</output><button type="button" data-staff-id="${s.id}" data-d="1" aria-label="mehr"><i data-lucide="plus"></i></button></div>
      ${hours ? `<button type="button" class="mono muted" style="font-size:11px;margin-left:8px" data-staff-id="${s.id}" data-all="${hours}">ganze Session</button>` : ''}
    </div></div>`;
  }).join('');
  $('[data-services]').innerHTML = SERVICES.map((s) => {
    const v = Number(d.services[s.id] || 0);
    return `<div class="addon ${v ? 'is-on' : ''}"><span class="a-ico"><i data-lucide="${s.icon}"></i></span><div style="flex:1">
      <b>${s.label}</b><small>${s.desc}</small><span class="a-price">${euro(s.price)} / ${s.unit}</span>
      <div class="stepper"><button type="button" data-svc-id="${s.id}" data-d="-1" aria-label="weniger"><i data-lucide="minus"></i></button><output>${v}×</output><button type="button" data-svc-id="${s.id}" data-d="1" aria-label="mehr"><i data-lucide="plus"></i></button></div>
    </div></div>`;
  }).join('');
  $('[data-upgrades]').innerHTML = UPGRADES.map((u) => {
    const on = d.upgrades.includes(u.id);
    return `<label class="addon ${on ? 'is-on' : ''}"><input type="checkbox" data-up="${u.id}" ${on ? 'checked' : ''}><span class="a-ico"><i data-lucide="${on ? 'check' : u.icon}"></i></span>
      <div><b>${u.label}</b><small>${u.desc}</small><span class="a-price">+ ${euro(u.price)}</span></div></label>`;
  }).join('');

  $('[data-repeat-val]').textContent = `${state.repeat}×`;
  const valid = d.slots.length > 0;
  $('[data-draft-sum]').textContent = euro(valid ? priceSession(d, isMember()).total * state.repeat : 0);
  $('[data-draft-sum]').previousElementSibling.textContent = state.repeat > 1 ? `${state.repeat} Termine` : 'Diese Buchung';
  $('[data-add]').disabled = !valid;
  formError($('[data-editor-error]'), '');
  icons($('[data-editor]'));
}

$('[data-editor]').addEventListener('click', (e) => {
  const d = state.draft;
  const t = e.target.closest('button, input');
  if (!t || t.disabled) return;
  if (t.dataset.slot) { const id = t.dataset.slot; d.slots = d.slots.includes(id) ? d.slots.filter((x) => x !== id) : SLOT_IDS.filter((x) => x === id || d.slots.includes(x)); }
  else if (t.dataset.extra) d.extra = Math.max(0, Math.min(EXTENSION.maxHours, Number(d.extra || 0) + Number(t.dataset.extra)));
  else if (t.dataset.staffId) {
    const max = sessionHours(d);
    const v = t.dataset.all ? Number(t.dataset.all) : Number(d.staff[t.dataset.staffId] || 0) + Number(t.dataset.d);
    d.staff[t.dataset.staffId] = Math.max(0, Math.min(max, v));
  }
  else if (t.dataset.svcId) d.services[t.dataset.svcId] = Math.max(0, Math.min(20, Number(d.services[t.dataset.svcId] || 0) + Number(t.dataset.d)));
  else if (t.dataset.up) { d.upgrades = t.checked ? [...new Set([...d.upgrades, t.dataset.up])] : d.upgrades.filter((x) => x !== t.dataset.up); }
  else if (t.dataset.repeat) state.repeat = Math.max(1, Math.min(8, state.repeat + Number(t.dataset.repeat)));
  else return;
  renderEditor();
});

$('[data-add]').addEventListener('click', () => {
  const base = JSON.parse(JSON.stringify({ ...state.draft, date: state.selected }));
  const toAdd = [], skipped = [];
  for (let i = 0; i < state.repeat; i++) {
    const dt = parseYmd(state.selected); dt.setDate(dt.getDate() + i * 7);
    const s = { ...base, date: ymd(dt), uid: state.editing && i === 0 ? state.editing : uid() };
    const err = validateSession(s, { booked: [...takenSet(s.date, state.editing)], isMember: isMember() });
    if (err) { if (i === 0) { formError($('[data-editor-error]'), err); return; } skipped.push(fmtDate(s.date, { day: 'numeric', month: 'short' })); continue; }
    toAdd.push(s);
  }
  if (state.editing) state.cart = state.cart.map((c) => (c.uid === state.editing ? toAdd[0] : c));
  else state.cart.push(...toAdd);
  state.cart.sort((a, b) => (a.date + pad(sessionRange(a)[0])).localeCompare(b.date + pad(sessionRange(b)[0])));
  saveCart();
  toast(state.editing ? 'Buchung aktualisiert' : `${toAdd.length} Termin${toAdd.length > 1 ? 'e' : ''} hinzugefügt${skipped.length ? ` · nicht verfügbar: ${skipped.join(', ')}` : ''}`, 'calendar-check');
  closeEditor();
  renderCart(true);
  scrollTo(innerWidth <= 1100 ? '.cart' : '.booking-layout', -90);
});

// ---------------- Mobile Warenkorb-Leiste ----------------
const cartbar = $('[data-cartbar]');
let cartInView = false;
new IntersectionObserver(([e]) => { cartInView = e.isIntersecting; syncCartbar(); }, { threshold: 0.15 }).observe($('.cart'));
function syncCartbar() {
  const n = state.cart.length;
  const show = n > 0 && $('[data-editor]').hidden && !$('[data-step="1"]').hidden && !cartInView;
  cartbar.classList.toggle('is-visible', show);
  document.body.classList.toggle('has-cartbar', show);
  if (!n) return;
  $('[data-cartbar-total]').textContent = euro(priceCart(state.cart, isMember()).total);
  $('[data-cartbar-count]').textContent = `${n} Termin${n === 1 ? '' : 'e'} ausgewählt`;
}

// ---------------- Warenkorb ----------------
function renderCart(pulse = false) {
  const box = $('[data-cart]');
  const n = state.cart.length;
  $('[data-cart-count]').textContent = `${n} Termin${n === 1 ? '' : 'e'}`;
  if (!n) {
    box.innerHTML = `<div class="cart-empty"><i data-lucide="calendar-plus-2"></i><p>Noch nichts ausgewählt.<br>Wähle einen Tag im Kalender.</p></div>`;
    icons(box); syncStepButtons(); syncCartbar(); return;
  }
  const member = isMember();
  const sum = priceCart(state.cart, member);
  const would = priceCart(state.cart, true);
  box.innerHTML = `
    <div class="cart-items">${state.cart.map((c, i) => {
      const p = sum.items[i]; const [a, z] = sessionRange(c);
      return `<div class="cart-item" data-uid="${c.uid}">
        <div class="ci-top"><div><div class="ci-date">${fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div class="ci-time">${hourLabel(a)} – ${hourLabel(z)} · ${sessionLabel(c)}</div></div>
          <div class="ci-actions"><button data-edit="${c.uid}" aria-label="Bearbeiten"><i data-lucide="pencil"></i></button><button data-remove="${c.uid}" aria-label="Entfernen"><i data-lucide="trash-2"></i></button></div></div>
        <div class="ci-lines">${p.lines.map((l) => `<div><span>${esc(l.label)}</span><span>${euro(l.amount)}</span></div>`).join('')}</div>
      </div>`;
    }).join('')}</div>
    <div class="cart-total">
      <div class="row-t"><span>${sum.hours} Stunden gesamt</span><span>${n} Termin${n === 1 ? '' : 'e'}</span></div>
      ${sum.discount ? `<div class="row-t" style="color:var(--amber)"><span>Member-Rabatt</span><span>− ${euro(sum.discount)}</span></div>` : ''}
      <div class="grand"><span class="label">Gesamt</span><b data-total>${euro(sum.total)}</b></div>
      <span class="muted" style="font-size:12px">inkl. MwSt. · Zahlung vor Ort oder per Rechnung</span>
    </div>
    ${!member ? `<div class="member-hint"><i data-lucide="sparkles"></i><span>Als Member würdest du hier <b>${euro(sum.total - would.total)}</b> sparen und bis zu ${MEMBER.windowMember} Tage im Voraus buchen. <a href="membership.html" style="text-decoration:underline">Mehr erfahren</a></span></div>` : `<div class="member-hint"><i data-lucide="badge-check"></i><span>Member-Konditionen aktiv · ${esc(state.user.name)}</span></div>`}
    <button class="btn btn-primary btn-block" style="margin-top:18px" data-goto="2" ${$('[data-step="1"]').hidden ? 'hidden' : ''}>Weiter zu deinen Daten <i data-lucide="arrow-right"></i></button>`;
  icons(box);
  if (pulse) gsap.fromTo('[data-total]', { color: '#ff4a1c' }, { color: '#efe7da', duration: 0.8 });
  syncStepButtons();
  syncCartbar();
}

$('[data-cart]').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-edit]'); const rm = e.target.closest('[data-remove]');
  if (ed) { const item = state.cart.find((c) => c.uid === ed.dataset.edit); goto(1); openEditor(item.date, item); }
  if (rm) {
    const el = rm.closest('.cart-item');
    gsap.to(el, { x: 30, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
      state.cart = state.cart.filter((c) => c.uid !== rm.dataset.remove); saveCart(); renderCart(); renderCalendar();
    } });
  }
});

// ---------------- Schritte ----------------
function syncStepButtons() {
  $$('.booking-steps [data-goto]').forEach((b) => { if (b.dataset.goto === '2') b.disabled = !state.cart.length; });
}
function goto(step) {
  step = Number(step);
  if (step === 2 && !state.cart.length) { toast('Wähle zuerst mindestens einen Termin.', 'calendar-x-2'); return; }
  $$('[data-step]').forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
  $$('.booking-steps button').forEach((b) => {
    const n = Number(b.dataset.goto);
    b.classList.toggle('is-active', n === step); b.classList.toggle('is-done', n < step);
    if (step === 3) b.disabled = true;
  });
  gsap.fromTo(`[data-step="${step}"]`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
  renderCart();
  scrollTo('.booking-layout', -110);
}
document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g && !g.disabled) goto(g.dataset.goto); });

$$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  $$('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
  $('[data-submit] span').textContent = state.mode === 'book' ? 'Jetzt verbindlich buchen' : 'Anfrage senden';
}));

// Checkout
const form = $('[data-checkout]');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(form));
  $$('.field', form).forEach((f) => f.classList.remove('invalid'));
  const bad = [];
  if (!fd.name?.trim()) bad.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email || '')) bad.push('email');
  bad.forEach((n) => form.elements[n].closest('.field').classList.add('invalid'));
  if (bad.length) return formError($('[data-checkout-error]'), 'Bitte Name und eine gültige E-Mail angeben.');
  if (!fd.terms) return formError($('[data-checkout-error]'), 'Bitte akzeptiere die Studioregeln.');
  formError($('[data-checkout-error]'), '');
  const btn = $('[data-submit]'); btn.disabled = true; btn.querySelector('span').textContent = 'Wird gesendet …';
  try {
    const { booking } = await api.book({ mode: state.mode, sessions: state.cart, contact: fd });
    state.cart = []; saveCart();
    showSuccess(booking);
    await loadAvailability(); renderCalendar(); renderCart();
  } catch (err) {
    formError($('[data-checkout-error]'), err.message);
  } finally {
    btn.disabled = false; btn.querySelector('span').textContent = state.mode === 'book' ? 'Jetzt verbindlich buchen' : 'Anfrage senden';
  }
});

function ics(booking) {
  const stamp = (date, h) => { const d = parseYmd(date); d.setHours(h); return `${ymd(d).replace(/-/g, '')}T${pad(d.getHours())}0000`; };
  const ev = booking.sessions.map((s, i) => {
    const [a, z] = sessionRange(s);
    return ['BEGIN:VEVENT', `UID:${booking.id}-${i}@room5`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${stamp(s.date, a)}`, `DTEND:${stamp(s.date, z)}`,
      `SUMMARY:${booking.status === 'confirmed' ? '' : '[Angefragt] '}Room 5 · ${sessionLabel(s)}`, `LOCATION:${STUDIO.house} · ${STUDIO.name}`, `DESCRIPTION:Buchung ${booking.id}`, 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Room5 Bunkerwest//DE', ...ev, 'END:VCALENDAR'].join('\r\n');
}

function showSuccess(b) {
  const confirmed = b.status === 'confirmed';
  const url = URL.createObjectURL(new Blob([ics(b)], { type: 'text/calendar' }));
  $('[data-success]').innerHTML = `${successSvg}
    <span class="eyebrow plain mono">${confirmed ? 'Gebucht' : 'Anfrage erhalten'} · ${esc(b.id)}</span>
    <h2 class="display h3" style="margin:18px 0 14px">${confirmed ? 'Die Session<br>gehört dir.' : 'Wir melden<br>uns gleich.'}</h2>
    <p class="muted" style="max-width:44ch;margin:0 auto 26px">${confirmed ? `Bestätigung geht an <b>${esc(b.contact.email)}</b>. Wir sehen uns im Bunkerwest.` : `Deine Anfrage ist bei uns. Antwort innerhalb von 24 Stunden an <b>${esc(b.contact.email)}</b>.`}</p>
    <div style="max-width:440px;margin:0 auto 30px;text-align:left">${b.sessions.map((s) => { const [a, z] = sessionRange(s); return `<div class="row" style="justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)"><span>${fmtDate(s.date)}</span><span class="mono muted">${hourLabel(a)}–${hourLabel(z)}</span></div>`; }).join('')}
      <div class="row" style="justify-content:space-between;padding:14px 0"><span class="label">Gesamt</span><b class="h4">${euro(b.total)}</b></div></div>
    <div class="row" style="justify-content:center">
      <a class="btn btn-primary" href="${url}" download="room5-${b.id}.ics"><i data-lucide="calendar-plus"></i>In Kalender eintragen</a>
      <button class="btn btn-ghost" data-goto="1">Weitere Session buchen</button>
    </div>`;
  goto(3);
  icons($('[data-success]'));
}

// ---------------- Laden ----------------
async function loadAvailability() {
  const from = ymd(today); const to = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + MEMBER.windowMember + 1));
  try { state.booked = (await api.availability(from, to)).booked || {}; } catch { state.booked = {}; }
}

(async function init() {
  state.user = await userReady;
  if (state.user) { form.elements.name.value = state.user.name || ''; form.elements.email.value = state.user.email || ''; }
  await loadAvailability();
  const before = state.cart.length;
  state.cart = state.cart.filter((c) => c.slots && !validateSession(c, { booked: state.booked[c.date] || [], isMember: isMember() }));
  if (state.cart.length < before) { saveCart(); toast('Einige gespeicherte Termine sind nicht mehr verfügbar und wurden entfernt.', 'info'); }
  renderCalendar(); renderCart();
})();
