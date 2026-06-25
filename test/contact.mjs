import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'assets', 'symbols');
let cells = '';
for (let i = 1; i <= 21; i++) {
  const svg = fs.readFileSync(path.join(dir, `symbols-${i}.svg`), 'utf8');
  cells += `<div class="cell"><div class="g">${svg}</div><div class="n">symbols-${i}</div></div>`;
}
const html = `<!doctype html><meta charset=utf8><style>
  body{margin:0;background:#15161c;font-family:-apple-system,sans-serif}
  .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;padding:12px}
  .cell{background:#23252e;border-radius:10px;padding:14px 6px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .g{height:40px;display:flex;align-items:center;justify-content:center}
  .g svg{width:auto;height:32px;max-width:48px;fill:#fff;color:#fff}
  .g svg *{fill:#fff}
  .n{color:#8aa;font-size:12px;font-family:monospace}
</style><div class="grid">${cells}</div>`;
fs.writeFileSync(path.join(__dirname, 'contact.html'), html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760, height: 560 } });
await p.goto('file://' + path.join(__dirname, 'contact.html'));
await p.waitForTimeout(300);
await p.screenshot({ path: path.join(__dirname, 'shots', 'contact.png') });
await b.close();
console.log('done');
