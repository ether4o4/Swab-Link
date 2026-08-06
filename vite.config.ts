import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build modes:
//   default            -> normal multi-file build (for GitHub Pages / any host)
//   SINGLEFILE=true    -> everything inlined into one index.html you can open anywhere
//   GITHUB_PAGES=true  -> sets the base path to /Swab-Link/ for project Pages
const singleFile = process.env.SINGLEFILE === 'true'
const githubPages = process.env.GITHUB_PAGES === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  // Single-file build uses relative paths so it works opened from anywhere.
  base: singleFile ? './' : githubPages ? '/Swab-Link/' : '/',
  plugins: [
    react(),
    // The service worker / PWA install only makes sense for a hosted build.
    ...(singleFile
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
              name: 'Swab-Link Work Orders',
              short_name: 'Swab-Link',
              description: 'Work orders for pulling-unit / workover swabbing jobs',
              theme_color: '#0f172a',
              background_color: '#0f172a',
              display: 'standalone',
              orientation: 'any',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
          }),
        ]),
  ],
})
