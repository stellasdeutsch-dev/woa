# World Olympians Association — redesign

Static redesign of [olympians.org](https://olympians.org) built with Astro and published on GitHub Pages.

- `scripts/crawl.mjs` — crawls the English site into `data/raw/` (not committed).
- `scripts/fetch-assets.mjs` — downloads images and documents into `public/`.
- `scripts/extract.mjs` — turns pages into clean JSON in `src/data/` (text kept verbatim).
- `scripts/check.mjs` — completeness check: every paragraph of the original must be on the new site.
- `scripts/shoot.mjs` — screenshots at 1440 / 834 / 390.
- `docs/` — research, audience analysis, user flows, Figma log.

```bash
npm ci
npm run build    # astro build + pagefind index
npm run preview
```
