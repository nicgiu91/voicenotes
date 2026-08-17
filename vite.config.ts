import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// HTTPS serve solo per usare il microfono dal telefono in LAN:
// avvia-voicenotes.bat imposta VOICENOTES_HTTPS=1
const useHttps = process.env.VOICENOTES_HTTPS === '1'

const plugins: PluginOption[] = [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'VoiceNotes',
      short_name: 'VoiceNotes',
      description: 'Registratore AI: registrazione, trascrizione, riepiloghi e mappe mentali',
      lang: 'it',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f1115',
      theme_color: '#0f1115',
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      // le chiamate API (trascrizione/LLM) non vanno mai in cache
      navigateFallbackDenylist: [/^\/api/],
    },
  }),
]
if (useHttps) plugins.push(basicSsl())

export default defineConfig({
  base: './',
  plugins,
  server: { port: 4000, host: true },
  preview: { port: 4000, host: true },
})
