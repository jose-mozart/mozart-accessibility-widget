# mozart-a11y

Mozart & Co's self-hosted **Liquid Glass accessibility widget**. One `<script>` line in a
Webflow footer injects a full accessibility menu (CSS + SVG refraction filter + DOM + launcher)
and wires every control to real effects on the host page. Replaces UserWay.

- **Single file**, self-injecting, idempotent (safe to load on every page / twice).
- **Locked glass look** — signed-off Liquid Glass material (SVG-displacement refraction,
  iOS squircle corners, layered bevel). Chromium gets full refraction; other browsers and
  `prefers-reduced-transparency` fall back to a solid panel automatically.
- **21 controls** across Text / Color / Reading & Focus / Media, matching the Figma frames.
- **Persistent** — every setting saved to `localStorage` under `mozart-a11y:v1`, re-applied on load.
- **Accessible** — keyboard operable, focus trap, `Esc` to close, ARIA roles, reduced-motion safe.

## Install (Webflow)

Site Settings → Custom Code → **Footer**, one line:

```html
<script defer src="https://cdn.jsdelivr.net/gh/jose-mozart/mozart-accessibility-widget@v1.0.2/dist/mozart-a11y.min.js"></script>
```

> **Use the latest tag (`@v1.0.2`).** jsDelivr caches a tag→commit mapping and will not reliably
> serve fresh bytes if a tag is ever *moved*, so every release is a brand-new immutable tag and the
> footer is bumped once to match. Current production release: **`v1.0.2`**. Never reuse or move a tag.

That's it. The widget wraps the existing page content in `#mz-a11y-content`, then mounts the
launcher and panel **outside** that wrapper so effects (filters/zoom) never touch the widget itself.

## Controls

| Section | Controls |
|---|---|
| — | **Bigger Interface** (toggle — scales the whole UI via `zoom`) |
| Text | Bigger Text (4 levels), Line Height (3), Text Spacing (3), Readable Font (toggle), Text Align (cycle L/C/R/justify) |
| Color | Contrast, Invert (re-inverts media), Grayscale, Saturation (3 levels) |
| Reading & Focus | Highlight Links, Highlight Titles, Reading Guide, Reading Mask, Tooltips, Read Aloud |
| Media | Pause Motion, Hide Images, Mute Sounds, Big Cursor |

Multi-level controls use the level-dots pattern; toggles use the `.mz-on` active state.
Filters (invert / contrast / saturate / grayscale) compose into a single `filter` string on the
content wrapper so they never clobber each other. **Reset All Settings** (or long-press the
launcher ~1.2s) clears everything.

## Develop

```bash
npm install
npm run build      # -> dist/mozart-a11y.min.js (esbuild, minified, self-contained)
npx playwright install chromium
npm test           # headless Chromium verification (test/verify.mjs)
```

Source of truth is `src/mozart-a11y.js`. The locked glass recipe (SVG filter + CSS) lives inside
it verbatim — **do not edit the material** (filters, shadows, tints, radius/corner-shape). Layout,
controls, and effects are everything else.

## Release & update flow

All client sites point at a pinned tag, so updates are a tag bump in one place.

1. Edit `src/mozart-a11y.js`, run `npm run build`, run `npm test`.
2. Commit, then tag and push a new version:
   ```bash
   git commit -am "feat: ..."
   git tag v1.1.0
   git push origin main --tags
   ```
3. Bump the `@version` in the Webflow footer snippet **once**:
   ```html
   <script defer src="https://cdn.jsdelivr.net/gh/jose-mozart/mozart-accessibility-widget@v1.1.0/dist/mozart-a11y.min.js"></script>
   ```
   All sites pick it up. (jsDelivr caches aggressively; a fresh tag URL is always served immediately.
   Never reuse a tag — mint a new one so caches don't serve stale code.)

## Browser support

- **Chromium 139+**: full Liquid Glass — SVG-displacement refraction + `corner-shape` squircle.
- **Safari / Firefox**: refraction degrades to plain blur; corners fall back to the rounded radius. Intentional.
- **`prefers-reduced-transparency: reduce`**: glass becomes a solid dark panel, still fully readable.
- **`prefers-reduced-motion: reduce`**: open/morph transitions disabled.

© Mozart & Co.
