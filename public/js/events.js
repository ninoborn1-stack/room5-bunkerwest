import { $, icons, userReady, t } from './app.js';
import { api } from './api.js';
import { renderWeekPlan, renderEventCards, bindNotify } from './weekplan.js';

// Events-Seite: Wochenplan nur angeteasert (voll im Profil), Event-Liste für Gäste gekürzt
const user = await userReady;
let { events } = await api.events();
renderWeekPlan($('[data-week]'), { user, events, teaser: true, eventHref: (e) => `#ev-${e.id}` });

const list = $('[data-events]');
const draw = async () => {
  ({ events } = await api.events());
  renderEventCards(list, events, user, { limit: user ? Infinity : 4, onChange: draw });
  if (!user && events.length > 4) {
    list.insertAdjacentHTML('beforeend', `<div class="more-events"><i data-lucide="calendar-heart"></i><span>${t('ev.moreInProfile', { n: events.length - 4 })}</span><a href="login.html?tab=register" class="btn btn-ghost btn-sm">${t('home.community.join')}</a></div>`);
    icons(list);
  }
};
draw();

if (user) bindNotify($('[data-notify-toggle]'), user);
else {
  const hint = $('[data-guest-hint]'); hint.hidden = false;
  hint.innerHTML = `<i data-lucide="bell"></i><span>${t('ev.guestHint')} <a href="login.html?tab=register">${t('home.community.join')}</a></span>`; icons(hint);
}
