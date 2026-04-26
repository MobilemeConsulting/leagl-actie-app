// Minimale service worker — vereist voor PWA-installeerbaarheid op iOS/Android.
// Geen offline caching: de app vereist altijd verse data uit Supabase + ElevenLabs.
// We laten alle requests gewoon door naar het netwerk.

const VERSION = 'leagl-assistant-v1'

self.addEventListener('install', (event) => {
  // Activeer onmiddellijk zodra geïnstalleerd
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Pass-through: laat de browser default doen.
  // (Geen event.respondWith → browser handelt het zelf af)
})
