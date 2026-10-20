// Rechtliches: Firmenangaben zentral aus config.LEGAL einsetzen
import { $$ } from './app.js';
import { LEGAL } from './config.js';

$$('[data-legal]').forEach((el) => {
  const key = el.dataset.legal; const v = LEGAL[key] || '';
  el.textContent = v;
  if (key === 'email') el.href = `mailto:${v}`;
  if (key === 'phone') el.href = `tel:${v.replace(/\s/g, '')}`;
});
