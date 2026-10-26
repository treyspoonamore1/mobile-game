import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      target: 'es2022',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    plugins: single
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'icons/*.png'],
            manifest: {
              name: 'Lifeline',
              short_name: 'Lifeline',
              description: "You're the healer. They're the heroes.",
              theme_color: '#14182e',
              background_color: '#14182e',
              display: 'fullscreen',
              orientation: 'portrait',
              start_url: './',
              scope: './',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: { globPatterns: ['**/*.{js,css,html,png,woff2,woff}'] },
          }),
        ],
  };
});
