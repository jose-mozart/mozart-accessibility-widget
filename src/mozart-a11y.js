/*!
 * mozart-a11y — Mozart & Co self-hosted accessibility widget
 * Liquid Glass treatment (locked recipe, signed off from the Liquid Glass Lab).
 * Single-file, self-injecting. Drop one <script defer> in the Webflow footer.
 *
 * Build: node build.js  ->  dist/mozart-a11y.min.js
 * Serve: https://cdn.jsdelivr.net/gh/jose-mozart/mozart-accessibility-widget@vX.Y.Z/dist/mozart-a11y.min.js
 */
import { ICON_SVGS, LOGO_SVG } from './assets.generated.js';

(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
   * 0. Idempotency guard — safe to load on every page, twice, whatever.
   * ------------------------------------------------------------------------- */
  if (window.__mozartA11y) return;
  window.__mozartA11y = true;

  var STORAGE_KEY = 'mozart-a11y:v1';
  var CONTENT_ID = 'mz-a11y-content';
  var ROOT_ID = 'mz-a11y-root';
  var doc = document;
  var isRTL = (doc.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';

  /* ---------------------------------------------------------------------------
   * 1. State
   * ------------------------------------------------------------------------- */
  var DEFAULTS = {
    biggerInterface: false,
    biggerText: 0,      // 0..4
    lineHeight: 0,      // 0..3
    textSpacing: 0,     // 0..3
    readableFont: false,
    textAlign: 0,       // 0 off, 1 left, 2 center, 3 right, 4 justify
    contrast: false,
    invert: false,
    grayscale: false,
    saturation: 0,      // 0..3
    highlightLinks: false,
    highlightTitles: false,
    readingGuide: false,
    readingMask: false,
    tooltips: false,
    readAloud: false,
    pauseMotion: false,
    hideImages: false,
    muteSounds: false,
    bigCursor: false
  };

  var state = load();

  function load() {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (var key in parsed) if (key in DEFAULTS) s[key] = parsed[key];
      }
    } catch (e) {}
    return s;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function reset() {
    for (var k in DEFAULTS) state[k] = DEFAULTS[k];
    save();
  }

  /* ---------------------------------------------------------------------------
   * 2. Pre-apply (minimise flash): write a synchronous <style> targeting the body
   *    with the saved BIGGER-TEXT zoom before we build the DOM and wrap content.
   *    (Bigger Interface scales the widget UI only, so it is NOT pre-applied here.)
   * ------------------------------------------------------------------------- */
  var preStyle = doc.createElement('style');
  preStyle.id = 'mz-a11y-preapply';
  var preZoom = 1 + state.biggerText * 0.08;
  if (preZoom !== 1) preStyle.textContent = 'body{zoom:' + preZoom + ';}';
  (doc.head || doc.documentElement).appendChild(preStyle);

  /* ---------------------------------------------------------------------------
   * 3. Icons — real Figma glyphs (assets/symbols/*, white -> currentColor) plus a
   *    few chrome glyphs synthesised in the same flat-fill style.
   * ------------------------------------------------------------------------- */
  function alignSVG(lines) {
    // lines: array of [x, width] bars; flat-fill style to match the asset set.
    var bars = '';
    var ys = [5, 10, 15, 20];
    for (var i = 0; i < 4; i++) bars += '<rect x="' + lines[i][0] + '" y="' + ys[i] + '" width="' + lines[i][1] + '" height="2.4" rx="1.2"/>';
    return '<svg viewBox="0 0 24 26" fill="currentColor" aria-hidden="true" focusable="false">' + bars + '</svg>';
  }
  var SYNTH = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    // launcher accessibility person (matches Figma 22-4528 blue FAB glyph), white
    launcher: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="4" r="2" fill="#fff"/>' +
      '<path d="M3 8.5c2.5 1 5.7 1.5 9 1.5s6.5-.5 9-1.5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path d="M12 9.5v6m0 0l-3.2 6.2M12 15.5l3.2 6.2" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    textAlignLeft: alignSVG([[3, 18], [3, 10], [3, 18], [3, 10]]),
    textAlignCenter: alignSVG([[3, 18], [7, 10], [3, 18], [7, 10]]),
    textAlignRight: alignSVG([[3, 18], [11, 10], [3, 18], [11, 10]]),
    textAlignJustify: alignSVG([[3, 18], [3, 18], [3, 18], [3, 18]])
  };
  var ICONS = {};
  for (var ik in ICON_SVGS) ICONS[ik] = ICON_SVGS[ik];
  for (var sk in SYNTH) ICONS[sk] = SYNTH[sk];

  /* ---------------------------------------------------------------------------
   * 4. Control definitions — order & grouping match Figma frame 22-4136.
   * ------------------------------------------------------------------------- */
  var CARDS_TEXT = [
    { key: 'biggerText', label: 'Bigger Text', icon: 'biggerText', type: 'level', max: 4 },
    { key: 'lineHeight', label: 'Line Height', icon: 'lineHeight', type: 'level', max: 3 },
    { key: 'textSpacing', label: 'Text Spacing', icon: 'textSpacing', type: 'level', max: 3 },
    { key: 'readableFont', label: 'Readable Font', icon: 'readableFont', type: 'toggle' },
    { key: 'textAlign', label: 'Text Align', icon: 'textAlign', type: 'cycle', max: 4 }
  ];
  var CARDS_COLOR = [
    { key: 'contrast', label: 'Contrast', icon: 'contrast', type: 'toggle' },
    { key: 'invert', label: 'Invert', icon: 'invert', type: 'toggle' },
    { key: 'grayscale', label: 'Grayscale', icon: 'grayscale', type: 'toggle' },
    { key: 'saturation', label: 'Saturation', icon: 'saturation', type: 'level', max: 3 }
  ];
  var CARDS_READING = [
    { key: 'highlightLinks', label: 'Highlight Links', icon: 'highlightLinks', type: 'toggle' },
    { key: 'highlightTitles', label: 'Highlight Titles', icon: 'highlightTitles', type: 'toggle' },
    { key: 'readingGuide', label: 'Reading Guide', icon: 'readingGuide', type: 'toggle' },
    { key: 'readingMask', label: 'Reading Mask', icon: 'readingMask', type: 'toggle' },
    { key: 'tooltips', label: 'Tooltips', icon: 'tooltips', type: 'toggle' },
    { key: 'readAloud', label: 'Read Aloud', icon: 'readAloud', type: 'toggle' }
  ];
  var CARDS_MEDIA = [
    { key: 'pauseMotion', label: 'Pause Motion', icon: 'pauseMotion', type: 'toggle' },
    { key: 'hideImages', label: 'Hide Images', icon: 'hideImages', type: 'toggle' },
    { key: 'muteSounds', label: 'Mute Sounds', icon: 'muteSounds', type: 'toggle' },
    { key: 'bigCursor', label: 'Big Cursor', icon: 'bigCursor', type: 'toggle' }
  ];

  /* ---------------------------------------------------------------------------
   * 5. CSS — locked glass recipe (VERBATIM, radius bumped 60->72 per round-2) +
   *    widget layout + effect rules.
   * ------------------------------------------------------------------------- */
  var GLASS_CSS = [
    /* ===== LOCKED GLASS RECIPE — material untouched; radius set to 72px ===== */
    '.mz-glass, .mz-glass--container {',
    '  --lg-base: 4, 4, 8;',
    '  --lhx: 0.669; --lhy: 0.743;',
    '  --lfx: -0.669; --lfy: -0.743;',
    '  --lt: 0.24; --dp: 38.0px;',
    '  border-radius: 72px;',
    '  corner-shape: superellipse(2.33);',
    '  box-shadow:',
    '    inset calc(var(--lhx) * 2px) calc(var(--lhy) * 2px) 0 0 rgba(255,255,255, var(--lt)),',
    '    inset calc(var(--lhx) * var(--dp) * 0.55) calc(var(--lhy) * var(--dp) * 0.55) calc(var(--dp) * 0.95) calc(var(--dp) * -0.45) rgba(0,0,0, 0.5),',
    '    inset calc(var(--lfx) * var(--dp) * 0.7) calc(var(--lfy) * var(--dp) * 0.7) calc(var(--dp) * 0.7) calc(var(--dp) * -0.62) rgba(255,255,255, calc(0.10 + var(--lt) * 0.5)),',
    '    inset calc(var(--lfx) * 1px) calc(var(--lfy) * 1px) 1px 0 rgba(255,255,255, calc(var(--lt) * 0.3)),',
    '    inset 0 0 14px -4px rgba(255,255,255, calc(var(--lt) * 0.5)),',
    '    0 8px 32px rgba(0,0,0, 0.38);',
    '  border: 1px solid rgba(255,255,255, 0.08);',
    '}',
    '.mz-glass--container {',
    '  background: rgba(var(--lg-base), 0.74);',
    '  -webkit-backdrop-filter: blur(17px) saturate(100%);',
    '  backdrop-filter: blur(17px) saturate(100%) url(#lg-refraction);',
    '}',
    '.mz-glass {',
    '  background: rgba(var(--lg-base), 0);',
    '  -webkit-backdrop-filter: blur(8.5px) saturate(100%);',
    '  backdrop-filter: blur(8.5px) saturate(100%) url(#lg-refraction);',
    '}',
    '@supports not (backdrop-filter: url(#lg-refraction)) {',
    '  .mz-glass--container { backdrop-filter: blur(17px) saturate(100%); -webkit-backdrop-filter: blur(17px) saturate(100%); }',
    '  .mz-glass { backdrop-filter: blur(10px) saturate(100%); -webkit-backdrop-filter: blur(10px) saturate(100%); }',
    '}',
    '@media (prefers-reduced-transparency: reduce) {',
    '  .mz-glass, .mz-glass--container { backdrop-filter: none; -webkit-backdrop-filter: none; }',
    '  .mz-glass--container { background: rgba(20,20,26,0.96); }',
    '  .mz-glass { background: rgba(28,28,36,0.94); }',
    '}'
  ].join('\n');

  var LAYOUT_CSS = [
    '#' + ROOT_ID + ' { all: initial; }',
    '#' + ROOT_ID + ', #' + ROOT_ID + ' *, #' + ROOT_ID + ' *::before, #' + ROOT_ID + ' *::after { box-sizing: border-box; }',
    '#' + ROOT_ID + ' { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #fff; }',

    /* Launcher FAB — matches Figma open button (blue circle, white access glyph) */
    '#mz-fab {',
    '  position: fixed; bottom: 24px; ' + (isRTL ? 'left: 24px;' : 'right: 24px;'),
    '  width: 56px; height: 56px; border-radius: 50%; border: none; padding: 0;',
    '  background: #0a84ff; color: #fff; cursor: pointer; z-index: 2147483646;',
    '  display: flex; align-items: center; justify-content: center;',
    '  box-shadow: 0 6px 20px rgba(10,132,255,.45), 0 2px 6px rgba(0,0,0,.3);',
    '  transition: transform .18s ease, box-shadow .18s ease;',
    '}',
    '#mz-fab:hover { transform: scale(1.06); }',
    '#mz-fab:active { transform: scale(.96); }',
    '#mz-fab:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }',
    '#mz-fab svg { width: 30px; height: 30px; }',

    /* Panel container */
    '#mz-panel {',
    '  position: fixed; bottom: 92px; ' + (isRTL ? 'left: 24px;' : 'right: 24px;'),
    '  width: 372px; max-width: calc(100vw - 32px);',
    '  height: 720px; max-height: calc(100vh - 116px);',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  z-index: 2147483647; color: #fff;',
    '  opacity: 0; transform: translateY(12px) scale(.98); pointer-events: none;',
    '  transition: opacity .26s cubic-bezier(.2,.7,.2,1), transform .26s cubic-bezier(.2,.7,.2,1);',
    '}',
    '#mz-panel.mz-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }',

    /* Pinned header (sibling ABOVE the scroll region — never sticky).
       Breathing room is the header's OWN margin (top + sides), which lives
       outside the scroll region — so it never reintroduces a clip gap. */
    '#mz-header {',
    '  flex: 0 0 auto; position: relative; z-index: 2; margin: 16px 14px 0;',
    '  height: 72px; border-radius: 38px; padding: 0 14px 0 26px;',
    '  display: flex; align-items: center; justify-content: space-between;',
    '}',
    '#mz-header h2 { margin: 0; font-size: 23px; font-weight: 600; letter-spacing: -.3px; line-height: 1; color: #fff; }',
    '#mz-close {',
    '  flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%; border: none; padding: 0;',
    '  cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center;',
    '  background: rgba(255,255,255,.10);',
    '}',
    '#mz-close svg { width: 18px; height: 18px; }',
    '#mz-close:hover { background: rgba(255,255,255,.18); }',
    '#mz-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',

    /* Scroll region — clipped box. Its top edge (the hard-clip line) sits FLUSH
       at the header bottom edge: margin-top:0 so no dead gap. The padding-top is
       resting inset only; overflow still clips at the scroll box top = header bottom. */
    '#mz-scroll {',
    '  flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;',
    '  padding: 18px 22px 8px; margin-top: 0;',
    '  overscroll-behavior: contain; -webkit-overflow-scrolling: touch;',
    '  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.25) transparent;',
    '}',
    '#mz-scroll::-webkit-scrollbar { width: 8px; }',
    '#mz-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); border-radius: 8px; }',

    /* Bigger Interface toggle row */
    '.mz-row {',
    '  display: flex; align-items: center; gap: 12px; height: 56px;',
    '  padding: 0 18px; border-radius: 30px; margin-bottom: 14px; cursor: pointer;',
    '}',
    '.mz-row .mz-row-icon { width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }',
    '.mz-row .mz-row-icon svg { height: 21px; width: auto; max-width: 26px; }',
    '.mz-row .mz-row-label { flex: 1 1 auto; font-size: 16px; font-weight: 500; }',

    /* Section label */
    '.mz-section-label {',
    '  font-size: 12px; font-weight: 600; letter-spacing: .2px;',
    '  color: rgba(255,255,255,.55); margin: 6px 0 12px 6px;',
    '}',

    /* Card grid */
    '.mz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }',
    '.mz-card {',
    '  position: relative; border-radius: 34px; aspect-ratio: 1 / 1; min-width: 0;',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  gap: 12px; padding: 12px; cursor: pointer; color: #fff; text-align: center;',
    '  transition: transform .14s ease;',
    '}',
    '.mz-card:hover { transform: translateY(-2px); }',
    '.mz-card:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',
    '.mz-card .mz-card-icon { height: 30px; display: flex; align-items: center; justify-content: center; color: #fff; }',
    '.mz-card .mz-card-icon svg { height: 28px; width: auto; max-width: 46px; }',
    '.mz-card .mz-card-label { font-size: 14.5px; font-weight: 500; line-height: 1.2; }',
    /* active state */
    '.mz-card.mz-on { box-shadow: inset 0 0 0 2px rgba(255,255,255,.85), 0 8px 32px rgba(0,0,0,.38); }',
    '.mz-card.mz-on .mz-card-icon { color: #0a84ff; }',

    /* level dots */
    '.mz-dots { display: flex; gap: 6px; height: 6px; }',
    '.mz-dots i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.3); display: block; }',
    '.mz-dots i.mz-dot-on { background: #fff; }',

    /* iOS switch — matches Figma switch frame (gray off / green on) */
    '.mz-switch { flex: 0 0 auto; width: 50px; height: 30px; border-radius: 16px; background: rgba(120,120,128,.5);',
    '  position: relative; transition: background .2s ease; }',
    '.mz-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 26px; height: 26px;',
    '  border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.3); transition: transform .2s ease; }',
    '.mz-row.mz-on .mz-switch { background: #34c759; }',
    '.mz-row.mz-on .mz-switch::after { transform: translateX(20px); }',

    /* Reset — keeps the liquid-glass material with a GREEN tint layered in (not a flat fill) */
    '.mz-reset {',
    '  width: 100%; height: 50px; border: none; border-radius: 26px; cursor: pointer;',
    '  background: rgba(48,209,88,0.34) !important; color: #fff; font-size: 15px; font-weight: 600;',
    '  display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px;',
    '  text-shadow: 0 1px 2px rgba(0,0,0,.35);',
    '}',
    '.mz-reset svg { width: 17px; height: 17px; color: #fff; }',
    '.mz-reset:hover { background: rgba(48,209,88,0.48) !important; }',
    '.mz-reset:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',
    '.mz-saved-note { text-align: center; font-size: 12px; color: rgba(255,255,255,.5); margin: 12px 0 14px; }',

    /* Logo tile — wordmark wrapped in its own glass tile (matches Figma footer) */
    '.mz-logo-tile { display: flex; align-items: center; justify-content: center; height: 56px; border-radius: 28px; margin-bottom: 8px; }',
    '.mz-logo-link { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 28px; text-decoration: none; cursor: pointer; }',
    '.mz-logo-link:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }',
    '.mz-logo-link:hover svg { opacity: 1; }',
    '.mz-logo-tile svg { height: 18px; width: auto; color: #fff; opacity: .9; transition: opacity .15s ease; }',

    /* Reading guide / mask / tooltip overlays (in widget layer, above filtered content) */
    '#mz-guide { position: fixed; left: 0; width: 100%; height: 0; pointer-events: none; z-index: 2147483640;',
    '  border-top: 2px solid rgba(255,214,10,.9); border-bottom: 2px solid rgba(255,214,10,.9);',
    '  background: rgba(255,214,10,.12); height: 40px; display: none; }',
    '#mz-mask-top, #mz-mask-bot { position: fixed; left: 0; width: 100%; background: rgba(0,0,0,.6);',
    '  pointer-events: none; z-index: 2147483639; display: none; }',
    '#mz-tip { position: fixed; z-index: 2147483645; max-width: 280px; padding: 8px 12px; border-radius: 10px;',
    '  background: #1c1c24; color: #fff; font-size: 14px; line-height: 1.4; box-shadow: 0 6px 20px rgba(0,0,0,.4);',
    '  pointer-events: none; display: none; }',

    '@media (prefers-reduced-motion: reduce) {',
    '  #mz-panel, #mz-fab, .mz-card, .mz-switch, .mz-switch::after { transition: none !important; }',
    '}'
  ].join('\n');

  // Effect rules applied to #mz-a11y-content (host page only — never the widget).
  var EFFECT_CSS = [
    '#' + CONTENT_ID + '.mz-lh-1 *:not(svg):not(path) { line-height: 1.5 !important; }',
    '#' + CONTENT_ID + '.mz-lh-2 *:not(svg):not(path) { line-height: 1.8 !important; }',
    '#' + CONTENT_ID + '.mz-lh-3 *:not(svg):not(path) { line-height: 2.1 !important; }',
    '#' + CONTENT_ID + '.mz-ls-1 *:not(svg):not(path) { letter-spacing: .06em !important; word-spacing: .14em !important; }',
    '#' + CONTENT_ID + '.mz-ls-2 *:not(svg):not(path) { letter-spacing: .12em !important; word-spacing: .22em !important; }',
    '#' + CONTENT_ID + '.mz-ls-3 *:not(svg):not(path) { letter-spacing: .18em !important; word-spacing: .32em !important; }',
    '#' + CONTENT_ID + '.mz-font * { font-family: "Atkinson Hyperlegible", "Verdana", "Tahoma", system-ui, sans-serif !important; }',
    '#' + CONTENT_ID + '.mz-align-1 p,#' + CONTENT_ID + '.mz-align-1 h1,#' + CONTENT_ID + '.mz-align-1 h2,#' + CONTENT_ID + '.mz-align-1 h3,#' + CONTENT_ID + '.mz-align-1 h4,#' + CONTENT_ID + '.mz-align-1 li { text-align: left !important; }',
    '#' + CONTENT_ID + '.mz-align-2 p,#' + CONTENT_ID + '.mz-align-2 h1,#' + CONTENT_ID + '.mz-align-2 h2,#' + CONTENT_ID + '.mz-align-2 h3,#' + CONTENT_ID + '.mz-align-2 h4,#' + CONTENT_ID + '.mz-align-2 li { text-align: center !important; }',
    '#' + CONTENT_ID + '.mz-align-3 p,#' + CONTENT_ID + '.mz-align-3 h1,#' + CONTENT_ID + '.mz-align-3 h2,#' + CONTENT_ID + '.mz-align-3 h3,#' + CONTENT_ID + '.mz-align-3 h4,#' + CONTENT_ID + '.mz-align-3 li { text-align: right !important; }',
    '#' + CONTENT_ID + '.mz-align-4 p,#' + CONTENT_ID + '.mz-align-4 h1,#' + CONTENT_ID + '.mz-align-4 h2,#' + CONTENT_ID + '.mz-align-4 h3,#' + CONTENT_ID + '.mz-align-4 h4,#' + CONTENT_ID + '.mz-align-4 li { text-align: justify !important; }',
    '#' + CONTENT_ID + '.mz-hl-links a { outline: 2px solid #ffd60a !important; background: rgba(255,214,10,.25) !important; text-decoration: underline !important; }',
    '#' + CONTENT_ID + '.mz-hl-titles h1,#' + CONTENT_ID + '.mz-hl-titles h2,#' + CONTENT_ID + '.mz-hl-titles h3,#' + CONTENT_ID + '.mz-hl-titles h4,#' + CONTENT_ID + '.mz-hl-titles h5,#' + CONTENT_ID + '.mz-hl-titles h6 { background: rgba(255,214,10,.22) !important; outline: 1px solid rgba(255,214,10,.6) !important; }',
    '#' + CONTENT_ID + '.mz-pause *, #' + CONTENT_ID + '.mz-pause *::before, #' + CONTENT_ID + '.mz-pause *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }',
    '#' + CONTENT_ID + '.mz-hide-img img, #' + CONTENT_ID + '.mz-hide-img picture, #' + CONTENT_ID + '.mz-hide-img video, #' + CONTENT_ID + '.mz-hide-img svg, #' + CONTENT_ID + '.mz-hide-img [style*="background-image"] { visibility: hidden !important; }',
    '#' + CONTENT_ID + '.mz-bigcursor, #' + CONTENT_ID + '.mz-bigcursor * { cursor: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M5 3l15 9-6 1 4 7-3 1-4-7-6 5V3z\' fill=\'%23000\' stroke=\'%23fff\' stroke-width=\'1.2\'/%3E%3C/svg%3E") 4 2, auto !important; }',
    /* invert: re-invert media so photos look normal */
    '#' + CONTENT_ID + '.mz-invert img, #' + CONTENT_ID + '.mz-invert video, #' + CONTENT_ID + '.mz-invert picture, #' + CONTENT_ID + '.mz-invert [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }'
  ].join('\n');

  /* ---------------------------------------------------------------------------
   * 6. Build DOM
   * ------------------------------------------------------------------------- */
  // Wrap all existing body children so effects apply to host content only.
  var content = doc.getElementById(CONTENT_ID);
  if (!content) {
    content = doc.createElement('div');
    content.id = CONTENT_ID;
    while (doc.body.firstChild) content.appendChild(doc.body.firstChild);
    doc.body.appendChild(content);
  }
  preStyle.parentNode && preStyle.parentNode.removeChild(preStyle);

  // SVG filter (once)
  var filterHost = doc.createElement('div');
  filterHost.innerHTML =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<filter id="lg-refraction" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.004 0.004" numOctaves="2" seed="42" result="noise"/>' +
    '<feGaussianBlur in="noise" stdDeviation="8.50" result="soft"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="soft" scale="130" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter></defs></svg>';
  doc.body.appendChild(filterHost.firstChild);

  // Styles (once)
  var styleEl = doc.createElement('style');
  styleEl.id = 'mz-a11y-style';
  styleEl.textContent = GLASS_CSS + '\n' + LAYOUT_CSS + '\n' + EFFECT_CSS;
  (doc.head || doc.documentElement).appendChild(styleEl);

  // Readable-font webfont (progressive enhancement; falls back to system stack)
  var fontLink = doc.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5/index.min.css';
  fontLink.crossOrigin = 'anonymous';
  (doc.head || doc.documentElement).appendChild(fontLink);

  // Root + launcher + panel
  var root = doc.createElement('div');
  root.id = ROOT_ID;

  var fab = doc.createElement('button');
  fab.id = 'mz-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Open accessibility menu');
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = ICONS.launcher;

  var panel = doc.createElement('div');
  panel.id = 'mz-panel';
  panel.className = 'mz-glass--container';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Accessibility settings');
  panel.setAttribute('aria-hidden', 'true');

  panel.innerHTML =
    '<div id="mz-header" class="mz-glass">' +
      '<h2 id="mz-title">Accessibility</h2>' +
      '<button id="mz-close" type="button" aria-label="Close accessibility menu">' + ICONS.close + '</button>' +
    '</div>' +
    '<div id="mz-scroll">' +
      rowHTML() +
      sectionHTML('Text', CARDS_TEXT) +
      sectionHTML('Color', CARDS_COLOR) +
      sectionHTML('Reading & Focus', CARDS_READING) +
      sectionHTML('Media', CARDS_MEDIA) +
      '<button class="mz-reset mz-glass" type="button" id="mz-reset">' + ICONS.reset + ' Reset All Settings</button>' +
      '<p class="mz-saved-note">Your settings are saved on this device.</p>' +
      '<div class="mz-logo-tile mz-glass">' +
        '<a class="mz-logo-link" href="https://mozartcompany.com/" target="_blank" rel="noopener noreferrer" aria-label="Mozart & Co — opens mozartcompany.com in a new tab">' + LOGO_SVG + '</a>' +
      '</div>' +
    '</div>';

  root.appendChild(fab);
  root.appendChild(panel);

  // Overlays (reading guide / mask / tooltip) live in root (unfiltered layer)
  var guide = doc.createElement('div'); guide.id = 'mz-guide';
  var maskTop = doc.createElement('div'); maskTop.id = 'mz-mask-top';
  var maskBot = doc.createElement('div'); maskBot.id = 'mz-mask-bot';
  var tip = doc.createElement('div'); tip.id = 'mz-tip';
  root.appendChild(guide); root.appendChild(maskTop); root.appendChild(maskBot); root.appendChild(tip);

  doc.body.appendChild(root);

  function rowHTML() {
    return '<div class="mz-row mz-glass" role="button" tabindex="0" data-key="biggerInterface" ' +
      'aria-pressed="false" aria-label="Bigger Interface">' +
      '<span class="mz-row-icon">' + ICONS.biggerInterface + '</span>' +
      '<span class="mz-row-label">Bigger Interface</span>' +
      '<span class="mz-switch" aria-hidden="true"></span></div>';
  }

  function sectionHTML(title, cards) {
    var html = '<div class="mz-section-label">' + title + '</div><div class="mz-grid">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var dots = '';
      if (c.type === 'level') {
        dots = '<div class="mz-dots" aria-hidden="true">';
        for (var d = 0; d < c.max; d++) dots += '<i></i>';
        dots += '</div>';
      }
      var roleAttrs = c.type === 'toggle'
        ? 'aria-pressed="false"'
        : 'role="slider" aria-valuemin="0" aria-valuemax="' + c.max + '" aria-valuenow="0"';
      html += '<div class="mz-card mz-glass" tabindex="0" role="button" data-key="' + c.key +
        '" data-type="' + c.type + '" data-max="' + (c.max || 0) + '" aria-label="' + c.label + '" ' + roleAttrs + '>' +
        '<span class="mz-card-icon">' + ICONS[c.icon] + '</span>' +
        '<span class="mz-card-label">' + c.label + '</span>' +
        dots +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------------------------------------------------------------------
   * 7. Effects — apply state to the host content wrapper + overlays.
   * ------------------------------------------------------------------------- */
  function applyAll() {
    // Bigger Text -> zoom the host CONTENT only.
    var textZoom = 1 + state.biggerText * 0.08;
    if (textZoom !== 1) {
      if ('zoom' in content.style) content.style.zoom = String(textZoom);
      else { content.style.transform = 'scale(' + textZoom + ')'; content.style.transformOrigin = 'top ' + (isRTL ? 'right' : 'left'); content.style.width = (100 / textZoom) + '%'; }
    } else {
      content.style.zoom = ''; content.style.transform = ''; content.style.width = '';
    }

    // Bigger Interface -> scale the WIDGET UI only (panel + launcher), not the host.
    var uiZoom = state.biggerInterface ? 1.15 : 1;
    if ('zoom' in panel.style) { panel.style.zoom = uiZoom === 1 ? '' : String(uiZoom); fab.style.zoom = uiZoom === 1 ? '' : String(uiZoom); }
    else {
      var t = uiZoom === 1 ? '' : 'scale(' + uiZoom + ')';
      panel.style.transformOrigin = 'bottom ' + (isRTL ? 'left' : 'right');
      fab.style.transformOrigin = 'center';
      // panel keeps its open/close transform; only nudge fab to avoid clobbering
      fab.style.transform = t;
    }

    // class-driven effects on content
    var cl = content.classList;
    setClass(cl, 'mz-lh-1', state.lineHeight === 1);
    setClass(cl, 'mz-lh-2', state.lineHeight === 2);
    setClass(cl, 'mz-lh-3', state.lineHeight === 3);
    setClass(cl, 'mz-ls-1', state.textSpacing === 1);
    setClass(cl, 'mz-ls-2', state.textSpacing === 2);
    setClass(cl, 'mz-ls-3', state.textSpacing === 3);
    setClass(cl, 'mz-font', state.readableFont);
    setClass(cl, 'mz-align-1', state.textAlign === 1);
    setClass(cl, 'mz-align-2', state.textAlign === 2);
    setClass(cl, 'mz-align-3', state.textAlign === 3);
    setClass(cl, 'mz-align-4', state.textAlign === 4);
    setClass(cl, 'mz-hl-links', state.highlightLinks);
    setClass(cl, 'mz-hl-titles', state.highlightTitles);
    setClass(cl, 'mz-pause', state.pauseMotion);
    setClass(cl, 'mz-hide-img', state.hideImages);
    setClass(cl, 'mz-bigcursor', state.bigCursor);
    setClass(cl, 'mz-invert', state.invert);

    // composed CSS filter string
    var f = [];
    if (state.invert) f.push('invert(1) hue-rotate(180deg)');
    if (state.contrast) f.push('contrast(1.35)');
    if (state.saturation) f.push('saturate(' + [1, 1.4, 1.8, 2.4][state.saturation] + ')');
    if (state.grayscale) f.push('grayscale(1)');
    content.style.filter = f.join(' ');

    // overlays + media side-effects
    applyReadingOverlays();
    applyTooltips();
    applyReadAloud();
    applyMute();
    if (state.pauseMotion) pauseMedia();
  }

  function setClass(cl, name, on) { if (on) cl.add(name); else cl.remove(name); }

  /* Reading guide + mask follow the pointer */
  var pointerY = window.innerHeight / 2;
  var overlayBound = false;
  function onPointerMove(e) { pointerY = e.clientY; positionOverlays(); }
  function positionOverlays() {
    if (state.readingGuide) { guide.style.top = (pointerY - 20) + 'px'; }
    if (state.readingMask) {
      var gap = 80;
      maskTop.style.top = '0'; maskTop.style.height = Math.max(0, pointerY - gap / 2) + 'px';
      maskBot.style.top = (pointerY + gap / 2) + 'px'; maskBot.style.height = Math.max(0, window.innerHeight - pointerY - gap / 2) + 'px';
    }
  }
  function applyReadingOverlays() {
    guide.style.display = state.readingGuide ? 'block' : 'none';
    maskTop.style.display = maskBot.style.display = state.readingMask ? 'block' : 'none';
    if ((state.readingGuide || state.readingMask) && !overlayBound) {
      window.addEventListener('mousemove', onPointerMove, { passive: true });
      overlayBound = true;
    } else if (!state.readingGuide && !state.readingMask && overlayBound) {
      window.removeEventListener('mousemove', onPointerMove); overlayBound = false;
    }
    positionOverlays();
  }

  /* Tooltips: surface title / aria-label on hover & focus within content */
  var tipBound = false;
  function onTipOver(e) {
    var el = e.target.closest('[title],[aria-label]');
    if (!el || root.contains(el)) { tip.style.display = 'none'; return; }
    var txt = el.getAttribute('title') || el.getAttribute('aria-label');
    if (!txt) { tip.style.display = 'none'; return; }
    tip.textContent = txt;
    tip.style.display = 'block';
    var r = el.getBoundingClientRect();
    tip.style.left = Math.min(r.left, window.innerWidth - 300) + 'px';
    tip.style.top = (r.bottom + 8) + 'px';
  }
  function onTipOut() { tip.style.display = 'none'; }
  function applyTooltips() {
    if (state.tooltips && !tipBound) {
      content.addEventListener('mouseover', onTipOver, true);
      content.addEventListener('mouseout', onTipOut, true);
      content.addEventListener('focusin', onTipOver, true);
      content.addEventListener('focusout', onTipOut, true);
      tipBound = true;
    } else if (!state.tooltips && tipBound) {
      content.removeEventListener('mouseover', onTipOver, true);
      content.removeEventListener('mouseout', onTipOut, true);
      content.removeEventListener('focusin', onTipOver, true);
      content.removeEventListener('focusout', onTipOut, true);
      tip.style.display = 'none'; tipBound = false;
    }
  }

  /* Read Aloud: click any text node in content to speak it */
  var readBound = false;
  function onReadClick(e) {
    if (root.contains(e.target)) return;
    var el = e.target.closest('p,h1,h2,h3,h4,h5,h6,li,a,span,button');
    var txt = (el ? el.innerText || el.textContent : '') || '';
    txt = txt.trim();
    if (!txt || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(txt.slice(0, 600)));
  }
  function applyReadAloud() {
    if (state.readAloud && !readBound) {
      content.addEventListener('click', onReadClick, true); readBound = true;
    } else if (!state.readAloud && readBound) {
      content.removeEventListener('click', onReadClick, true); readBound = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }

  /* Mute: mute all media now + any added later */
  var muteObserver = null;
  function muteAll(on) {
    var m = content.querySelectorAll('video,audio');
    for (var i = 0; i < m.length; i++) m[i].muted = on;
  }
  function applyMute() {
    if (state.muteSounds) {
      muteAll(true);
      if (!muteObserver && window.MutationObserver) {
        muteObserver = new MutationObserver(function () { if (state.muteSounds) muteAll(true); });
        muteObserver.observe(content, { childList: true, subtree: true });
      }
    } else {
      muteAll(false);
      if (muteObserver) { muteObserver.disconnect(); muteObserver = null; }
    }
  }
  function pauseMedia() {
    var v = content.querySelectorAll('video');
    for (var i = 0; i < v.length; i++) { try { v[i].pause(); } catch (e) {} }
  }

  /* ---------------------------------------------------------------------------
   * 8. UI sync — reflect state into card visuals/ARIA
   * ------------------------------------------------------------------------- */
  function syncUI() {
    var row = panel.querySelector('.mz-row');
    setClass(row.classList, 'mz-on', state.biggerInterface);
    row.setAttribute('aria-pressed', String(state.biggerInterface));

    var cards = panel.querySelectorAll('.mz-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var key = card.getAttribute('data-key');
      var type = card.getAttribute('data-type');
      var val = state[key];
      var on = type === 'toggle' ? !!val : val > 0;
      setClass(card.classList, 'mz-on', on);
      if (type === 'toggle') card.setAttribute('aria-pressed', String(!!val));
      else card.setAttribute('aria-valuenow', String(val));
      var dots = card.querySelectorAll('.mz-dots i');
      for (var d = 0; d < dots.length; d++) setClass(dots[d].classList, 'mz-dot-on', d < val);
      if (key === 'textAlign') {
        var icn = val === 0 ? 'textAlign' : ['', 'textAlignLeft', 'textAlignCenter', 'textAlignRight', 'textAlignJustify'][val];
        card.querySelector('.mz-card-icon').innerHTML = ICONS[icn];
      }
    }
  }

  /* ---------------------------------------------------------------------------
   * 9. Interaction
   * ------------------------------------------------------------------------- */
  function toggleKey(key) { state[key] = !state[key]; }
  function cycleLevel(key, max) { state[key] = (state[key] + 1) % (max + 1); }

  function handleControl(key, type, max) {
    if (type === 'toggle') toggleKey(key);
    else cycleLevel(key, max);
    save(); applyAll(); syncUI();
  }

  panel.addEventListener('click', function (e) {
    var ctl = e.target.closest('[data-key]');
    if (ctl) {
      handleControl(ctl.getAttribute('data-key'), ctl.getAttribute('data-type') || 'toggle', +ctl.getAttribute('data-max') || 0);
      return;
    }
    if (e.target.closest('#mz-reset')) { reset(); applyAll(); syncUI(); }
  });
  panel.addEventListener('keydown', function (e) {
    var ctl = e.target.closest('[data-key]');
    if (!ctl) return;
    var type = ctl.getAttribute('data-type') || 'toggle';
    var max = +ctl.getAttribute('data-max') || 0;
    var key = ctl.getAttribute('data-key');
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleControl(key, type, max); }
    else if (type !== 'toggle' && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) { e.preventDefault(); state[key] = Math.min(max, state[key] + 1); save(); applyAll(); syncUI(); }
    else if (type !== 'toggle' && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) { e.preventDefault(); state[key] = Math.max(0, state[key] - 1); save(); applyAll(); syncUI(); }
  });

  /* ---------------------------------------------------------------------------
   * 10. Open / close + focus management
   * ------------------------------------------------------------------------- */
  var isOpen = false;
  function focusables() { return panel.querySelectorAll('button, a[href], [tabindex="0"], [role="button"], [role="slider"]'); }
  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.classList.add('mz-open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    doc.addEventListener('keydown', onDocKeydown, true);
    var first = panel.querySelector('#mz-close');
    if (first) first.focus();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('mz-open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('keydown', onDocKeydown, true);
    fab.focus();
  }
  function onDocKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!panel.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }
  fab.addEventListener('click', function () { isOpen ? close() : open(); });
  panel.querySelector('#mz-close').addEventListener('click', close);

  // Long-press FAB to reset everything
  var pressTimer = null;
  fab.addEventListener('mousedown', function () { pressTimer = setTimeout(function () { reset(); applyAll(); syncUI(); }, 1200); });
  ['mouseup', 'mouseleave'].forEach(function (ev) { fab.addEventListener(ev, function () { clearTimeout(pressTimer); }); });

  /* ---------------------------------------------------------------------------
   * 11. Init
   * ------------------------------------------------------------------------- */
  applyAll();
  syncUI();
})();
