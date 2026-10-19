// Copies the site's static files from log-your-logoff/ into public/, so the GitHub Pages version and
// the Webflow Cloud app stay the same. The page markup lives in src/pages/index.astro.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const from = new URL('../log-your-logoff/', import.meta.url);
const to = new URL('../public/', import.meta.url);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of ['app.js', 'data.js', 'config.js', 'style.css', 'assets', 's']) {
  cpSync(new URL(f, from), new URL(f, to), { recursive: true });
}
console.log('Synced static files into public/');
