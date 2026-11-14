import { defineConfig } from 'astro/config';
// Published on GitHub Pages under /woa/
export default defineConfig({
  site: 'https://stellasdeutsch-dev.github.io',
  base: '/woa',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
});
