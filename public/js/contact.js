import { gsap, $, $$, icons, formError, esc, successSvg, reduced, userReady, t, L, captcha } from './app.js';
import { STUDIO, REQUEST_TYPES, SPACES, SPACE_EXTRAS, SPACE_REQUEST_TYPES, FEATURES } from './config.js';
import { api } from './api.js';

$('[data-contact-info]').innerHTML = [
  ['mail', t('contact.email'), STUDIO.email, `mailto:${STUDIO.email}`],
  ['phone', t('contact.phone'), STUDIO.phone, `tel:${STUDIO.phone.replace(/\s/g, '')}`],
  ['map-pin', t('contact.address'), `${STUDIO.street}<br>${STUDIO.city}`, null],
  ['at-sign', 'Instagram', STUDIO.instagramHandle, STUDIO.instagram],
].map(([i, l, v, href]) => {
  const inner = `<span class="ci-ico"><i data-lucide="${i}"></i></span><div><small>${l}</small>${v}</div>`;
  return href ? `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>` : `<div class="ci">${inner}</div>`;
}).join('');

// Arten aus der Konfiguration
const form = $('[data-contact]');
$('[data-types]').innerHTML = REQUEST_TYPES.map((r, i) => `<label class="chip"><input type="radio" name="type" value="${r.id}" ${i === 0 ? 'checked' : ''}><span><i data-lucide="${r.icon}"></i>${L(r.label)}</span></label>`).join('');

