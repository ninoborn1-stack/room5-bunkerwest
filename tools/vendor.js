// Kopiert die benötigten Bibliotheken & Schriften aus node_modules nach public/vendor,
// damit public/ komplett eigenständig ist (auch ohne server.js statisch hostbar).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'public', 'vendor');
fs.rmSync(OUT, { recursive: true, force: true });
const FILES = {
  'gsap.min.js': 'gsap/dist/gsap.min.js',
  'ScrollTrigger.min.js': 'gsap/dist/ScrollTrigger.min.js',
  'lucide.min.js': 'lucide/dist/umd/lucide.min.js',
  'fonts/inter-tight.woff2': '@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2',
  'fonts/inter-tight-italic.woff2': '@fontsource-variable/inter-tight/files/inter-tight-latin-wght-italic.woff2',
  'fonts/jetbrains-400.woff2': '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
  'fonts/great-vibes.woff2': '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2',
  'fonts/jetbrains-500.woff2': '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
};
for (const w of [500, 600, 700, 800, 900]) FILES[`fonts/unbounded-${w}.woff2`] = `@fontsource/unbounded/files/unbounded-latin-${w}-normal.woff2`;

for (const [dest, src] of Object.entries(FILES)) {
  const to = path.join(OUT, dest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'node_modules', src), to);
}
console.log(`vendor: ${Object.keys(FILES).length} Dateien nach public/vendor kopiert`);
