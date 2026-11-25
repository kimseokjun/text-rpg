import { defineConfig } from 'vite';
import { writeFileSync } from 'fs';
const BUILD = String(Date.now());
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  plugins: [{ name: 'version-file', closeBundle() { try { writeFileSync('dist/version.json', JSON.stringify({ build: BUILD })); } catch { /* 무시 */ } } }],
});