// Zusatzfelder je nach Art
const EXTRA = {
  studio: [['date', 'date', t('contact.f.date')], ['slot', ['', '1 h', '3 h', '6 h · Day 12–18', '6 h · Night 18:30–00:30', 'Day + Night (12 h)'], t('contact.f.slot')]],
  membership: [],
  event: [['eventType', 'text', t('contact.f.eventType')], ['guests', 'number', t('contact.f.guests')], ['duration', 'text', t('contact.f.duration')]],
  location: [['shootType', ['', 'Foto', 'Video / Musikvideo', 'Content / Social', 'Film'], t('contact.f.shootType')], ['crew', 'number', t('contact.f.crew')], ['duration', 'text', t('contact.f.duration')]],
  kooperation: [['website', 'url', 'Website'], ['idea', 'text', t('contact.f.idea')]],
  presse: [['medium', 'text', t('contact.f.medium')], ['deadline', 'date', 'Deadline']],
  sonstiges: [],
};
const HINT = {
  studio: `${t('contact.hint.studio')} <a href="buchen.html">${t('contact.hint.studioLink')}</a>`,
  event: t('contact.hint.event'),
  location: t('contact.hint.location'),
};
function renderExtra() {
  const type = form.elements.type.value;
  $('[data-extra-fields]').innerHTML = (EXTRA[type] || []).map(([name, kind, label]) => `<div class="field"><label for="x-${name}">${label}</label>${Array.isArray(kind)
    ? `<select id="x-${name}" name="x_${name}">${kind.map((o) => `<option value="${o}">${o || '–'}</option>`).join('')}</select>`
    : `<input id="x-${name}" name="x_${name}" type="${kind}" ${kind === 'number' ? 'min="1"' : ''}>`}</div>`).join('');
  renderSpaces(type);
  renderMembership(type);
  const hint = $('[data-type-hint]'); hint.hidden = !HINT[type]; hint.innerHTML = HINT[type] ? `<i data-lucide="info"></i><span>${HINT[type]}</span>` : '';
  icons(form);
}
// Membership: Artist-Bewerbung direkt hier (läuft über /applications → Admin „Bewerbungen“)
const ROLES = ['Artist', 'Producer', 'Instrumentalist', 'Engineer', 'Songwriter'];
const USAGE = [['monatlich', t('mem.usage1')], ['wöchentlich', t('mem.usage2')], ['mehrmals pro Woche', t('mem.usage3')]];
let tier = (new URLSearchParams(location.search).get('tier') || 'artist').toLowerCase() === 'community' ? 'community' : 'artist';
let currentUser = null;
function renderMembership(type) {
  const box = $('[data-member-block]');
  box.hidden = type !== 'membership'; if (box.hidden) { box.innerHTML = ''; return; }
  const guest = !currentUser;
  box.innerHTML = `<div class="field"><span class="label">${t('contact.f.tier')}</span><div class="chips" style="margin-top:4px">
      <label class="chip"><input type="radio" name="tier" value="artist" ${tier === 'artist' ? 'checked' : ''}><span><i data-lucide="badge-check"></i>Artist · ${t('contact.m.apply')}</span></label>
      <label class="chip"><input type="radio" name="tier" value="community" ${tier === 'community' ? 'checked' : ''}><span><i data-lucide="users-round"></i>Community · ${t('contact.m.free')}</span></label></div></div>
    ${tier === 'community' ? `<div class="alert info"><i data-lucide="info"></i><span>${t('contact.m.communityHint')} <a href="login.html?tab=register">${t('home.community.join')}</a></span></div>` : `
    <div class="form-grid">
      <div class="field"><label for="m-role">${t('mem.whatDo')}</label><select id="m-role" name="m_role">${ROLES.map((r) => `<option>${r}</option>`).join('')}</select></div>
      <div class="field"><label for="m-usage">${t('mem.usage')}</label><select id="m-usage" name="m_usage">${USAGE.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="m-genres">${t('mem.genres')}</label><input id="m-genres" name="m_genres" placeholder="${t('mem.genresPh')}"></div>
      <div class="field"><label for="m-ref">${t('mem.referral')}</label><input id="m-ref" name="m_referral"></div>
    </div>
    <div class="field"><label for="m-links">${t('mem.links')}</label><textarea id="m-links" name="m_links" style="min-height:80px" placeholder="Spotify, SoundCloud, Instagram, YouTube …"></textarea></div>
    ${guest ? `<div class="field"><label for="m-pw">${t('mem.pw')}</label><input id="m-pw" name="m_password" type="password" autocomplete="new-password" minlength="8"><span class="hint">${t('mem.pwHint')}</span></div>` : `<div class="alert info"><i data-lucide="user-round-check"></i><span>${t('mem.withProfile', { email: esc(currentUser.email) })}</span></div>`}`}`;
  const msg = form.elements.message;
  msg.placeholder = tier === 'artist' ? t('mem.motivationPh') : t('contact.messagePh');
}
form.addEventListener('change', (e) => { if (e.target.name === 'tier') { tier = e.target.value; renderMembership('membership'); icons(form); } });

// Bereiche im Bunker (aus dem Grundriss vorbelegt: ?raeume=a,b&von=…&bis=…&extras=…)
const qs = new URLSearchParams(location.search);
const today = new Date(); const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const pick = { spaces: new Set((qs.get('raeume') || '').split(',').filter((id) => SPACES.some((x) => x.id === id && !x.own))), extras: new Set((qs.get('extras') || '').split(',').filter(Boolean)), from: qs.get('von') || '', to: qs.get('bis') || '' };
function renderSpaces(type) {
  const box = $('[data-spaces-block]');
  const on = SPACE_REQUEST_TYPES.includes(type);
  box.hidden = !on; if (!on) { box.innerHTML = ''; return; }
  if (!FEATURES.spacePlan) {
    box.innerHTML = `<div class="sb-head"><div><span class="label">${t('contact.date.title')}</span><small class="muted">${t('contact.date.sub')}</small></div></div>
      <div class="form-grid">
        <div class="field"><label for="s-from">${t('contact.spaces.from')}</label><input id="s-from" type="date" data-sfrom min="${todayYmd}" value="${esc(pick.from)}"></div>
        <div class="field"><label for="s-to">${t('contact.spaces.to')}</label><input id="s-to" type="date" data-sto min="${todayYmd}" value="${esc(pick.to)}"></div>
      </div>`;
    return;
  }
  box.innerHTML = `<div class="sb-head"><div><span class="label">${t('contact.spaces.title')}</span><small class="muted">${t('contact.spaces.sub')}</small></div><a href="./#raeume" class="link-arrow">${t('contact.spaces.plan')} <i data-lucide="layout-dashboard"></i></a></div>
    <div class="chips">${SPACES.filter((x) => !x.own).map((x) => `<label class="chip"><input type="checkbox" data-space value="${x.id}" ${pick.spaces.has(x.id) ? 'checked' : ''}><span>${esc(L(x.name))} <small class="mono">${x.area} m²</small></span></label>`).join('')}</div>
    <div class="form-grid">
      <div class="field"><label for="s-from">${t('contact.spaces.from')}</label><input id="s-from" type="date" data-sfrom min="${todayYmd}" value="${esc(pick.from)}"></div>
      <div class="field"><label for="s-to">${t('contact.spaces.to')}</label><input id="s-to" type="date" data-sto min="${todayYmd}" value="${esc(pick.to)}"></div>
    </div>
    <div><span class="label">${t('contact.spaces.extras')}</span><div class="chips" style="margin-top:8px">${SPACE_EXTRAS.map((x) => `<label class="chip"><input type="checkbox" data-sextra value="${x.id}" ${pick.extras.has(x.id) ? 'checked' : ''}><span><i data-lucide="${x.icon}"></i>${esc(L(x.label))}</span></label>`).join('')}</div></div>`;
}
form.addEventListener('change', (e) => {
  if (e.target.matches('[data-space]')) e.target.checked ? pick.spaces.add(e.target.value) : pick.spaces.delete(e.target.value);
  if (e.target.matches('[data-sextra]')) e.target.checked ? pick.extras.add(e.target.value) : pick.extras.delete(e.target.value);
  if (e.target.matches('[data-sfrom]')) { pick.from = e.target.value; const to = $('[data-sto]'); to.min = pick.from || todayYmd; if (!pick.to || pick.to < pick.from) { to.value = pick.from; pick.to = pick.from; } }
  if (e.target.matches('[data-sto]')) pick.to = e.target.value;
});

// Vorauswahl: ?typ=… oder die Seite, von der man kommt – sonst „Create your own space“
const FROM_PAGE = { 'membership.html': 'membership', 'room5.html': 'studio', 'buchen.html': 'studio', 'zahlung.html': 'studio' };
const fromRef = (() => { try { const r = new URL(document.referrer); return r.origin === location.origin ? FROM_PAGE[r.pathname.split('/').pop()] : null; } catch { return null; } })();
const typ = qs.get('typ') || fromRef;
if (typ) { const r = form.querySelector(`input[name=type][value="${CSS.escape(typ)}"]`); if (r) r.checked = true; }
form.addEventListener('change', (e) => { if (e.target.name === 'type') renderExtra(); });
renderExtra(); icons();

let getCaptcha = () => null;
captcha($('[data-captcha]')).then((g) => (getCaptcha = g));
userReady.then((u) => { currentUser = u; if (form.elements.type.value === 'membership') { renderMembership('membership'); icons(form); } if (u) $$('[data-guest-only]').forEach((f) => { f.hidden = true; f.querySelector('input').required = false; }); });

if (!reduced) {
  $$('[data-signal] .pulse').forEach((c, i) => gsap.fromTo(c, { attr: { r: 8 }, opacity: 1 }, { attr: { r: 100 }, opacity: 0, duration: 3, repeat: -1, ease: 'power1.out', delay: i }));
  gsap.to('[data-signal] .sweep', { rotation: 360, svgOrigin: '110 110', duration: 4, repeat: -1, ease: 'none' });
}

async function sendApplication(d, user) {
  const err = $('[data-contact-error]');
  if ((d.message || '').trim().length < 20) { form.elements.message.closest('.field').classList.add('invalid'); return formError(err, t('err.motivation_short')); }
  if (!user && String(d.m_password || '').length < 8) return formError(err, t('err.password_short'));
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try {
    await api.apply({ name: d.name, email: d.email, phone: d.phone, role: d.m_role, usage: d.m_usage, genres: d.m_genres, links: d.m_links, referral: d.m_referral, motivation: d.message, password: d.m_password, captcha: getCaptcha() });
    const wrap = $('[data-contact-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">${t('mem.sent.eyebrow')}</span>
      <h3 class="display h3" style="margin:18px 0 14px">${t('mem.sent.title', { name: esc((user?.name || d.name).split(' ')[0]) })}</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">${user ? t('mem.sent.textUser') : t('mem.sent.textNew')}</p>
      <a href="konto.html" class="btn btn-ghost">${t('footer.profile')}</a></div>`;
    icons(wrap); gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) { formError(err, ex.code ? t(`err.${ex.code}`) : ex.message); btn.disabled = false; }
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
  if (d.type === 'membership' && tier === 'artist') return sendApplication(d, user);
  const withSpaces = SPACE_REQUEST_TYPES.includes(d.type) && pick.spaces.size;
  if (withSpaces && !pick.from) return formError($('[data-contact-error]'), t('contact.spaces.needDate'));
  const fields = {};
  for (const [k, v] of Object.entries(d)) if (k.startsWith('x_') && v) fields[k.slice(2)] = v;
  if (!withSpaces && SPACE_REQUEST_TYPES.includes(d.type) && pick.from) fields.wunschtermin = pick.to && pick.to !== pick.from ? `${pick.from} – ${pick.to}` : pick.from;
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try {
    await api.request({ type: d.type, name: d.name, email: d.email, phone: d.phone, company: d.company, message: d.message, fields, captcha: getCaptcha(),
      ...(withSpaces ? { spaces: [...pick.spaces], dateFrom: pick.from, dateTo: pick.to || pick.from, extras: [...pick.extras] } : {}) });
    try { sessionStorage.removeItem('bw-sel'); } catch {}
    const wrap = $('[data-contact-wrap]');
    wrap.innerHTML = `<div class="success">${successSvg}<span class="eyebrow plain mono">${t('contact.sent')}</span>
      <h3 class="display h3" style="margin:18px 0 14px">${t('contact.sentTitle')}</h3>
      <p class="muted" style="max-width:40ch;margin:0 auto 26px">${t('contact.sentText', { name: esc((user?.name || d.name).split(' ')[0]), email: esc(user?.email || d.email) })}</p>
      <a href="./" class="btn btn-ghost">${t('contact.back')}</a></div>`;
    icons(wrap); gsap.from(wrap.children, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
  } catch (ex) { formError($('[data-contact-error]'), ex.code ? t(`err.${ex.code}`) : ex.message); btn.disabled = false; }
});
