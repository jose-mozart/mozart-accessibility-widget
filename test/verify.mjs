// Headless Chromium verification for mozart-a11y.
// Usage: node test/verify.mjs   (after `npm run build`)
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, 'sample.html');
const SHOT = (n) => path.join(__dirname, 'shots', n);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

const browser = await chromium.launch();

async function fresh(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__mozartA11y === true, { timeout: 5000 });
  await page.waitForTimeout(150);
  return { ctx, page };
}

try {
  // 1. Loads once; FAB appears; panel opens with locked glass look
  console.log('1. Load + FAB + open');
  let { ctx, page } = await fresh();
  ok(await page.locator('#mz-fab').isVisible(), 'FAB visible');
  ok(await page.locator('#mz-a11y-content').count() === 1, 'content wrapper created');
  ok(await page.locator('#lg-refraction').count() === 1, 'SVG refraction filter injected');
  await page.locator('#mz-fab').click();
  await page.waitForTimeout(400);
  ok(await page.locator('#mz-panel.mz-open').count() === 1, 'panel opens');
  const bd = await page.locator('#mz-panel').evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
  ok(/blur/.test(bd), 'panel has glass backdrop-filter (' + bd.slice(0, 40) + ')');
  await page.locator('#mz-panel').screenshot({ path: SHOT('panel.png') });
  await page.screenshot({ path: SHOT('full-open.png') });

  // 2. Each control affects content, not the widget
  console.log('2. Controls affect content only');
  const contentFilter = () => page.locator('#mz-a11y-content').evaluate(el => el.style.filter);
  const widgetFilter = () => page.locator('#mz-a11y-root').evaluate(el => getComputedStyle(el).filter);

  await page.locator('.mz-card[data-key="grayscale"]').click();
  await page.waitForTimeout(100);
  ok(/grayscale/.test(await contentFilter()), 'grayscale -> content filter');
  ok(!/grayscale/.test(await widgetFilter()), 'grayscale NOT on widget');
  await page.locator('.mz-card[data-key="grayscale"]').click(); // off

  await page.locator('.mz-card[data-key="invert"]').click();
  ok(/invert/.test(await contentFilter()), 'invert -> content filter');
  await page.locator('.mz-card[data-key="invert"]').click();

  await page.locator('.mz-card[data-key="contrast"]').click();
  ok(/contrast/.test(await contentFilter()), 'contrast -> content filter');
  await page.locator('.mz-card[data-key="contrast"]').click();

  await page.locator('.mz-card[data-key="biggerText"]').click();
  await page.waitForTimeout(50);
  const z = await page.locator('#mz-a11y-content').evaluate(el => el.style.zoom);
  ok(parseFloat(z) > 1, 'bigger text -> zoom ' + z);
  await page.locator('.mz-card[data-key="biggerText"]').click();
  await page.locator('.mz-card[data-key="biggerText"]').click();
  await page.locator('.mz-card[data-key="biggerText"]').click();
  await page.locator('.mz-card[data-key="biggerText"]').click(); // cycle back to 0

  await page.locator('.mz-row[data-key="biggerInterface"]').click();
  await page.waitForTimeout(50);
  ok(parseFloat(await page.locator('#mz-panel').evaluate(el => el.style.zoom)) === 1.15, 'bigger interface -> WIDGET panel zoom 1.15');
  ok((await page.locator('#mz-a11y-content').evaluate(el => el.style.zoom)) !== '1.15', 'bigger interface does NOT zoom host content');
  await page.locator('.mz-row[data-key="biggerInterface"]').click();

  await page.locator('.mz-card[data-key="lineHeight"]').click();
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-lh-1')), 'line height -> class');
  await page.locator('.mz-card[data-key="lineHeight"]').click();
  await page.locator('.mz-card[data-key="lineHeight"]').click();

  await page.locator('.mz-card[data-key="readableFont"]').click();
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-font')), 'readable font -> class');
  await page.locator('.mz-card[data-key="readableFont"]').click();

  await page.locator('.mz-card[data-key="hideImages"]').click();
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-hide-img')), 'hide images -> class');
  ok(await page.locator('header strong').isVisible(), 'header text still visible while images hidden');
  await page.locator('.mz-card[data-key="hideImages"]').click();

  await page.locator('.mz-card[data-key="readingGuide"]').click();
  ok(await page.locator('#mz-guide').evaluate(el => getComputedStyle(el).display) === 'block', 'reading guide overlay shown');
  await page.locator('.mz-card[data-key="readingGuide"]').click();

  await page.locator('.mz-card[data-key="textAlign"]').click();
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-align-1')), 'text align cycle -> align-1');
  await page.locator('.mz-card[data-key="textAlign"]').click();
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-align-2')), 'text align cycle -> align-2');

  // 3. Persistence across reload
  console.log('3. Persistence');
  await page.locator('.mz-card[data-key="grayscale"]').click();
  await page.waitForTimeout(50);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__mozartA11y === true);
  await page.waitForTimeout(150);
  ok(/grayscale/.test(await contentFilter()), 'grayscale persisted after reload');
  ok(await page.locator('#mz-a11y-content').evaluate(el => el.classList.contains('mz-align-2')), 'text align persisted after reload');
  // reset for later tests
  await page.evaluate(() => { localStorage.removeItem('mozart-a11y:v1'); });
  await ctx.close();

  // 4. Double-load does not double-inject
  console.log('4. Idempotency');
  ({ ctx, page } = await fresh());
  await page.addScriptTag({ path: path.join(__dirname, '..', 'dist', 'mozart-a11y.min.js') });
  await page.waitForTimeout(100);
  ok(await page.locator('#mz-a11y-root').count() === 1, 'single root after double load');
  ok(await page.locator('#mz-fab').count() === 1, 'single FAB after double load');
  ok(await page.locator('#lg-refraction').count() === 1, 'single SVG filter after double load');
  await ctx.close();

  // 5. Keyboard-only operation
  console.log('5. Keyboard');
  ({ ctx, page } = await fresh());
  await page.locator('#mz-fab').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  ok(await page.locator('#mz-panel.mz-open').count() === 1, 'Enter on FAB opens panel');
  const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  ok(focusedId === 'mz-close', 'focus moved into dialog (close btn)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok(await page.locator('#mz-panel.mz-open').count() === 0, 'Esc closes panel');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'mz-fab', 'focus returns to FAB');
  await ctx.close();

  // 6. prefers-reduced-transparency -> solid
  console.log('6. Reduced transparency');
  ({ ctx, page } = await fresh({ reducedMotion: 'reduce', contrast: 'more' }));
  // emulate reduced transparency via media feature override
  await page.emulateMedia({ forcedColors: 'none' });
  await page.locator('#mz-fab').click();
  await page.waitForTimeout(300);
  // Playwright cannot set prefers-reduced-transparency directly; assert fallback CSS rule exists
  const hasFallback = await page.evaluate(() => {
    for (const s of document.styleSheets) {
      try { for (const r of s.cssRules) if (r.conditionText && r.conditionText.includes('prefers-reduced-transparency')) return true; } catch (e) {}
    }
    return false;
  });
  ok(hasFallback, 'reduced-transparency fallback rule present');
  await ctx.close();

  // 7/8. Pinned header + clip-on-scroll
  console.log('7/8. Pinned header + clip');
  ({ ctx, page } = await fresh());
  await page.locator('#mz-fab').click();
  await page.waitForTimeout(300);
  const headerInScroll = await page.evaluate(() => !!document.querySelector('#mz-scroll #mz-header'));
  ok(!headerInScroll, 'header is a sibling above scroll region (not inside, not sticky)');
  const scrollOverflow = await page.locator('#mz-scroll').evaluate(el => getComputedStyle(el).overflowY);
  ok(scrollOverflow === 'auto' || scrollOverflow === 'scroll', 'scroll region has overflow-y');
  // scroll the body content and confirm header top stays put
  const hBefore = await page.locator('#mz-header').evaluate(el => el.getBoundingClientRect().top);
  await page.locator('#mz-scroll').evaluate(el => el.scrollTo(0, 300));
  await page.waitForTimeout(100);
  const hAfter = await page.locator('#mz-header').evaluate(el => el.getBoundingClientRect().top);
  ok(Math.abs(hBefore - hAfter) < 1, 'header stays pinned during scroll');
  await page.locator('#mz-panel').screenshot({ path: SHOT('panel-scrolled.png') });
  await ctx.close();

  // R2. Round-2 corrections
  console.log('R2. Round-2 corrections');
  ({ ctx, page } = await fresh());
  await page.locator('#mz-fab').click();
  await page.waitForTimeout(300);
  // C4: refraction filter actually wired into computed backdrop-filter (not silent fallback)
  const cbf = await page.locator('#mz-panel').evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
  ok(/url\(.*#lg-refraction.*\)/.test(cbf), 'C4: computed backdrop-filter contains url(#lg-refraction)');
  // C4: radius 72
  ok(Math.round(parseFloat(await page.locator('#mz-panel').evaluate(el => getComputedStyle(el).borderTopLeftRadius))) === 72, 'C4: panel radius is 72px');
  // C1: reset keeps glass material (has backdrop-filter) + green-tinted background
  const rbf = await page.locator('#mz-reset').evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
  ok(/blur/.test(rbf), 'C1: reset button retains glass backdrop-filter');
  const rbg = await page.locator('#mz-reset').evaluate(el => getComputedStyle(el).backgroundColor);
  ok(/^rgba?\(\s*48,\s*209,\s*88/.test(rbg), 'C1: reset background is green-tinted rgba (' + rbg + ')');
  // C2: logo wrapped in its own glass tile, with an inlined svg
  ok(await page.locator('.mz-logo-tile.mz-glass svg').count() === 1, 'C2: Mozart logo inside a .mz-glass tile');
  // real assets inlined (AA glyph etc.) — every card has an svg
  const cardSvgs = await page.locator('.mz-card .mz-card-icon svg').count();
  ok(cardSvgs === 19, 'real glyphs inlined on all 19 cards (' + cardSvgs + ')');
  await page.locator('#mz-panel').screenshot({ path: SHOT('panel-r2.png') });
  await page.locator('#mz-scroll').evaluate(el => el.scrollTo(0, 9999));
  await page.waitForTimeout(150);
  await page.locator('#mz-panel').screenshot({ path: SHOT('panel-r2-bottom.png') });
  await ctx.close();

} catch (e) {
  console.error('ERROR', e);
  fail++;
} finally {
  await browser.close();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
