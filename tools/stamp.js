// Versionsstempel beim Veröffentlichen: hängt ?v=<commit> an alle eigenen JS/CSS-Verweise,
// damit Browser nach jedem Deploy garantiert die neuen Dateien laden (statt alter Cache-Versionen).
// Läuft nur im GitHub-Pages-Workflow. Auf Cloudflare sorgen die Header in public/_headers dafür (dort NICHT
// verwenden, sonst kann die Backend-Funktion ihre Importe nicht bündeln).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUB = path.join(ROOT, 'public');
const v = (process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || String(Date.now())).slice(0, 8);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'vendor' ? [] : walk(p);
  return [p];
});

let n = 0;
for (const file of walk(PUB)) {
  const ext = path.extname(file);
  if (!['.html', '.js'].includes(ext)) continue;
  let s = fs.readFileSync(file, 'utf8'); const before = s;
  if (ext === '.html') {
    s = s.replace(/(src|href)="((?:js|css)\/[^"?#]+\.(?:js|css))"/g, `$1="$2?v=${v}"`);
    s = s.replace('<head>', `<head>\n  <meta name="build" content="${v}">`);
  } else {
    // statische und dynamische Importe: from './x.js' / import('./x.js')
    s = s.replace(/((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, `$1$2$3?v=${v}$2`);
  }
  if (s !== before) { fs.writeFileSync(file, s); n++; }
}
fs.writeFileSync(path.join(PUB, 'version.json'), JSON.stringify({ v }));
console.log(`Versionsstempel v=${v} in ${n} Dateien gesetzt (+ version.json)`);
