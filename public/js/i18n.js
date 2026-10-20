// Sprachumschaltung DE/EN
// - Deutsch steht direkt im HTML. Elemente mit data-i18n="key" bekommen bei EN den Text aus EN.
// - data-i18n-html="key" ersetzt innerHTML (für Texte mit <br>, <em> usw.).
// - data-i18n-attr="placeholder:key;aria-label:key2" übersetzt Attribute.
// - Texte aus JavaScript: t('key', { name: 'X' }) – mit Platzhaltern {name}.
import { DE } from './i18n/de.js';
import { EN } from './i18n/en.js';

const DICT = { de: DE, en: EN };
export const LANGS = ['de', 'en'];
export const lang = LANGS.includes(document.documentElement.lang) ? document.documentElement.lang : 'de';
export const locale = lang === 'de' ? 'de-DE' : 'en-GB';

export function t(key, vars = {}) {
  const str = DICT[lang][key] ?? DE[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

export function applyI18n(root = document) {
  if (lang === 'de') { document.documentElement.classList.remove('i18n-pending'); return; }
  const dict = DICT[lang];
  root.querySelectorAll('[data-i18n]').forEach((el) => { const v = dict[el.dataset.i18n]; if (v != null) el.textContent = v; });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { const v = dict[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => { const [attr, key] = pair.split(':'); if (dict[key] != null) el.setAttribute(attr.trim(), dict[key]); });
  });
  if (root === document) {
    const title = dict[`meta.title.${document.body.dataset.page}`]; if (title) document.title = title;
    const desc = dict[`meta.desc.${document.body.dataset.page}`]; if (desc) document.querySelector('meta[name=description]')?.setAttribute('content', desc);
    document.documentElement.classList.remove('i18n-pending');
  }
}

export function setLang(l) {
  try { localStorage.setItem('r5-lang', l); } catch {}
  location.reload();
}

// Zahlen, Preise, Datum in der aktiven Sprache
export const fmtEuro = (n) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const fmtDate = (d, opts) => d.toLocaleDateString(locale, opts);
